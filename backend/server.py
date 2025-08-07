from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Header, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import json
import hmac
import hashlib
import httpx
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(
    title="CRM Omnichannel Platform",
    description="CRM with WhatsApp, Messenger, and AI-powered automation",
    version="2.0.0"
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ============================================================================
# EXISTING CRM MODELS
# ============================================================================

class Card(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = ""
    contact_name: Optional[str] = ""
    contact_email: Optional[str] = ""
    contact_phone: Optional[str] = ""
    estimated_value: Optional[float] = 0.0
    priority: str = "medium"  # low, medium, high
    assigned_to: Optional[str] = ""
    tags: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    due_date: Optional[datetime] = None
    column_id: str
    position: int = 0
    # NEW: Communication tracking
    last_contact: Optional[datetime] = None
    communication_count: int = 0
    preferred_channel: Optional[str] = None  # whatsapp, messenger, email
    external_ids: Dict[str, str] = {}  # Store platform-specific IDs

class CardCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    contact_name: Optional[str] = ""
    contact_email: Optional[str] = ""
    contact_phone: Optional[str] = ""
    estimated_value: Optional[float] = 0.0
    priority: str = "medium"
    assigned_to: Optional[str] = ""
    tags: List[str] = []
    due_date: Optional[datetime] = None
    column_id: str

class CardUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    estimated_value: Optional[float] = None
    priority: Optional[str] = None
    assigned_to: Optional[str] = None
    tags: Optional[List[str]] = None
    due_date: Optional[datetime] = None
    column_id: Optional[str] = None
    position: Optional[int] = None

class Column(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    color: str = "#3B82F6"
    position: int = 0
    board_id: str

class Board(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    owner: str = "default_user"

class MoveCardRequest(BaseModel):
    card_id: str
    destination_column_id: str
    position: int

# ============================================================================
# NEW OMNICHANNEL MODELS
# ============================================================================

class MessageChannel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # whatsapp, messenger, email, instagram
    display_name: str
    is_active: bool = True
    configuration: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Contact(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    platform_ids: Dict[str, str] = {}  # {platform: external_id}
    first_seen: datetime = Field(default_factory=datetime.utcnow)
    last_seen: datetime = Field(default_factory=datetime.utcnow)
    profile_data: Dict[str, Any] = {}
    card_id: Optional[str] = None  # Link to CRM card

class Communication(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    contact_id: str
    card_id: Optional[str] = None
    channel: str  # whatsapp, messenger, email
    direction: str  # incoming, outgoing
    content: str
    intent: Optional[str] = None  # Detected intent
    intent_confidence: Optional[float] = None
    automated_response: bool = False
    platform_message_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = {}

class Intent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # interested_product, support_request, price_inquiry, etc
    description: str
    keywords: List[str] = []
    confidence_threshold: float = 0.7
    automated_response_template: Optional[str] = None
    target_column_id: Optional[str] = None  # Auto-move leads to this column
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AutomationRule(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    intent: str
    conditions: Dict[str, Any] = {}
    actions: List[Dict[str, Any]] = []  # move_to_column, send_message, etc
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

# ============================================================================
# PLATFORM CONFIGURATION MODELS  
# ============================================================================

class PlatformConfig(BaseModel):
    platform: str
    is_configured: bool = False
    is_active: bool = False
    config_data: Dict[str, Any] = {}
    last_updated: datetime = Field(default_factory=datetime.utcnow)

class WhatsAppConfig(BaseModel):
    qr_code: Optional[str] = None
    is_connected: bool = False
    phone_number: Optional[str] = None
    
class MessengerConfig(BaseModel):
    page_access_token: Optional[str] = None
    verify_token: Optional[str] = None
    app_secret: Optional[str] = None
    is_verified: bool = False
    page_name: Optional[str] = None

# Webhook Models
class IncomingMessage(BaseModel):
    platform: str
    sender_id: str
    message: str
    message_id: str
    timestamp: int
    metadata: Optional[Dict[str, Any]] = {}

class OutgoingMessage(BaseModel):
    platform: str
    recipient_id: str
    message: str
    automated: bool = False

# ============================================================================
# AI INTEGRATION SETUP
# ============================================================================

try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    AI_AVAILABLE = True
except ImportError:
    AI_AVAILABLE = False
    print("AI integration not available. Install emergentintegrations package.")

# Global AI chat instance (will be recreated for each session)
ai_chat = None

async def get_ai_chat(session_id: str = "default"):
    """Get or create AI chat instance for intent analysis"""
    global ai_chat
    
    if not AI_AVAILABLE:
        return None
        
    gemini_api_key = os.environ.get('GEMINI_API_KEY')
    if not gemini_api_key:
        return None
        
    # Create new instance for this session
    chat = LlmChat(
        api_key=gemini_api_key,
        session_id=session_id,
        system_message="""You are an AI assistant specialized in analyzing customer messages for a CRM system.

Your task is to analyze incoming messages and determine the customer's intent. You should respond with a JSON object containing:
- intent: The primary intent (interested_product, support_request, price_inquiry, complaint, general_question, appointment_request, purchase_ready)
- confidence: Confidence score between 0.0 and 1.0
- summary: Brief summary of the message
- suggested_response: A professional response appropriate for the intent
- urgency: low, medium, high
- next_action: Suggested next action (call_customer, send_info, schedule_meeting, create_quote, resolve_issue)

Example response:
{
  "intent": "interested_product",
  "confidence": 0.85,
  "summary": "Customer asking about product pricing and availability",
  "suggested_response": "Thank you for your interest! I'd be happy to provide you with detailed pricing information and check availability. Could you please tell me which specific product you're interested in?",
  "urgency": "medium", 
  "next_action": "send_info"
}"""
    )
    
    # Configure to use Gemini 2.0 Flash
    chat.with_model("gemini", "gemini-2.0-flash")
    chat.with_max_tokens(1024)
    
    return chat

# ============================================================================
# EXISTING CRM ENDPOINTS (Keep all existing functionality)
# ============================================================================

@api_router.post("/boards", response_model=Board)
async def create_board(board_data: dict):
    board = Board(
        title=board_data.get("title", "My CRM Board"),
        description=board_data.get("description", "")
    )
    
    # Insert board
    await db.boards.insert_one(board.dict())
    
    # Create default columns
    default_columns = [
        {"title": "Prospects 🎯", "color": "#EF4444", "position": 0},
        {"title": "Contact Made 📞", "color": "#F59E0B", "position": 1},
        {"title": "Proposal Sent 📄", "color": "#3B82F6", "position": 2},
        {"title": "Closed Won 🎉", "color": "#10B981", "position": 3}
    ]
    
    for col_data in default_columns:
        column = Column(
            title=col_data["title"],
            color=col_data["color"],
            position=col_data["position"],
            board_id=board.id
        )
        await db.columns.insert_one(column.dict())
    
    return board

@api_router.get("/boards", response_model=List[Board])
async def get_boards():
    boards = await db.boards.find().to_list(1000)
    return [Board(**board) for board in boards]

@api_router.get("/boards/{board_id}/columns", response_model=List[Column])
async def get_board_columns(board_id: str):
    columns = await db.columns.find({"board_id": board_id}).sort("position").to_list(1000)
    return [Column(**column) for column in columns]

# Card Management with enhanced communication tracking
@api_router.post("/cards", response_model=Card)
async def create_card(card_data: CardCreate):
    # Get the current maximum position in the column
    existing_cards = await db.cards.find({"column_id": card_data.column_id}).sort("position", -1).limit(1).to_list(1)
    next_position = existing_cards[0]["position"] + 1 if existing_cards else 0
    
    card = Card(**card_data.dict(), position=next_position)
    await db.cards.insert_one(card.dict())
    return card

@api_router.get("/cards", response_model=List[Card])
async def get_cards(column_id: Optional[str] = None):
    query = {"column_id": column_id} if column_id else {}
    cards = await db.cards.find(query).sort("position").to_list(1000)
    return [Card(**card) for card in cards]

@api_router.put("/cards/{card_id}", response_model=Card)
async def update_card(card_id: str, card_update: CardUpdate):
    update_data = {k: v for k, v in card_update.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    result = await db.cards.update_one(
        {"id": card_id}, 
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Card not found")
    
    updated_card = await db.cards.find_one({"id": card_id})
    return Card(**updated_card)

@api_router.delete("/cards/{card_id}")
async def delete_card(card_id: str):
    result = await db.cards.delete_one({"id": card_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Card not found")
    return {"message": "Card deleted successfully"}

@api_router.post("/cards/move")
async def move_card(move_request: MoveCardRequest):
    card = await db.cards.find_one({"id": move_request.card_id})
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    # Update card's column and position
    await db.cards.update_one(
        {"id": move_request.card_id},
        {"$set": {
            "column_id": move_request.destination_column_id,
            "position": move_request.position
        }}
    )
    
    # Reorder other cards in the destination column
    await db.cards.update_many(
        {
            "column_id": move_request.destination_column_id,
            "id": {"$ne": move_request.card_id},
            "position": {"$gte": move_request.position}
        },
        {"$inc": {"position": 1}}
    )
    
    return {"message": "Card moved successfully"}

# Analytics endpoints (enhanced with communication data)
@api_router.get("/analytics/pipeline")
async def get_pipeline_analytics():
    # Get all columns and cards
    columns_data = await db.columns.find().to_list(1000)
    cards_data = await db.cards.find().to_list(1000)
    
    # Get communication stats
    communications_count = await db.communications.count_documents({})
    active_conversations = await db.communications.distinct("contact_id", {
        "timestamp": {"$gte": datetime.utcnow() - timedelta(days=7)}
    })
    
    # Convert to Pydantic models to ensure proper serialization
    columns = [Column(**col) for col in columns_data]
    cards = [Card(**card) for card in cards_data]
    
    # Calculate analytics
    column_stats = {}
    total_value = 0
    
    for column in columns:
        column_cards = [c for c in cards if c.column_id == column.id]
        column_value = sum(c.estimated_value for c in column_cards)
        column_stats[column.id] = {
            "title": column.title,
            "count": len(column_cards),
            "total_value": column_value
        }
        total_value += column_value
    
    return {
        "column_stats": column_stats,
        "total_cards": len(cards),
        "total_pipeline_value": total_value,
        "columns": [col.dict() for col in columns],
        "communication_stats": {
            "total_messages": communications_count,
            "active_conversations": len(active_conversations)
        }
    }

# Initialize default board if none exists
@api_router.post("/initialize")
async def initialize_default_data():
    # Check if any boards exist
    existing_boards = await db.boards.find().limit(1).to_list(1)
    
    if not existing_boards:
        # Create default board
        board = Board(title="Sales Pipeline", description="Main sales CRM board")
        await db.boards.insert_one(board.dict())
        
        # Create default columns
        default_columns = [
            {"title": "Prospects 🎯", "color": "#EF4444", "position": 0},
            {"title": "Contact Made 📞", "color": "#F59E0B", "position": 1},
            {"title": "Proposal Sent 📄", "color": "#3B82F6", "position": 2},
            {"title": "Closed Won 🎉", "color": "#10B981", "position": 3}
        ]
        
        column_ids = []
        for col_data in default_columns:
            column = Column(
                title=col_data["title"],
                color=col_data["color"],
                position=col_data["position"],
                board_id=board.id
            )
            await db.columns.insert_one(column.dict())
            column_ids.append(column.id)
        
        # Create default intents
        default_intents = [
            {
                "name": "interested_product",
                "description": "Customer showing interest in products/services",
                "keywords": ["interested", "product", "service", "buy", "purchase"],
                "automated_response_template": "Thank you for your interest! I'd be happy to help you learn more about our products. What specific information are you looking for?",
                "target_column_id": column_ids[1]  # Contact Made
            },
            {
                "name": "price_inquiry", 
                "description": "Customer asking about pricing",
                "keywords": ["price", "cost", "how much", "pricing", "expensive"],
                "automated_response_template": "I'd be happy to provide pricing information. Let me get you our current rates and any available promotions.",
                "target_column_id": column_ids[1]  # Contact Made
            },
            {
                "name": "support_request",
                "description": "Customer needs help or support",
                "keywords": ["help", "support", "problem", "issue", "broken"],
                "automated_response_template": "I'm here to help! Can you please describe the issue you're experiencing so I can assist you better?",
                "target_column_id": column_ids[0]  # Prospects
            }
        ]
        
        for intent_data in default_intents:
            intent = Intent(**intent_data)
            await db.intents.insert_one(intent.dict())
        
        # Create sample cards
        sample_cards = [
            {
                "title": "Acme Corp - Enterprise Deal",
                "description": "Large enterprise client interested in our premium package",
                "contact_name": "John Smith",
                "contact_email": "john@acmecorp.com",
                "contact_phone": "+1 (555) 123-4567",
                "estimated_value": 25000,
                "priority": "high",
                "column_id": column_ids[0],
                "position": 0
            }
        ]
        
        for card_data in sample_cards:
            card = Card(**card_data)
            await db.cards.insert_one(card.dict())
        
        return {"message": "Default data initialized successfully", "board_id": board.id}
    
    return {"message": "Data already exists"}

# ============================================================================
# NEW OMNICHANNEL ENDPOINTS
# ============================================================================

# Platform Configuration Endpoints
@api_router.get("/platforms/status")
async def get_platforms_status():
    """Get status of all integrated platforms"""
    platforms = ["whatsapp", "messenger"]
    status = {}
    
    for platform in platforms:
        platform_config = await db.platform_configs.find_one({"platform": platform})
        if platform_config:
            status[platform] = {
                "configured": platform_config.get("is_configured", False),
                "active": platform_config.get("is_active", False),
                "last_updated": platform_config.get("last_updated")
            }
        else:
            status[platform] = {
                "configured": False,
                "active": False,
                "last_updated": None
            }
    
    return status

# WhatsApp Integration Endpoints (will be expanded with Node.js service)
@api_router.get("/whatsapp/qr")
async def get_whatsapp_qr():
    """Get WhatsApp QR code for authentication"""
    # This will be implemented with the Node.js WhatsApp service
    return {"qr": None, "connected": False}

@api_router.get("/whatsapp/status")
async def get_whatsapp_status():
    """Get WhatsApp connection status"""
    config = await db.platform_configs.find_one({"platform": "whatsapp"})
    return {
        "connected": config.get("is_active", False) if config else False,
        "phone_number": config.get("config_data", {}).get("phone_number") if config else None
    }

# Messenger Integration Endpoints
@api_router.get("/messenger/verify")
async def verify_messenger_webhook(request: Request):
    """Handle Facebook Messenger webhook verification"""
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token") 
    challenge = request.query_params.get("hub.challenge")
    
    verify_token = os.environ.get("FB_VERIFY_TOKEN", "your_verify_token")
    
    if mode and token:
        if mode == "subscribe" and token == verify_token:
            return Response(content=challenge, status_code=200)
        else:
            return Response(content="Verification failed", status_code=403)
    else:
        return Response(content="Missing required parameters", status_code=400)

@api_router.post("/messenger/webhook")
async def handle_messenger_webhook(request: Request, x_hub_signature: str = Header(None)):
    """Handle incoming Facebook Messenger messages"""
    try:
        body = await request.body()
        data = json.loads(body)
        
        # Verify signature (in production)
        # if not verify_messenger_signature(body, x_hub_signature):
        #     raise HTTPException(status_code=403, detail="Invalid signature")
        
        if data.get("object") == "page":
            for entry in data.get("entry", []):
                for messaging_event in entry.get("messaging", []):
                    await process_messenger_message(messaging_event)
        
        return Response(content="EVENT_RECEIVED", status_code=200)
        
    except Exception as e:
        print(f"Messenger webhook error: {e}")
        return Response(content="ERROR", status_code=500)

# Contact Management
@api_router.get("/contacts", response_model=List[Contact])
async def get_contacts():
    """Get all contacts"""
    contacts = await db.contacts.find().sort("last_seen", -1).to_list(1000)
    return [Contact(**contact) for contact in contacts]

@api_router.get("/contacts/{contact_id}/communications")
async def get_contact_communications(contact_id: str):
    """Get all communications for a specific contact"""
    communications = await db.communications.find(
        {"contact_id": contact_id}
    ).sort("timestamp", -1).to_list(1000)
    return [Communication(**comm) for comm in communications]

# Communication History
@api_router.get("/communications")
async def get_communications(
    channel: Optional[str] = None,
    contact_id: Optional[str] = None,
    limit: int = 100
):
    """Get communications with optional filtering"""
    query = {}
    if channel:
        query["channel"] = channel
    if contact_id:
        query["contact_id"] = contact_id
    
    communications = await db.communications.find(query).sort("timestamp", -1).limit(limit).to_list(limit)
    return [Communication(**comm) for comm in communications]

# Intent Management
@api_router.get("/intents", response_model=List[Intent])
async def get_intents():
    """Get all defined intents"""
    intents = await db.intents.find().to_list(1000)
    return [Intent(**intent) for intent in intents]

@api_router.post("/intents", response_model=Intent)
async def create_intent(intent_data: Intent):
    """Create a new intent"""
    await db.intents.insert_one(intent_data.dict())
    return intent_data

# Message Processing Functions
async def process_messenger_message(event: dict):
    """Process incoming Messenger message"""
    sender_id = event.get("sender", {}).get("id")
    message = event.get("message", {})
    message_text = message.get("text", "")
    
    if not sender_id or not message_text:
        return
    
    # Get or create contact
    contact = await get_or_create_contact("messenger", sender_id, {})
    
    # Store incoming message
    communication = Communication(
        contact_id=contact["id"],
        channel="messenger",
        direction="incoming",
        content=message_text,
        platform_message_id=message.get("mid")
    )
    
    # Analyze intent with AI
    if AI_AVAILABLE:
        try:
            ai_chat = await get_ai_chat(f"messenger_{sender_id}")
            if ai_chat:
                user_message = UserMessage(text=f"Analyze this customer message for intent: {message_text}")
                ai_response = await ai_chat.send_message(user_message)
                
                try:
                    # Parse AI response as JSON
                    intent_data = json.loads(ai_response)
                    communication.intent = intent_data.get("intent")
                    communication.intent_confidence = intent_data.get("confidence", 0.0)
                    
                    # Auto-respond if confidence is high enough
                    if intent_data.get("confidence", 0.0) > 0.7:
                        await send_automated_response(
                            contact, 
                            "messenger", 
                            intent_data.get("suggested_response", "Thank you for your message!")
                        )
                        communication.automated_response = True
                        
                        # Auto-move to appropriate column
                        await auto_move_lead_to_column(contact, intent_data.get("intent"))
                        
                except json.JSONDecodeError:
                    print("Could not parse AI response as JSON")
                    
        except Exception as e:
            print(f"AI intent analysis error: {e}")
    
    # Store the communication
    await db.communications.insert_one(communication.dict())
    
    # Update contact last seen
    await db.contacts.update_one(
        {"id": contact["id"]},
        {"$set": {"last_seen": datetime.utcnow()}}
    )

async def get_or_create_contact(platform: str, external_id: str, profile_data: dict):
    """Get existing contact or create new one"""
    # Look for existing contact by platform ID
    contact = await db.contacts.find_one({f"platform_ids.{platform}": external_id})
    
    if not contact:
        # Create new contact
        contact_data = {
            "id": str(uuid.uuid4()),
            "name": profile_data.get("name") or profile_data.get("first_name"),
            "platform_ids": {platform: external_id},
            "profile_data": profile_data,
            "first_seen": datetime.utcnow(),
            "last_seen": datetime.utcnow()
        }
        
        # Try to create CRM card automatically
        if contact_data.get("name"):
            card_data = {
                "title": f"Lead from {platform.title()}: {contact_data['name']}",
                "contact_name": contact_data["name"],
                "description": f"Auto-created from {platform} conversation",
                "tags": [f"source_{platform}", "auto_created"],
                "column_id": await get_default_column_id(),  # Prospects column
                "position": 0,
                "external_ids": {platform: external_id}
            }
            
            card = Card(**card_data)
            await db.cards.insert_one(card.dict())
            contact_data["card_id"] = card.id
        
        await db.contacts.insert_one(contact_data)
        contact = contact_data
    
    return contact

async def get_default_column_id():
    """Get the ID of the first column (Prospects)"""
    column = await db.columns.find_one({}, sort=[("position", 1)])
    return column["id"] if column else None

async def send_automated_response(contact: dict, platform: str, message: str):
    """Send automated response via the appropriate platform"""
    try:
        if platform == "messenger":
            await send_messenger_message(
                contact["platform_ids"]["messenger"], 
                message
            )
        elif platform == "whatsapp":
            # Will be implemented with WhatsApp service
            pass
            
    except Exception as e:
        print(f"Error sending automated response: {e}")

async def send_messenger_message(recipient_id: str, message_text: str):
    """Send message via Facebook Messenger API"""
    page_access_token = os.environ.get("FB_PAGE_ACCESS_TOKEN")
    if not page_access_token:
        return
        
    url = "https://graph.facebook.com/v18.0/me/messages"
    
    payload = {
        "recipient": {"id": recipient_id},
        "message": {"text": message_text},
        "messaging_type": "RESPONSE"
    }
    
    headers = {"Content-Type": "application/json"}
    params = {"access_token": page_access_token}
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, params=params)
            response.raise_for_status()
            
            # Store outgoing message
            communication = Communication(
                contact_id=await get_contact_id_by_platform("messenger", recipient_id),
                channel="messenger",
                direction="outgoing",
                content=message_text,
                automated_response=True
            )
            await db.communications.insert_one(communication.dict())
            
    except Exception as e:
        print(f"Error sending Messenger message: {e}")

async def get_contact_id_by_platform(platform: str, external_id: str):
    """Get contact ID by platform external ID"""
    contact = await db.contacts.find_one({f"platform_ids.{platform}": external_id})
    return contact["id"] if contact else None

async def auto_move_lead_to_column(contact: dict, intent: str):
    """Automatically move lead to appropriate column based on intent"""
    if not contact.get("card_id"):
        return
        
    # Find intent configuration
    intent_config = await db.intents.find_one({"name": intent})
    if not intent_config or not intent_config.get("target_column_id"):
        return
    
    # Move card to target column
    await db.cards.update_one(
        {"id": contact["card_id"]},
        {"$set": {
            "column_id": intent_config["target_column_id"],
            "last_contact": datetime.utcnow()
        }}
    )

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()