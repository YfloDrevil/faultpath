from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import base64
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Emergent LLM setup
EMERGENT_LLM_KEY = os.getenv('EMERGENT_LLM_KEY', 'sk-emergent-01a98B2D539FfF44dC')

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class DiagramCategory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    icon: str
    color: str
    diagram_type: str  # 'wiring' or 'equipment'
    count: int
    description: Optional[str] = None

class Diagram(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category_id: str
    title: str
    description: Optional[str] = None
    image_data: Optional[str] = None  # Base64 encoded image
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    conversation_id: str
    role: str  # 'user' or 'assistant'
    content: str
    images: Optional[List[str]] = None  # Base64 encoded images
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatConversation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    equipment_name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Request/Response Models
class CategoryCreate(BaseModel):
    name: str
    icon: str
    color: str
    diagram_type: str
    count: int
    description: Optional[str] = None

class DiagramCreate(BaseModel):
    category_id: str
    title: str
    description: Optional[str] = None
    image_data: Optional[str] = None

class MessageCreate(BaseModel):
    content: str
    images: Optional[List[str]] = None

class ConversationCreate(BaseModel):
    equipment_name: str

# Initialize default categories
async def init_default_data():
    # Check if categories exist
    existing = await db.categories.count_documents({})
    if existing == 0:
        categories = [
            # Wiring Diagrams
            {"id": str(uuid.uuid4()), "name": "Automotive", "icon": "car", "color": "#3B82F6", 
             "diagram_type": "wiring", "count": 3, "description": "Engine, transmission, brakes"},
            {"id": str(uuid.uuid4()), "name": "Electrical", "icon": "zap", "color": "#F97316", 
             "diagram_type": "wiring", "count": 3, "description": "3 diagrams"},
            {"id": str(uuid.uuid4()), "name": "HVAC", "icon": "wind", "color": "#14B8A6", 
             "diagram_type": "wiring", "count": 3, "description": "3 diagrams"},
            {"id": str(uuid.uuid4()), "name": "Plumbing", "icon": "droplet", "color": "#A855F7", 
             "diagram_type": "wiring", "count": 2, "description": "2 diagrams"},
            {"id": str(uuid.uuid4()), "name": "General", "icon": "wrench", "color": "#6B7280", 
             "diagram_type": "wiring", "count": 2, "description": "2 diagrams"},
            # Equipment & Parts
            {"id": str(uuid.uuid4()), "name": "Fixed Plant", "icon": "factory", "color": "#10B981", 
             "diagram_type": "equipment", "count": 0, "description": "Generators, compressors, pumps"},
            {"id": str(uuid.uuid4()), "name": "Mobile Plant", "icon": "truck", "color": "#F97316", 
             "diagram_type": "equipment", "count": 0, "description": "Excavators, loaders, cranes"},
            {"id": str(uuid.uuid4()), "name": "Heavy Diesel", "icon": "cog", "color": "#EC4899", 
             "diagram_type": "equipment", "count": 0, "description": "Engine systems and components"},
        ]
        await db.categories.insert_many(categories)
        logger.info("Default categories initialized")

# API Routes
@api_router.get("/")
async def root():
    return {"message": "FaultPath API", "version": "1.0"}

@api_router.get("/categories", response_model=List[DiagramCategory])
async def get_categories(diagram_type: Optional[str] = None):
    query = {}
    if diagram_type:
        query["diagram_type"] = diagram_type
    
    categories = await db.categories.find(query, {"_id": 0}).to_list(100)
    return categories

@api_router.post("/categories", response_model=DiagramCategory)
async def create_category(category: CategoryCreate):
    cat_obj = DiagramCategory(**category.model_dump())
    doc = cat_obj.model_dump()
    await db.categories.insert_one(doc)
    return cat_obj

@api_router.get("/diagrams", response_model=List[Diagram])
async def get_diagrams(category_id: Optional[str] = None):
    query = {}
    if category_id:
        query["category_id"] = category_id
    
    diagrams = await db.diagrams.find(query, {"_id": 0}).to_list(1000)
    
    for diagram in diagrams:
        if isinstance(diagram.get('created_at'), str):
            diagram['created_at'] = datetime.fromisoformat(diagram['created_at'])
    
    return diagrams

@api_router.post("/diagrams", response_model=Diagram)
async def create_diagram(diagram: DiagramCreate):
    diagram_obj = Diagram(**diagram.model_dump())
    doc = diagram_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.diagrams.insert_one(doc)
    
    # Update category count
    await db.categories.update_one(
        {"id": diagram.category_id},
        {"$inc": {"count": 1}}
    )
    
    return diagram_obj

@api_router.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        base64_data = base64.b64encode(contents).decode('utf-8')
        mime_type = file.content_type or 'image/jpeg'
        return {"image_data": f"data:{mime_type};base64,{base64_data}"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Chat endpoints
@api_router.get("/conversations", response_model=List[ChatConversation])
async def get_conversations():
    conversations = await db.conversations.find({}, {"_id": 0}).sort("updated_at", -1).to_list(100)
    
    for conv in conversations:
        if isinstance(conv.get('created_at'), str):
            conv['created_at'] = datetime.fromisoformat(conv['created_at'])
        if isinstance(conv.get('updated_at'), str):
            conv['updated_at'] = datetime.fromisoformat(conv['updated_at'])
    
    return conversations

@api_router.post("/conversations", response_model=ChatConversation)
async def create_conversation(conversation: ConversationCreate):
    conv_obj = ChatConversation(**conversation.model_dump())
    doc = conv_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.conversations.insert_one(doc)
    return conv_obj

@api_router.get("/conversations/{conversation_id}/messages", response_model=List[ChatMessage])
async def get_messages(conversation_id: str):
    messages = await db.messages.find(
        {"conversation_id": conversation_id},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(1000)
    
    for msg in messages:
        if isinstance(msg.get('timestamp'), str):
            msg['timestamp'] = datetime.fromisoformat(msg['timestamp'])
    
    return messages

@api_router.post("/conversations/{conversation_id}/messages", response_model=ChatMessage)
async def send_message(conversation_id: str, message: MessageCreate):
    # Create user message
    user_msg = ChatMessage(
        conversation_id=conversation_id,
        role="user",
        content=message.content,
        images=message.images
    )
    
    user_doc = user_msg.model_dump()
    user_doc['timestamp'] = user_doc['timestamp'].isoformat()
    await db.messages.insert_one(user_doc)
    
    # System prompt for FaultPath
    system_prompt = """You are FaultPath, an expert diagnostic assistant for mechanics and technicians. 
    You provide systematic, step-by-step troubleshooting guidance for equipment failures.
    
    When analyzing issues:
    1. Acknowledge the symptoms clearly
    2. Explain what the symptoms indicate
    3. Provide systematic diagnostic steps
    4. Reference specific components and their locations
    5. Explain testing procedures with expected values
    6. Be specific about tools and measurements needed
    7. Use technical but clear language
    
    Focus on electrical, hydraulic, mechanical systems in:
    - Automotive equipment
    - Heavy machinery (cranes, excavators, loaders)
    - HVAC systems
    - Electrical systems
    - Plumbing systems
    
    Be practical, thorough, and safety-conscious."""
    
    # Initialize LlmChat with the conversation
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=conversation_id,
        system_message=system_prompt
    ).with_model("openai", "gpt-4o")
    
    # Get AI response
    try:
        user_content = message.content
        if message.images:
            user_content += "\n\n[User has uploaded images for analysis]"
        
        user_message = UserMessage(text=user_content)
        assistant_content = await chat.send_message(user_message)
    except Exception as e:
        logger.error(f"AI error: {e}")
        assistant_content = "I apologize, but I'm having trouble processing your request. Please try again or rephrase your question."
    
    # Create assistant message
    assistant_msg = ChatMessage(
        conversation_id=conversation_id,
        role="assistant",
        content=assistant_content
    )
    
    assistant_doc = assistant_msg.model_dump()
    assistant_doc['timestamp'] = assistant_doc['timestamp'].isoformat()
    await db.messages.insert_one(assistant_doc)
    
    # Update conversation timestamp
    await db.conversations.update_one(
        {"id": conversation_id},
        {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return assistant_msg

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    await init_default_data()
    logger.info("FaultPath API started")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
