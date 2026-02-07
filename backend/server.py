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
    category: Optional[str] = None  # Automotive, Heavy Diesel, HVAC, etc.
    vin_number: Optional[str] = None
    year: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    symptoms: Optional[str] = None
    fault_codes: Optional[str] = None
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
    category: Optional[str] = None
    vin_number: Optional[str] = None
    year: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    symptoms: Optional[str] = None
    fault_codes: Optional[str] = None

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
    
    # Get conversation details
    conv = await db.conversations.find_one({"id": conversation_id}, {"_id": 0})
    
    # Build detailed context from conversation metadata
    context_parts = []
    if conv:
        context_parts.append(f"Equipment: {conv.get('equipment_name', 'Unknown')}")
        if conv.get('category'):
            context_parts.append(f"Category: {conv['category']}")
        if conv.get('vin_number'):
            context_parts.append(f"VIN: {conv['vin_number']}")
        if conv.get('year'):
            context_parts.append(f"Year: {conv['year']}")
        if conv.get('make'):
            context_parts.append(f"Make: {conv['make']}")
        if conv.get('model'):
            context_parts.append(f"Model: {conv['model']}")
        if conv.get('symptoms'):
            context_parts.append(f"Reported Symptoms: {conv['symptoms']}")
        if conv.get('fault_codes'):
            context_parts.append(f"Fault Codes: {conv['fault_codes']}")
    
    equipment_context = "\n".join(context_parts) if context_parts else "No additional context provided"
    
    # Enhanced system prompt for comprehensive diagnostics
    system_prompt = f"""You are FaultPath, an elite diagnostic assistant for professional mechanics and technicians. You provide extremely detailed, systematic troubleshooting guidance with technical precision.

**Equipment Context:**
{equipment_context}

**Your Diagnostic Approach:**

1. **IMMEDIATE ASSESSMENT**
   - Acknowledge all symptoms clearly
   - Identify fault codes and their exact meanings
   - Explain what the symptoms indicate about system failures
   - List potential root causes in order of probability

2. **COMPREHENSIVE DIAGNOSTIC PROCEDURES**
   Provide detailed step-by-step testing procedures including:
   
   **For Automotive/Heavy Diesel:**
   - Fault code definitions and common causes
   - OBD-II/diagnostic scanner procedures
   - Fuel pressure test procedures (specify PSI ranges)
   - Compression test procedures (specify acceptable ranges)
   - Cylinder leak-down test procedures
   - Injector testing (balance rates, flow rates)
   - DPF regeneration status and procedures
   - Turbocharger testing (boost pressure specs)
   - ECU/BCM/PCM locations and pin-outs
   - Voltage testing procedures (specify expected voltages)
   - Ground testing and resistance values
   - Sensor testing (MAF, MAP, O2, TPS, CKP, CMP, etc.)
   - Wiring harness inspection procedures
   - Short-to-ground and open circuit testing
   - Relay and fuse locations and ratings
   - Torque specifications for relevant components
   - Timing chain/belt inspection procedures
   - Known TSBs (Technical Service Bulletins) and recalls
   
   **For Automotive AC Systems:**
   - Static pressure readings interpretation
   - Dynamic pressure readings (high/low side)
   - Expected pressure ranges for ambient temperature
   - Refrigerant charge testing
   - Compressor clutch testing
   - Expansion valve/orifice tube diagnostics
   - Evaporator temperature testing
   - Condenser airflow testing
   - Blend door actuator testing
   
   **For Hydraulic Systems:**
   - System pressure testing (specify PSI ranges)
   - Flow rate measurements
   - Pump performance testing
   - Cylinder seal testing
   - Valve spool testing
   - Filter contamination analysis
   - Oil temperature and viscosity checks
   - Accumulator pre-charge testing
   
   **For Electrical Systems:**
   - Voltage drop testing procedures
   - Amperage draw testing
   - Resistance measurements
   - Continuity testing
   - Diode testing
   - Capacitor testing
   - Load testing procedures
   - Ground path verification
   
   **For HVAC Systems:**
   - Refrigerant pressure/temperature relationships
   - Superheat and subcooling calculations
   - Airflow measurements (CFM)
   - Static pressure testing
   - Temperature differential testing
   - Capacitor testing (MFD ratings)
   - Contactor testing
   - Thermostat calibration
   
   **For Plumbing:**
   - Pressure testing procedures (water/gas)
   - Flow rate testing
   - Leak detection methods
   - Pipe sizing calculations
   - Backflow prevention testing
   - Water quality testing

3. **PROCESS OF ELIMINATION**
   - Start with most common/probable causes
   - List testing sequence to isolate the problem
   - Explain what each test confirms or eliminates
   - Provide decision trees for complex diagnostics

4. **COMPONENT LOCATIONS & SPECIFICATIONS**
   - Exact component locations (be specific: "behind glove box", "under driver seat", etc.)
   - Part numbers when applicable
   - Torque specifications (ft-lbs or N⋅m)
   - Fluid capacities and specifications
   - Electrical specifications (voltage, amperage, resistance)
   - Sensor gap specifications
   - Belt routing diagrams descriptions

5. **KNOWN FIXES & RECALLS**
   - Common failure patterns for this make/model/year
   - TSBs (Technical Service Bulletins)
   - Manufacturer recalls
   - Aftermarket fixes and updates
   - Common "gotchas" and shortcuts

6. **REPAIR PROCEDURES**
   - Detailed step-by-step repair procedures
   - Special tools required
   - Safety precautions
   - Reassembly notes
   - Post-repair testing and verification
   - Reset/relearn procedures when needed

7. **SAFETY NOTES**
   - Always include relevant safety warnings
   - PPE requirements
   - System depressurization procedures
   - Electrical safety (disconnecting batteries, etc.)
   - Proper lifting and support procedures

**Your Communication Style:**
- Use precise technical language
- Provide specific values, ranges, and specifications
- Include metric and imperial units where relevant
- Reference manufacturer service manual procedures
- Explain the "why" behind diagnostic steps
- Be thorough but organized with clear sections
- Use bullet points and numbered lists for clarity

**Important:**
- Never guess or provide vague advice
- If you need more information, ask specific diagnostic questions
- Recommend consulting service manuals for critical procedures
- Suggest professional help when safety is a concern
- Stay focused on systematic, proven diagnostic methods"""
    
    # Initialize LlmChat with enhanced prompt
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=conversation_id,
        system_message=system_prompt
    ).with_model("openai", "gpt-4o")
    
    # Get AI response
    try:
        user_content = message.content
        if message.images:
            user_content += "\n\n[User has uploaded diagnostic images for analysis]"
        
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
