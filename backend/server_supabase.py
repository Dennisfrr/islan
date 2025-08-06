from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel, EmailStr, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
import os
import logging
from pathlib import Path
import re
import json

# Supabase imports
from supabase import create_client, Client
from jose import JWTError, jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create the main app without a prefix
app = FastAPI(title="CRM Supabase API", version="2.0.0")

# Supabase configuration
supabase_url = os.environ.get('SUPABASE_URL')
supabase_anon_key = os.environ.get('SUPABASE_ANON_KEY') 
supabase_jwt_secret = os.environ.get('SUPABASE_JWT_SECRET')

if not all([supabase_url, supabase_anon_key]):
    # For now, use placeholder values
    supabase_url = "https://placeholder.supabase.co"
    supabase_anon_key = "placeholder_key"
    print("Warning: Using placeholder Supabase credentials")

# Initialize Supabase client
supabase: Client = create_client(supabase_url, supabase_anon_key)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# JWT configuration
security = HTTPBearer()

class AuthHandler:
    def __init__(self):
        self.secret = supabase_jwt_secret or "placeholder_secret"
        self.algorithm = "HS256"
    
    def decode_token(self, token: str) -> dict:
        """Decode and validate JWT token"""
        try:
            payload = jwt.decode(token, self.secret, algorithms=[self.algorithm])
            return payload
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token"
            )
    
    def get_current_user(self, credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
        """Extract user information from JWT token"""
        token = credentials.credentials
        payload = self.decode_token(token)
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )
        
        return {
            "id": user_id,
            "email": payload.get("email"),
            "role": payload.get("role", "authenticated")
        }

auth_handler = AuthHandler()

# Pydantic Models for Authentication
class UserRegistration(BaseModel):
    email: EmailStr
    password: str
    name: str

    @validator('password')
    def validate_password_strength(cls, password):
        """Validate password meets security requirements"""
        if len(password) < 8:
            raise ValueError('A senha deve ter pelo menos 8 caracteres')
        
        if not re.search(r'[A-Z]', password):
            raise ValueError('A senha deve conter pelo menos uma letra maiúscula')
        
        if not re.search(r'[a-z]', password):
            raise ValueError('A senha deve conter pelo menos uma letra minúscula')
        
        if not re.search(r'\d', password):
            raise ValueError('A senha deve conter pelo menos um número')
        
        return password

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str
    
    @validator('new_password')
    def validate_password_strength(cls, password):
        """Validate password meets security requirements"""
        if len(password) < 8:
            raise ValueError('A senha deve ter pelo menos 8 caracteres')
        
        if not re.search(r'[A-Z]', password):
            raise ValueError('A senha deve conter pelo menos uma letra maiúscula')
        
        if not re.search(r'[a-z]', password):
            raise ValueError('A senha deve conter pelo menos uma letra minúscula')
        
        if not re.search(r'\d', password):
            raise ValueError('A senha deve conter pelo menos um número')
        
        return password
    
    @validator('confirm_password')
    def passwords_match(cls, confirm_password, values):
        """Ensure password confirmation matches"""
        if 'new_password' in values and confirm_password != values['new_password']:
            raise ValueError('Confirmação de senha não confere')
        return confirm_password

# Authentication endpoints
@api_router.post("/auth/register", response_model=dict)
async def register_user(user_data: UserRegistration):
    """Register a new user with email and password"""
    try:
        # Create user in Supabase Auth
        response = supabase.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password,
            "options": {
                "data": {
                    "name": user_data.name
                }
            }
        })
        
        if response.user:
            return {
                "message": "Usuário registrado com sucesso",
                "user": {
                    "id": response.user.id,
                    "email": response.user.email,
                    "name": user_data.name
                },
                "access_token": response.session.access_token if response.session else None
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Falha no registro"
            )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro no registro: {str(e)}"
        )

@api_router.post("/auth/login", response_model=dict)
async def login_user(user_credentials: UserLogin):
    """Authenticate user and return access token"""
    try:
        response = supabase.auth.sign_in_with_password({
            "email": user_credentials.email,
            "password": user_credentials.password
        })
        
        if response.user and response.session:
            return {
                "message": "Login realizado com sucesso",
                "user": {
                    "id": response.user.id,
                    "email": response.user.email,
                    "name": response.user.user_metadata.get("name")
                },
                "access_token": response.session.access_token,
                "refresh_token": response.session.refresh_token
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciais inválidas"
            )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Falha no login: {str(e)}"
        )

@api_router.post("/auth/logout")
async def logout_user():
    """Sign out current user"""
    try:
        supabase.auth.sign_out()
        return {"message": "Logout realizado com sucesso"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Falha no logout: {str(e)}"
        )

