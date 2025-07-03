from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import googlemaps
import httpx
from datetime import datetime

from database import get_db
from models import User as UserModel
from schemas import Location
from api.auth import get_current_active_user
from config import settings

router = APIRouter()

# Initialize Google Maps client
gmaps = googlemaps.Client(key=settings.google_maps_api_key)


class RecommendationService:
    """Service for generating recommendations"""
    
    @staticmethod
    async def get_weather_info(lat: float, lng: float) -> Dict[str, Any]:
        """Get weather information for a location"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://api.openweathermap.org/data/2.5/weather",
                    params={
                        "lat": lat,
                        "lon": lng,
                        "appid": settings.openweather_api_key,
                        "units": "metric"
                    }
                )
                if response.status_code == 200:
                    return response.json()
                return {}
        except Exception:
            return {}
    
    @staticmethod
    def get_nearby_places(lat: float, lng: float, place_type: str = "tourist_attraction", radius: int = 5000) -> List[Dict]:
        """Get nearby places using Google Places API"""
        try:
            places_result = gmaps.places_nearby(
                location=(lat, lng),
                radius=radius,
                type=place_type
            )
            
            places = []
            for place in places_result.get('results', [])[:10]:  # Limit to 10 results
                place_details = {
                    "place_id": place.get("place_id"),
                    "name": place.get("name"),
                    "rating": place.get("rating"),
                    "price_level": place.get("price_level"),
                    "types": place.get("types", []),
                    "vicinity": place.get("vicinity"),
                    "geometry": place.get("geometry", {}).get("location", {}),
                    "photos": [photo.get("photo_reference") for photo in place.get("photos", [])[:3]]
                }
                places.append(place_details)
            
            return places
        except Exception as e:
            print(f"Error getting nearby places: {e}")
            return []
    
    @staticmethod
    async def get_place_details(place_id: str) -> Dict[str, Any]:
        """Get detailed information about a place"""
        try:
            place_details = gmaps.place(
                place_id=place_id,
                fields=[
                    "name", "formatted_address", "international_phone_number",
                    "website", "rating", "reviews", "opening_hours", "price_level",
                    "photos", "geometry", "types"
                ]
            )
            return place_details.get("result", {})
        except Exception as e:
            print(f"Error getting place details: {e}")
            return {}


@router.get("/places/nearby")
async def get_nearby_recommendations(
    lat: float,
    lng: float,
    place_type: str = "tourist_attraction",
    radius: int = 5000,
    current_user: UserModel = Depends(get_current_active_user)
):
    """Get nearby place recommendations"""
    places = RecommendationService.get_nearby_places(lat, lng, place_type, radius)
    weather = await RecommendationService.get_weather_info(lat, lng)
    
    return {
        "places": places,
        "weather": weather,
        "location": {"lat": lat, "lng": lng},
        "search_params": {
            "type": place_type,
            "radius": radius
        }
    }


@router.get("/places/{place_id}")
async def get_place_details(
    place_id: str,
    current_user: UserModel = Depends(get_current_active_user)
):
    """Get detailed information about a specific place"""
    place_details = await RecommendationService.get_place_details(place_id)
    
    if not place_details:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Place not found"
        )
    
    return place_details


@router.get("/restaurants")
async def get_restaurant_recommendations(
    lat: float,
    lng: float,
    cuisine: str = None,
    price_level: int = None,
    radius: int = 2000,
    current_user: UserModel = Depends(get_current_active_user)
):
    """Get restaurant recommendations"""
    # Base search for restaurants
    restaurants = RecommendationService.get_nearby_places(lat, lng, "restaurant", radius)
    
    # Filter by cuisine or price level if specified
    if cuisine:
        restaurants = [
            r for r in restaurants 
            if cuisine.lower() in " ".join(r.get("types", [])).lower()
        ]
    
    if price_level is not None:
        restaurants = [
            r for r in restaurants 
            if r.get("price_level") == price_level
        ]
    
    return {
        "restaurants": restaurants,
        "filters": {
            "cuisine": cuisine,
            "price_level": price_level,
            "radius": radius
        }
    }


@router.get("/activities")
async def get_activity_recommendations(
    lat: float,
    lng: float,
    activity_type: str = "tourist_attraction",
    current_user: UserModel = Depends(get_current_active_user)
):
    """Get activity recommendations based on type"""
    activity_types = {
        "attractions": "tourist_attraction",
        "museums": "museum",
        "parks": "park",
        "shopping": "shopping_mall",
        "entertainment": "amusement_park",
        "nightlife": "night_club",
        "spa": "spa"
    }
    
    google_type = activity_types.get(activity_type, activity_type)
    activities = RecommendationService.get_nearby_places(lat, lng, google_type)
    
    return {
        "activities": activities,
        "activity_type": activity_type,
        "location": {"lat": lat, "lng": lng}
    }


@router.get("/weather")
async def get_weather_forecast(
    lat: float,
    lng: float,
    current_user: UserModel = Depends(get_current_active_user)
):
    """Get weather information for a location"""
    weather = await RecommendationService.get_weather_info(lat, lng)
    
    if not weather:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Weather information not available"
        )
    
    return weather


@router.post("/personalized")
async def get_personalized_recommendations(
    location: Location,
    interests: List[str] = [],
    budget: str = "medium",  # low, medium, high
    current_user: UserModel = Depends(get_current_active_user)
):
    """Get personalized recommendations based on user preferences"""
    lat, lng = location.latitude, location.longitude
    
    # Map interests to Google Places types
    interest_mapping = {
        "culture": ["museum", "art_gallery", "church"],
        "food": ["restaurant", "cafe", "bakery"],
        "shopping": ["shopping_mall", "store"],
        "nature": ["park", "zoo"],
        "adventure": ["amusement_park", "tourist_attraction"],
        "nightlife": ["night_club", "bar"],
        "history": ["museum", "church", "tourist_attraction"],
        "art": ["art_gallery", "museum"],
        "sports": ["stadium", "gym"]
    }
    
    # Budget mapping for price levels
    budget_mapping = {
        "low": [0, 1],
        "medium": [1, 2],
        "high": [2, 3, 4]
    }
    
    recommendations = []
    
    # Get recommendations for each interest
    for interest in interests:
        place_types = interest_mapping.get(interest.lower(), ["tourist_attraction"])
        for place_type in place_types[:1]:  # Limit to avoid too many API calls
            places = RecommendationService.get_nearby_places(lat, lng, place_type)
            
            # Filter by budget if price level is available
            if budget in budget_mapping:
                allowed_prices = budget_mapping[budget]
                places = [
                    p for p in places 
                    if p.get("price_level") is None or p.get("price_level") in allowed_prices
                ]
            
            recommendations.extend(places[:5])  # Limit per category
    
    # Remove duplicates and sort by rating
    unique_recommendations = []
    seen_place_ids = set()
    
    for rec in recommendations:
        if rec["place_id"] not in seen_place_ids:
            unique_recommendations.append(rec)
            seen_place_ids.add(rec["place_id"])
    
    # Sort by rating (descending)
    unique_recommendations.sort(key=lambda x: x.get("rating", 0), reverse=True)
    
    return {
        "recommendations": unique_recommendations[:20],  # Top 20 recommendations
        "parameters": {
            "interests": interests,
            "budget": budget,
            "location": location.dict()
        },
        "user_preferences": current_user.preferences
    }
