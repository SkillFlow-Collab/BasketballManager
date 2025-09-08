from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import os
import logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
from pathlib import Path
from pydantic import BaseModel, Field
from pydantic.json import ENCODERS_BY_TYPE
from typing import List, Optional
from enum import Enum
import uuid
from datetime import datetime, date, timedelta
import jwt
import bcrypt
from bson import ObjectId

# Add ObjectId encoder for JSON serialization
ENCODERS_BY_TYPE[ObjectId] = str

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configuration
JWT_SECRET = (
    os.environ.get('JWT_SECRET') or
    os.environ.get('JWT_SECRET_KEY') or
    'replace-me-in-prod'  # fallback only for local/dev
)
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

ENVIRONMENT = os.environ.get('ENVIRONMENT', 'production')
ADMIN_RESET_TOKEN = os.environ.get('ADMIN_RESET_TOKEN')  # à définir dans Vercel (backend)
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://basketball-manager-msoh.vercel.app')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']

mongo_client: AsyncIOMotorClient = None
db = None

# DB ping helper for health endpoint
async def db_ping():
    try:
        await database.command("ping")
        return True, "ok"
    except Exception as e:
        logger.exception("DB ping failed: %s", e)
        return False, str(e)

# Security
security = HTTPBearer(auto_error=False)

# --- DB dependency (use global client) ---
async def get_database():
    yield db

app = FastAPI()

# --- FastAPI startup/shutdown events for MongoDB connection ---
@app.on_event("startup")
async def startup_event():
    global mongo_client, db
    mongo_client = AsyncIOMotorClient(mongo_url)
    db = mongo_client[DB_NAME]

@app.on_event("shutdown")
async def shutdown_event():
    global mongo_client
    if mongo_client:
        mongo_client.close()

# --- CORS (vercel + local) ---
from starlette.middleware.cors import CORSMiddleware

