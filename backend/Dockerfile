# ── Backend Dockerfile ──────────────────────────────────────────────────────
FROM python:3.11-slim

# Install system dependencies: Tesseract OCR, OpenCV libs, poppler for PDF
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    libtesseract-dev \
    libleptonica-dev \
    libgl1 \
    libglib2.0-0 \
    poppler-utils \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first for Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY . .

# Create data and uploads directories
RUN mkdir -p /app/data /app/uploads

# Expose the API port
EXPOSE 8000

# Run with production settings (no reload)
CMD ["python", "-m", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
