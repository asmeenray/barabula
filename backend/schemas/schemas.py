from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, List
from datetime import datetime


# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    full_name: str = Field(..., min_length=1, max_length=100)
    avatar_url: Optional[str] = None
    preferences: Dict = {}
    language: str = "en"
    timezone: str = "UTC"


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    preferences: Optional[Dict] = None
    language: Optional[str] = None
    timezone: Optional[str] = None


class UserInDB(UserBase):
    id: str
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class User(UserInDB):
    pass


# Authentication Schemas
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: Optional[str] = None


class UserLogin(BaseModel):
    username: str  # Can be username or email
    password: str


# Location Schema
class Location(BaseModel):
    address: str
    latitude: float
    longitude: float
    place_id: Optional[str] = None


# Itinerary Schemas
class ItineraryBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    destination: str = Field(..., min_length=1, max_length=100)
    start_date: datetime
    end_date: datetime
    budget: Optional[float] = None
    currency: str = "USD"
    is_public: bool = False


class ItineraryCreate(ItineraryBase):
    pass


class ItineraryUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    destination: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    budget: Optional[float] = None
    currency: Optional[str] = None
    status: Optional[str] = None
    is_public: Optional[bool] = None


class ItineraryInDB(ItineraryBase):
    id: str
    status: str
    ai_generated: bool
    metadata: Dict
    owner_id: str
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class Itinerary(ItineraryInDB):
    owner: User
    collaborators: List["ItineraryCollaborator"] = []


# Activity Schemas
class ActivityBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    category: str
    location: Optional[Location] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    cost: Optional[float] = None
    currency: str = "USD"
    booking_info: Dict = {}
    notes: Optional[str] = None
    priority: int = Field(default=1, ge=1, le=3)


class ActivityCreate(ActivityBase):
    itinerary_id: str


class ActivityUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    location: Optional[Location] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    cost: Optional[float] = None
    currency: Optional[str] = None
    booking_info: Optional[Dict] = None
    notes: Optional[str] = None
    priority: Optional[int] = None
    is_booked: Optional[bool] = None


class ActivityInDB(ActivityBase):
    id: str
    itinerary_id: str
    is_booked: bool
    metadata: Dict
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class Activity(ActivityInDB):
    pass


# Collaborator Schemas
class CollaboratorBase(BaseModel):
    user_id: str
    role: str = "viewer"
    permissions: Dict = {}


class CollaboratorCreate(CollaboratorBase):
    itinerary_id: str


class CollaboratorUpdate(BaseModel):
    role: Optional[str] = None
    permissions: Optional[Dict] = None


class ItineraryCollaborator(CollaboratorBase):
    id: str
    itinerary_id: str
    invited_at: datetime
    joined_at: Optional[datetime]
    user: User

    class Config:
        from_attributes = True


# AI/Chat Schemas
class ChatMessage(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    context: Optional[Dict] = {}


class ChatResponse(BaseModel):
    response: str
    suggestions: Optional[List[str]] = []
    context: Optional[Dict] = {}


class ItineraryGenerationRequest(BaseModel):
    destination: str
    start_date: datetime
    end_date: datetime
    budget: Optional[float] = None
    interests: List[str] = []
    travel_style: str = "balanced"  # budget, mid-range, luxury, balanced
    group_size: int = 1
    special_requirements: Optional[str] = None


# Update forward references
Itinerary.model_rebuild()
