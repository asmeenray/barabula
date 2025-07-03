from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, JSON, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import uuid


class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    preferences = Column(JSON, default={})
    language = Column(String, default="en")
    timezone = Column(String, default="UTC")
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    itineraries = relationship("Itinerary", back_populates="owner")
    collaborations = relationship("ItineraryCollaborator", back_populates="user")


class Itinerary(Base):
    __tablename__ = "itineraries"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    description = Column(Text)
    destination = Column(String, nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    budget = Column(Float, nullable=True)
    currency = Column(String, default="USD")
    status = Column(String, default="draft")  # draft, active, completed, cancelled
    is_public = Column(Boolean, default=False)
    ai_generated = Column(Boolean, default=False)
    metadata = Column(JSON, default={})
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    owner = relationship("User", back_populates="itineraries")
    collaborators = relationship("ItineraryCollaborator", back_populates="itinerary")
    activities = relationship("Activity", back_populates="itinerary")


class ItineraryCollaborator(Base):
    __tablename__ = "itinerary_collaborators"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    itinerary_id = Column(String, ForeignKey("itineraries.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    role = Column(String, default="viewer")  # owner, editor, viewer
    permissions = Column(JSON, default={})
    invited_at = Column(DateTime(timezone=True), server_default=func.now())
    joined_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    itinerary = relationship("Itinerary", back_populates="collaborators")
    user = relationship("User", back_populates="collaborations")


class Activity(Base):
    __tablename__ = "activities"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    itinerary_id = Column(String, ForeignKey("itineraries.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    category = Column(String, nullable=False)  # accommodation, transport, attraction, restaurant, etc.
    location = Column(JSON)  # {address, lat, lng, place_id}
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    cost = Column(Float, nullable=True)
    currency = Column(String, default="USD")
    booking_info = Column(JSON, default={})
    notes = Column(Text)
    priority = Column(Integer, default=1)  # 1=high, 2=medium, 3=low
    is_booked = Column(Boolean, default=False)
    metadata = Column(JSON, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    itinerary = relationship("Itinerary", back_populates="activities")