@api_router.get("/auth/profile", response_model=UserResponse)
async def get_user_profile(current_user: dict = Depends(auth_handler.get_current_user)):
    """Get current user profile information"""
    try:
        # Fetch additional user data from profiles table
        user_data = supabase.table('profiles').select('*').eq('id', current_user['id']).execute()
        
        return UserResponse(
            id=current_user['id'],
            email=current_user['email'],
            name=user_data.data[0].get('name') if user_data.data else None
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Falha ao buscar perfil: {str(e)}"
        )

@api_router.get("/auth/google")
async def google_login():
    """Initiate Google OAuth login"""
    try:
        response = supabase.auth.sign_in_with_oauth({
            "provider": "google",
            "options": {
                "redirect_to": "http://localhost:3000/auth/callback"
            }
        })
        
        return {"url": response.url}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Falha no login do Google: {str(e)}"
        )

@api_router.get("/auth/github")
async def github_login():
    """Initiate GitHub OAuth login"""
    try:
        response = supabase.auth.sign_in_with_oauth({
            "provider": "github",
            "options": {
                "redirect_to": "http://localhost:3000/auth/callback",
                "scopes": "user:email"
            }
        })
        
        return {"url": response.url}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Falha no login do GitHub: {str(e)}"
        )

# CRM Models using Supabase
class Card(BaseModel):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = ""
    contact_name: Optional[str] = ""
    contact_email: Optional[str] = ""
    contact_phone: Optional[str] = ""
    estimated_value: Optional[float] = 0.0
    priority: str = "medium"  # low, medium, high
    assigned_to: Optional[str] = ""
    tags: List[str] = []
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
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
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    color: str = "#3B82F6"
    position: int = 0
    board_id: str
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)

class ColumnCreate(BaseModel):
    title: str
    color: str = "#3B82F6"
    board_id: str

class Board(BaseModel):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = ""
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    user_id: str

class BoardCreate(BaseModel):
    title: str
    description: Optional[str] = ""

class BoardUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None

class MoveCardRequest(BaseModel):
    card_id: str
    destination_column_id: str
    position: int

# Board Management with Supabase
@api_router.post("/boards", response_model=dict)
async def create_board(
    board_data: BoardCreate, 
    current_user: dict = Depends(auth_handler.get_current_user)
):
    try:
        board_record = {
            "id": str(uuid.uuid4()),
            "title": board_data.title,
            "description": board_data.description,
            "user_id": current_user["id"],
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        result = supabase.table("boards").insert(board_record).execute()
        
        if result.data:
            # Create default columns
            board_id = result.data[0]["id"]
            default_columns = [
                {"title": "Prospects 🎯", "color": "#EF4444", "position": 0},
                {"title": "Contact Made 📞", "color": "#F59E0B", "position": 1},
                {"title": "Proposal Sent 📄", "color": "#3B82F6", "position": 2},
                {"title": "Closed Won 🎉", "color": "#10B981", "position": 3}
            ]
            
            columns_data = []
            for col_data in default_columns:
                column_record = {
                    "id": str(uuid.uuid4()),
                    "title": col_data["title"],
                    "color": col_data["color"],
                    "position": col_data["position"],
                    "board_id": board_id,
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat()
                }
                columns_data.append(column_record)
            
            supabase.table("columns").insert(columns_data).execute()
            
            return {"message": "Quadro criado com sucesso", "board": result.data[0]}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Falha ao criar quadro"
            )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao criar quadro: {str(e)}"
        )

@api_router.get("/boards", response_model=List[dict])
async def get_boards(current_user: dict = Depends(auth_handler.get_current_user)):
    try:
        result = supabase.table("boards").select("*").eq("user_id", current_user["id"]).execute()
        return result.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao buscar quadros: {str(e)}"
        )

@api_router.get("/boards/{board_id}/columns", response_model=List[dict])
async def get_board_columns(
    board_id: str,
    current_user: dict = Depends(auth_handler.get_current_user)
):
    try:
        # Verify board ownership
        board_result = supabase.table("boards").select("id").eq("id", board_id).eq("user_id", current_user["id"]).execute()
        if not board_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quadro não encontrado"
            )
        
        result = supabase.table("columns").select("*").eq("board_id", board_id).order("position").execute()
        return result.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao buscar colunas: {str(e)}"
        )

# Card Management with Supabase
@api_router.post("/cards", response_model=dict)
async def create_card(
    card_data: CardCreate,
    current_user: dict = Depends(auth_handler.get_current_user)
):
    try:
        # Get the current maximum position in the column
        existing_cards = supabase.table("cards").select("position").eq("column_id", card_data.column_id).order("position", desc=True).limit(1).execute()
        next_position = existing_cards.data[0]["position"] + 1 if existing_cards.data else 0
        
        card_record = {
            "id": str(uuid.uuid4()),
            "title": card_data.title,
            "description": card_data.description,
            "contact_name": card_data.contact_name,
            "contact_email": card_data.contact_email,
            "contact_phone": card_data.contact_phone,
            "estimated_value": card_data.estimated_value,
            "priority": card_data.priority,
            "assigned_to": card_data.assigned_to,
            "tags": card_data.tags,
            "due_date": card_data.due_date.isoformat() if card_data.due_date else None,
            "column_id": card_data.column_id,
            "position": next_position,
            "user_id": current_user["id"],
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        result = supabase.table("cards").insert(card_record).execute()
        
        if result.data:
            return {"message": "Cartão criado com sucesso", "card": result.data[0]}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Falha ao criar cartão"
            )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao criar cartão: {str(e)}"
        )

