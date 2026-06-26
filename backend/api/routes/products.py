"""
Product Catalog routes — manage item names, codes, and categories.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import ProductCatalog, User
from api.dependencies import get_current_active_user, get_current_admin

router = APIRouter(prefix="/api/products", tags=["Product Catalog"])


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class ProductCreate(BaseModel):
    item_name: str = Field(..., min_length=1, max_length=500)
    item_code: str = Field(..., min_length=1, max_length=50)
    category: str = Field(default="Category 1")


class ProductUpdate(BaseModel):
    item_name: Optional[str] = Field(None, min_length=1, max_length=500)
    item_code: Optional[str] = Field(None, min_length=1, max_length=50)
    category: Optional[str] = None


class ProductResponse(BaseModel):
    id: int
    item_name: str
    item_code: str
    category: str
    created_at: Optional[str]

    class Config:
        from_attributes = True


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    product_in: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new product in the catalog."""
    # Check for duplicate item_name
    existing = db.query(ProductCatalog).filter(
        ProductCatalog.item_name == product_in.item_name
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Item '{product_in.item_name}' already exists in catalog",
        )

    # Check for duplicate item_code
    existing_code = db.query(ProductCatalog).filter(
        ProductCatalog.item_code == product_in.item_code
    ).first()
    if existing_code:
        raise HTTPException(
            status_code=400,
            detail=f"Item code '{product_in.item_code}' is already assigned to another product",
        )

    product = ProductCatalog(
        item_name=product_in.item_name,
        item_code=product_in.item_code,
        category=product_in.category,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product.to_dict()


@router.get("")
def list_products(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all products in the catalog. Supports search and category filter."""
    query = db.query(ProductCatalog)

    if search:
        query = query.filter(
            ProductCatalog.item_name.ilike(f"%{search}%")
            | ProductCatalog.item_code.ilike(f"%{search}%")
        )

    if category:
        query = query.filter(ProductCatalog.category == category)

    total = query.count()
    products = query.order_by(ProductCatalog.item_name).offset(skip).limit(limit).all()

    return {
        "total": total,
        "items": [p.to_dict() for p in products],
    }


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get a single product by ID."""
    product = db.query(ProductCatalog).filter(ProductCatalog.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product.to_dict()


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    product_in: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update a product in the catalog."""
    product = db.query(ProductCatalog).filter(ProductCatalog.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if product_in.item_name is not None and product_in.item_name != product.item_name:
        dup = db.query(ProductCatalog).filter(
            ProductCatalog.item_name == product_in.item_name,
            ProductCatalog.id != product_id,
        ).first()
        if dup:
            raise HTTPException(status_code=400, detail=f"Item name '{product_in.item_name}' already exists")
        product.item_name = product_in.item_name

    if product_in.item_code is not None and product_in.item_code != product.item_code:
        dup = db.query(ProductCatalog).filter(
            ProductCatalog.item_code == product_in.item_code,
            ProductCatalog.id != product_id,
        ).first()
        if dup:
            raise HTTPException(status_code=400, detail=f"Item code '{product_in.item_code}' already taken")
        product.item_code = product_in.item_code

    if product_in.category is not None:
        product.category = product_in.category

    db.commit()
    db.refresh(product)
    return product.to_dict()


@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a product from the catalog."""
    product = db.query(ProductCatalog).filter(ProductCatalog.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    db.delete(product)
    db.commit()
    return {"message": f"Product '{product.item_name}' deleted"}
