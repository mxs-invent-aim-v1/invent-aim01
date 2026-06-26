"""
Upload routes — batch file upload and job status polling.
"""
import asyncio
import shutil
import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile, Depends
from fastapi.responses import JSONResponse

import config
from api.background_tasks import create_job, get_job, list_jobs, process_batch
from api.dependencies import check_upload_permission, get_current_active_user

router = APIRouter(prefix="/api/upload", tags=["upload"])


@router.post("", dependencies=[Depends(check_upload_permission)])
async def upload_invoices(
    background_tasks: BackgroundTasks,
    files: Annotated[list[UploadFile], File(description="Invoice files (PDF/JPG/PNG)")],
):
    """
    Accept one or more invoice files, save to disk, and start a background job.
    Returns a job_id to poll for status.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    saved_paths: list[str] = []
    errors: list[str] = []

    job_id = str(uuid.uuid4())
    job_dir = config.UPLOAD_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    for file in files:
        suffix = Path(file.filename or "").suffix.lower()
        if suffix not in config.SUPPORTED_EXTENSIONS:
            errors.append(f"{file.filename}: unsupported file type ({suffix})")
            continue

        if file.size and file.size > config.MAX_FILE_SIZE_BYTES:
            errors.append(f"{file.filename}: file too large (max {config.MAX_FILE_SIZE_BYTES // (1024*1024)}MB)")
            continue

        safe_name = f"{uuid.uuid4().hex}{suffix}"
        dest = job_dir / safe_name

        with open(dest, "wb") as f:
            shutil.copyfileobj(file.file, f)

        # Rename to original name for better UX in DB
        original_name = (file.filename or safe_name).replace("/", "_").replace("\\", "_")
        final_dest = job_dir / original_name
        dest.rename(final_dest)
        saved_paths.append(str(final_dest))

    if not saved_paths:
        raise HTTPException(
            status_code=400,
            detail=f"No valid files to process. Errors: {errors}",
        )

    # Register job and start async processing
    create_job_with_id(job_id, saved_paths)
    background_tasks.add_task(process_batch, job_id, saved_paths)

    return JSONResponse(
        status_code=202,
        content={
            "job_id": job_id,
            "total_files": len(saved_paths),
            "skipped": errors,
            "message": f"Processing {len(saved_paths)} file(s) in background",
        },
    )


def create_job_with_id(job_id: str, file_paths: list[str]) -> None:
    """Internal: register a job with a pre-assigned ID."""
    from api.background_tasks import _jobs
    _jobs[job_id] = {
        "id": job_id,
        "total_files": len(file_paths),
        "processed": 0,
        "failed": 0,
        "pending": len(file_paths),
        "status": "queued",
        "results": [],
    }


@router.get("/job/{job_id}", dependencies=[Depends(get_current_active_user)])
async def get_job_status(job_id: str):
    """Poll processing status for a batch job."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return job


@router.get("/jobs", dependencies=[Depends(get_current_active_user)])
async def list_all_jobs():
    """List all recent batch jobs."""
    return list_jobs()
