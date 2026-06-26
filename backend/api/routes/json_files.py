"""
JSON Files routes — list and download extracted JSON files.
"""
import os
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

import config

router = APIRouter(prefix="/api/json-files", tags=["json"])

@router.get("")
def list_json_files():
    """Scan the UPLOAD_DIR and return a list of all extracted JSON files."""
    json_files = []
    
    if not config.UPLOAD_DIR.exists():
        return json_files

    for root, dirs, files in os.walk(config.UPLOAD_DIR):
        for file in files:
            if file.endswith(".json"):
                file_path = Path(root) / file
                job_id = Path(root).name
                stat = file_path.stat()
                json_files.append({
                    "job_id": job_id,
                    "filename": file,
                    "size": stat.st_size,
                    "created_at": stat.st_ctime
                })
    
    # Sort by created_at descending
    json_files.sort(key=lambda x: x["created_at"], reverse=True)
    return json_files


@router.get("/{job_id}/{filename}")
def get_json_file(job_id: str, filename: str):
    """Return the specific JSON file."""
    if not filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="Invalid file type requested")
        
    file_path = config.UPLOAD_DIR / job_id / filename
    
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
        
    return FileResponse(
        path=file_path,
        media_type="application/json",
        filename=filename
    )
