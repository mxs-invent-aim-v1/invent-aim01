"""
Image preprocessing pipeline using OpenCV.
Enhances image quality before OCR to maximize accuracy.
"""
import logging

import cv2
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)


def light_preprocess_image(image: Image.Image) -> Image.Image:
    """
    Fast preprocessing for clean/digital images (e.g., natively-rendered PDFs).
    Only applies grayscale conversion + Otsu thresholding.
    ~10ms vs ~5s for the full pipeline.
    """
    try:
        img_array = np.array(image.convert("RGB"))
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        return Image.fromarray(binary)
    except Exception as e:
        logger.warning(f"Light preprocessing failed, using original: {e}")
        return image


def preprocess_image(image: Image.Image) -> Image.Image:
    """
    Full preprocessing pipeline for scanned/noisy documents:
    1. Convert to grayscale
    2. Deskew (correct rotation)
    3. Fast denoising (median blur — replaces slow fastNlMeansDenoising)
    4. Adaptive thresholding (binarize)
    Returns a PIL Image ready for Tesseract.
    """
    try:
        img_array = np.array(image.convert("RGB"))
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        deskewed = _deskew(gray)
        # Median blur is ~100x faster than fastNlMeansDenoising and
        # sufficient for salt-and-pepper noise in scanned documents
        denoised = cv2.medianBlur(deskewed, 3)
        # Adaptive threshold works better than Otsu for uneven lighting
        binary = cv2.adaptiveThreshold(
            denoised,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            11,
            2,
        )
        return Image.fromarray(binary)
    except Exception as e:
        logger.warning(f"Preprocessing failed, using original: {e}")
        return image


def _deskew(gray: np.ndarray) -> np.ndarray:
    """Detect and correct skew angle using Hough lines."""
    try:
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)
        lines = cv2.HoughLines(edges, 1, np.pi / 180, threshold=100)
        if lines is None or len(lines) < 5:
            return gray

        angles = []
        for line in lines[:50]:
            rho, theta = line[0]
            # Only consider near-horizontal lines for deskew
            angle_deg = np.degrees(theta) - 90
            if abs(angle_deg) < 10:
                angles.append(angle_deg)

        if not angles:
            return gray

        median_angle = float(np.median(angles))
        if abs(median_angle) < 0.5:
            return gray  # No meaningful skew

        h, w = gray.shape
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, median_angle, 1.0)
        rotated = cv2.warpAffine(
            gray, M, (w, h),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_REPLICATE,
        )
        logger.debug(f"Deskewed image by {median_angle:.2f}°")
        return rotated
    except Exception as e:
        logger.debug(f"Deskew failed: {e}")
        return gray


def scale_image(image: Image.Image, target_dpi: int = 300) -> Image.Image:
    """Scale image to target DPI equivalent (assumes 72 DPI input)."""
    scale = target_dpi / 72
    new_size = (int(image.width * scale), int(image.height * scale))
    return image.resize(new_size, Image.LANCZOS)