@api_router.get("/cards", response_model=List[dict])
async def get_cards(
    column_id: Optional[str] = None,
    current_user: dict = Depends(auth_handler.get_current_user)
):
    try:
        query = supabase.table("cards").select("*")
        if column_id:
            query = query.eq("column_id", column_id)
        
        result = query.order("position").execute()
        return result.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao buscar cartões: {str(e)}"
        )

@api_router.put("/cards/{card_id}", response_model=dict)
async def update_card(
    card_id: str, 
    card_update: CardUpdate,
    current_user: dict = Depends(auth_handler.get_current_user)
):
    try:
        update_data = {k: v for k, v in card_update.dict().items() if v is not None}
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nenhum dado para atualizar"
            )
        
        update_data["updated_at"] = datetime.utcnow().isoformat()
        if "due_date" in update_data and update_data["due_date"]:
            update_data["due_date"] = update_data["due_date"].isoformat()
        
        result = supabase.table("cards").update(update_data).eq("id", card_id).execute()
        
        if result.data:
            return {"message": "Cartão atualizado com sucesso", "card": result.data[0]}
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cartão não encontrado"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao atualizar cartão: {str(e)}"
        )

@api_router.delete("/cards/{card_id}")
async def delete_card(
    card_id: str,
    current_user: dict = Depends(auth_handler.get_current_user)
):
    try:
        result = supabase.table("cards").delete().eq("id", card_id).execute()
        
        if result.data:
            return {"message": "Cartão excluído com sucesso"}
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cartão não encontrado"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao excluir cartão: {str(e)}"
        )

@api_router.post("/cards/move")
async def move_card(
    move_request: MoveCardRequest,
    current_user: dict = Depends(auth_handler.get_current_user)
):
    try:
        # Check if card exists
        card_result = supabase.table("cards").select("*").eq("id", move_request.card_id).execute()
        if not card_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cartão não encontrado"
            )
        
        # Update card's column and position
        update_data = {
            "column_id": move_request.destination_column_id,
            "position": move_request.position,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        result = supabase.table("cards").update(update_data).eq("id", move_request.card_id).execute()
        
        if result.data:
            return {"message": "Cartão movido com sucesso"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Falha ao mover cartão"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao mover cartão: {str(e)}"
        )

# Analytics endpoints
@api_router.get("/analytics/pipeline")
async def get_pipeline_analytics(current_user: dict = Depends(auth_handler.get_current_user)):
    try:
        # Get all user boards
        boards_result = supabase.table("boards").select("id").eq("user_id", current_user["id"]).execute()
        board_ids = [board["id"] for board in boards_result.data]
        
        if not board_ids:
            return {
                "column_stats": {},
                "total_cards": 0,
                "total_pipeline_value": 0,
                "columns": []
            }
        
        # Get columns for user boards
        columns_result = supabase.table("columns").select("*").in_("board_id", board_ids).execute()
        columns = columns_result.data
        
        # Get cards for user boards
        column_ids = [col["id"] for col in columns]
        if column_ids:
            cards_result = supabase.table("cards").select("*").in_("column_id", column_ids).execute()
            cards = cards_result.data
        else:
            cards = []
        
        # Calculate analytics
        column_stats = {}
        total_value = 0
        
        for column in columns:
            column_cards = [c for c in cards if c["column_id"] == column["id"]]
            column_value = sum(c.get("estimated_value", 0) for c in column_cards)
            column_stats[column["id"]] = {
                "title": column["title"],
                "count": len(column_cards),
                "total_value": column_value
            }
            total_value += column_value
        
        return {
            "column_stats": column_stats,
            "total_cards": len(cards),
            "total_pipeline_value": total_value,
            "columns": columns
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao buscar analytics: {str(e)}"
        )

# Initialize default board if none exists
@api_router.post("/initialize")
async def initialize_default_data(current_user: dict = Depends(auth_handler.get_current_user)):
    try:
        # Check if user has any boards
        existing_boards = supabase.table("boards").select("id").eq("user_id", current_user["id"]).limit(1).execute()
        
        if not existing_boards.data:
            # Create default board
            board_data = BoardCreate(
                title="Pipeline de Vendas",
                description="Quadro principal do CRM"
            )
            return await create_board(board_data, current_user)
        
        return {"message": "Dados já existem"}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao inicializar dados: {str(e)}"
        )

# Include the router in the main app
app.include_router(api_router)

# CORS configuration
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)