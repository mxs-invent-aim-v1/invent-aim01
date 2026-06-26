"""
Async batch processing engine.
Manages a job queue for processing multiple invoice files concurrently.
"""
import asyncio
import logging
import time
import uuid
from pathlib import Path
from typing import Any

import config
from core.document_loader import load_document, compute_file_hash
from core.extractor import extract_invoice_fields
from core.vision_extractor import extract_from_image
from db.database import SessionLocal
from db.repository import InvoiceRepository

logger = logging.getLogger(__name__)

# In-memory job store (suitable for single-process; use Redis for multi-process)
_jobs: dict[str, dict[str, Any]] = {}
# Serialize LLM inference: on CPU-only hardware, concurrent Ollama calls compete
# for CPU/RAM and make each request slower due to memory contention.
_semaphore: asyncio.Semaphore = asyncio.Semaphore(1)


def create_job(file_paths: list[str]) -> str:
    """Register a new batch job and return its ID."""
    job_id = str(uuid.uuid4())
    _jobs[job_id] = {
        "id": job_id,
        "total_files": len(file_paths),
        "processed": 0,
        "failed": 0,
        "pending": len(file_paths),
        "status": "queued",
        "results": [],
    }
    return job_id


def get_job(job_id: str) -> dict | None:
    return _jobs.get(job_id)


def list_jobs() -> list[dict]:
    return list(_jobs.values())


async def process_batch(job_id: str, file_paths: list[str]) -> None:
    """
    Process all files in a batch job concurrently (up to MAX_CONCURRENT_JOBS).
    Updates job state in-place for polling.
    """
    job = _jobs[job_id]
    job["status"] = "processing"

    # ── Check model availability ONCE per batch (not per file) ────────────
    from core.ollama_client import ollama
    try:
        model_ok = await ollama.is_model_available(config.OLLAMA_TEXT_MODEL)
    except Exception:
        job["status"] = "failed"
        job["results"].append({
            "file_name": "*",
            "status": "error",
            "error": f"Cannot connect to Ollama at {config.OLLAMA_HOST}. Make sure Ollama is running: `ollama serve`",
        })
        return
    if not model_ok:
        job["status"] = "failed"
        job["results"].append({
            "file_name": "*",
            "status": "error",
            "error": f"Ollama model '{config.OLLAMA_TEXT_MODEL}' is not available. Please pull it first: `ollama pull {config.OLLAMA_TEXT_MODEL}`",
        })
        return

    # Process files sequentially — on CPU-only hardware, concurrent Ollama
    # calls don't parallelize; they compete for CPU/RAM and cause model swapping.
    for fp in file_paths:
        try:
            await _process_single_file(job_id, fp)
        except Exception:
            pass  # Errors already tracked inside _process_single_file

    failed = job["failed"]
    processed = job["processed"]
    job["status"] = "done" if failed == 0 else (
        "partial_failure" if processed > 0 else "failed"
    )
    logger.info(
        f"Job {job_id} complete: {processed} ok, {failed} failed out of {len(file_paths)}"
    )


async def _process_single_file(job_id: str, file_path_str: str) -> None:
    """Process one invoice file under the semaphore (rate limiting)."""
    async with _semaphore:
        start_ms = int(time.time() * 1000)
        file_path = Path(file_path_str)
        job = _jobs[job_id]

        result_entry: dict[str, Any] = {
            "file_name": file_path.name,
            "status": "pending",
            "invoice_id": None,
            "error": None,
        }

        db = None
        try:
            db = SessionLocal()
            repo = InvoiceRepository(db)

            # ── Step 1: Check deduplication ──────────────────────────────────
            file_hash = compute_file_hash(file_path)
            existing = repo.exists_by_hash(file_hash)
            if existing:
                logger.info(f"Duplicate skipped: {file_path.name} (id={existing.id})")
                result_entry.update({
                    "status": "duplicate",
                    "invoice_id": existing.id,
                    "message": "Already processed",
                })
                job["processed"] += 1
                job["pending"] -= 1
                job["results"].append(result_entry)
                db.close()
                return

            # ── Step 2: Load document (OCR if needed) ────────────────────────
            # Model availability is checked once in process_batch(), not here
            logger.info(f"Loading: {file_path.name}")
            doc_result = await asyncio.to_thread(load_document, file_path)

            if doc_result.error:
                raise RuntimeError(f"Document load failed: {doc_result.error}")

            # ── Step 4: LLM extraction ───────────────────────────────────────
            try:
                extracted = await extract_invoice_fields(doc_result.raw_text)
            except RuntimeError as e:
                if "404" in str(e) or "not found" in str(e).lower():
                    raise RuntimeError(
                        f"Model '{config.OLLAMA_TEXT_MODEL}' returned 404 — "
                        f"it may still be downloading. Run: `ollama pull {config.OLLAMA_TEXT_MODEL}`"
                    )
                raise

            # Fallback to vision if confidence too low
            low_confidence = extracted.confidence_score < config.EXTRACTION_CONFIDENCE_THRESHOLD
            is_image = file_path.suffix.lower() in config.SUPPORTED_IMAGE_EXTENSIONS

            if low_confidence:
                logger.info(
                    f"Low confidence ({extracted.confidence_score:.2f}), "
                    f"trying vision LLM for {file_path.name}"
                )
                try:
                    vision_path = file_path
                    is_temp = False
                    if not is_image:
                        import fitz
                        doc = fitz.open(str(file_path))
                        page = doc[0]
                        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                        temp_png = file_path.with_suffix(".temp.png")
                        pix.save(str(temp_png))
                        doc.close()
                        vision_path = temp_png
                        is_temp = True
                        
                    vision_result = await extract_from_image(vision_path)
                    if vision_result.confidence_score > extracted.confidence_score:
                        extracted = vision_result
                        
                    if is_temp:
                        vision_path.unlink(missing_ok=True)
                except Exception as ve:
                    logger.warning(f"Vision fallback failed: {ve} — using text extraction")

            # ── Step 5: Save to DB ───────────────────────────────────────────
            invoice = repo.save_invoice(doc_result, extracted, job_id)

            # ── Step 6: Save JSON to disk ────────────────────────────────────
            json_path = file_path.with_suffix(".json")
            try:
                with open(json_path, "w", encoding="utf-8") as jf:
                    jf.write(extracted.model_dump_json(indent=2))
            except Exception as e:
                logger.warning(f"Failed to save JSON for {file_path.name}: {e}")

            duration = int(time.time() * 1000) - start_ms
            logger.info(
                f"✓ {file_path.name}: id={invoice.id}, "
                f"confidence={extracted.confidence_score:.2f}, {duration}ms"
            )
            result_entry.update({
                "status": "ok",
                "invoice_id": invoice.id,
                "confidence": extracted.confidence_score,
                "duration_ms": duration,
            })
            job["processed"] += 1

        except Exception as e:
            logger.error(f"✗ {file_path.name}: {e}")
            result_entry.update({"status": "error", "error": str(e)})
            job["failed"] += 1
            try:
                repo.save_error(None, file_path.name, "", str(e), job_id)
            except Exception:
                pass
        finally:
            job["pending"] = max(0, job["pending"] - 1)
            job["results"].append(result_entry)
            if db is not None:
                try:
                    db.close()
                except Exception:
                    pass
