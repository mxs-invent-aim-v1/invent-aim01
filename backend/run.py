"""
Run the FastAPI backend from the backend/ directory.
Usage: python run.py
"""
import sys
import os

# Ensure the backend directory is on the Python path
sys.path.insert(0, os.path.dirname(__file__))

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=["."],
    )
