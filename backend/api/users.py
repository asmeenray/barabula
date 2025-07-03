from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import User as UserModel
from schemas import User, UserUpdate
from api.auth import get_current_active_user

router = APIRouter()


@router.get("/", response_model=List[User])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    """Get list of users (for collaboration features)"""
    users = db.query(UserModel).filter(UserModel.is_active == True).offset(skip).limit(limit).all()
    return users


@router.get("/{user_id}", response_model=User)
async def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    """Get user by ID"""
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.put("/me", response_model=User)
async def update_current_user(
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    """Update current user information"""
    update_data = user_update.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    return current_user


@router.delete("/me")
async def delete_current_user(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    """Deactivate current user account"""
    current_user.is_active = False
    db.commit()
    return {"message": "Account deactivated successfully"}


@router.get("/search/{query}", response_model=List[User])
async def search_users(
    query: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    """Search users by username or full name"""
    users = db.query(UserModel).filter(
        (UserModel.username.ilike(f"%{query}%")) |
        (UserModel.full_name.ilike(f"%{query}%"))
    ).filter(UserModel.is_active == True).limit(10).all()
    
    return users
