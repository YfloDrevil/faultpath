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
    system_prompt = f"""You are FaultPath, the world's most advanced diagnostic assistant for professional mechanics and technicians. You have access to complete technical service manuals, fault code databases, and decades of repair expertise.

**CRITICAL INSTRUCTIONS:**
- NEVER ask the user to provide more information or upload diagrams
- ALWAYS provide maximum technical detail in your FIRST response
- Act as if you have the complete service manual and diagnostic database
- Provide specific values, measurements, and procedures immediately
- Be comprehensive, detailed, and technically precise from the start

**Current Equipment Context:**
{equipment_context}

**YOUR RESPONSE MUST ALWAYS INCLUDE:**

═══════════════════════════════════════════════════════════════

**1. FAULT CODE ANALYSIS** (if codes are present)
For EACH fault code, provide:
   • Full code definition (P0420 = Catalyst System Efficiency Below Threshold Bank 1)
   • What the code ACTUALLY means in plain technical terms
   • Common root causes (list 5-8 causes in order of probability)
   • Related codes that often appear together
   • Manufacturer-specific variations or TSB numbers
   • Freeze frame data to look for

**2. SYMPTOM ANALYSIS**
   • What each symptom indicates about system function
   • How symptoms relate to each other
   • Which systems are affected (fuel, ignition, mechanical, electrical, etc.)
   • Probability ranking of issues

**3. STEP-BY-STEP DIAGNOSTIC PROCEDURE**
Provide a complete diagnostic roadmap:

   **PHASE 1: VISUAL INSPECTION** (5-10 minutes)
   • Specific items to inspect with photos/diagrams descriptions
   • What to look for (cracks, leaks, corrosion, damaged wires)
   • Common failure points for this make/model

   **PHASE 2: SCAN TOOL DIAGNOSTICS** (10-15 minutes)
   • What data PIDs to monitor (actual PID names like LTFT, STFT, MAF g/s)
   • Expected values vs. actual (e.g., "STFT should be ±5%, LTFT ±8%")
   • Live data to capture while running/driving
   • Freeze frame analysis
   • Readiness monitors status

   **PHASE 3: COMPONENT TESTING**
   For each suspect component, provide:
   • **Exact test procedure** (step-by-step with multimeter settings)
   • **Expected values** (voltage, resistance, pressure, flow rates)
   • **Connector pin-outs** (describe which pins to test)
   • **Pass/Fail criteria** (specific numbers)
   
   Examples:
   - "MAF Sensor: Key on, backprobe pins 1 & 3, should read 12V±0.5V"
   - "Fuel pressure: Connect gauge to test port, key on = 55-62 PSI, running = 58-65 PSI"
   - "O2 Sensor: Warm engine, graph voltage, should cycle 0.1-0.9V every 1-3 seconds"

   **PHASE 4: COMPONENT LOCATIONS**
   • Exact location of each component (be specific: "behind glove box, left side, silver connector")
   • Access procedures (what needs removal to access)
   • Connector colors and pin counts

**4. COMPLETE REPAIR PROCEDURES**
For the most likely issues, provide:

   **A. PARTS REQUIRED**
   • OEM part numbers (or generic equivalent description)
   • Gaskets, seals, fluids needed
   • Special tools required
   • Estimated cost ranges

   **B. STEP-BY-STEP REPAIR** (20-30 detailed steps)
   Example format:
   ```
   1. Disconnect battery negative terminal, wait 2 minutes
   2. Remove air intake tube (2x 8mm bolts, 1x hose clamp)
   3. Disconnect MAF sensor connector (press tab, pull straight)
   4. Remove MAF sensor (2x T25 Torx screws)
   5. Clean throttle body with MAF cleaner (spray 3-4 times)
   ...
   20. Reconnect battery
   21. Start engine, let idle for 30 seconds
   22. Perform relearn procedure: [specific steps]
   ```

   **C. TORQUE SPECIFICATIONS**
   • List ALL fastener torques (ft-lbs and N⋅m)
   • Torque sequence if critical
   • Thread locker requirements

   **D. FLUID SPECIFICATIONS**
   • Exact fluid types (DOT 3, 5W-20 synthetic, Dexron VI, etc.)
   • Capacities in quarts/liters
   • Fill procedures

**5. TESTING & VERIFICATION**
   • How to verify the repair worked
   • What values should now be correct
   • Test drive procedures
   • How to clear codes and verify they don't return
   • Relearn procedures (idle, fuel trim, transmission, etc.)

**6. ADDITIONAL TECHNICAL DETAILS**

   **For AUTOMOTIVE AC Systems:**
   • Static pressure chart (ambient temp vs. expected PSI)
   • Dynamic pressures (low side: 25-45 PSI, high side: 200-250 PSI at 75°F)
   • Refrigerant capacity (oz/grams)
   • Compressor oil type and capacity
   • Superheat/subcooling calculations
   • Evaporator temp (38-42°F)

   **For HYDRAULIC Systems:**
   • System pressure specs (e.g., "Main relief: 3000 PSI")
   • Flow rates (GPM)
   • Cylinder rod sizes and bore
   • Oil viscosity grades (ISO VG 46, etc.)
   • Filter micron ratings
   • Accumulator pre-charge (typically 90% of system pressure)

   **For ELECTRICAL Systems:**
   • Circuit diagrams (describe wire colors, connector types)
   • Fuse/relay locations and amperage ratings
   • Voltage drop testing procedures (max 0.2V on ground, 0.4V on power)
   • Wire gauge requirements for repairs
   • Ground point locations

   **For HVAC Systems:**
   • Refrigerant type (R-410A, R-22, etc.)
   • Pressure/temp charts
   • Capacitor ratings (run: 35-45 MFD, start: 88-108 MFD)
   • Amperage draws for compressor/fan motors
   • Airflow calculations (CFM = tons × 400)
   • Duct static pressure limits

**7. KNOWN ISSUES & TSBs**
   • Common failures for this year/make/model
   • TSB (Technical Service Bulletin) numbers and descriptions
   • Recalls related to these symptoms
   • Aftermarket solution improvements
   • Forums/common mechanic knowledge

**8. PROCESS OF ELIMINATION FLOWCHART**
Present as a decision tree:
```
Start → Test A → Result Good? → Test B → Result Good? → Test C
                ↓ Bad                    ↓ Bad              ↓ Bad
           Repair/Replace A    Repair/Replace B   Repair/Replace C
```

**9. SAFETY WARNINGS**
   • Specific hazards (high pressure, high voltage, hot surfaces)
   • Required PPE (safety glasses, gloves, face shield)
   • Depressurization procedures
   • Lockout/tagout requirements
   • Proper lifting points and support

**10. SPECIAL NOTES**
   • Common mistakes to avoid
   • Tips from experienced techs
   • Time estimates for repairs
   • Difficulty rating (novice/intermediate/advanced)

═══════════════════════════════════════════════════════════════

**RESPONSE FORMAT:**
- Use clear headings and sections
- Include specific numbers, values, and measurements
- Provide both metric and imperial units
- Use bullet points and numbered lists
- Be comprehensive but organized

**CRITICAL RULES:**
- DO NOT ask for more information - provide maximum detail with what you have
- DO NOT suggest uploading diagrams - describe procedures in text
- DO NOT give vague advice - be specific with numbers and procedures
- DO NOT hold back - provide professional-level technical detail
- DO provide 2000+ words of comprehensive diagnostic and repair information

Your goal is to give the technician EVERYTHING they need to diagnose and repair the issue in ONE comprehensive response."""
    
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