ALLOWED_ORIGINS = [FRONTEND_URL, "http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"^https://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=86400,
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Lightweight health endpoint for debugging
@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

# DB health endpoint
@app.get("/api/health/db")
async def health_db():
    ok, msg = await db_ping()
    if ok:
        return {"db": "ok"}
    raise HTTPException(status_code=500, detail=f"DB error: {msg}")

# Preflight handler for CORS OPTIONS requests
@app.options("/{rest_of_path:path}")
async def preflight(rest_of_path: str):
    return JSONResponse(content={"ok": True})

# Define Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    password_hash: str
    role: str  # 'admin' or 'coach'
    first_name: str
    last_name: str
    must_change_password: bool = False  # Force password change on first login
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None

class UserCreate(BaseModel):
    email: str
    password: str
    role: str
    first_name: str
    last_name: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    role: str
    first_name: str
    last_name: str
    must_change_password: bool
    last_login: Optional[datetime]

class LoginResponse(BaseModel):
    token: str
    user: UserResponse

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class Player(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    first_name: str
    last_name: str
    date_of_birth: date
    position: str
    coach_referent: Optional[str] = None
    photo: Optional[str] = None  # Base64 encoded photo
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PlayerCreate(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: date
    position: str
    coach_referent: Optional[str] = None
    photo: Optional[str] = None

class PlayerUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    position: Optional[str] = None
    coach_referent: Optional[str] = None
    photo: Optional[str] = None

class Session(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    player_ids: List[str]  # Changed from player_id to player_ids for multiple players
    session_date: date
    themes: List[str]  # Multiple themes can be selected
    trainers: List[str]  # Multiple trainers can be selected
    content_details: str  # Detailed content from coaches
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SessionCreate(BaseModel):
    player_ids: List[str]  # Changed from player_id to player_ids
    session_date: date
    themes: List[str]
    trainers: List[str]
    content_details: str
    notes: Optional[str] = None

class SessionUpdate(BaseModel):
    session_date: Optional[date] = None
    player_ids: Optional[List[str]] = None  # Changed from player_id to player_ids
    themes: Optional[List[str]] = None
    trainers: Optional[List[str]] = None
    content_details: Optional[str] = None
    notes: Optional[str] = None

class PlayerReport(BaseModel):
    player: Player
    total_sessions: int
    content_breakdown: dict
    trainer_breakdown: dict
    recent_sessions: List[Session]
    # Match statistics
    match_stats: Optional[dict] = None  # Will contain match-related statistics

class Coach(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    first_name: str
    last_name: str
    photo: Optional[str] = None  # Base64 encoded photo
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CoachCreate(BaseModel):
    first_name: str
    last_name: str
    photo: Optional[str] = None

class CoachUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    photo: Optional[str] = None

class CoachReport(BaseModel):
    coach: Coach
    total_sessions: int
    theme_breakdown: dict
    player_breakdown: dict
    recent_sessions: List[Session]

# Player Evaluation Models
class EvaluationAspect(BaseModel):
    name: str
    score: int  # 1-5 scale

class EvaluationTheme(BaseModel):
    name: str
    aspects: List[EvaluationAspect]
    average_score: Optional[float] = None

class PlayerEvaluation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    player_id: str
    evaluator_id: str  # Coach who made the evaluation
    evaluation_date: datetime = Field(default_factory=datetime.utcnow)
    evaluation_type: str = "initial"  # "initial" or "final"
    themes: List[EvaluationTheme]
    overall_average: Optional[float] = None
    notes: Optional[str] = None

class EvaluationCreate(BaseModel):
    player_id: str
    themes: List[EvaluationTheme]
    notes: Optional[str] = None
    evaluation_date: Optional[datetime] = None
    evaluation_type: Optional[str] = "initial"

class EvaluationUpdate(BaseModel):
    themes: Optional[List[EvaluationTheme]] = None
    notes: Optional[str] = None

# Collective Session and Attendance Models
class CollectiveSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_type: str  # U18, U21, CDF, Musculation
    session_date: date
    session_time: str  # e.g., "19:00"
    location: Optional[str] = None
    coach: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AttendanceStatus(str, Enum):
    PRESENT = "present"
    ABSENT = "absent"
    INJURED = "injured"
    OFF = "off"

class Attendance(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    collective_session_id: str
    player_id: str
    status: AttendanceStatus
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CollectiveSessionCreate(BaseModel):
    session_type: str
    session_date: date
    session_time: str
    location: Optional[str] = None
    coach: Optional[str] = None
    notes: Optional[str] = None

class AttendanceCreate(BaseModel):
    collective_session_id: str
    player_id: str
    status: AttendanceStatus
    notes: Optional[str] = None

class AttendanceUpdate(BaseModel):
    status: Optional[AttendanceStatus] = None
    notes: Optional[str] = None

# Match Models
class TeamType(str, Enum):
    U18 = "U18"
    U21 = "U21"

class Match(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    team: TeamType  # U18 or U21
    opponent: str
    match_date: date
    match_time: str  # e.g., "15:00"
    location: str
    is_home: bool  # True = domicile, False = extérieur
    competition: Optional[str] = None  # e.g., "Championnat Régional"
    final_score_us: Optional[int] = None
    final_score_opponent: Optional[int] = None
    coach: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class MatchCreate(BaseModel):
    team: TeamType
    opponent: str
    match_date: date
    match_time: str
    location: str
    is_home: bool
    competition: Optional[str] = None
    final_score_us: Optional[int] = None
    final_score_opponent: Optional[int] = None
    coach: Optional[str] = None
    notes: Optional[str] = None

class MatchUpdate(BaseModel):
    team: Optional[TeamType] = None
    opponent: Optional[str] = None
    match_date: Optional[date] = None
    match_time: Optional[str] = None
    location: Optional[str] = None
    is_home: Optional[bool] = None
    competition: Optional[str] = None
    final_score_us: Optional[int] = None
    final_score_opponent: Optional[int] = None
    coach: Optional[str] = None
    notes: Optional[str] = None

class MatchParticipation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    match_id: str
    player_id: str
    is_present: bool
    is_starter: bool  # True = dans le 5 de départ
    play_time: Optional[int] = None  # Temps de jeu en minutes
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class MatchParticipationCreate(BaseModel):
    match_id: str
    player_id: str
    is_present: bool
    is_starter: bool = False
    play_time: Optional[int] = None
    notes: Optional[str] = None

class MatchParticipationUpdate(BaseModel):
    is_present: Optional[bool] = None
    is_starter: Optional[bool] = None
    play_time: Optional[int] = None
    notes: Optional[str] = None

# Authentication functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_token(user_data: dict) -> str:
    payload = {
        'user_id': user_data['id'],
        'email': user_data['email'],
        'role': user_data['role'],
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials or not credentials.scheme or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_token(credentials.credentials)
        user = await database.users.find_one({"id": payload["user_id"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return User(**user)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("get_current_user error: %s", e)
        raise HTTPException(status_code=401, detail="Auth check failed")

async def get_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# Authentication endpoints
@api_router.post("/auth/login", response_model=LoginResponse)
async def login(login_data: UserLogin):
    try:
        user = await database.users.find_one({"email": login_data.email})
        if not user or not verify_password(login_data.password, user['password_hash']):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Update last login
        await database.users.update_one(
            {"id": user['id']},
            {"$set": {"last_login": datetime.utcnow()}}
        )

        token = create_token(user)
        user_response = UserResponse(
            id=user['id'],
            email=user['email'],
            role=user['role'],
            first_name=user['first_name'],
            last_name=user['last_name'],
            must_change_password=user.get('must_change_password', False),
            last_login=user.get('last_login')
        )
        return LoginResponse(token=token, user=user_response)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Login failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")

class ResetAdminBody(BaseModel):
    email: Optional[str] = "admin@staderochelais.com"
    password: Optional[str] = "admin123"
    first_name: Optional[str] = "Admin"
    last_name: Optional[str] = "Stade Rochelais"

@api_router.get("/dev/admin-status")
async def admin_status(request: Request):
    try:
        if not ADMIN_RESET_TOKEN or request.headers.get("x-admin-reset") != ADMIN_RESET_TOKEN:
            raise HTTPException(status_code=403, detail="Forbidden")
        total = await database.users.count_documents({})
        admin_doc = await database.users.find_one({"role": "admin"})
        default_email_doc = await database.users.find_one({"email": "admin@staderochelais.com"})
        return {
            "total_users": total,
            "has_admin": bool(admin_doc),
            "has_default_email": bool(default_email_doc)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("admin-status error: %s", e)
        raise HTTPException(status_code=500, detail=f"Admin status error: {str(e)}")

@api_router.post("/dev/reset-admin")
async def dev_reset_admin(body: ResetAdminBody, request: Request):
    try:
        if not ADMIN_RESET_TOKEN or request.headers.get("x-admin-reset") != ADMIN_RESET_TOKEN:
            raise HTTPException(status_code=403, detail="Forbidden")

        pwd_hash = hash_password(body.password)
        now = datetime.utcnow()
        existing = await database.users.find_one({"email": body.email})
        data = {
            "email": body.email,
            "password_hash": pwd_hash,
            "role": "admin",
            "first_name": body.first_name,
            "last_name": body.last_name,
            "must_change_password": False,
            "last_login": None,
        }
        if existing:
            await database.users.update_one({"email": body.email}, {"$set": data})
            user_id = existing.get("id")
            action = "updated"
        else:
            new_user = {"id": str(uuid.uuid4()), **data, "created_at": now}
            await database.users.insert_one(new_user)
            user_id = new_user["id"]
            action = "created"

        logger.info("Admin %s via dev endpoint for email=%s", action, body.email)
        return {"ok": True, "action": action, "user_id": user_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("reset-admin error: %s", e)
        raise HTTPException(status_code=500, detail=f"Reset admin error: {str(e)}")

# Environment sanity-check endpoint
@api_router.get("/dev/check-env")
async def dev_check_env(request: Request):
    if not ADMIN_RESET_TOKEN or request.headers.get("x-admin-reset") != ADMIN_RESET_TOKEN:
        raise HTTPException(status_code=403, detail="Forbidden")
    return {
        "MONGO_URL_set": bool(os.environ.get("MONGO_URL")),
        "DB_NAME_set": bool(os.environ.get("DB_NAME")),
        "JWT_SECRET_set": bool(JWT_SECRET and JWT_SECRET != "replace-me-in-prod"),
        "ENVIRONMENT": ENVIRONMENT,
    }

@api_router.post("/auth/create-user", response_model=UserResponse)
async def create_user(user_data: UserCreate, current_user: User = Depends(get_current_user), database = Depends(get_database)):
    # Check if user already exists
    existing_user = await database.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    # Create new user with must_change_password = True
    password_hash = hash_password(user_data.password)
    user_dict = user_data.dict()
    user_dict['password_hash'] = password_hash
    user_dict['must_change_password'] = True  # Force password change on first login
    del user_dict['password']
    
    user_obj = User(**user_dict)
    await database.users.insert_one(user_obj.dict())
    
    return UserResponse(
        id=user_obj.id,
        email=user_obj.email,
        role=user_obj.role,
        first_name=user_obj.first_name,
        last_name=user_obj.last_name,
        must_change_password=user_obj.must_change_password,
        last_login=user_obj.last_login
    )

@api_router.get("/auth/users", response_model=List[UserResponse])
async def get_users(current_user: User = Depends(get_current_user), database = Depends(get_database)):
    users = await database.users.find().to_list(1000)
    return [UserResponse(
        id=user['id'],
        email=user['email'],
        role=user['role'],
        first_name=user['first_name'],
        last_name=user['last_name'],
        must_change_password=user.get('must_change_password', False),
        last_login=user.get('last_login')
    ) for user in users]

@api_router.delete("/auth/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(get_current_user), database = Depends(get_database)):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    result = await database.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}

@api_router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        role=current_user.role,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        must_change_password=current_user.must_change_password,
        last_login=current_user.last_login
    )

@api_router.post("/auth/change-password")
async def change_password(password_data: ChangePasswordRequest, current_user: User = Depends(get_current_user), database = Depends(get_database)):
    # Verify current password
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Hash new password
    new_password_hash = hash_password(password_data.new_password)
    
    # Update user password and remove must_change_password flag
    await database.users.update_one(
        {"id": current_user.id},
        {"$set": {
            "password_hash": new_password_hash,
            "must_change_password": False
        }}
    )
    
    return {"message": "Password changed successfully"}

# Player endpoints (with auth protection)
@api_router.post("/players", response_model=Player)
async def create_player(player_data: PlayerCreate, current_user: User = Depends(get_current_user), database = Depends(get_database)):
    player_dict = player_data.dict()
    player_obj = Player(**player_dict)
    
    # Convert date objects to ISO format strings for MongoDB storage
    player_dict_for_db = player_obj.dict()
    if isinstance(player_dict_for_db["date_of_birth"], date):
        player_dict_for_db["date_of_birth"] = player_dict_for_db["date_of_birth"].isoformat()
    
    await database.players.insert_one(player_dict_for_db)
    return player_obj

@api_router.get("/players", response_model=List[Player])
async def get_players(current_user: User = Depends(get_current_user), database = Depends(get_database)):
    players = await database.players.find().to_list(1000)
    return [Player(**player) for player in players]

@api_router.get("/players/{player_id}", response_model=Player)
async def get_player(player_id: str, current_user: User = Depends(get_current_user), database = Depends(get_database)):
    player = await database.players.find_one({"id": player_id})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return Player(**player)

@api_router.put("/players/{player_id}", response_model=Player)
async def update_player(player_id: str, player_data: PlayerUpdate, current_user: User = Depends(get_current_user), database = Depends(get_database)):
    update_data = {k: v for k, v in player_data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    # Convert date objects to ISO format strings for MongoDB storage
    if "date_of_birth" in update_data and isinstance(update_data["date_of_birth"], date):
        update_data["date_of_birth"] = update_data["date_of_birth"].isoformat()
    
    result = await database.players.update_one({"id": player_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Player not found")
    
    updated_player = await database.players.find_one({"id": player_id})
    return Player(**updated_player)

@api_router.delete("/players/{player_id}")
async def delete_player(player_id: str, current_user: User = Depends(get_current_user), database = Depends(get_database)):
    result = await database.players.delete_one({"id": player_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # Also delete all sessions for this player
    await database.sessions.delete_many({"player_id": player_id})
    return {"message": "Player deleted successfully"}

# Coach endpoints (with auth protection)
@api_router.post("/coaches", response_model=Coach)
async def create_coach(coach_data: CoachCreate, current_user: User = Depends(get_current_user), database = Depends(get_database)):
    coach_dict = coach_data.dict()
    coach_obj = Coach(**coach_dict)
    await database.coaches.insert_one(coach_obj.dict())
    return coach_obj

@api_router.get("/coaches", response_model=List[Coach])
async def get_coaches(current_user: User = Depends(get_current_user), database = Depends(get_database)):
    coaches = await database.coaches.find().to_list(1000)
    return [Coach(**coach) for coach in coaches]

@api_router.get("/coaches/{coach_id}", response_model=Coach)
async def get_coach(coach_id: str, current_user: User = Depends(get_current_user), database = Depends(get_database)):
    coach = await database.coaches.find_one({"id": coach_id})
    if not coach:
        raise HTTPException(status_code=404, detail="Coach not found")
    return Coach(**coach)

@api_router.put("/coaches/{coach_id}", response_model=Coach)
async def update_coach(coach_id: str, coach_data: CoachUpdate, current_user: User = Depends(get_current_user), database = Depends(get_database)):
    update_data = {k: v for k, v in coach_data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = await database.coaches.update_one({"id": coach_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Coach not found")
    
    updated_coach = await database.coaches.find_one({"id": coach_id})
    return Coach(**updated_coach)

@api_router.delete("/coaches/{coach_id}")
async def delete_coach(coach_id: str, current_user: User = Depends(get_current_user), database = Depends(get_database)):
    result = await database.coaches.delete_one({"id": coach_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Coach not found")
    return {"message": "Coach deleted successfully"}

# Player Evaluation endpoints
@api_router.post("/evaluations", response_model=PlayerEvaluation)
async def create_evaluation(evaluation_data: EvaluationCreate, current_user: User = Depends(get_current_user), database = Depends(get_database)):
    # Verify player exists
    player = await database.players.find_one({"id": evaluation_data.player_id})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # Calculate averages for each theme and overall
    themes_with_averages = []
    total_score = 0
    total_aspects = 0
    
    for theme in evaluation_data.themes:
        if theme.aspects:
            theme_total = sum(aspect.score for aspect in theme.aspects)
            theme_average = theme_total / len(theme.aspects)
            theme.average_score = round(theme_average, 2)
            
            total_score += theme_total
            total_aspects += len(theme.aspects)
        else:
            theme.average_score = 0
        
        themes_with_averages.append(theme)
    
    overall_average = round(total_score / total_aspects, 2) if total_aspects > 0 else 0
    
    evaluation_type = evaluation_data.evaluation_type or "initial"
    
    # Check if an evaluation of this type already exists for this player
    existing_evaluation = await database.evaluations.find_one({
        "player_id": evaluation_data.player_id,
        "evaluation_type": evaluation_type
    })
    
    if existing_evaluation:
        # Update existing evaluation instead of creating a new one
        updated_evaluation = {
            "evaluator_id": current_user.id,
            "evaluation_date": evaluation_data.evaluation_date if hasattr(evaluation_data, 'evaluation_date') and evaluation_data.evaluation_date else datetime.utcnow(),
            "evaluation_type": evaluation_type,
            "themes": [theme.dict() for theme in themes_with_averages],
            "overall_average": overall_average,
            "notes": evaluation_data.notes
        }
        
        await database.evaluations.update_one(
            {"id": existing_evaluation["id"]},
            {"$set": updated_evaluation}
        )
        
        # Return the updated evaluation
        updated_eval = await database.evaluations.find_one({"id": existing_evaluation["id"]})
        return PlayerEvaluation(**updated_eval)
    else:
        # Create new evaluation
        evaluation_obj = PlayerEvaluation(
            player_id=evaluation_data.player_id,
            evaluator_id=current_user.id,
            evaluation_date=evaluation_data.evaluation_date if hasattr(evaluation_data, 'evaluation_date') and evaluation_data.evaluation_date else datetime.utcnow(),
            evaluation_type=evaluation_type,
            themes=themes_with_averages,
            overall_average=overall_average,
            notes=evaluation_data.notes
        )
        
        await database.evaluations.insert_one(evaluation_obj.dict())
        return evaluation_obj

@api_router.get("/evaluations/player/{player_id}", response_model=List[PlayerEvaluation])
async def get_player_evaluations(player_id: str, current_user: User = Depends(get_current_user), database = Depends(get_database)):
    evaluations = await database.evaluations.find({"player_id": player_id}).sort("evaluation_date", -1).to_list(100)
    return [PlayerEvaluation(**evaluation) for evaluation in evaluations]

@app.get("/api/evaluations/averages/all")
async def get_all_players_averages(current_user: User = Depends(get_current_user), database = Depends(get_database)):
    """Get evaluation averages for all players"""
    try:
        evaluations = await database.evaluations.find({}).to_list(1000)
        
        if not evaluations:
            return {"theme_averages": {}, "overall_average": 0, "total_evaluations": 0}
        
        # Calculate theme averages
        theme_totals = {}
        theme_counts = {}
        total_scores = 0
        total_aspects = 0
        
        for evaluation in evaluations:
            for theme in evaluation.get('themes', []):
                theme_name = theme.get('name')
                theme_score = theme.get('average_score', 0)
                
                if theme_name and theme_score > 0:
                    if theme_name not in theme_totals:
                        theme_totals[theme_name] = 0
                        theme_counts[theme_name] = 0
                    
                    theme_totals[theme_name] += theme_score
                    theme_counts[theme_name] += 1
                    total_scores += theme_score
                    total_aspects += 1
        
        # Calculate averages
        theme_averages = {}
        for theme_name in theme_totals:
            if theme_counts[theme_name] > 0:
                theme_averages[theme_name] = round(theme_totals[theme_name] / theme_counts[theme_name], 2)
        
        overall_average = round(total_scores / total_aspects, 2) if total_aspects > 0 else 0
        
        return {
            "theme_averages": theme_averages,
            "overall_average": overall_average,
            "total_evaluations": len(evaluations)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating averages: {str(e)}")

@app.get("/api/evaluations/averages/position/{position}")
async def get_position_averages(position: str, current_user: User = Depends(get_current_user), database = Depends(get_database)):
    """Get evaluation averages for players of a specific position"""
    try:
        # Get players of the specified position
        players = await database.players.find({"position": position}).to_list(100)
        player_ids = [player["id"] for player in players]
        
        if not player_ids:
            return {"theme_averages": {}, "overall_average": 0, "players_count": 0, "total_evaluations": 0}
        
        # Get evaluations for these players
        evaluations = await database.evaluations.find({"player_id": {"$in": player_ids}}).to_list(1000)
        
        if not evaluations:
            return {"theme_averages": {}, "overall_average": 0, "players_count": len(player_ids), "total_evaluations": 0}
        
        # Calculate theme averages
        theme_totals = {}
        theme_counts = {}
        total_scores = 0
        total_aspects = 0
        
        for evaluation in evaluations:
            for theme in evaluation.get('themes', []):
                theme_name = theme.get('name')
                theme_score = theme.get('average_score', 0)
                
                if theme_name and theme_score > 0:
                    if theme_name not in theme_totals:
                        theme_totals[theme_name] = 0
                        theme_counts[theme_name] = 0
                    
                    theme_totals[theme_name] += theme_score
                    theme_counts[theme_name] += 1
                    total_scores += theme_score
                    total_aspects += 1
        
        # Calculate averages
        theme_averages = {}
        for theme_name in theme_totals:
            if theme_counts[theme_name] > 0:
                theme_averages[theme_name] = round(theme_totals[theme_name] / theme_counts[theme_name], 2)
        
        overall_average = round(total_scores / total_aspects, 2) if total_aspects > 0 else 0
        
        return {
            "theme_averages": theme_averages,
            "overall_average": overall_average,
            "players_count": len(player_ids),
            "total_evaluations": len(evaluations),
            "position": position
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating position averages: {str(e)}")

@api_router.get("/evaluations/player/{player_id}/latest", response_model=PlayerEvaluation)
async def get_latest_player_evaluation(player_id: str, current_user: User = Depends(get_current_user), database = Depends(get_database)):
    evaluation = await database.evaluations.find_one(
        {"player_id": player_id}, 
        sort=[("evaluation_date", -1)]
    )
    if not evaluation:
        raise HTTPException(status_code=404, detail="No evaluation found for this player")
    return PlayerEvaluation(**evaluation)

@api_router.get("/evaluations/player/{player_id}/average")
async def get_player_evaluation_average(player_id: str, current_user: User = Depends(get_current_user), database = Depends(get_database)):
    evaluations = await database.evaluations.find({"player_id": player_id}).to_list(100)
    
    if not evaluations:
        raise HTTPException(status_code=404, detail="No evaluations found for this player")
    
    # Calculate average scores for each theme across all evaluations
    theme_totals = {}
    theme_counts = {}
    
    for evaluation in evaluations:
        for theme in evaluation.get("themes", []):
            theme_name = theme["name"]
            if theme_name not in theme_totals:
                theme_totals[theme_name] = 0
                theme_counts[theme_name] = 0
            
            if theme.get("average_score"):
                theme_totals[theme_name] += theme["average_score"]
                theme_counts[theme_name] += 1
    
    # Calculate averages
    theme_averages = {}
    for theme_name in theme_totals:
        if theme_counts[theme_name] > 0:
            theme_averages[theme_name] = round(theme_totals[theme_name] / theme_counts[theme_name], 2)
    
    # Calculate overall average
    if theme_averages:
        overall_average = round(sum(theme_averages.values()) / len(theme_averages), 2)
    else:
        overall_average = 0
    
    return {
        "player_id": player_id,
        "theme_averages": theme_averages,
        "overall_average": overall_average,
        "evaluation_count": len(evaluations)
    }

@api_router.get("/evaluations/averages/all")
async def get_all_players_averages(current_user: User = Depends(get_current_user), database = Depends(get_database)):
    """Get average scores across all players"""
    evaluations = await database.evaluations.find().to_list(1000)
    
    if not evaluations:
        return {"theme_averages": {}, "overall_average": 0, "total_evaluations": 0}
    
    theme_totals = {}
    theme_counts = {}
    
    for evaluation in evaluations:
        for theme in evaluation.get("themes", []):
            theme_name = theme["name"]
            if theme_name not in theme_totals:
                theme_totals[theme_name] = 0
                theme_counts[theme_name] = 0
            
            if theme.get("average_score"):
                theme_totals[theme_name] += theme["average_score"]
                theme_counts[theme_name] += 1
    
    theme_averages = {}
    for theme_name in theme_totals:
        if theme_counts[theme_name] > 0:
            theme_averages[theme_name] = round(theme_totals[theme_name] / theme_counts[theme_name], 2)
    
    overall_average = round(sum(theme_averages.values()) / len(theme_averages), 2) if theme_averages else 0
    
    return {
        "theme_averages": theme_averages,
        "overall_average": overall_average,
        "total_evaluations": len(evaluations)
    }

@api_router.get("/evaluations/averages/position/{position}")
async def get_position_averages(position: str, current_user: User = Depends(get_current_user), database = Depends(get_database)):
    """Get average scores for players of a specific position"""
    # Get all players of this position
    players = await database.players.find({"position": position}).to_list(1000)
    player_ids = [player["id"] for player in players]
    
    if not player_ids:
        return {"theme_averages": {}, "overall_average": 0, "total_evaluations": 0}
    
    # Get evaluations for these players
    evaluations = await database.evaluations.find({"player_id": {"$in": player_ids}}).to_list(1000)
    
    if not evaluations:
        return {"theme_averages": {}, "overall_average": 0, "total_evaluations": 0}
    
    theme_totals = {}
    theme_counts = {}
    
    for evaluation in evaluations:
        for theme in evaluation.get("themes", []):
            theme_name = theme["name"]
            if theme_name not in theme_totals:
                theme_totals[theme_name] = 0
                theme_counts[theme_name] = 0
            
            if theme.get("average_score"):
                theme_totals[theme_name] += theme["average_score"]
                theme_counts[theme_name] += 1
    
    theme_averages = {}
    for theme_name in theme_totals:
        if theme_counts[theme_name] > 0:
            theme_averages[theme_name] = round(theme_totals[theme_name] / theme_counts[theme_name], 2)
    
    overall_average = round(sum(theme_averages.values()) / len(theme_averages), 2) if theme_averages else 0
    
    return {
        "position": position,
        "theme_averages": theme_averages,
        "overall_average": overall_average,
        "total_evaluations": len(evaluations),
        "players_count": len(players)
    }

@app.delete("/api/evaluations/{evaluation_id}")
async def delete_evaluation(evaluation_id: str, current_user: User = Depends(get_current_user), database = Depends(get_database)):
    """Delete a specific evaluation"""
    try:
        result = await database.evaluations.delete_one({"id": evaluation_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Evaluation not found")
        return {"message": "Evaluation deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting evaluation: {str(e)}")

@app.get("/api/evaluations")
async def get_all_evaluations(current_user: User = Depends(get_current_user), database = Depends(get_database)):
    """Get all evaluations (for admin purposes)"""
    try:
        evaluations = await database.evaluations.find({}).to_list(1000)
        return evaluations
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching evaluations: {str(e)}")

# Collective Sessions endpoints
@api_router.post("/collective-sessions", response_model=CollectiveSession)
async def create_collective_session(session_data: CollectiveSessionCreate, current_user: User = Depends(get_current_user), database = Depends(get_database)):
    session_obj = CollectiveSession(**session_data.dict())
    
    # Convert date objects to ISO format strings for MongoDB storage
    session_dict_for_db = session_obj.dict()
    if isinstance(session_dict_for_db["session_date"], date):
        session_dict_for_db["session_date"] = session_dict_for_db["session_date"].isoformat()
    
    await database.collective_sessions.insert_one(session_dict_for_db)
    return session_obj

@api_router.get("/collective-sessions", response_model=List[CollectiveSession])
async def get_collective_sessions(
    month: Optional[int] = None,
    year: Optional[int] = None,
    session_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    database = Depends(get_database)
):
    query = {}
    
    if month and year:
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1)
        else:
            end_date = date(year, month + 1, 1)
        
        query["session_date"] = {
            "$gte": start_date.isoformat(),
            "$lt": end_date.isoformat()
        }
    
    if session_type:
        query["session_type"] = session_type
    
    sessions = await database.collective_sessions.find(query).sort("session_date", -1).to_list(100)
    return [CollectiveSession(**session) for session in sessions]

@api_router.get("/collective-sessions/{session_id}", response_model=CollectiveSession)
async def get_collective_session(session_id: str, current_user: User = Depends(get_current_user), database = Depends(get_database)):
    session = await database.collective_sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Collective session not found")
    return CollectiveSession(**session)

@api_router.put("/collective-sessions/{session_id}", response_model=CollectiveSession)
async def update_collective_session(session_id: str, session_data: CollectiveSessionCreate, current_user: User = Depends(get_current_user), database = Depends(get_database)):
    # Convert date objects to ISO format strings for MongoDB storage
    update_data = session_data.dict()
    if "session_date" in update_data and isinstance(update_data["session_date"], date):
        update_data["session_date"] = update_data["session_date"].isoformat()
    
    result = await database.collective_sessions.update_one(
        {"id": session_id}, 
        {"$set": update_data}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Collective session not found")
    
    updated_session = await database.collective_sessions.find_one({"id": session_id})
    return CollectiveSession(**updated_session)

@api_router.delete("/collective-sessions/{session_id}")
async def delete_collective_session(session_id: str, current_user: User = Depends(get_current_user), database = Depends(get_database)):
    # Also delete all attendances for this session
    await database.attendances.delete_many({"collective_session_id": session_id})
    
    result = await database.collective_sessions.delete_one({"id": session_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Collective session not found")
    return {"message": "Collective session deleted successfully"}

# Match endpoints
@api_router.post("/matches", response_model=Match)
async def create_match(match_data: MatchCreate, current_user: User = Depends(get_current_user), database = Depends(get_database)):
    match_obj = Match(**match_data.dict())
    
    # Convert to dict and handle date serialization
    match_dict_for_db = match_obj.dict()
    match_dict_for_db['match_date'] = match_obj.match_date.isoformat()
    
    await database.matches.insert_one(match_dict_for_db)
    return match_obj

@api_router.get("/matches", response_model=List[Match])
async def get_matches(
    month: Optional[int] = None,
    year: Optional[int] = None,
    team: Optional[TeamType] = None,
    current_user: User = Depends(get_current_user),
    database = Depends(get_database)
):
    query = {}
    
    # Filter by month and year if provided
    if month is not None and year is not None:
        start_date = f"{year}-{month:02d}-01"
        if month == 12:
            end_date = f"{year + 1}-01-01"
        else:
            end_date = f"{year}-{month + 1:02d}-01"
        
        query["match_date"] = {
            "$gte": start_date,
            "$lt": end_date
        }
    
    # Filter by team if provided
    if team:
        query["team"] = team
    
    matches = await database.matches.find(query).sort("match_date", -1).to_list(100)
    return [Match(**match) for match in matches]

@api_router.get("/matches/{match_id}", response_model=Match)
async def get_match(match_id: str, current_user: User = Depends(get_current_user), database = Depends(get_database)):
    match = await database.matches.find_one({"id": match_id})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return Match(**match)

@api_router.put("/matches/{match_id}", response_model=Match)
async def update_match(match_id: str, match_data: MatchUpdate, current_user: User = Depends(get_current_user), database = Depends(get_database)):
    # Build update data excluding None values
    update_data = {k: v for k, v in match_data.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data provided for update")
    
    # Handle date serialization if date is being updated
    if 'match_date' in update_data:
        update_data['match_date'] = update_data['match_date'].isoformat()
    
    result = await database.matches.update_one(
        {"id": match_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Return updated match
    updated_match = await database.matches.find_one({"id": match_id})
    return Match(**updated_match)

@api_router.delete("/matches/{match_id}")
async def delete_match(match_id: str, current_user: User = Depends(get_current_user), database = Depends(get_database)):
    # Also delete all participations for this match
    await database.match_participations.delete_many({"match_id": match_id})
    
    result = await database.matches.delete_one({"id": match_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Match not found")
    return {"message": "Match deleted successfully"}

# Match Participation endpoints
@api_router.post("/match-participations", response_model=MatchParticipation)
async def create_match_participation(participation_data: MatchParticipationCreate, current_user: User = Depends(get_current_user), database = Depends(get_database)):
    # Check if participation already exists for this player and match
    existing_participation = await database.match_participations.find_one({
        "match_id": participation_data.match_id,
        "player_id": participation_data.player_id
    })
    
    if existing_participation:
        # Update existing participation
        update_data = participation_data.dict()
        await database.match_participations.update_one(
            {"id": existing_participation["id"]},
            {"$set": update_data}
        )
        updated_participation = await database.match_participations.find_one({"id": existing_participation["id"]})
        return MatchParticipation(**updated_participation)
    else:
        # Create new participation
        participation_obj = MatchParticipation(**participation_data.dict())
        participation_dict_for_db = participation_obj.dict()
        await database.match_participations.insert_one(participation_dict_for_db)
        return participation_obj

@api_router.get("/match-participations/match/{match_id}", response_model=List[dict])
async def get_match_participations(match_id: str, current_user: User = Depends(get_current_user), database = Depends(get_database)):
    participations = await database.match_participations.find({"match_id": match_id}).to_list(100)
    player_tasks = [database.players.find_one({"id": p["player_id"]}) for p in participations]
    players = await asyncio.gather(*player_tasks)

    result = []
    for participation, player in zip(participations, players):
        if player:
            result.append({"participation": MatchParticipation(**participation), "player": Player(**player)})
    return result

@api_router.get("/match-participations/player/{player_id}", response_model=List[dict])
async def get_player_match_participations(player_id: str, current_user: User = Depends(get_current_user), database = Depends(get_database)):
    participations = await database.match_participations.find({"player_id": player_id}).to_list(100)
    match_tasks = [database.matches.find_one({"id": p["match_id"]}) for p in participations]
    matches = await asyncio.gather(*match_tasks)

    result = []
    for participation, match in zip(participations, matches):
        if match:
            result.append({"participation": MatchParticipation(**participation), "match": Match(**match)})
    return result

@api_router.put("/match-participations/{participation_id}", response_model=MatchParticipation)
async def update_match_participation(participation_id: str, participation_data: MatchParticipationUpdate, current_user: User = Depends(get_current_user), database = Depends(get_database)):
    # Build update data excluding None values
    update_data = {k: v for k, v in participation_data.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data provided for update")
    
    result = await database.match_participations.update_one(
        {"id": participation_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Match participation not found")
    
    # Return updated participation
    updated_participation = await database.match_participations.find_one({"id": participation_id})
    return MatchParticipation(**updated_participation)

@api_router.delete("/match-participations/{participation_id}")
async def delete_match_participation(participation_id: str, current_user: User = Depends(get_current_user), database = Depends(get_database)):
    result = await database.match_participations.delete_one({"id": participation_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Match participation not found")
    return {"message": "Match participation deleted successfully"}

# Attendance endpoints
@api_router.post("/attendances", response_model=Attendance)
async def create_attendance(attendance_data: AttendanceCreate, current_user: User = Depends(get_current_user), database = Depends(get_database)):
    # Check if attendance already exists for this player and session
    existing_attendance = await database.attendances.find_one({
        "collective_session_id": attendance_data.collective_session_id,
        "player_id": attendance_data.player_id
    })
    
    if existing_attendance:
        # Update existing attendance
        result = await database.attendances.update_one(
            {"id": existing_attendance["id"]},
            {"$set": attendance_data.dict()}
        )
        updated_attendance = await database.attendances.find_one({"id": existing_attendance["id"]})
        return Attendance(**updated_attendance)
    else:
        # Create new attendance
        attendance_obj = Attendance(**attendance_data.dict())
        await database.attendances.insert_one(attendance_obj.dict())
        return attendance_obj

@api_router.get("/attendances/session/{session_id}")
async def get_session_attendances(session_id: str, current_user: User = Depends(get_current_user)):
    attendances = await database.attendances.find({"collective_session_id": session_id}).to_list(100)
    player_tasks = [database.players.find_one({"id": a["player_id"]}) for a in attendances]
    players = await asyncio.gather(*player_tasks)

    result = []
    for attendance, player in zip(attendances, players):
        if player:
            result.append({**attendance, "player": player})
    return result

@api_router.get("/attendances/player/{player_id}")
async def get_player_attendances(
    player_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    database = Depends(get_database)
):
    # Get all attendances for the player
    attendances = await database.attendances.find({"player_id": player_id}).to_list(1000)
    
    # Get session info for each attendance
    result = []
    for attendance in attendances:
        session = await database.collective_sessions.find_one({"id": attendance["collective_session_id"]})
        if session:
            # Apply date filter if provided
            if start_date and end_date:
                session_date = datetime.fromisoformat(session["session_date"])
                filter_start = datetime.fromisoformat(start_date)
                filter_end = datetime.fromisoformat(end_date)
                
                if not (filter_start <= session_date <= filter_end):
                    continue
            
            attendance_with_session = {
                **attendance,
                "session": session
            }
            result.append(attendance_with_session)
    
    # Sort by session date
    result.sort(key=lambda x: x["session"]["session_date"], reverse=True)
    return result

@api_router.get("/attendances/reports/player/{player_id}")
async def get_player_attendance_report(
    player_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    database = Depends(get_database)
):
    # Get player info
    player = await database.players.find_one({"id": player_id})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # Get all attendances for the player
    attendances = await database.attendances.find({"player_id": player_id}).to_list(1000)
    
    # Get session info and apply filters
    attendance_data = []
    for attendance in attendances:
        session = await database.collective_sessions.find_one({"id": attendance["collective_session_id"]})
        if session:
            # Convert session_date to datetime for comparison
            if isinstance(session["session_date"], str):
                session_date = datetime.fromisoformat(session["session_date"])
            elif isinstance(session["session_date"], date):
                session_date = datetime.combine(session["session_date"], datetime.min.time())
            else:
                # Skip if we can't parse the date
                continue
            
            # Apply date filter
            if start_date and end_date:
                filter_start = datetime.fromisoformat(start_date)
                filter_end = datetime.fromisoformat(end_date)
                if not (filter_start <= session_date <= filter_end):
                    continue
            
            attendance_data.append({
                "attendance": attendance,
                "session": session
            })
    
    # Calculate statistics
    stats = {
        "total_sessions": len(attendance_data),
        "present": 0,
        "absent": 0,
        "injured": 0,
        "off": 0,
        "by_type": {},
        "recent_attendances": []
    }
    
    for item in attendance_data:
        status = item["attendance"]["status"]
        session_type = item["session"]["session_type"]
        
        # Count by status
        if status == "present":
            stats["present"] += 1
        elif status == "absent":
            stats["absent"] += 1
        elif status == "injured":
            stats["injured"] += 1
        elif status == "off":
            stats["off"] += 1
        
        # Count by session type
        if session_type not in stats["by_type"]:
            stats["by_type"][session_type] = {
                "total": 0,
                "present": 0,
                "absent": 0,
                "injured": 0,
                "off": 0
            }
        
        stats["by_type"][session_type]["total"] += 1
        stats["by_type"][session_type][status] += 1
    
    # Get recent attendances (last 10)
    recent_data = sorted(attendance_data, key=lambda x: x["session"]["session_date"], reverse=True)[:10]
    stats["recent_attendances"] = [
        {
            "session_date": item["session"]["session_date"],
            "session_type": item["session"]["session_type"],
            "status": item["attendance"]["status"],
            "notes": item["attendance"].get("notes", "")
        }
        for item in recent_data
    ]
    
    # Calculate percentages
    if stats["total_sessions"] > 0:
        stats["presence_rate"] = round((stats["present"] / stats["total_sessions"]) * 100, 1)
        stats["absence_rate"] = round((stats["absent"] / stats["total_sessions"]) * 100, 1)
        stats["injury_rate"] = round((stats["injured"] / stats["total_sessions"]) * 100, 1)
    else:
        stats["presence_rate"] = 0
        stats["absence_rate"] = 0
        stats["injury_rate"] = 0
    
    return {
        "player": player,
        "statistics": stats
    }

@api_router.post("/sessions", response_model=Session)
async def create_session(session_data: SessionCreate, current_user: User = Depends(get_current_user), database = Depends(get_database)):
    # Verify all players exist
    for player_id in session_data.player_ids:
        player = await database.players.find_one({"id": player_id})
        if not player:
            raise HTTPException(status_code=404, detail=f"Player with id {player_id} not found")
    
    session_dict = session_data.dict()
    session_obj = Session(**session_dict)
    
    # Convert date objects to ISO format strings for MongoDB storage
    session_dict_for_db = session_obj.dict()
    if isinstance(session_dict_for_db["session_date"], date):
        session_dict_for_db["session_date"] = session_dict_for_db["session_date"].isoformat()
    
    await database.sessions.insert_one(session_dict_for_db)
    return session_obj

@api_router.get("/sessions", response_model=List[Session])
async def get_sessions(current_user: User = Depends(get_current_user), database = Depends(get_database)):
    sessions = await database.sessions.find().sort("session_date", -1).to_list(1000)
    result = []
    for session in sessions:
        # Handle both old and new format
        if "themes" not in session:
            # Convert old format to new format
            session["themes"] = [session.get("content", "")] if session.get("content") else []
            session["trainers"] = [session.get("trainer", "")] if session.get("trainer") else []
            session["content_details"] = session.get("results", "")
        
        # Handle both old single player and new multiple players format
        if "player_id" in session and "player_ids" not in session:
            # Convert old single player format to new multiple players format
            session["player_ids"] = [session["player_id"]]
            del session["player_id"]
        
        result.append(Session(**session))
    return result

@api_router.get("/sessions/player/{player_id}", response_model=List[Session])
async def get_player_sessions(player_id: str, current_user: User = Depends(get_current_user), database = Depends(get_database)):
    # Find sessions where the player is in player_ids array OR in old player_id field
    sessions = await database.sessions.find({
        "$or": [
            {"player_ids": {"$in": [player_id]}},
            {"player_id": player_id}  # For backward compatibility
        ]
    }).sort("session_date", -1).to_list(1000)
    
    result = []
    for session in sessions:
        # Handle both old and new format
        if "themes" not in session:
            # Convert old format to new format
            session["themes"] = [session.get("content", "")] if session.get("content") else []
            session["trainers"] = [session.get("trainer", "")] if session.get("trainer") else []
            session["content_details"] = session.get("results", "")
        
        # Handle both old single player and new multiple players format
        if "player_id" in session and "player_ids" not in session:
            session["player_ids"] = [session["player_id"]]
            del session["player_id"]
        
        result.append(Session(**session))
    return result

@api_router.get("/sessions/{session_id}", response_model=Session)
async def get_session(session_id: str, current_user: User = Depends(get_current_user), database = Depends(get_database)):
    session = await database.sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Handle both old and new format
    if "themes" not in session:
        # Convert old format to new format
        session["themes"] = [session.get("content", "")] if session.get("content") else []
        session["trainers"] = [session.get("trainer", "")] if session.get("trainer") else []
        session["content_details"] = session.get("results", "")
    
    return Session(**session)

@api_router.put("/sessions/{session_id}", response_model=Session)
async def update_session(session_id: str, session_data: SessionUpdate, current_user: User = Depends(get_current_user), database = Depends(get_database)):
    update_data = {k: v for k, v in session_data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    # Convert date objects to ISO format strings for MongoDB storage
    if "session_date" in update_data and isinstance(update_data["session_date"], date):
        update_data["session_date"] = update_data["session_date"].isoformat()
    
    result = await database.sessions.update_one({"id": session_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    
    updated_session = await database.sessions.find_one({"id": session_id})
    return Session(**updated_session)

@api_router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, current_user: User = Depends(get_current_user), database = Depends(get_database)):
    result = await database.sessions.delete_one({"id": session_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session deleted successfully"}

@api_router.get("/reports/player/{player_id}", response_model=PlayerReport)
async def get_player_report(player_id: str, current_user: User = Depends(get_current_user), start_date: Optional[str] = None, end_date: Optional[str] = None, database = Depends(get_database)):
    base_query = {
        "$or": [
            {"player_ids": {"$in": [player_id]}},
            {"player_id": player_id}
        ]
    }
    if start_date and end_date:
        base_query["session_date"] = {"$gte": start_date, "$lte": end_date}

    player_task = database.players.find_one({"id": player_id})
    sessions_task = database.sessions.find(base_query).to_list(1000)
    participations_task = database.match_participations.find({"player_id": player_id}).to_list(1000)

    player, sessions, match_participations = await asyncio.gather(player_task, sessions_task, participations_task)

    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # Build query for sessions where this player is involved
    base_query = {
        "$or": [
            {"player_ids": {"$in": [player_id]}},
            {"player_id": player_id}  # For backward compatibility
        ]
    }
    
    # Add date filter if provided
    if start_date and end_date:
        base_query["session_date"] = {
            "$gte": start_date,
            "$lte": end_date
        }
    
    # Get sessions for this player (filtered by date if provided)
    sessions = await database.sessions.find(base_query).to_list(1000)
    
    session_objects = []
    
    for session in sessions:
        # Handle both old and new format
        if "themes" not in session:
            # Convert old format to new format
            session["themes"] = [session.get("content", "")] if session.get("content") else []
            session["trainers"] = [session.get("trainer", "")] if session.get("trainer") else []
            session["content_details"] = session.get("results", "")
        
        # Handle both old single player and new multiple players format
        if "player_id" in session and "player_ids" not in session:
            session["player_ids"] = [session["player_id"]]
            # Remove old field to avoid conflicts
            del session["player_id"]
        elif "player_ids" not in session:
            # If neither field exists, create empty list
            session["player_ids"] = []
        
        # Remove MongoDB ObjectId field if present
        if "_id" in session:
            del session["_id"]
        
        session_objects.append(Session(**session))
    
    # Calculate statistics
    total_sessions = len(session_objects)
    
    # Theme breakdown (using converted session objects)
    content_breakdown = {}
    for session_obj in session_objects:
        themes = session_obj.themes or []
        for theme in themes:
            if theme.strip():  # Ignore empty themes
                content_breakdown[theme] = content_breakdown.get(theme, 0) + 1
    
    # Trainer breakdown (using converted session objects)
    trainer_breakdown = {}
    for session_obj in session_objects:
        trainers = session_obj.trainers or []
        for trainer in trainers:
            if trainer.strip():  # Ignore empty trainers
                trainer_breakdown[trainer] = trainer_breakdown.get(trainer, 0) + 1
    
    # Recent sessions (last 10)
    recent_sessions = sorted(session_objects, key=lambda x: x.session_date, reverse=True)[:10]
    
    # Get match statistics for this player
    match_participations = await database.match_participations.find({"player_id": player_id}).to_list(1000)
    match_stats = {
        "total_matches": len(match_participations),
        "matches_played": len([p for p in match_participations if p["is_present"]]),
        "matches_started": len([p for p in match_participations if p["is_present"] and p["is_starter"]]),
        "total_play_time": sum([p.get("play_time", 0) for p in match_participations if p["is_present"] and p.get("play_time")]),
        "average_play_time": 0,
        "average_play_time_u18": 0,
        "average_play_time_u21": 0,
        "team_breakdown": {},
        "recent_matches": []
    }
    
    # Calculate average play time (global and by team)
    played_matches = [p for p in match_participations if p["is_present"] and p.get("play_time")]
    u18_play_times = []
    u21_play_times = []
    
    if played_matches:
        match_stats["average_play_time"] = round(sum([p["play_time"] for p in played_matches]) / len(played_matches), 1)
    
    # Get match details for team breakdown and separate U18/U21 averages
    for participation in match_participations:
        match = await database.matches.find_one({"id": participation["match_id"]})
        if match:
            # Team breakdown
            team = match["team"]
            if team not in match_stats["team_breakdown"]:
                match_stats["team_breakdown"][team] = {
                    "total": 0,
                    "played": 0,
                    "started": 0
                }
            
            match_stats["team_breakdown"][team]["total"] += 1
            if participation["is_present"]:
                match_stats["team_breakdown"][team]["played"] += 1
                if participation["is_starter"]:
                    match_stats["team_breakdown"][team]["started"] += 1
                
                # Collect play times by team for separate averages
                if participation.get("play_time"):
                    if team == "U18":
                        u18_play_times.append(participation["play_time"])
                    elif team == "U21":
                        u21_play_times.append(participation["play_time"])
            
            # Recent matches (last 5)
            if len(match_stats["recent_matches"]) < 5:
                match_stats["recent_matches"].append({
                    "match": Match(**match),
                    "participation": MatchParticipation(**participation)
                })
    
    # Calculate separate averages for U18 and U21
    if u18_play_times:
        match_stats["average_play_time_u18"] = round(sum(u18_play_times) / len(u18_play_times), 1)
    
    if u21_play_times:
        match_stats["average_play_time_u21"] = round(sum(u21_play_times) / len(u21_play_times), 1)
    # Sort recent matches by date
    match_stats["recent_matches"] = sorted(
        match_stats["recent_matches"], 
        key=lambda x: x["match"].match_date, 
        reverse=True
    )[:5]
    
    return PlayerReport(
        player=Player(**player),
        total_sessions=total_sessions,
        content_breakdown=content_breakdown,
        trainer_breakdown=trainer_breakdown,
        recent_sessions=recent_sessions,
        match_stats=match_stats
    )

@api_router.get("/reports/coach/{coach_name}", response_model=CoachReport)
async def get_coach_report(coach_name: str, current_user: User = Depends(get_current_user), start_date: Optional[str] = None, end_date: Optional[str] = None, database = Depends(get_database)):
    query = {"trainers": {"$in": [coach_name]}}
    if start_date and end_date:
        query["session_date"] = {"$gte": start_date, "$lte": end_date}

    coach_task = database.coaches.find_one({
        "$or": [
            {"first_name": coach_name},
            {"last_name": coach_name},
            {"$expr": {"$eq": [{"$concat": ["$first_name", " ", "$last_name"]}, coach_name]}}
        ]
    })
    sessions_task = database.sessions.find(query).to_list(1000)
    players_task = database.players.find().to_list(1000)

    coach, sessions, players = await asyncio.gather(coach_task, sessions_task, players_task)

    if not coach:
        coach = {"id": "virtual", "first_name": coach_name, "last_name": "", "photo": None, "created_at": datetime.utcnow()}
    
    # Build query with date filter if provided
    query = {"trainers": {"$in": [coach_name]}}
    if start_date and end_date:
        query["session_date"] = {
            "$gte": start_date,
            "$lte": end_date
        }
    
    # Get sessions for this coach (filtered by date if provided)
    sessions = await database.sessions.find(query).to_list(1000)
    session_objects = []
    
    for session in sessions:
        # Handle both old and new format
        if "themes" not in session:
            # Convert old format to new format
            session["themes"] = [session.get("content", "")] if session.get("content") else []
            session["trainers"] = [session.get("trainer", "")] if session.get("trainer") else []
            session["content_details"] = session.get("results", "")
        
        # Handle both old single player and new multiple players format
        if "player_id" in session and "player_ids" not in session:
            session["player_ids"] = [session["player_id"]]
            # Remove old field to avoid conflicts
            del session["player_id"]
        elif "player_ids" not in session:
            # If neither field exists, create empty list
            session["player_ids"] = []
        
        # Remove MongoDB ObjectId field if present
        if "_id" in session:
            del session["_id"]
            
        session_objects.append(Session(**session))
    
    # Calculate statistics
    total_sessions = len(session_objects)
    
    # Theme breakdown
    theme_breakdown = {}
    for session_obj in session_objects:
        themes = session_obj.themes or []
        for theme in themes:
            if theme.strip():
                theme_breakdown[theme] = theme_breakdown.get(theme, 0) + 1
    
    # Player breakdown
    player_breakdown = {}
    players = await database.players.find().to_list(1000)
    player_lookup = {player["id"]: f"{player['first_name']} {player['last_name']}" for player in players}
    
    for session_obj in session_objects:
        player_ids = session_obj.player_ids or []
        for player_id in player_ids:
            player_name = player_lookup.get(player_id, "Joueur Inconnu")
            player_breakdown[player_name] = player_breakdown.get(player_name, 0) + 1
    
    # Recent sessions (last 10)
    recent_sessions = sorted(session_objects, key=lambda x: x.session_date, reverse=True)[:10]
    
    return CoachReport(
        coach=Coach(**coach),
        total_sessions=total_sessions,
        theme_breakdown=theme_breakdown,
        player_breakdown=player_breakdown,
        recent_sessions=recent_sessions
    )

@api_router.get("/calendar")
async def get_calendar_data(current_user: User = Depends(get_current_user), database = Depends(get_database)):
    sessions = await database.sessions.find().to_list(1000)
    players = await database.players.find().to_list(1000)
    
    # Create player lookup
    player_lookup = {player["id"]: f"{player['first_name']} {player['last_name']}" for player in players}
    
    # Format calendar data
    calendar_data = []
    for session in sessions:
        session_date = session["session_date"]
        # If session_date is a string, keep it as is
        if not isinstance(session_date, str):
            session_date = session_date.isoformat()
        
        # Handle both old and new format for player references
        player_names = []
        if "player_ids" in session:
            # New format with multiple players
            for player_id in session.get("player_ids", []):
                player_names.append(player_lookup.get(player_id, "Inconnu"))
        elif "player_id" in session:
            # Old format with single player
            player_names.append(player_lookup.get(session["player_id"], "Inconnu"))
        
        # Handle themes
        themes = session.get("themes", [])
        if not themes and "content" in session:
            # Fallback to old content field
            themes = [session["content"]]
        
        # Handle trainers
        trainers = session.get("trainers", [])
        if not trainers and "trainer" in session:
            # Fallback to old trainer field
            trainers = [session["trainer"]]
            
        calendar_data.append({
            "id": session["id"],
            "title": f"{', '.join(player_names)} - {', '.join(themes)}",
            "date": session_date,
            "player_names": player_names,
            "themes": themes,
            "trainers": trainers,
            "content_details": session.get("content_details", session.get("results", ""))
        })
    
    return calendar_data

@api_router.get("/analytics/dashboard")
async def get_dashboard_analytics(current_user: User = Depends(get_current_user), database = Depends(get_database), days: int = 30):
    # Get all sessions and players
    all_sessions = await database.sessions.find().to_list(1000)
    players = await database.players.find().to_list(1000)
    
    # Create player lookup
    player_lookup = {player["id"]: f"{player['first_name']} {player['last_name']}" for player in players}
    
    # Convert ALL sessions to consistent format first
    all_processed_sessions = []
    for session in all_sessions:
        # Handle both old and new format
        if "themes" not in session:
            session["themes"] = [session.get("content", "")] if session.get("content") else []
            session["trainers"] = [session.get("trainer", "")] if session.get("trainer") else []
            session["content_details"] = session.get("results", "")
        
        # Handle both old single player and new multiple players format
        if "player_id" in session and "player_ids" not in session:
            session["player_ids"] = [session["player_id"]]
        
        all_processed_sessions.append(session)
    
    # Filter sessions by date range for ALL calculations
    from datetime import datetime, timedelta
    if days < 365:  # Don't filter for "all time"
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        filtered_sessions = []
        for session in all_processed_sessions:
            session_date_str = session.get("session_date")
            if isinstance(session_date_str, str):
                try:
                    session_date = datetime.fromisoformat(session_date_str)
                    if start_date <= session_date <= end_date:
                        filtered_sessions.append(session)
                except:
                    continue
        processed_sessions = filtered_sessions
    else:
        processed_sessions = all_processed_sessions
    
    # Monthly evolution (last 12 months) - SORTED CHRONOLOGICALLY
    import calendar as cal
    
    monthly_stats = []
    current_date = datetime.now()
    
    # Go back 12 months and collect data chronologically
    for i in range(11, -1, -1):  # 11 months ago to current month
        target_date = current_date - timedelta(days=30*i)  # Approximate month calculation
        month_key = f"{target_date.year}-{target_date.month:02d}"
        month_name = f"{cal.month_name[target_date.month]} {target_date.year}"
        
        # Count sessions for this month FROM FILTERED SESSIONS
        session_count = 0
        for session in processed_sessions:
            session_date_str = session.get("session_date")
            if isinstance(session_date_str, str):
                try:
                    session_date = datetime.fromisoformat(session_date_str)
                    if session_date.year == target_date.year and session_date.month == target_date.month:
                        session_count += 1
                except:
                    continue
        
        if session_count > 0:  # Only include months with data
            monthly_stats.append({
                "month": month_name,
                "count": session_count,
                "sort_key": f"{target_date.year}-{target_date.month:02d}"
            })
    
    # Convert to dict to maintain compatibility
    monthly_evolution = {item["month"]: item["count"] for item in monthly_stats}
    
    # Theme progression - FROM FILTERED SESSIONS
    theme_stats = {}
    for session in processed_sessions:
        themes = session.get("themes", [])
        for theme in themes:
            if theme.strip():
                theme_stats[theme] = theme_stats.get(theme, 0) + 1
    
    # Coach comparison - FROM FILTERED SESSIONS
    coach_stats = {}
    for session in processed_sessions:
        trainers = session.get("trainers", [])
        for trainer in trainers:
            if trainer.strip():
                coach_stats[trainer] = coach_stats.get(trainer, 0) + 1
    
    # Player activity analysis - FROM FILTERED SESSIONS ONLY
    player_activity = {}
    
    # Initialize all players with 0 sessions
    for player in players:
        player_name = f"{player['first_name']} {player['last_name']}"
        player_activity[player_name] = 0
    
    # Count actual sessions for each player FROM FILTERED SESSIONS
    for session in processed_sessions:
        player_ids = session.get("player_ids", [])
        for player_id in player_ids:
            player_name = player_lookup.get(player_id, "Unknown")
            if player_name in player_activity:
                player_activity[player_name] += 1
    
    # Sort players by activity (least active first for alerts)
    sorted_players = sorted(player_activity.items(), key=lambda x: x[1])
    least_active_players = sorted_players[:5] if len(sorted_players) >= 5 else sorted_players
    
    # Inactive players alert (no sessions in last 5 days) - USE ALL SESSIONS FOR THIS ALERT
    inactive_players = []
    end_date = datetime.now()
    start_date_alert = end_date - timedelta(days=5)
    
    for player in players:
        player_id = player["id"]
        player_name = f"{player['first_name']} {player['last_name']}"
        
        # Check if player has sessions in last 5 days (use ALL sessions, not filtered)
        has_recent_session = False
        for session in all_processed_sessions:  # Use all sessions for inactivity alert
            session_date_str = session.get("session_date")
            if isinstance(session_date_str, str):
                try:
                    session_date = datetime.fromisoformat(session_date_str)
                    if start_date_alert <= session_date <= end_date:
                        player_ids = session.get("player_ids", [])
                        if "player_id" in session:  # Old format
                            player_ids = [session["player_id"]]
                        if player_id in player_ids:
                            has_recent_session = True
                            break
                except:
                    continue
        
        if not has_recent_session:
            inactive_players.append(player_name)
    
    # Theme imbalance detection - FROM FILTERED SESSIONS
    theme_imbalances = []
    if theme_stats:
        total_sessions = sum(theme_stats.values())
        avg_per_theme = total_sessions / len(theme_stats)
        
        for theme, count in theme_stats.items():
            percentage = (count / total_sessions) * 100 if total_sessions > 0 else 0
            if percentage < 5:  # Less than 5% is considered underworked
                theme_imbalances.append({
                    "theme": theme,
                    "count": count,
                    "percentage": round(percentage, 1)
                })
    
    return {
        "theme_progression": theme_stats,
        "coach_comparison": coach_stats,
        "player_activity": player_activity,
        "least_active_players": least_active_players,
        "monthly_evolution": monthly_evolution,
        "total_players": len(players),
        "total_sessions": len(processed_sessions),  # Now filtered
        "average_sessions_per_player": round(len(processed_sessions) / len(players), 1) if len(players) > 0 else 0,
        "inactive_players": inactive_players,
        "theme_imbalances": theme_imbalances,
        "period_days": days
    }

@api_router.get("/analytics/heatmap")
async def get_heatmap_data(current_user: User = Depends(get_current_user), days: int = 30):
    from datetime import datetime, timedelta
    import calendar as cal
    
    # Get sessions from the last X days
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    sessions = await database.sessions.find().to_list(1000)
    
    # Convert sessions to consistent format and filter by date
    processed_sessions = []
    for session in sessions:
        # Handle both old and new format
        if "themes" not in session:
            session["themes"] = [session.get("content", "")] if session.get("content") else []
            session["trainers"] = [session.get("trainer", "")] if session.get("trainer") else []
            session["content_details"] = session.get("results", "")
        
        if "player_id" in session and "player_ids" not in session:
            session["player_ids"] = [session["player_id"]]
        
        # Filter by date
        session_date_str = session.get("session_date")
        if isinstance(session_date_str, str):
            try:
                session_date = datetime.fromisoformat(session_date_str)
                if start_date <= session_date <= end_date:
                    processed_sessions.append(session)
            except:
                continue
    
    # Create heatmap data - count sessions per day
    heatmap_data = {}
    current_date = start_date
    
    while current_date <= end_date:
        date_str = current_date.strftime("%Y-%m-%d")
        day_sessions = [s for s in processed_sessions if s.get("session_date") == date_str]
        
        # Calculate intensity (number of sessions)
        intensity = len(day_sessions)
        
        heatmap_data[date_str] = {
            "date": date_str,
            "count": intensity,
            "day_name": current_date.strftime("%a"),
            "day_number": current_date.day,
            "month": current_date.strftime("%B"),
            "week_of_year": current_date.isocalendar()[1],
            "intensity": min(intensity / 5, 1.0) if intensity > 0 else 0  # Normalize to 0-1 scale
        }
        
        current_date += timedelta(days=1)
    
    return {
        "heatmap_data": heatmap_data,
        "start_date": start_date.strftime("%Y-%m-%d"),
        "end_date": end_date.strftime("%Y-%m-%d"),
        "total_days": days,
        "total_sessions": len(processed_sessions)
    }

# Include the router in the main app
app.include_router(api_router)

# Startup event to initialize coaches, update themes and create admin user
@app.on_event("startup")
async def initialize_data():
    logger.info("Startup: ENV=%s DB_NAME=%s", ENVIRONMENT, os.environ.get('DB_NAME'))
    # Check if admin user exists
    admin_user = await database.users.find_one({"role": "admin"})
    if not admin_user:
        # Create default admin user
        admin_password_hash = hash_password("admin123")  # Change this password!
        admin_user_data = {
            "id": str(uuid.uuid4()),
            "email": "admin@staderochelais.com",
            "password_hash": admin_password_hash,
            "role": "admin",
            "first_name": "Admin",
            "last_name": "Stade Rochelais",
            "must_change_password": False,  # Default admin doesn't need to change password
            "created_at": datetime.utcnow(),
            "last_login": None
        }
        await database.users.insert_one(admin_user_data)
        logger.info("Admin user created: admin@staderochelais.com / admin123")
    
    # Check if coaches already exist
    existing_coaches = await database.coaches.count_documents({})
    if existing_coaches == 0:
        # Create default coaches
        default_coaches = [
            {
                "id": str(uuid.uuid4()),
                "first_name": "Léo",
                "last_name": "",
                "photo": None,
                "created_at": datetime.utcnow()
            },
            {
                "id": str(uuid.uuid4()),
                "first_name": "J-E",
                "last_name": "",
                "photo": None,
                "created_at": datetime.utcnow()
            },
            {
                "id": str(uuid.uuid4()),
                "first_name": "David",
                "last_name": "",
                "photo": None,
                "created_at": datetime.utcnow()
            },
            {
                "id": str(uuid.uuid4()),
                "first_name": "Mike",
                "last_name": "",
                "photo": None,
                "created_at": datetime.utcnow()
            },
            {
                "id": str(uuid.uuid4()),
                "first_name": "Loan",
                "last_name": "",
                "photo": None,
                "created_at": datetime.utcnow()
            }
        ]
        
        await database.coaches.insert_many(default_coaches)
        logger.info("Coaches initialisés avec succès")
    
    # Update theme names in existing sessions
    try:
        await database.sessions.update_many(
            {"themes": {"$in": ["Écran et remise"]}},
            {"$set": {"themes.$": "Écran et lecture"}}
        )
        logger.info("Thèmes mis à jour avec succès")
    except Exception as e:
        logger.error(f"Erreur lors de la mise à jour des thèmes: {e}")

# CORS configuration
ALLOWED_ORIGINS = [
    "https://basketball-manager-msoh.vercel.app",  # frontend (production)
    "http://localhost:3000",                       # frontend (local dev)
]


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()