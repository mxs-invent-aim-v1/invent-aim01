"""
Document loader - unified entry point for PDF and image ingestion.
Chooses the right extraction strategy based on file type and content quality.
"""
import hashlib
import io
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF
import pdfplumber
from PIL import Image

import config
from core.preprocessor import preprocess_image, light_preprocess_image, scale_image
from core.ocr_engine import run_ocr

logger = logging.getLogger(__name__)

MIN_WORDS_FOR_NATIVE_PDF = 20  # Below this → treat as scanned PDF
OCR_RENDER_DPI = 200  # 200 DPI is sufficient for Tesseract; 300 DPI is overkill


@dataclass
class DocumentResult:
    raw_text: str
    file_path: str
    file_name: str
    file_size_bytes: int
    file_hash: str
    page_count: int
    source_type: str  # pdf_native | pdf_ocr | image_ocr
    ocr_confidence: Optional[float] = None
    error: Optional[str] = None
    pages: list[str] = field(default_factory=list)  # Per-page text


def load_document(file_path: Path) -> DocumentResult:
    """
    Main entry point. Auto-detects file type and returns DocumentResult
    with raw text ready for LLM extraction.
    """
    suffix = file_path.suffix.lower()
    file_size = file_path.stat().st_size
    file_hash = compute_file_hash(file_path)

    try:
        if suffix in config.SUPPORTED_PDF_EXTENSIONS:
            return _process_pdf(file_path, file_size, file_hash)
        elif suffix in config.SUPPORTED_IMAGE_EXTENSIONS:
            return _process_image(file_path, file_size, file_hash)
        else:
            raise ValueError(f"Unsupported file type: {suffix}")
    except Exception as e:
        logger.error(f"Failed to load document {file_path.name}: {e}")
        return DocumentResult(
            raw_text="",
            file_path=str(file_path),
            file_name=file_path.name,
            file_size_bytes=file_size,
            file_hash=file_hash,
            page_count=0,
            source_type="error",
            ocr_confidence=None,
            error=str(e),
        )


def _process_pdf(file_path: Path, file_size: int, file_hash: str) -> DocumentResult:
    """
    PDF processing strategy:
    1. Try pdfplumber for native text (fast, accurate for digital PDFs).
    2. If text is empty/garbled → render pages via PyMuPDF at 300 DPI → OCR.
    """
    pages_text: list[str] = []
    page_count = 0

    # ── Step 1: Native text extraction ──────────────────────────────────────
    try:
        with pdfplumber.open(str(file_path)) as pdf:
            page_count = len(pdf.pages)
            for page in pdf.pages:
                text = page.extract_text(x_tolerance=3, y_tolerance=3) or ""
                pages_text.append(text)
    except Exception as e:
        logger.warning(f"pdfplumber failed on {file_path.name}: {e}")

    full_text = "\n\n".join(pages_text)

    if _is_text_meaningful(full_text):
        logger.info(f"[PDF-native] {file_path.name}: {len(full_text)} chars")
        return DocumentResult(
            raw_text=full_text.strip(),
            file_path=str(file_path),
            file_name=file_path.name,
            file_size_bytes=file_size,
            file_hash=file_hash,
            page_count=page_count,
            source_type="pdf_native",
            pages=pages_text,
        )

    # ── Step 2: Scanned PDF → render to image → OCR ─────────────────────────
    logger.info(f"[PDF-OCR] {file_path.name}: switching to OCR (native text insufficient)")
    pages_text = []
    confidences: list[float] = []

    doc = fitz.open(str(file_path))
    page_count = len(doc)

    for page in doc:
        # Render at configured DPI (200 default — 44% fewer pixels than 300)
        mat = fitz.Matrix(OCR_RENDER_DPI / 72, OCR_RENDER_DPI / 72)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        img_bytes = pix.tobytes("png")
        img = Image.open(io.BytesIO(img_bytes))

        # Use light preprocessing for PDF-rendered pages (already clean digital images)
        processed = light_preprocess_image(img)
        result = run_ocr(processed)
        pages_text.append(result.text)
        confidences.append(result.confidence)

    doc.close()

    avg_conf = sum(confidences) / len(confidences) if confidences else 0.0
    full_text = "\n\n".join(pages_text)

    logger.info(
        f"[PDF-OCR] {file_path.name}: {page_count} pages, avg confidence={avg_conf:.1f}%"
    )
    return DocumentResult(
        raw_text=full_text.strip(),
        file_path=str(file_path),
        file_name=file_path.name,
        file_size_bytes=file_size,
        file_hash=file_hash,
        page_count=page_count,
        source_type="pdf_ocr",
        ocr_confidence=avg_conf,
        pages=pages_text,
    )


def _process_image(file_path: Path, file_size: int, file_hash: str) -> DocumentResult:
    """Open image → preprocess → OCR."""
    img = Image.open(str(file_path))

    # Upscale small images for better OCR
    if img.width < 1200 or img.height < 1600:
        img = scale_image(img)

    processed = preprocess_image(img)
    result = run_ocr(processed)

    logger.info(
        f"[Image-OCR] {file_path.name}: {result.word_count} words, "
        f"confidence={result.confidence:.1f}%"
    )
    return DocumentResult(
        raw_text=result.text.strip(),
        file_path=str(file_path),
        file_name=file_path.name,
        file_size_bytes=file_size,
        file_hash=file_hash,
        page_count=1,
        source_type="image_ocr",
        ocr_confidence=result.confidence,
        pages=[result.text],
    )


def _is_text_meaningful(text: str) -> bool:
    """
    Heuristic: text is meaningful if it contains at least N real words.
    Filters out garbled scanned text.
    """
    if not text:
        return False
    words = [w for w in text.split() if len(w) > 2 and w.isascii()]
    return len(words) >= MIN_WORDS_FOR_NATIVE_PDF


def compute_file_hash(file_path: Path) -> str:
    """Compute SHA-256 hash of a file for deduplication."""
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            sha256.update(chunk)
    return sha256.hexdigest()
