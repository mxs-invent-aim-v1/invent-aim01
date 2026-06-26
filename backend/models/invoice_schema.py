"""
Pydantic schemas for invoice data validation and serialization.
These act as the contract between the LLM extractor and the database.
"""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


# ─── Sub-models ───────────────────────────────────────────────────────────────

class LineItem(BaseModel):
    name: str
    hsn_code: Optional[str] = None
    quantity: float = 1.0
    unit_price: float = 0.0
    total_price: float = 0.0
    tax_rate: Optional[float] = None  # Percentage, e.g. 18.0 for 18% GST
    tax_amount: Optional[float] = None

    @field_validator("quantity", "unit_price", "total_price", mode="before")
    @classmethod
    def parse_numeric(cls, v: Any) -> float:
        if v is None:
            return 0.0
        if isinstance(v, (int, float)):
            return float(v)
        # Strip currency symbols and commas
        cleaned = str(v).replace(",", "").replace("₹", "").replace("Rs.", "").strip()
        try:
            return float(cleaned)
        except ValueError:
            return 0.0


class TaxBreakdown(BaseModel):
    cgst_rate: Optional[float] = None
    cgst_amount: Optional[float] = None
    sgst_rate: Optional[float] = None
    sgst_amount: Optional[float] = None
    igst_rate: Optional[float] = None
    igst_amount: Optional[float] = None
    total_tax: Optional[float] = None


# ─── Main Invoice Schema ───────────────────────────────────────────────────────

class InvoiceExtracted(BaseModel):
    """
    The structured output the LLM must produce.
    All fields are optional to handle partial extraction gracefully.
    """
    # Identification
    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None  # String first, coerced to date later
    order_id: Optional[str] = None

    # Parties
    seller_gstin: Optional[str] = None

    # Items
    line_items: list[LineItem] = Field(default_factory=list)

    # Financials
    tax_breakdown: Optional[TaxBreakdown] = None
    grand_total: Optional[float] = None

    # Metadata
    confidence_score: float = 0.0  # 0–1, set after validation

    @field_validator("grand_total", mode="before")
    @classmethod
    def parse_amount(cls, v: Any) -> Optional[float]:
        if v is None:
            return None
        if isinstance(v, (int, float)):
            return float(v)
        cleaned = str(v).replace(",", "").replace("₹", "").replace("Rs.", "").strip()
        try:
            return float(cleaned)
        except ValueError:
            return None

    @model_validator(mode="after")
    def validate_and_fix_grand_total(self) -> InvoiceExtracted:
        """
        Auto-corrects hallucinated grand totals (e.g. LLM picking a phone number).
        If the grand total is missing or wildly disproportionate to the line items,
        it falls back to a computed sum.
        """
        # Calculate expected total (line items + tax)
        # Note: some invoices include tax in total_price, some don't.
        # We just need a ballpark to detect massive hallucinations.
        expected_total = sum(item.total_price for item in self.line_items)
        if self.tax_breakdown and self.tax_breakdown.total_tax:
            expected_total += self.tax_breakdown.total_tax

        if expected_total > 0:
            if self.grand_total is None or self.grand_total == 0.0:
                self.grand_total = expected_total
            else:
                # If extracted total is > 5x the expected sum, it's likely a phone number/ID
                if self.grand_total > (expected_total * 5):
                    self.grand_total = expected_total
        
        return self

    def compute_confidence(self) -> float:
        """
        Heuristic confidence score based on how many key fields are populated.
        """
        key_fields = [
            self.invoice_number,
            self.invoice_date,
            self.grand_total,
            self.order_id,
        ]
        filled = sum(1 for f in key_fields if f is not None)
        base_score = filled / len(key_fields)

        # Bonus for line items
        if self.line_items:
            base_score = min(1.0, base_score + 0.1)

        # Bonus for GSTIN
        if self.seller_gstin:
            base_score = min(1.0, base_score + 0.05)

        return round(base_score, 3)


# ─── API Response Schemas ──────────────────────────────────────────────────────

class InvoiceResponse(BaseModel):
    """Full invoice record returned from DB."""
    id: int
    file_hash: str
    invoice_number: Optional[str]
    invoice_date: Optional[str]
    order_id: Optional[str]
    product_description: Optional[str]
    hsn_code: Optional[str]
    quantity: Optional[float]
    seller_gstin: Optional[str]
    cgst_rate: Optional[float]
    cgst_amount: Optional[float]
    sgst_rate: Optional[float]
    sgst_amount: Optional[float]
    igst_rate: Optional[float]
    igst_amount: Optional[float]
    total_tax: Optional[float]
    grand_total: Optional[float]
    confidence_score: Optional[float]
    source_type: Optional[str]
    ocr_confidence: Optional[float]
    status: str
    line_items: list[dict] = []
    taxes: list[dict] = []

    class Config:
        from_attributes = True


class JobStatus(BaseModel):
    """Processing job status."""
    job_id: str
    total_files: int
    processed: int
    failed: int
    pending: int
    status: str  # queued | processing | done | partial_failure
    results: list[dict] = []


class StatsResponse(BaseModel):
    total_invoices: int
    total_spend: float
    by_month: list[dict]
    needs_review_count: int
