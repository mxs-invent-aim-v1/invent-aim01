"""
Authentication and user management routes.
"""
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session

from api.dependencies import get_current_admin, get_current_active_user
from core.security import create_access_token, get_password_hash, verify_password
from db.database import get_db
from db.models import User

router = APIRouter(prefix="/auth", tags=["Authentication"])

class Token(BaseModel):
    access_token: str
    token_type: str

class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "user"
    can_upload: bool = False

class UserUpdate(BaseModel):
    role: str
    can_upload: bool
    is_active: bool

class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    can_upload: bool
    is_active: bool


@router.post("/token", response_model=Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    access_token = create_access_token(subject=user.id)
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/users/me", response_model=UserResponse)
def read_users_me(
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get current user details."""
    return current_user


# ─── Admin User Management ───────────────────────────────────────────────────

@router.get("/users", response_model=list[UserResponse])
def get_all_users(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
) -> Any:
    """List all users (Admin only)."""
    return db.query(User).all()


@router.post("/users", response_model=UserResponse)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
) -> Any:
    """Create new user (Admin only)."""
    user = db.query(User).filter(User.username == user_in.username).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    
    db_user = User(
        username=user_in.username,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role,
        can_upload=user_in.can_upload,
        is_active=True,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
) -> Any:
    """Update user permissions and status (Admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Prevent admin from removing their own admin privileges easily
    if user.id == current_admin.id and user_in.role != "admin":
        raise HTTPException(status_code=400, detail="Cannot downgrade your own admin privileges.")
        
    user.role = user_in.role
    user.can_upload = user_in.can_upload
    user.is_active = user_in.is_active
    db.commit()
    db.refresh(user)
    return user
