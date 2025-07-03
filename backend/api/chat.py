from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import openai
from datetime import datetime, timedelta
import json

from database import get_db, get_mongodb
from models import User as UserModel, Itinerary as ItineraryModel
from schemas import ChatMessage, ChatResponse, ItineraryGenerationRequest
from api.auth import get_current_active_user
from config import settings

router = APIRouter()

# Initialize OpenAI client
openai.api_key = settings.openai_api_key


class AIService:
    """AI service for chat and itinerary generation"""
    
    @staticmethod
    async def generate_chat_response(message: str, context: Dict = None, user_preferences: Dict = None) -> Dict[str, Any]:
        """Generate AI chat response"""
        try:
            # Build system prompt based on context
            system_prompt = """You are BARABULA, an AI travel companion. You help users plan trips, provide travel recommendations, 
            and assist with travel-related questions. Be helpful, friendly, and provide practical travel advice. 
            
            If users ask about specific destinations, provide information about:
            - Best time to visit
            - Popular attractions
            - Local cuisine recommendations
            - Transportation options
            - Cultural tips
            - Budget considerations
            
            Keep responses concise but informative."""
            
            if user_preferences:
                system_prompt += f"\n\nUser preferences: {json.dumps(user_preferences)}"
            
            if context:
                system_prompt += f"\n\nCurrent context: {json.dumps(context)}"
            
            response = await openai.ChatCompletion.acreate(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message}
                ],
                max_tokens=500,
                temperature=0.7
            )
            
            ai_response = response.choices[0].message.content
            
            # Generate suggestions based on the conversation
            suggestions = []
            if "destination" in message.lower() or "where" in message.lower():
                suggestions = [
                    "Tell me about popular attractions",
                    "What's the best time to visit?",
                    "Help me plan an itinerary",
                    "What's the local cuisine like?"
                ]
            elif "itinerary" in message.lower() or "plan" in message.lower():
                suggestions = [
                    "Generate a 3-day itinerary",
                    "Add restaurant recommendations",
                    "Include cultural activities",
                    "Suggest nearby attractions"
                ]
            
            return {
                "response": ai_response,
                "suggestions": suggestions,
                "context": context or {}
            }
            
        except Exception as e:
            print(f"Error generating AI response: {e}")
            return {
                "response": "I'm sorry, I'm having trouble processing your request right now. Please try again later.",
                "suggestions": [],
                "context": {}
            }
    
    @staticmethod
    async def generate_itinerary(request: ItineraryGenerationRequest, user_preferences: Dict = None) -> Dict[str, Any]:
        """Generate AI-powered itinerary"""
        try:
            # Calculate trip duration
            duration = (request.end_date - request.start_date).days
            
            # Build prompt for itinerary generation
            prompt = f"""Create a detailed {duration}-day travel itinerary for {request.destination}.
            
            Trip Details:
            - Destination: {request.destination}
            - Start Date: {request.start_date.strftime('%Y-%m-%d')}
            - End Date: {request.end_date.strftime('%Y-%m-%d')}
            - Duration: {duration} days
            - Group Size: {request.group_size}
            - Travel Style: {request.travel_style}
            - Budget: {request.budget if request.budget else 'Not specified'}
            - Interests: {', '.join(request.interests) if request.interests else 'General tourism'}
            
            {f'Special Requirements: {request.special_requirements}' if request.special_requirements else ''}
            
            Please provide a JSON response with the following structure:
            {{
                "title": "Trip title",
                "description": "Brief description",
                "daily_activities": [
                    {{
                        "day": 1,
                        "date": "YYYY-MM-DD",
                        "activities": [
                            {{
                                "title": "Activity name",
                                "description": "Activity description",
                                "category": "attraction|restaurant|transport|accommodation",
                                "start_time": "HH:MM",
                                "duration_minutes": 120,
                                "estimated_cost": 50,
                                "location": {{
                                    "address": "Full address",
                                    "latitude": 0.0,
                                    "longitude": 0.0
                                }},
                                "notes": "Additional tips or notes"
                            }}
                        ]
                    }}
                ],
                "estimated_total_cost": 1000,
                "recommendations": [
                    "General travel tip 1",
                    "General travel tip 2"
                ]
            }}
            
            Make sure activities are realistic and well-timed throughout each day."""
            
            response = await openai.ChatCompletion.acreate(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a professional travel planner. Generate practical, detailed itineraries in the exact JSON format requested."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=2000,
                temperature=0.3
            )
            
            # Parse the AI response
            ai_content = response.choices[0].message.content
            
            # Try to extract JSON from the response
            try:
                # Find JSON in the response
                start_idx = ai_content.find('{')
                end_idx = ai_content.rfind('}') + 1
                json_str = ai_content[start_idx:end_idx]
                
                itinerary_data = json.loads(json_str)
                return itinerary_data
                
            except json.JSONDecodeError:
                # Fallback if JSON parsing fails
                return {
                    "title": f"{duration}-day trip to {request.destination}",
                    "description": "AI-generated itinerary",
                    "daily_activities": [],
                    "estimated_total_cost": request.budget or 0,
                    "recommendations": ["Please try generating the itinerary again for detailed activities."],
                    "raw_response": ai_content
                }
                
        except Exception as e:
            print(f"Error generating itinerary: {e}")
            return {
                "title": f"Trip to {request.destination}",
                "description": "Basic itinerary template",
                "daily_activities": [],
                "estimated_total_cost": 0,
                "recommendations": ["Error generating detailed itinerary. Please try again."],
                "error": str(e)
            }


