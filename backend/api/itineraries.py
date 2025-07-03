from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List

from database import get_db
from models import User as UserModel, Itinerary as ItineraryModel, Activity as ActivityModel
from schemas import (
    Itinerary, ItineraryCreate, ItineraryUpdate,
    Activity, ActivityCreate, ActivityUpdate
)
from api.auth import get_current_active_user

router = APIRouter()


@router.get("/", response_model=List[Itinerary])
async def get_itineraries(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    """Get user's itineraries"""
    itineraries = db.query(ItineraryModel).options(
        joinedload(ItineraryModel.owner),
        joinedload(ItineraryModel.collaborators)
    ).filter(ItineraryModel.owner_id == current_user.id).offset(skip).limit(limit).all()
    
    return itineraries


@router.post("/", response_model=Itinerary, status_code=status.HTTP_201_CREATED)
async def create_itinerary(
    itinerary_data: ItineraryCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    """Create a new itinerary"""
    db_itinerary = ItineraryModel(
        **itinerary_data.dict(),
        owner_id=current_user.id
    )
    
    db.add(db_itinerary)
    db.commit()
    db.refresh(db_itinerary)
    
    # Load relationships for response
    db_itinerary = db.query(ItineraryModel).options(
        joinedload(ItineraryModel.owner),
        joinedload(ItineraryModel.collaborators)
    ).filter(ItineraryModel.id == db_itinerary.id).first()
    
    return db_itinerary


@router.get("/{itinerary_id}", response_model=Itinerary)
async def get_itinerary(
    itinerary_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    """Get itinerary by ID"""
    itinerary = db.query(ItineraryModel).options(
        joinedload(ItineraryModel.owner),
        joinedload(ItineraryModel.collaborators),
        joinedload(ItineraryModel.activities)
    ).filter(ItineraryModel.id == itinerary_id).first()
    
    if not itinerary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Itinerary not found"
        )
    
    # Check if user has access (owner or collaborator)
    if itinerary.owner_id != current_user.id and not itinerary.is_public:
        # Check if user is a collaborator
        is_collaborator = any(
            collab.user_id == current_user.id 
            for collab in itinerary.collaborators
        )
        if not is_collaborator:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this itinerary"
            )
    
    return itinerary


@router.put("/{itinerary_id}", response_model=Itinerary)
async def update_itinerary(
    itinerary_id: str,
    itinerary_update: ItineraryUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    """Update itinerary"""
    itinerary = db.query(ItineraryModel).filter(ItineraryModel.id == itinerary_id).first()
    
    if not itinerary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Itinerary not found"
        )
    
    if itinerary.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this itinerary"
        )
    
    update_data = itinerary_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(itinerary, field, value)
    
    db.commit()
    db.refresh(itinerary)
    
    # Load relationships for response
    itinerary = db.query(ItineraryModel).options(
        joinedload(ItineraryModel.owner),
        joinedload(ItineraryModel.collaborators)
    ).filter(ItineraryModel.id == itinerary_id).first()
    
    return itinerary


@router.delete("/{itinerary_id}")
async def delete_itinerary(
    itinerary_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    """Delete itinerary"""
    itinerary = db.query(ItineraryModel).filter(ItineraryModel.id == itinerary_id).first()
    
    if not itinerary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Itinerary not found"
        )
    
    if itinerary.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this itinerary"
        )
    
    db.delete(itinerary)
    db.commit()
    
    return {"message": "Itinerary deleted successfully"}


# Activity endpoints
@router.get("/{itinerary_id}/activities", response_model=List[Activity])
async def get_itinerary_activities(
    itinerary_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    """Get activities for an itinerary"""
    # First check if user has access to itinerary
    itinerary = db.query(ItineraryModel).filter(ItineraryModel.id == itinerary_id).first()
    if not itinerary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Itinerary not found"
        )
    
    activities = db.query(ActivityModel).filter(
        ActivityModel.itinerary_id == itinerary_id
    ).order_by(ActivityModel.start_time).all()
    
    return activities


@router.post("/{itinerary_id}/activities", response_model=Activity, status_code=status.HTTP_201_CREATED)
async def create_activity(
    itinerary_id: str,
    activity_data: ActivityCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    """Create a new activity in an itinerary"""
    # Check if itinerary exists and user has access
    itinerary = db.query(ItineraryModel).filter(ItineraryModel.id == itinerary_id).first()
    if not itinerary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Itinerary not found"
        )
    
    activity_dict = activity_data.dict()
    activity_dict["itinerary_id"] = itinerary_id
    
    db_activity = ActivityModel(**activity_dict)
    
    db.add(db_activity)
    db.commit()
    db.refresh(db_activity)
    
    return db_activity


@router.put("/{itinerary_id}/activities/{activity_id}", response_model=Activity)
async def update_activity(
    itinerary_id: str,
    activity_id: str,
    activity_update: ActivityUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    """Update an activity"""
    activity = db.query(ActivityModel).filter(
        ActivityModel.id == activity_id,
        ActivityModel.itinerary_id == itinerary_id
    ).first()
    
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found"
        )
    
    update_data = activity_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(activity, field, value)
    
    db.commit()
    db.refresh(activity)
    
    return activity


@router.delete("/{itinerary_id}/activities/{activity_id}")
async def delete_activity(
    itinerary_id: str,
    activity_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    """Delete an activity"""
    activity = db.query(ActivityModel).filter(
        ActivityModel.id == activity_id,
        ActivityModel.itinerary_id == itinerary_id
    ).first()
    
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found"
        )
    
    db.delete(activity)
    db.commit()
    
    return {"message": "Activity deleted successfully"}
