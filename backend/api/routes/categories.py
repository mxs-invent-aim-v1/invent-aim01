"""
Categories, Workflows, and Processes routes — full CRUD.
"""
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import Category, Workflow, WorkflowProcess, ProductCatalog, User
from api.dependencies import get_current_active_user

router = APIRouter(prefix="/api/categories", tags=["Categories & Workflows"])


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    color: str = Field(default="cyan")


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    color: Optional[str] = None


class WorkflowCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    order_index: Optional[int] = None


class WorkflowUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    order_index: Optional[int] = None


class ProcessCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    order_index: Optional[int] = None


class ProcessUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    order_index: Optional[int] = None


# ─── Category Routes ──────────────────────────────────────────────────────────

@router.get("")
def list_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all categories with nested workflows and processes."""
    categories = db.query(Category).order_by(Category.name).all()
    return {"items": [c.to_dict() for c in categories]}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_category(
    data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new category."""
    existing = db.query(Category).filter(Category.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Category '{data.name}' already exists")

    cat = Category(name=data.name, color=data.color)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat.to_dict()


@router.put("/{category_id}")
def update_category(
    category_id: int,
    data: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Rename or update a category's color."""
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    if data.name is not None and data.name != cat.name:
        dup = db.query(Category).filter(Category.name == data.name, Category.id != category_id).first()
        if dup:
            raise HTTPException(status_code=400, detail=f"Category '{data.name}' already exists")
        # Update all products using the old category name
        old_name = cat.name
        db.query(ProductCatalog).filter(ProductCatalog.category == old_name).update(
            {ProductCatalog.category: data.name}, synchronize_session="fetch"
        )
        cat.name = data.name

    if data.color is not None:
        cat.color = data.color

    db.commit()
    db.refresh(cat)
    return cat.to_dict()


@router.delete("/{category_id}")
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a category. Fails if products are still assigned to it."""
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    product_count = db.query(ProductCatalog).filter(ProductCatalog.category == cat.name).count()
    if product_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete: {product_count} products are still assigned to '{cat.name}'. Reassign them first."
        )

    db.delete(cat)
    db.commit()
    return {"message": f"Category '{cat.name}' deleted"}


# ─── Workflow Routes ──────────────────────────────────────────────────────────

@router.post("/{category_id}/workflows", status_code=status.HTTP_201_CREATED)
def create_workflow(
    category_id: int,
    data: WorkflowCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Add a workflow to a category."""
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    # Auto-assign order_index if not provided
    if data.order_index is None:
        max_idx = max((w.order_index for w in cat.workflows), default=-1)
        data.order_index = max_idx + 1

    wf = Workflow(category_id=category_id, name=data.name, order_index=data.order_index)
    db.add(wf)
    db.commit()
    db.refresh(wf)
    return wf.to_dict()


@router.put("/{category_id}/workflows/{workflow_id}")
def update_workflow(
    category_id: int,
    workflow_id: int,
    data: WorkflowUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Rename or reorder a workflow."""
    wf = db.query(Workflow).filter(
        Workflow.id == workflow_id, Workflow.category_id == category_id
    ).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")

    if data.name is not None:
        wf.name = data.name
    if data.order_index is not None:
        wf.order_index = data.order_index

    db.commit()
    db.refresh(wf)
    return wf.to_dict()


@router.delete("/{category_id}/workflows/{workflow_id}")
def delete_workflow(
    category_id: int,
    workflow_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a workflow. Clears workflow_id from any assigned products."""
    wf = db.query(Workflow).filter(
        Workflow.id == workflow_id, Workflow.category_id == category_id
    ).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Clear workflow_id from products that reference this workflow
    db.query(ProductCatalog).filter(ProductCatalog.workflow_id == workflow_id).update(
        {ProductCatalog.workflow_id: None}, synchronize_session="fetch"
    )

    db.delete(wf)
    db.commit()
    return {"message": f"Workflow '{wf.name}' deleted"}


# ─── Process Routes ───────────────────────────────────────────────────────────

@router.post("/{category_id}/workflows/{workflow_id}/processes", status_code=status.HTTP_201_CREATED)
def create_process(
    category_id: int,
    workflow_id: int,
    data: ProcessCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Add a process step to a workflow."""
    wf = db.query(Workflow).filter(
        Workflow.id == workflow_id, Workflow.category_id == category_id
    ).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Auto-assign order_index
    if data.order_index is None:
        max_idx = max((p.order_index for p in wf.processes), default=-1)
        data.order_index = max_idx + 1

    proc = WorkflowProcess(
        workflow_id=workflow_id,
        name=data.name,
        description=data.description,
        order_index=data.order_index,
    )
    db.add(proc)
    db.commit()
    db.refresh(proc)
    return proc.to_dict()


@router.put("/{category_id}/workflows/{workflow_id}/processes/{process_id}")
def update_process(
    category_id: int,
    workflow_id: int,
    process_id: int,
    data: ProcessUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Rename, reorder, or update description of a process step."""
    proc = db.query(WorkflowProcess).filter(
        WorkflowProcess.id == process_id,
        WorkflowProcess.workflow_id == workflow_id,
    ).first()
    if not proc:
        raise HTTPException(status_code=404, detail="Process not found")

    # Verify workflow belongs to category
    wf = db.query(Workflow).filter(Workflow.id == workflow_id, Workflow.category_id == category_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found in this category")

    if data.name is not None:
        proc.name = data.name
    if data.description is not None:
        proc.description = data.description
    if data.order_index is not None:
        proc.order_index = data.order_index

    db.commit()
    db.refresh(proc)
    return proc.to_dict()


@router.delete("/{category_id}/workflows/{workflow_id}/processes/{process_id}")
def delete_process(
    category_id: int,
    workflow_id: int,
    process_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a process step from a workflow."""
    proc = db.query(WorkflowProcess).filter(
        WorkflowProcess.id == process_id,
        WorkflowProcess.workflow_id == workflow_id,
    ).first()
    if not proc:
        raise HTTPException(status_code=404, detail="Process not found")

    db.delete(proc)
    db.commit()
    return {"message": f"Process '{proc.name}' deleted"}
