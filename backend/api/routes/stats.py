"""
Stats and analytics routes.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from db.database import get_db
from db.repository import InvoiceRepository
from core.ollama_client import ollama
from core.ocr_engine import is_tesseract_available
from api.dependencies import get_current_active_user

router = APIRouter(prefix="/api", tags=["stats"])


@router.get("/stats", dependencies=[Depends(get_current_active_user)])
def get_stats(db: Session = Depends(get_db)):
    """Aggregate statistics for the dashboard."""
    repo = InvoiceRepository(db)
    return repo.get_stats()


@router.get("/health")
async def health_check():
    """Check system health: Ollama connectivity, Tesseract availability."""
    ollama_status = await ollama.health_check()
    tesseract_ok = is_tesseract_available()

    return {
        "status": "ok" if ollama_status["status"] == "ok" else "degraded",
        "ollama": ollama_status,
        "tesseract": {
            "available": tesseract_ok,
            "note": "Install from https://github.com/UB-Mannheim/tesseract/wiki" if not tesseract_ok else "OK",
        },
    }
