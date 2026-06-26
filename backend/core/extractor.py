"""
Core LLM-based invoice field extractor.
Sends OCR text to Ollama and parses the structured JSON response.
"""
import json
import logging
from typing import Optional

from core.ollama_client import ollama, extract_json_from_response
from models.invoice_schema import InvoiceExtracted, LineItem, TaxBreakdown
import config

logger = logging.getLogger(__name__)

# ─── System prompt ────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are an expert invoice data extraction assistant specializing in Indian e-commerce invoices (Amazon India, Flipkart, Meesho, Myntra, Snapdeal, etc.).

Your task: extract all structured fields from the raw invoice text provided.

RULES:
- Respond with ONLY a valid JSON object. No markdown, no explanations.
- If a field is not found, use null.
- For amounts, use numbers only (no currency symbols or commas).
- For dates, use YYYY-MM-DD format if possible, otherwise the original text.
- GSTIN format is 15 characters: e.g. 29AABCT1332L1ZD
- Include ONLY ACTUAL PHYSICAL PRODUCTS in line items. Do NOT include marketplace fees, shipping, or service charges.
"""

# ─── Extraction prompt template (compressed for faster inference) ───────────────
EXTRACTION_PROMPT = """Extract all fields from the invoice text below. Return a JSON object with this schema:

{{
  "invoice_number": "string|null",
  "invoice_date": "YYYY-MM-DD|null",
  "order_id": "string|null",
  "seller_gstin": "15-char GSTIN|null",
  "line_items": [{{"name":"full product description","hsn_code":"string|null","quantity":1,"unit_price":0.0,"total_price":0.0,"tax_rate":null,"tax_amount":null}}],
  "tax_breakdown": {{"cgst_rate":null,"cgst_amount":null,"sgst_rate":null,"sgst_amount":null,"igst_rate":null,"igst_amount":null,"total_tax":null}},
  "grand_total": 0.0
}}

Rules: 
1. EXTREMELY IMPORTANT: Carefully locate the EXACT 'Invoice Number' (or Bill No). Do not miss it. Look near the top of the document.
2. Line Items: ONLY include physical products. Ignore lines starting with 'Marketplace Fees', 'Shipping', or 'Handling'.
3. Taxes: Strictly extract ONLY numeric rates (e.g. 18) and numeric amounts (e.g. 150.50). Do not include ₹ symbols.
4. Indian GST: CGST+SGST or IGST. total_tax = sum of all taxes. 
5. grand_total = Final amount payable. Must be a realistic amount.

INVOICE TEXT:
---
{raw_text}
---

JSON:"""


async def extract_invoice_fields(
    raw_text: str,
    model: Optional[str] = None,
) -> InvoiceExtracted:
    """
    Main extraction function.
    Sends raw text to Ollama and returns a validated InvoiceExtracted object.
    """
    model = model or config.OLLAMA_TEXT_MODEL

    # Truncate very long text to avoid context window overflow
    max_chars = 6000
    text_for_llm = raw_text[:max_chars]
    if len(raw_text) > max_chars:
        logger.warning(f"Text truncated from {len(raw_text)} to {max_chars} chars for LLM")

    prompt = EXTRACTION_PROMPT.format(raw_text=text_for_llm)

    logger.info(f"Sending to Ollama model={model} ({len(text_for_llm)} chars)")

    try:
        response = await ollama.generate(
            prompt=prompt,
            model=model,
            system=SYSTEM_PROMPT,
            temperature=0.05,
        )
        logger.debug(f"Raw Ollama response (first 500 chars): {response[:500]}")

        extracted_dict = extract_json_from_response(response)
        invoice = _dict_to_invoice(extracted_dict)
        invoice.confidence_score = invoice.compute_confidence()

        logger.info(
            f"Extraction complete: invoice_number={invoice.invoice_number}, "
            f"total={invoice.grand_total}, confidence={invoice.confidence_score}"
        )
        return invoice

    except ValueError as e:
        logger.error(f"JSON parse error from Ollama: {e}")
        # Return empty invoice with zero confidence
        return InvoiceExtracted(confidence_score=0.0)
    except RuntimeError as e:
        logger.error(f"Ollama runtime error: {e}")
        raise


def _dict_to_invoice(data: dict) -> InvoiceExtracted:
    """Convert raw dict from LLM to validated InvoiceExtracted."""
    # Line items
    raw_items = data.pop("line_items", []) or []
    line_items = []
    for item in raw_items:
        if isinstance(item, dict) and item.get("name"):
            try:
                line_items.append(LineItem(**item))
            except Exception as e:
                logger.debug(f"Skipped malformed line item: {e}")
    data["line_items"] = line_items

    # Tax breakdown
    if isinstance(data.get("tax_breakdown"), dict):
        try:
            data["tax_breakdown"] = TaxBreakdown(**data["tax_breakdown"])
        except Exception:
            data["tax_breakdown"] = None

    return InvoiceExtracted(**{k: v for k, v in data.items() if v is not None or k in ("confidence_score",)})
