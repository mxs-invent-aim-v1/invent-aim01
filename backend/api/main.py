"""
FastAPI application entry point.
"""
import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from db.database import init_db, seed_default_categories
from api.routes import upload, invoices, stats, json_files, query, auth, po, products, categories, tracking, pws
from api.dependencies import get_current_active_user

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    logger.info("Starting Invoice Scanner API...")
    init_db()
    seed_default_categories()
    logger.info("Database initialized.")
    yield
    # Cleanup persistent HTTP client on shutdown
    from core.ollama_client import ollama
    await ollama.close()
    logger.info("Shutting down.")


app = FastAPI(
    title="Invoice Scanner API",
    description="Local invoice scanning and data extraction using Ollama LLM",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Nginx proxies in production; allow all for flexibility
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routes ───────────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api")
app.include_router(upload.router) # Dependencies added per-route inside upload.py
app.include_router(invoices.router, dependencies=[Depends(get_current_active_user)])
app.include_router(stats.router) # Stats router handles its own dependencies if needed
app.include_router(json_files.router, dependencies=[Depends(get_current_active_user)])
app.include_router(query.router, dependencies=[Depends(get_current_active_user)])
app.include_router(po.router, dependencies=[Depends(get_current_active_user)])
app.include_router(products.router, dependencies=[Depends(get_current_active_user)])
app.include_router(categories.router, dependencies=[Depends(get_current_active_user)])
app.include_router(tracking.router, dependencies=[Depends(get_current_active_user)])
app.include_router(pws.router, prefix="/api", dependencies=[Depends(get_current_active_user)])


@app.get("/api")
def root():
    return {"message": "Invoice Scanner API", "docs": "/docs"}


# ─── Serve React frontend in production ───────────────────────────────────────
frontend_dist = Path(__file__).parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="static")
    logger.info(f"Serving frontend from {frontend_dist}")
