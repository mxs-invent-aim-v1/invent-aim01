"""
SQLAlchemy ORM models for the invoice database.
"""
import json
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Column, DateTime, Float, ForeignKey, Integer, String, Text, Boolean, func
)
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(200), nullable=False)
    role = Column(String(20), default="user")  # "admin" or "user"
    can_upload = Column(Boolean, default=False)  # User permission to upload
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "username": self.username,
            "role": self.role,
            "can_upload": self.can_upload,
            "is_active": self.is_active,
            "created_at": self.created_at,
        }


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)

    # File metadata
    file_name = Column(String(500), nullable=False)
    file_path = Column(String(1000), nullable=False)
    file_hash = Column(String(64), unique=True, index=True, nullable=False)
    file_size_bytes = Column(Integer)
    page_count = Column(Integer)
    source_type = Column(String(50))      # pdf_native | pdf_ocr | image_ocr | image_vision
    ocr_confidence = Column(Float)

    # Platform & identification
    invoice_number = Column(String(200), index=True)
    invoice_date = Column(String(50))
    order_id = Column(String(200), index=True)

    # Seller
    seller_gstin = Column(String(20))

    # Financials
    grand_total = Column(Float)
    
    # Custom Categories
    category = Column(String(50), nullable=True)
    
    # Tracking workflow override — when set, uses this category's workflows instead of PO category
    tracking_category_override = Column(String(100), nullable=True)

    # Quality
    confidence_score = Column(Float, default=0.0)
    status = Column(String(50), default="processed", index=True)
    # processed | needs_review | error

    # Raw data (for debugging / re-processing)
    raw_text = Column(Text)
    raw_json = Column(Text)               # Full JSON from LLM

    # Purchase Order Link
    po_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=True, index=True)

    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    line_items = relationship("LineItem", back_populates="invoice", cascade="all, delete-orphan")
    taxes = relationship("TaxEntry", back_populates="invoice", cascade="all, delete-orphan")
    processing_logs = relationship("ProcessingLog", back_populates="invoice", cascade="all, delete-orphan")
    po = relationship("PurchaseOrder")

    def to_dict(self) -> dict:
        # Flatten line items into summary fields
        product_description = "; ".join(
            li.name for li in self.line_items if li.name
        ) or None
        hsn_code = "; ".join(
            li.hsn_code for li in self.line_items if li.hsn_code
        ) or None
        quantity = sum(li.quantity or 0 for li in self.line_items) or None

        # Flatten tax entries
        tax_map = {t.tax_type: t for t in self.taxes}
        cgst = tax_map.get("CGST")
        sgst = tax_map.get("SGST")
        igst = tax_map.get("IGST")
        total_tax = sum(t.amount or 0 for t in self.taxes) or None

        return {
            "id": self.id,
            "file_hash": self.file_hash,
            "file_name": self.file_name,
            "invoice_number": self.invoice_number,
            "invoice_date": self.invoice_date,
            "order_id": self.order_id,
            "product_description": product_description,
            "hsn_code": hsn_code,
            "quantity": quantity,
            "seller_gstin": self.seller_gstin,
            "cgst_rate": cgst.rate if cgst else None,
            "cgst_amount": cgst.amount if cgst else None,
            "sgst_rate": sgst.rate if sgst else None,
            "sgst_amount": sgst.amount if sgst else None,
            "igst_rate": igst.rate if igst else None,
            "igst_amount": igst.amount if igst else None,
            "total_tax": round(total_tax, 2) if total_tax else None,
            "grand_total": self.grand_total,
            "category": self.category,
            "confidence_score": self.confidence_score,
            "source_type": self.source_type,
            "ocr_confidence": self.ocr_confidence,
            "status": self.status,
            "po_id": self.po_id,
            "po_number": self.po.po_number if self.po else None,
            "linked_po": self.po.to_dict() if self.po else None,
        }


class LineItem(Base):
    __tablename__ = "line_items"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False, index=True)

    name = Column(String(1000), nullable=False)
    hsn_code = Column(String(20))
    quantity = Column(Float, default=1.0)
    unit_price = Column(Float, default=0.0)
    total_price = Column(Float, default=0.0)
    tax_rate = Column(Float)
    tax_amount = Column(Float)

    invoice = relationship("Invoice", back_populates="line_items")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "hsn_code": self.hsn_code,
            "quantity": self.quantity,
            "unit_price": self.unit_price,
            "total_price": self.total_price,
            "tax_rate": self.tax_rate,
            "tax_amount": self.tax_amount,
        }


class TaxEntry(Base):
    __tablename__ = "taxes"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False, index=True)

    tax_type = Column(String(20))   # CGST | SGST | IGST | CESS
    rate = Column(Float)
    amount = Column(Float)

    invoice = relationship("Invoice", back_populates="taxes")

    def to_dict(self) -> dict:
        return {"tax_type": self.tax_type, "rate": self.rate, "amount": self.amount}


