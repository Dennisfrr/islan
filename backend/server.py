from fastapi import FastAPI, APIRouter, HTTPException
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
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

# Board Management
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

# Card Management
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

# Analytics endpoints
@api_router.get("/analytics/pipeline")
async def get_pipeline_analytics():
    # Get all columns and cards
    columns_data = await db.columns.find().to_list(1000)
    cards_data = await db.cards.find().to_list(1000)
    
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
        "columns": [col.dict() for col in columns]
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
            },
            {
                "title": "TechStart Inc - SaaS Solution",
                "description": "Growing startup needs scalable CRM solution",
                "contact_name": "Sarah Johnson",
                "contact_email": "sarah@techstart.com",
                "estimated_value": 12000,
                "priority": "medium",
                "column_id": column_ids[1],
                "position": 0
            },
            {
                "title": "Global Retail Chain",
                "description": "Multi-location retail client proposal sent",
                "contact_name": "Mike Wilson",
                "contact_email": "mike@globalretail.com",
                "estimated_value": 45000,
                "priority": "high",
                "column_id": column_ids[2],
                "position": 0
            }
        ]
        
        for card_data in sample_cards:
            card = Card(**card_data)
            await db.cards.insert_one(card.dict())
        
        return {"message": "Default data initialized successfully", "board_id": board.id}
    
    return {"message": "Data already exists"}

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