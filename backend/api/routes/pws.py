from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from api.dependencies import get_db
from db.models import PWSItem, PWSAssignment

router = APIRouter(prefix="/pws", tags=["PWS Management"])

class PWSItemCreate(BaseModel):
    id: str
    type: str
    name: str

class PWSAssignmentCreate(BaseModel):
    parent_id: str
    child_id: str

@router.get("/items", response_model=List[Dict[str, Any]])
def get_pws_items(db: Session = Depends(get_db)):
    items = db.query(PWSItem).all()
    return [item.to_dict() for item in items]

@router.post("/items", response_model=Dict[str, Any])
def create_pws_item(item: PWSItemCreate, db: Session = Depends(get_db)):
    db_item = PWSItem(id=item.id, type=item.type, name=item.name)
    db.add(db_item)
    try:
        db.commit()
        db.refresh(db_item)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    return db_item.to_dict()

@router.get("/assignments", response_model=List[Dict[str, Any]])
def get_pws_assignments(db: Session = Depends(get_db)):
    assignments = db.query(PWSAssignment).all()
    return [assignment.to_dict() for assignment in assignments]

@router.post("/assignments", response_model=Dict[str, Any])
def create_pws_assignment(assign: PWSAssignmentCreate, db: Session = Depends(get_db)):
    # Check if already exists
    existing = db.query(PWSAssignment).filter_by(parent_id=assign.parent_id, child_id=assign.child_id).first()
    if existing:
        return existing.to_dict()

    db_assign = PWSAssignment(parent_id=assign.parent_id, child_id=assign.child_id)
    db.add(db_assign)
    try:
        db.commit()
        db.refresh(db_assign)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    return db_assign.to_dict()

@router.delete("/assignments/{parent_id}/{child_id}")
def delete_pws_assignment(parent_id: str, child_id: str, db: Session = Depends(get_db)):
    assignment = db.query(PWSAssignment).filter_by(parent_id=parent_id, child_id=child_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    db.delete(assignment)
    db.commit()
    return {"status": "success"}