class ProcessingLog(Base):
    __tablename__ = "processing_logs"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True, index=True)
    job_id = Column(String(100), index=True)
    file_name = Column(String(500))
    stage = Column(String(50))      # load | ocr | extract | save
    status = Column(String(20))     # ok | error | warning
    message = Column(Text)
    duration_ms = Column(Integer)
    created_at = Column(DateTime, server_default=func.now())

    invoice = relationship("Invoice", back_populates="processing_logs")


class ProductCatalog(Base):
    __tablename__ = "product_catalog"

    id = Column(Integer, primary_key=True, index=True)
    item_name = Column(String(500), unique=True, nullable=False, index=True)
    item_code = Column(String(50), unique=True, nullable=False, index=True)
    category = Column(String(100), nullable=False, default="Category 1")  # Category name string
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=True, index=True)
    created_at = Column(DateTime, server_default=func.now())

    workflow = relationship("Workflow", back_populates="products")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "item_name": self.item_name,
            "item_code": self.item_code,
            "category": self.category,
            "workflow_id": self.workflow_id,
            "workflow_name": self.workflow.name if self.workflow else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    color = Column(String(30), nullable=False, default="cyan")  # cyan | purple | orange | emerald | rose | amber
    created_at = Column(DateTime, server_default=func.now())

    workflows = relationship("Workflow", back_populates="category", cascade="all, delete-orphan", order_by="Workflow.order_index")

    def to_dict(self, include_workflows=True) -> dict:
        result = {
            "id": self.id,
            "name": self.name,
            "color": self.color,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_workflows:
            result["workflows"] = [w.to_dict() for w in self.workflows]
        return result


class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    order_index = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, server_default=func.now())

    category = relationship("Category", back_populates="workflows")
    processes = relationship("WorkflowProcess", back_populates="workflow", cascade="all, delete-orphan", order_by="WorkflowProcess.order_index")
    products = relationship("ProductCatalog", back_populates="workflow")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "category_id": self.category_id,
            "name": self.name,
            "order_index": self.order_index,
            "processes": [p.to_dict() for p in self.processes],
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class WorkflowProcess(Base):
    __tablename__ = "workflow_processes"

    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    order_index = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, server_default=func.now())

    workflow = relationship("Workflow", back_populates="processes")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "workflow_id": self.workflow_id,
            "name": self.name,
            "description": self.description,
            "order_index": self.order_index,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class InvoiceProcessTracking(Base):
    """Tracks which process steps an invoice has completed in its workflow."""
    __tablename__ = "invoice_process_tracking"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False, index=True)
    process_id = Column(Integer, ForeignKey("workflow_processes.id"), nullable=False, index=True)
    completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    completed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    invoice = relationship("Invoice")
    process = relationship("WorkflowProcess")
    completed_by = relationship("User")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "invoice_id": self.invoice_id,
            "process_id": self.process_id,
            "process_name": self.process.name if self.process else None,
            "completed": self.completed,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "completed_by_id": self.completed_by_id,
            "completed_by_username": self.completed_by.username if self.completed_by else None,
            "notes": self.notes,
        }


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    po_number = Column(String(50), unique=True, index=True, nullable=False)
    item_name = Column(String(500), nullable=False)
    item_code = Column(String(50), nullable=True)    # Auto-filled from product catalog
    category = Column(String(20), nullable=True)     # Auto-filled from product catalog
    quantity = Column(Float, nullable=False)
    unit = Column(String(20), default="pcs")  # pcs | kg | litre | box | other
    notes = Column(Text, nullable=True)
    status = Column(String(20), default="pending", index=True)  # pending | approved | rejected

    # Who raised the PO
    requested_by_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    # Admin who approved/rejected (nullable until acted on)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    requested_by = relationship("User", foreign_keys=[requested_by_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "po_number": self.po_number,
            "item_name": self.item_name,
            "item_code": self.item_code,
            "category": self.category,
            "quantity": self.quantity,
            "unit": self.unit,
            "notes": self.notes,
            "status": self.status,
            "requested_by_id": self.requested_by_id,
            "requested_by_username": self.requested_by.username if self.requested_by else None,
            "approved_by_id": self.approved_by_id,
            "approved_by_username": self.approved_by.username if self.approved_by else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class PWSItem(Base):
    __tablename__ = "pws_items"

    id = Column(String(50), primary_key=True, index=True)
    type = Column(String(20), index=True, nullable=False) # 'project', 'workflow', 'state'
    name = Column(String(200), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "type": self.type,
            "name": self.name,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class PWSAssignment(Base):
    __tablename__ = "pws_assignments"

    id = Column(Integer, primary_key=True, index=True)
    parent_id = Column(String(50), ForeignKey("pws_items.id", ondelete="CASCADE"), index=True, nullable=False)
    child_id = Column(String(50), ForeignKey("pws_items.id", ondelete="CASCADE"), index=True, nullable=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "parent_id": self.parent_id,
            "child_id": self.child_id,
        }