@router.post("/message", response_model=ChatResponse)
async def send_chat_message(
    message_data: ChatMessage,
    current_user: UserModel = Depends(get_current_active_user)
):
    """Send a message to the AI travel assistant"""
    response_data = await AIService.generate_chat_response(
        message_data.message,
        message_data.context,
        current_user.preferences
    )
    
    # Store chat history in MongoDB
    mongodb = await get_mongodb()
    chat_record = {
        "user_id": current_user.id,
        "message": message_data.message,
        "response": response_data["response"],
        "context": message_data.context,
        "timestamp": datetime.utcnow(),
        "suggestions": response_data["suggestions"]
    }
    
    try:
        await mongodb.chat_history.insert_one(chat_record)
    except Exception as e:
        print(f"Error storing chat history: {e}")
    
    return ChatResponse(**response_data)


@router.get("/history")
async def get_chat_history(
    limit: int = 50,
    current_user: UserModel = Depends(get_current_active_user)
):
    """Get user's chat history"""
    mongodb = await get_mongodb()
    
    try:
        cursor = mongodb.chat_history.find(
            {"user_id": current_user.id}
        ).sort("timestamp", -1).limit(limit)
        
        history = []
        async for record in cursor:
            # Convert ObjectId to string
            record["_id"] = str(record["_id"])
            history.append(record)
        
        return {"history": history}
    
    except Exception as e:
        print(f"Error retrieving chat history: {e}")
        return {"history": []}


@router.post("/generate-itinerary")
async def generate_ai_itinerary(
    request: ItineraryGenerationRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    """Generate an AI-powered itinerary"""
    # Generate itinerary using AI
    itinerary_data = await AIService.generate_itinerary(request, current_user.preferences)
    
    # Create itinerary in database
    db_itinerary = ItineraryModel(
        title=itinerary_data.get("title", f"AI Trip to {request.destination}"),
        description=itinerary_data.get("description", "AI-generated travel itinerary"),
        destination=request.destination,
        start_date=request.start_date,
        end_date=request.end_date,
        budget=request.budget,
        status="draft",
        ai_generated=True,
        metadata={
            "ai_generated_data": itinerary_data,
            "generation_request": request.dict(),
            "estimated_cost": itinerary_data.get("estimated_total_cost", 0)
        },
        owner_id=current_user.id
    )
    
    db.add(db_itinerary)
    db.commit()
    db.refresh(db_itinerary)
    
    return {
        "itinerary": db_itinerary,
        "ai_data": itinerary_data,
        "message": "Itinerary generated successfully! You can now view and customize it."
    }


@router.post("/translate")
async def translate_text(
    text: str,
    target_language: str = "en",
    current_user: UserModel = Depends(get_current_active_user)
):
    """Translate text to target language"""
    try:
        response = await openai.ChatCompletion.acreate(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system", 
                    "content": f"You are a professional translator. Translate the following text to {target_language}. Only return the translated text, nothing else."
                },
                {"role": "user", "content": text}
            ],
            max_tokens=200,
            temperature=0.1
        )
        
        translated_text = response.choices[0].message.content.strip()
        
        return {
            "original_text": text,
            "translated_text": translated_text,
            "target_language": target_language
        }
        
    except Exception as e:
        print(f"Error translating text: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Translation service temporarily unavailable"
        )


@router.get("/suggestions")
async def get_conversation_suggestions(
    context: str = "general",
    current_user: UserModel = Depends(get_current_active_user)
):
    """Get conversation suggestions based on context"""
    suggestions_map = {
        "general": [
            "Help me plan a trip to Paris",
            "What are the best travel destinations for summer?",
            "I need budget travel tips",
            "Suggest activities for a weekend getaway"
        ],
        "planning": [
            "Generate a 5-day itinerary",
            "Find restaurants near my hotel",
            "What's the weather like in my destination?",
            "Help me book activities"
        ],
        "destination": [
            "Tell me about local customs",
            "What's the best time to visit?",
            "Recommend must-see attractions",
            "Help me understand the local transportation"
        ]
    }
    
    return {
        "suggestions": suggestions_map.get(context, suggestions_map["general"]),
        "context": context
    }
