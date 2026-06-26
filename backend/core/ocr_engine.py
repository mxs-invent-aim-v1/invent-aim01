"""
Tesseract OCR engine wrapper with confidence scoring.
"""
import logging
from dataclasses import dataclass

import pytesseract
from PIL import Image

import config

logger = logging.getLogger(__name__)

# Configure Tesseract path (Windows)
pytesseract.pytesseract.tesseract_cmd = config.TESSERACT_CMD

# Tesseract config: OEM 1 (LSTM only — faster than OEM 3 which adds legacy engine), PSM 6
TESSERACT_CONFIG = r"--oem 1 --psm 6"


@dataclass
class OCRResult:
    text: str
    confidence: float  # 0-100
    word_count: int


def run_ocr(image: Image.Image, lang: str = "eng") -> OCRResult:
    """
    Run Tesseract OCR on a PIL Image.
    Returns extracted text and a mean confidence score.

    Uses a SINGLE image_to_data() call to get both text and confidence,
    avoiding the costly duplicate image_to_string() call.
    """
    try:
        # Single Tesseract call — get per-word data including positions & confidence
        data = pytesseract.image_to_data(
            image,
            lang=lang,
            config=TESSERACT_CONFIG,
            output_type=pytesseract.Output.DICT,
        )

        # Reconstruct text from word-level data using block/par/line structure
        words = []
        confidences = []
        lines: list[str] = []
        current_line_words: list[str] = []
        prev_block, prev_par, prev_line = -1, -1, -1

        for i, word_text in enumerate(data["text"]):
            word_text = word_text.strip()
            conf = int(data["conf"][i])

            if not word_text or conf <= 0:
                continue

            words.append(word_text)
            confidences.append(conf)

            block_num = data["block_num"][i]
            par_num = data["par_num"][i]
            line_num = data["line_num"][i]

            # Detect line/paragraph/block change → flush current line
            if (block_num != prev_block or par_num != prev_par or line_num != prev_line):
                if current_line_words:
                    lines.append(" ".join(current_line_words))
                # Add blank line between blocks/paragraphs for readability
                if prev_block != -1 and (block_num != prev_block or par_num != prev_par):
                    lines.append("")
                current_line_words = []

            current_line_words.append(word_text)
            prev_block, prev_par, prev_line = block_num, par_num, line_num

        # Flush last line
        if current_line_words:
            lines.append(" ".join(current_line_words))

        text = "\n".join(lines)
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0

        logger.debug(
            f"OCR complete: {len(words)} words, avg confidence={avg_confidence:.1f}%"
        )
        return OCRResult(
            text=text.strip(),
            confidence=avg_confidence,
            word_count=len(words),
        )
    except Exception as e:
        logger.error(f"OCR failed: {e}")
        return OCRResult(text="", confidence=0.0, word_count=0)


def is_tesseract_available() -> bool:
    """Check if Tesseract is installed and accessible."""
    try:
        version = pytesseract.get_tesseract_version()
        logger.info(f"Tesseract version: {version}")
        return True
    except Exception:
        return False
