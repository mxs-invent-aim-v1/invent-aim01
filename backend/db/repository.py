"""
Repository layer — all database CRUD operations for invoices.
"""
import json
import logging
from typing import Optional

from sqlalchemy import desc, func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from db.models import Invoice, LineItem, TaxEntry, ProcessingLog
from models.invoice_schema import InvoiceExtracted
from core.document_loader import DocumentResult

logger = logging.getLogger(__name__)


class InvoiceRepository:

    def __init__(self, db: Session):
        self.db = db

    # ── Deduplication ─────────────────────────────────────────────────────────

    def exists_by_hash(self, file_hash: str) -> Optional[Invoice]:
        """Return existing invoice if same file was already processed."""
        return self.db.query(Invoice).filter(Invoice.file_hash == file_hash).first()

    # ── Create ────────────────────────────────────────────────────────────────

    def save_invoice(
        self,
        doc_result: DocumentResult,
        extracted: InvoiceExtracted,
        job_id: str = "",
    ) -> Invoice:
        """
        Persist a fully extracted invoice with its line items and taxes.
        Returns the created Invoice ORM object.
        """
        # Determine status: all newly uploaded invoices must be registered/reviewed
        status = "needs_review"

        invoice = Invoice(
            file_name=doc_result.file_name,
            file_path=doc_result.file_path,
            file_hash=doc_result.file_hash,
            file_size_bytes=doc_result.file_size_bytes,
            page_count=doc_result.page_count,
            source_type=doc_result.source_type,
            ocr_confidence=doc_result.ocr_confidence,
            invoice_number=extracted.invoice_number,
            invoice_date=str(extracted.invoice_date) if extracted.invoice_date else None,
            order_id=extracted.order_id,
            seller_gstin=extracted.seller_gstin,
            grand_total=extracted.grand_total,
            confidence_score=extracted.confidence_score,
            status=status,
            raw_text=doc_result.raw_text[:50000],  # Cap raw text
            raw_json=extracted.model_dump_json(),
        )
        self.db.add(invoice)
        self.db.flush()  # Get ID without committing

        # Save line items
        for item in extracted.line_items:
            db_item = LineItem(
                invoice_id=invoice.id,
                name=item.name,
                hsn_code=item.hsn_code,
                quantity=item.quantity,
                unit_price=item.unit_price,
                total_price=item.total_price,
                tax_rate=item.tax_rate,
                tax_amount=item.tax_amount,
            )
            self.db.add(db_item)

        # Save tax entries
        if extracted.tax_breakdown:
            tb = extracted.tax_breakdown
            tax_pairs = [
                ("CGST", tb.cgst_rate, tb.cgst_amount),
                ("SGST", tb.sgst_rate, tb.sgst_amount),
                ("IGST", tb.igst_rate, tb.igst_amount),
            ]
            for tax_type, rate, amount in tax_pairs:
                if amount is not None:
                    self.db.add(TaxEntry(
                        invoice_id=invoice.id,
                        tax_type=tax_type,
                        rate=rate,
                        amount=amount,
                    ))

        try:
            self.db.commit()
            self.db.refresh(invoice)
            logger.info(f"Saved invoice id={invoice.id} ({invoice.file_name})")
            return invoice
        except IntegrityError:
            # Race condition: another concurrent request already inserted this hash.
            # Rollback and return the existing record as a duplicate.
            self.db.rollback()
            existing = self.exists_by_hash(doc_result.file_hash)
            if existing:
                logger.info(f"Duplicate detected (race): {doc_result.file_name} → id={existing.id}")
                return existing
            raise  # Unexpected IntegrityError on a different column

    def save_error(
        self,
        doc_result: Optional[DocumentResult],
        file_name: str,
        file_hash: str,
        error_msg: str,
        job_id: str = "",
    ) -> ProcessingLog:
        """Log a failed processing attempt."""
        log = ProcessingLog(
            job_id=job_id,
            file_name=file_name,
            stage="error",
            status="error",
            message=error_msg[:2000],
        )
        self.db.add(log)
        self.db.commit()
        return log

    # ── Read ──────────────────────────────────────────────────────────────────

    def get_invoice(self, invoice_id: int) -> Optional[Invoice]:
        return self.db.query(Invoice).filter(Invoice.id == invoice_id).first()

    def list_invoices(
        self,
        skip: int = 0,
        limit: int = 50,
        status: Optional[str] = None,
        search: Optional[str] = None,
    ) -> tuple[list[Invoice], int]:
        """Returns (invoices, total_count)."""
        q = self.db.query(Invoice)

        if status:
            q = q.filter(Invoice.status == status)
        if search:
            pattern = f"%{search}%"
            q = q.filter(
                or_(
                    Invoice.invoice_number.ilike(pattern),
                    Invoice.order_id.ilike(pattern),
                )
            )

        total = q.count()
        invoices = q.order_by(desc(Invoice.id)).offset(skip).limit(limit).all()
        return invoices, total

    def get_all_for_export(
        self,
        status: Optional[str] = None,
    ) -> list[Invoice]:
        """Fetch all invoices for CSV/Excel export (no pagination)."""
        q = self.db.query(Invoice)
        if status:
            q = q.filter(Invoice.status == status)
        return q.order_by(desc(Invoice.id)).all()

    # ── Update ────────────────────────────────────────────────────────────────

    def update_invoice(self, invoice_id: int, updates: dict) -> Optional[Invoice]:
        """Apply manual field corrections from the UI."""
        invoice = self.get_invoice(invoice_id)
        if not invoice:
            return None
        allowed = {
            "invoice_number", "invoice_date", "order_id",
            "seller_gstin",
            "grand_total", "status", "category",
        }
        for key, val in updates.items():
            if key in allowed:
                setattr(invoice, key, val)
        
        if "hsn_code" in updates:
            hsn_val = updates["hsn_code"]
            if invoice.line_items:
                for li in invoice.line_items:
                    li.hsn_code = hsn_val
            elif hsn_val:
                from db.models import LineItem
                li = LineItem(invoice_id=invoice.id, name="Unknown", hsn_code=hsn_val)
                self.db.add(li)
                
        if "total_tax" in updates:
            tax_val = updates["total_tax"]
            for t in invoice.taxes:
                self.db.delete(t)
            if tax_val is not None and str(tax_val).strip() != "":
                try:
                    from db.models import TaxEntry
                    new_tax = TaxEntry(invoice_id=invoice.id, tax_type="TOTAL", amount=float(tax_val))
                    self.db.add(new_tax)
                except ValueError:
                    pass

        self.db.commit()
        self.db.refresh(invoice)
        return invoice

    # ── Delete ────────────────────────────────────────────────────────────────

    def delete_invoice(self, invoice_id: int) -> bool:
        invoice = self.get_invoice(invoice_id)
        if not invoice:
            return False
        self.db.delete(invoice)
        self.db.commit()
        return True

    # ── Statistics ────────────────────────────────────────────────────────────

    def get_stats(self) -> dict:
        total = self.db.query(func.count(Invoice.id)).scalar() or 0
        total_spend = self.db.query(func.sum(Invoice.grand_total)).scalar() or 0.0
        needs_review = (
            self.db.query(func.count(Invoice.id))
            .filter(Invoice.status == "needs_review")
            .scalar() or 0
        )

        # Spend by month
        by_month_rows = (
            self.db.query(
                func.strftime("%Y-%m", Invoice.invoice_date).label("month"),
                func.count(Invoice.id),
                func.sum(Invoice.grand_total),
            )
            .group_by("month")
            .order_by("month")
            .all()
        )
        by_month = [
            {"month": r[0], "count": r[1], "total": round(r[2] or 0, 2)}
            for r in by_month_rows
        ]

        return {
            "total_invoices": total,
            "total_spend": round(total_spend, 2),
            "by_month": by_month,
            "needs_review_count": needs_review,
        }
