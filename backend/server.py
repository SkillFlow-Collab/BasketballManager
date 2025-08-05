from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
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
from mangum import Mangum

# Add ObjectId encoder for JSON serialization
ENCODERS_BY_TYPE[ObjectId] = str

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'stade-rochelais-basketball-secret-2025')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
security = HTTPBearer(auto_error=False)

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models (unchanged from previous version)
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    password_hash: str
    role: str
    first_name: str
    last_name: str
    must_change_password: bool = False
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
    photo: Optional[str] = None
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
    player_ids: List[str]
    session_date: date
    themes: List[str]
    trainers: List[str]
    content_details: str
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SessionCreate(BaseModel):
    player_ids: List[str]
    session_date: date
    themes: List[str]
    trainers: List[str]
    content_details: str
    notes: Optional[str] = None

class SessionUpdate(BaseModel):
    session_date: Optional[date] = None
    player_ids: Optional[List[str]] = None
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
    match_stats: Optional[dict] = None

class Coach(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    first_name: str
    last_name: str
    photo: Optional[str] = None
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

class EvaluationAspect(BaseModel):
    name: str
    score: int

class EvaluationTheme(BaseModel):
    name: str
    aspects: List[EvaluationAspect]
    average_score: Optional[float] = None

class PlayerEvaluation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    player_id: str
    evaluator_id: str
    evaluation_date: datetime = Field(default_factory=datetime.utcnow)
    evaluation_type: str = "initial"
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

class CollectiveSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_type: str
    session_date: date
    session_time: str
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

class TeamType(str, Enum):
    U18 = "U18"
    U21 = "U21"

class Match(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
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
    is_starter: bool
    play_time: Optional[int] = None
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
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    payload = decode_token(credentials.credentials)
    user = await db.users.find_one({"id": payload['user_id']})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user)

async def get_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# Initialization function (replacing startup event)
async def initialize_data():
    logger = logging.getLogger(__name__)
    # Check if admin user exists
    admin_user = await db.users.find_one({"role": "admin"})
    if not admin_user:
        admin_password_hash = hash_password("admin123")
        admin_user_data = {
            "id": str(uuid.uuid4()),
            "email": "admin@staderochelais.com",
            "password_hash": admin_password_hash,
            "role": "admin",
            "first_name": "Admin",
            "last_name": "Stade Rochelais",
            "must_change_password": False,
            "created_at": datetime.utcnow(),
            "last_login": None
        }
        await db.users.insert_one(admin_user_data)
        logger.info("Admin user created: admin@staderochelais.com / admin123")
    
    # Initialize coaches
    existing_coaches = await db.coaches.count_documents({})
    if existing_coaches == 0:
        default_coaches = [
            {
                "id": str(uuid.uuid4()),
                "first_name": "Léo",
                "last_name": "",
                "photo": None,
                "created_at": datetime.utcnow()
            },
            # Add other coaches as needed
        ]
        await db.coaches.insert_many(default_coaches)
        logger.info("Coaches initialized successfully")
    
    # Update theme names
    try:
        await db.sessions.update_many(
            {"themes": {"$in": ["Écran et remise"]}},
            {"$set": {"themes.$": "Écran et lecture"}}
        )
        logger.info("Themes updated successfully")
    except Exception as e:
        logger.error(f"Error updating themes: {e}")

# Authentication endpoints
@api_router.post("/auth/login", response_model=LoginResponse)
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email})
    if not user or not verify_password(login_data.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    await db.users.update_one(
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

@api_router.post("/auth/create-user", response_model=UserResponse)
async def create_user(user_data: UserCreate, current_user: User = Depends(get_current_user)):
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    password_hash = hash_password(user_data.password)
    user_dict = user_data.dict()
    user_dict['password_hash'] = password_hash
    user_dict['must_change_password'] = True
    del user_dict['password']
    
    user_obj = User(**user_dict)
    await db.users.insert_one(user_obj.dict())
    
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
async def get_users(current_user: User = Depends(get_current_user)):
    users = await db.users.find().to_list(1000)
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
async def delete_user(user_id: str, current_user: User = Depends(get_current_user)):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    result = await db.users.delete_one({"id": user_id})
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
async def change_password(password_data: ChangePasswordRequest, current_user: User = Depends(get_current_user)):
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    new_password_hash = hash_password(password_data.new_password)
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {
            "password_hash": new_password_hash,
            "must_change_password": False
        }}
    )
    
    return {"message": "Password changed successfully"}

# Player endpoints
@api_router.post("/players", response_model=Player)
async def create_player(player_data: PlayerCreate, current_user: User = Depends(get_current_user)):
    player_dict = player_data.dict()
    player_obj = Player(**player_dict)
    
    player_dict_for_db = player_obj.dict()
    if isinstance(player_dict_for_db["date_of_birth"], date):
        player_dict_for_db["date_of_birth"] = player_dict_for_db["date_of_birth"].isoformat()
    
    await db.players.insert_one(player_dict_for_db)
    return player_obj

@api_router.get("/players", response_model=List[Player])
async def get_players(current_user: User = Depends(get_current_user)):
    players = await db.players.find().to_list(1000)
    return [Player(**player) for player in players]

@api_router.get("/players/{player_id}", response_model=Player)
async def get_player(player_id: str, current_user: User = Depends(get_current_user)):
    player = await db.players.find_one({"id": player_id})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return Player(**player)

@api_router.put("/players/{player_id}", response_model=Player)
async def update_player(player_id: str, player_data: PlayerUpdate, current_user: User = Depends(get_current_user)):
    update_data = {k: v for k, v in player_data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    if "date_of_birth" in update_data and isinstance(update_data["date_of_birth"], date):
        update_data["date_of_birth"] = update_data["date_of_birth"].isoformat()
    
    result = await db.players.update_one({"id": player_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Player not found")
    
    updated_player = await db.players.find_one({"id": player_id})
    return Player(**updated_player)

@api_router.delete("/players/{player_id}")
async def delete_player(player_id: str, current_user: User = Depends(get_current_user)):
    result = await db.players.delete_one({"id": player_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Player not found")
    
    await db.sessions.delete_many({"player_id": player_id})
    return {"message": "Player deleted successfully"}

# Coach endpoints
@api_router.post("/coaches", response_model=Coach)
async def create_coach(coach_data: CoachCreate, current_user: User = Depends(get_current_user)):
    coach_dict = coach_data.dict()
    coach_obj = Coach(**coach_dict)
    await db.coaches.insert_one(coach_obj.dict())
    return coach_obj

@api_router.get("/coaches", response_model=List[Coach])
async def get_coaches(current_user: User = Depends(get_current_user)):
    coaches = await db.coaches.find().to_list(1000)
    return [Coach(**coach) for coach in coaches]

@api_router.get("/coaches/{coach_id}", response_model=Coach)
async def get_coach(coach_id: str, current_user: User = Depends(get_current_user)):
    coach = await db.coaches.find_one({"id": coach_id})
    if not coach:
        raise HTTPException(status_code=404, detail="Coach not found")
    return Coach(**coach)

@api_router.put("/coaches/{coach_id}", response_model=Coach)
async def update_coach(coach_id: str, coach_data: CoachUpdate, current_user: User = Depends(get_current_user)):
    update_data = {k: v for k, v in coach_data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = await db.coaches.update_one({"id": coach_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Coach not found")
    
    updated_coach = await db.coaches.find_one({"id": coach_id})
    return Coach(**updated_coach)

@api_router.delete("/coaches/{coach_id}")
async def delete_coach(coach_id: str, current_user: User = Depends(get_current_user)):
    result = await db.coaches.delete_one({"id": coach_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Coach not found")
    return {"message": "Coach deleted successfully"}

# Player Evaluation endpoints
@api_router.post("/evaluations", response_model=PlayerEvaluation)
async def create_evaluation(evaluation_data: EvaluationCreate, current_user: User = Depends(get_current_user)):
    player = await db.players.find_one({"id": evaluation_data.player_id})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
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
    
    existing_evaluation = await db.evaluations.find_one({
        "player_id": evaluation_data.player_id,
        "evaluation_type": evaluation_type
    })
    
    if existing_evaluation:
        updated_evaluation = {
            "evaluator_id": current_user.id,
            "evaluation_date": evaluation_data.evaluation_date if hasattr(evaluation_data, 'evaluation_date') and evaluation_data.evaluation_date else datetime.utcnow(),
            "evaluation_type": evaluation_type,
            "themes": [theme.dict() for theme in themes_with_averages],
            "overall_average": overall_average,
            "notes": evaluation_data.notes
        }
        
        await db.evaluations.update_one(
            {"id": existing_evaluation["id"]},
            {"$set": updated_evaluation}
        )
        
        updated_eval = await db.evaluations.find_one({"id": existing_evaluation["id"]})
        return PlayerEvaluation(**updated_eval)
    else:
        evaluation_obj = PlayerEvaluation(
            player_id=evaluation_data.player_id,
            evaluator_id=current_user.id,
            evaluation_date=evaluation_data.evaluation_date if hasattr(evaluation_data, 'evaluation_date') and evaluation_data.evaluation_date else datetime.utcnow(),
            evaluation_type=evaluation_type,
            themes=themes_with_averages,
            overall_average=overall_average,
            notes=evaluation_data.notes
        )
        
        await db.evaluations.insert_one(evaluation_obj.dict())
        return evaluation_obj

@api_router.get("/evaluations/player/{player_id}", response_model=List[PlayerEvaluation])
async def get_player_evaluations(player_id: str, current_user: User = Depends(get_current_user)):
    evaluations = await db.evaluations.find({"player_id": player_id}).sort("evaluation_date", -1).to_list(100)
    return [PlayerEvaluation(**evaluation) for evaluation in evaluations]

@api_router.get("/evaluations/player/{player_id}/latest", response_model=PlayerEvaluation)
async def get_latest_player_evaluation(player_id: str, current_user: User = Depends(get_current_user)):
    evaluation = await db.evaluations.find_one(
        {"player_id": player_id}, 
        sort=[("evaluation_date", -1)]
    )
    if not evaluation:
        raise HTTPException(status_code=404, detail="No evaluation found for this player")
    return PlayerEvaluation(**evaluation)

@api_router.get("/evaluations/player/{player_id}/average")
async def get_player_evaluation_average(player_id: str, current_user: User = Depends(get_current_user)):
    evaluations = await db.evaluations.find({"player_id": player_id}).to_list(100)
    
    if not evaluations:
        raise HTTPException(status_code=404, detail="No evaluations found for this player")
    
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
        "player_id": player_id,
        "theme_averages": theme_averages,
        "overall_average": overall_average,
        "evaluation_count": len(evaluations)
    }

@api_router.get("/evaluations/averages/all")
async def get_all_players_averages(current_user: User = Depends(get_current_user)):
    evaluations = await db.evaluations.find().to_list(1000)
    
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
async def get_position_averages(position: str, current_user: User = Depends(get_current_user)):
    players = await db.players.find({"position": position}).to_list(1000)
    player_ids = [player["id"] for player in players]
    
    if not player_ids:
        return {"theme_averages": {}, "overall_average": 0, "total_evaluations": 0}
    
    evaluations = await db.evaluations.find({"player_id": {"$in": player_ids}}).to_list(1000)
    
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

@api_router.delete("/evaluations/{evaluation_id}")
async def delete_evaluation(evaluation_id: str, current_user: User = Depends(get_current_user)):
    result = await db.evaluations.delete_one({"id": evaluation_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    return {"message": "Evaluation deleted successfully"}

@api_router.get("/evaluations")
async def get_all_evaluations(current_user: User = Depends(get_current_user)):
    evaluations = await db.evaluations.find().to_list(1000)
    return evaluations

# Collective Sessions endpoints
@api_router.post("/collective-sessions", response_model=CollectiveSession)
async def create_collective_session(session_data: CollectiveSessionCreate, current_user: User = Depends(get_current_user)):
    session_obj = CollectiveSession(**session_data.dict())
    
    session_dict_for_db = session_obj.dict()
    if isinstance(session_dict_for_db["session_date"], date):
        session_dict_for_db["session_date"] = session_dict_for_db["session_date"].isoformat()
    
    await db.collective_sessions.insert_one(session_dict_for_db)
    return session_obj

@api_router.get("/collective-sessions", response_model=List[CollectiveSession])
async def get_collective_sessions(
    month: Optional[int] = None,
    year: Optional[int] = None,
    session_type: Optional[str] = None,
    current_user: User = Depends(get_current_user)
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
    
    sessions = await db.collective_sessions.find(query).sort("session_date", -1).to_list(100)
    return [CollectiveSession(**session) for session in sessions]

@api_router.get("/collective-sessions/{session_id}", response_model=CollectiveSession)
async def get_collective_session(session_id: str, current_user: User = Depends(get_current_user)):
    session = await db.collective_sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Collective session not found")
    return CollectiveSession(**session)

@api_router.put("/collective-sessions/{session_id}", response_model=CollectiveSession)
async def update_collective_session(session_id: str, session_data: CollectiveSessionCreate, current_user: User = Depends(get_current_user)):
    update_data = session_data.dict()
    if "session_date" in update_data and isinstance(update_data["session_date"], date):
        update_data["session_date"] = update_data["session_date"].isoformat()
    
    result = await db.collective_sessions.update_one(
        {"id": session_id}, 
        {"$set": update_data}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Collective session not found")
    
    updated_session = await db.collective_sessions.find_one({"id": session_id})
    return CollectiveSession(**updated_session)

@api_router.delete("/collective-sessions/{session_id}")
async def delete_collective_session(session_id: str, current_user: User = Depends(get_current_user)):
    await db.attendances.delete_many({"collective_session_id": session_id})
    
    result = await db.collective_sessions.delete_one({"id": session_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Collective session not found")
    return {"message": "Collective session deleted successfully"}

# Match endpoints
@api_router.post("/matches", response_model=Match)
async def create_match(match_data: MatchCreate, current_user: User = Depends(get_current_user)):
    match_obj = Match(**match_data.dict())
    
    match_dict_for_db = match_obj.dict()
    match_dict_for_db['match_date'] = match_obj.match_date.isoformat()
    
    await db.matches.insert_one(match_dict_for_db)
    return match_obj

@api_router.get("/matches", response_model=List[Match])
async def get_matches(
    month: Optional[int] = None,
    year: Optional[int] = None,
    team: Optional[TeamType] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    
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
    
    if team:
        query["team"] = team
    
    matches = await db.matches.find(query).sort("match_date", -1).to_list(100)
    return [Match(**match) for match in matches]

@api_router.get("/matches/{match_id}", response_model=Match)
async def get_match(match_id: str, current_user: User = Depends(get_current_user)):
    match = await db.matches.find_one({"id": match_id})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return Match(**match)

@api_router.put("/matches/{match_id}", response_model=Match)
async def update_match(match_id: str, match_data: MatchUpdate, current_user: User = Depends(get_current_user)):
    update_data = {k: v for k, v in match_data.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data provided for update")
    
    if 'match_date' in update_data:
        update_data['match_date'] = update_data['match_date'].isoformat()
    
    result = await db.matches.update_one(
        {"id": match_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Match not found")
    
    updated_match = await db.matches.find_one({"id": match_id})
    return Match(**updated_match)

@api_router.delete("/matches/{match_id}")
async def delete_match(match_id: str, current_user: User = Depends(get_current_user)):
    await db.match_participations.delete_many({"match_id": match_id})
    
    result = await db.matches.delete_one({"id": match_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Match not found")
    return {"message": "Match deleted successfully"}

# Match Participation endpoints
@api_router.post("/match-participations", response_model=MatchParticipation)
async def create_match_participation(participation_data: MatchParticipationCreate, current_user: User = Depends(get_current_user)):
    existing_participation = await db.match_participations.find_one({
        "match_id": participation_data.match_id,
        "player_id": participation_data.player_id
    })
    
    if existing_participation:
        update_data = participation_data.dict()
        await db.match_participations.update_one(
            {"id": existing_participation["id"]},
            {"$set": update_data}
        )
        updated_participation = await db.match_participations.find_one({"id": existing_participation["id"]})
        return MatchParticipation(**updated_participation)
    else:
        participation_obj = MatchParticipation(**participation_data.dict())
        participation_dict_for_db = participation_obj.dict()
        await db.match_participations.insert_one(participation_dict_for_db)
        return participation_obj

@api_router.get("/match-participations/match/{match_id}", response_model=List[dict])
async def get_match_participations(match_id: str, current_user: User = Depends(get_current_user)):
    participations = await db.match_participations.find({"match_id": match_id}).to_list(100)
    
    result = []
    for participation in participations:
        player = await db.players.find_one({"id": participation["player_id"]})
        if player:
            result.append({
                "participation": MatchParticipation(**participation),
                "player": Player(**player)
            })
    
    return result

@api_router.get("/match-participations/player/{player_id}", response_model=List[dict])
async def get_player_match_participations(player_id: str, current_user: User = Depends(get_current_user)):
    participations = await db.match_participations.find({"player_id": player_id}).to_list(100)
    
    result = []
    for participation in participations:
        match = await db.matches.find_one({"id": participation["match_id"]})
        if match:
            result.append({
                "participation": MatchParticipation(**participation),
                "match": Match(**match)
            })
    
    return result

@api_router.put("/match-participations/{participation_id}", response_model=MatchParticipation)
async def update_match_participation(participation_id: str, participation_data: MatchParticipationUpdate, current_user: User = Depends(get_current_user)):
    update_data = {k: v for k, v in participation_data.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data provided for update")
    
    result = await db.match_participations.update_one(
        {"id": participation_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Match participation not found")
    
    updated_participation = await db.match_participations.find_one({"id": participation_id})
    return MatchParticipation(**updated_participation)

@api_router.delete("/match-participations/{participation_id}")
async def delete_match_participation(participation_id: str, current_user: User = Depends(get_current_user)):
    result = await db.match_participations.delete_one({"id": participation_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Match participation not found")
    return {"message": "Match participation deleted successfully"}

# Attendance endpoints
@api_router.post("/attendances", response_model=Attendance)
async def create_attendance(attendance_data: AttendanceCreate, current_user: User = Depends(get_current_user)):
    existing_attendance = await db.attendances.find_one({
        "collective_session_id": attendance_data.collective_session_id,
        "player_id": attendance_data.player_id
    })
    
    if existing_attendance:
        result = await db.attendances.update_one(
            {"id": existing_attendance["id"]},
            {"$set": attendance_data.dict()}
        )
        updated_attendance = await db.attendances.find_one({"id": existing_attendance["id"]})
        return Attendance(**updated_attendance)
    else:
        attendance_obj = Attendance(**attendance_data.dict())
        await db.attendances.insert_one(attendance_obj.dict())
        return attendance_obj

@api_router.get("/attendances/session/{session_id}")
async def get_session_attendances(session_id: str, current_user: User = Depends(get_current_user)):
    attendances = await db.attendances.find({"collective_session_id": session_id}).to_list(100)
    
    result = []
    for attendance in attendances:
        player = await db.players.find_one({"id": attendance["player_id"]})
        if player:
            attendance_with_player = {
                **attendance,
                "player": player
            }
            result.append(attendance_with_player)
    
    return result

@api_router.get("/attendances/player/{player_id}")
async def get_player_attendances(
    player_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    attendances = await db.attendances.find({"player_id": player_id}).to_list(1000)
    
    result = []
    for attendance in attendances:
        session = await db.collective_sessions.find_one({"id": attendance["collective_session_id"]})
        if session:
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
    
    result.sort(key=lambda x: x["session"]["session_date"], reverse=True)
    return result

@api_router.get("/attendances/reports/player/{player_id}")
async def get_player_attendance_report(
    player_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    player = await db.players.find_one({"id": player_id})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    attendances = await db.attendances.find({"player_id": player_id}).to_list(1000)
    
    attendance_data = []
    for attendance in attendances:
        session = await db.collective_sessions.find_one({"id": attendance["collective_session_id"]})
        if session:
            if isinstance(session["session_date"], str):
                session_date = datetime.fromisoformat(session["session_date"])
            elif isinstance(session["session_date"], date):
                session_date = datetime.combine(session["session_date"], datetime.min.time())
            else:
                continue
            
            if start_date and end_date:
                filter_start = datetime.fromisoformat(start_date)
                filter_end = datetime.fromisoformat(end_date)
                if not (filter_start <= session_date <= filter_end):
                    continue
            
            attendance_data.append({
                "attendance": attendance,
                "session": session
            })
    
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
        
        if status == "present":
            stats["present"] += 1
        elif status == "absent":
            stats["absent"] += 1
        elif status == "injured":
            stats["injured"] += 1
        elif status == "off":
            stats["off"] += 1
        
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
async def create_session(session_data: SessionCreate, current_user: User = Depends(get_current_user)):
    for player_id in session_data.player_ids:
        player = await db.players.find_one({"id": player_id})
        if not player:
            raise HTTPException(status_code=404, detail=f"Player with id {player_id} not found")
    
    session_dict = session_data.dict()
    session_obj = Session(**session_dict)
    
    session_dict_for_db = session_obj.dict()
    if isinstance(session_dict_for_db["session_date"], date):
        session_dict_for_db["session_date"] = session_dict_for_db["session_date"].isoformat()
    
    await db.sessions.insert_one(session_dict_for_db)
    return session_obj

@api_router.get("/sessions", response_model=List[Session])
async def get_sessions(current_user: User = Depends(get_current_user)):
    sessions = await db.sessions.find().sort("session_date", -1).to_list(1000)
    result = []
    for session in sessions:
        if "themes" not in session:
            session["themes"] = [session.get("content", "")] if session.get("content") else []
            session["trainers"] = [session.get("trainer", "")] if session.get("trainer") else []
            session["content_details"] = session.get("results", "")
        
        if "player_id" in session and "player_ids" not in session:
            session["player_ids"] = [session["player_id"]]
            del session["player_id"]
        
        result.append(Session(**session))
    return result

@api_router.get("/sessions/player/{player_id}", response_model=List[Session])
async def get_player_sessions(player_id: str, current_user: User = Depends(get_current_user)):
    sessions = await db.sessions.find({
        "$or": [
            {"player_ids": {"$in": [player_id]}},
            {"player_id": player_id}
        ]
    }).sort("session_date", -1).to_list(1000)
    
    result = []
    for session in sessions:
        if "themes" not in session:
            session["themes"] = [session.get("content", "")] if session.get("content") else []
            session["trainers"] = [session.get("trainer", "")] if session.get("trainer") else []
            session["content_details"] = session.get("results", "")
        
        if "player_id" in session and "player_ids" not in session:
            session["player_ids"] = [session["player_id"]]
            del session["player_id"]
        
        result.append(Session(**session))
    return result

@api_router.get("/sessions/{session_id}", response_model=Session)
async def get_session(session_id: str, current_user: User = Depends(get_current_user)):
    session = await db.sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if "themes" not in session:
        session["themes"] = [session.get("content", "")] if session.get("content") else []
        session["trainers"] = [session.get("trainer", "")] if session.get("trainer") else []
        session["content_details"] = session.get("results", "")
    
    return Session(**session)

@api_router.put("/sessions/{session_id}", response_model=Session)
async def update_session(session_id: str, session_data: SessionUpdate, current_user: User = Depends(get_current_user)):
    update_data = {k: v for k, v in session_data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    if "session_date" in update_data and isinstance(update_data["session_date"], date):
        update_data["session_date"] = update_data["session_date"].isoformat()
    
    result = await db.sessions.update_one({"id": session_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    
    updated_session = await db.sessions.find_one({"id": session_id})
    return Session(**updated_session)

@api_router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, current_user: User = Depends(get_current_user)):
    result = await db.sessions.delete_one({"id": session_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session deleted successfully"}

@api_router.get("/reports/player/{player_id}", response_model=PlayerReport)
async def get_player_report(player_id: str, current_user: User = Depends(get_current_user), start_date: Optional[str] = None, end_date: Optional[str] = None):
    player = await db.players.find_one({"id": player_id})
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    base_query = {
        "$or": [
            {"player_ids": {"$in": [player_id]}},
            {"player_id": player_id}
        ]
    }
    
    if start_date and end_date:
        base_query["session_date"] = {
            "$gte": start_date,
            "$lte": end_date
        }
    
    sessions = await db.sessions.find(base_query).to_list(1000)
    
    session_objects = []
    for session in sessions:
        if "themes" not in session:
            session["themes"] = [session.get("content", "")] if session.get("content") else []
            session["trainers"] = [session.get("trainer", "")] if session.get("trainer") else []
            session["content_details"] = session.get("results", "")
        
        if "player_id" in session and "player_ids" not in session:
            session["player_ids"] = [session["player_id"]]
            del session["player_id"]
        elif "player_ids" not in session:
            session["player_ids"] = []
        
        if "_id" in session:
            del session["_id"]
        
        session_objects.append(Session(**session))
    
    total_sessions = len(session_objects)
    
    content_breakdown = {}
    for session_obj in session_objects:
        themes = session_obj.themes or []
        for theme in themes:
            if theme.strip():
                content_breakdown[theme] = content_breakdown.get(theme, 0) + 1
    
    trainer_breakdown = {}
    for session_obj in session_objects:
        trainers = session_obj.trainers or []
        for trainer in trainers:
            if trainer.strip():
                trainer_breakdown[trainer] = trainer_breakdown.get(trainer, 0) + 1
    
    recent_sessions = sorted(session_objects, key=lambda x: x.session_date, reverse=True)[:10]
    
    match_participations = await db.match_participations.find({"player_id": player_id}).to_list(1000)
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
    
    played_matches = [p for p in match_participations if p["is_present"] and p.get("play_time")]
    u18_play_times = []
    u21_play_times = []
    
    if played_matches:
        match_stats["average_play_time"] = round(sum([p["play_time"] for p in played_matches]) / len(played_matches), 1)
    
    for participation in match_participations:
        match = await db.matches.find_one({"id": participation["match_id"]})
        if match:
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
                
                if participation.get("play_time"):
                    if team == "U18":
                        u18_play_times.append(participation["play_time"])
                    elif team == "U21":
                        u21_play_times.append(participation["play_time"])
            
            if len(match_stats["recent_matches"]) < 5:
                match_stats["recent_matches"].append({
                    "match": Match(**match),
                    "participation": MatchParticipation(**participation)
                })
    
    if u18_play_times:
        match_stats["average_play_time_u18"] = round(sum(u18_play_times) / len(u18_play_times), 1)
    
    if u21_play_times:
        match_stats["average_play_time_u21"] = round(sum(u21_play_times) / len(u21_play_times), 1)
    
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
async def get_coach_report(coach_name: str, current_user: User = Depends(get_current_user), start_date: Optional[str] = None, end_date: Optional[str] = None):
    coach = await db.coaches.find_one({
        "$or": [
            {"first_name": coach_name},
            {"last_name": coach_name},
            {"$expr": {"$eq": [{"$concat": ["$first_name", " ", "$last_name"]}, coach_name]}}
        ]
    })
    
    if not coach:
        coach = {
            "id": "virtual",
            "first_name": coach_name,
            "last_name": "",
            "photo": None,
            "created_at": datetime.utcnow()
        }
    
    query = {"trainers": {"$in": [coach_name]}}
    if start_date and end_date:
        query["session_date"] = {
            "$gte": start_date,
            "$lte": end_date
        }
    
    sessions = await db.sessions.find(query).to_list(1000)
    session_objects = []
    
    for session in sessions:
        if "themes" not in session:
            session["themes"] = [session.get("content", "")] if session.get("content") else []
            session["trainers"] = [session.get("trainer", "")] if session.get("trainer") else []
            session["content_details"] = session.get("results", "")
        
        if "player_id" in session and "player_ids" not in session:
            session["player_ids"] = [session["player_id"]]
            del session["player_id"]
        elif "player_ids" not in session:
            session["player_ids"] = []
        
        if "_id" in session:
            del session["_id"]
            
        session_objects.append(Session(**session))
    
    total_sessions = len(session_objects)
    
    theme_breakdown = {}
    for session_obj in session_objects:
        themes = session_obj.themes or []
        for theme in themes:
            if theme.strip():
                theme_breakdown[theme] = theme_breakdown.get(theme, 0) + 1
    
    player_breakdown = {}
    players = await db.players.find().to_list(1000)
    player_lookup = {player["id"]: f"{player['first_name']} {player['last_name']}" for player in players}
    
    for session_obj in session_objects:
        player_ids = session_obj.player_ids or []
        for player_id in player_ids:
            player_name = player_lookup.get(player_id, "Joueur Inconnu")
            player_breakdown[player_name] = player_breakdown.get(player_name, 0) + 1
    
    recent_sessions = sorted(session_objects, key=lambda x: x.session_date, reverse=True)[:10]
    
    return CoachReport(
        coach=Coach(**coach),
        total_sessions=total_sessions,
        theme_breakdown=theme_breakdown,
        player_breakdown=player_breakdown,
        recent_sessions=recent_sessions
    )

@api_router.get("/calendar")
async def get_calendar_data(current_user: User = Depends(get_current_user)):
    sessions = await db.sessions.find().to_list(1000)
    players = await db.players.find().to_list(1000)
    
    player_lookup = {player["id"]: f"{player['first_name']} {player['last_name']}" for player in players}
    
    calendar_data = []
    for session in sessions:
        session_date = session["session_date"]
        if not isinstance(session_date, str):
            session_date = session_date.isoformat()
        
        player_names = []
        if "player_ids" in session:
            for player_id in session.get("player_ids", []):
                player_names.append(player_lookup.get(player_id, "Inconnu"))
        elif "player_id" in session:
            player_names.append(player_lookup.get(session["player_id"], "Inconnu"))
        
        themes = session.get("themes", [])
        if not themes and "content" in session:
            themes = [session["content"]]
        
        trainers = session.get("trainers", [])
        if not trainers and "trainer" in session:
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
async def get_dashboard_analytics(current_user: User = Depends(get_current_user), days: int = 30):
    all_sessions = await db.sessions.find().to_list(1000)
    players = await db.players.find().to_list(1000)
    
    player_lookup = {player["id"]: f"{player['first_name']} {player['last_name']}" for player in players}
    
    all_processed_sessions = []
    for session in all_sessions:
        if "themes" not in session:
            session["themes"] = [session.get("content", "")] if session.get("content") else []
            session["trainers"] = [session.get("trainer", "")] if session.get("trainer") else []
            session["content_details"] = session.get("results", "")
        
        if "player_id" in session and "player_ids" not in session:
            session["player_ids"] = [session["player_id"]]
        
        all_processed_sessions.append(session)
    
    if days < 365:
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
    
    monthly_stats = []
    current_date = datetime.now()
    
    for i in range(11, -1, -1):
        target_date = current_date - timedelta(days=30*i)
        month_key = f"{target_date.year}-{target_date.month:02d}"
        month_name = f"{calendar.month_name[target_date.month]} {target_date.year}"
        
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
        
        if session_count > 0:
            monthly_stats.append({
                "month": month_name,
                "count": session_count,
                "sort_key": f"{target_date.year}-{target_date.month:02d}"
            })
    
    monthly_evolution = {item["month"]: item["count"] for item in monthly_stats}
    
    theme_stats = {}
    for session in processed_sessions:
        themes = session.get("themes", [])
        for theme in themes:
            if theme.strip():
                theme_stats[theme] = theme_stats.get(theme, 0) + 1
    
    coach_stats = {}
    for session in processed_sessions:
        trainers = session.get("trainers", [])
        for trainer in trainers:
            if trainer.strip():
                coach_stats[trainer] = coach_stats.get(trainer, 0) + 1
    
    player_activity = {}
    for player in players:
        player_name = f"{player['first_name']} {player['last_name']}"
        player_activity[player_name] = 0
    
    for session in processed_sessions:
        player_ids = session.get("player_ids", [])
        for player_id in player_ids:
            player_name = player_lookup.get(player_id, "Unknown")
            if player_name in player_activity:
                player_activity[player_name] += 1
    
    sorted_players = sorted(player_activity.items(), key=lambda x: x[1])
    least_active_players = sorted_players[:5] if len(sorted_players) >= 5 else sorted_players
    
    inactive_players = []
    end_date = datetime.now()
    start_date_alert = end_date - timedelta(days=5)
    
    for player in players:
        player_id = player["id"]
        player_name = f"{player['first_name']} {player['last_name']}"
        
        has_recent_session = False
        for session in all_processed_sessions:
            session_date_str = session.get("session_date")
            if isinstance(session_date_str, str):
                try:
                    session_date = datetime.fromisoformat(session_date_str)
                    if start_date_alert <= session_date <= end_date:
                        player_ids = session.get("player_ids", [])
                        if "player_id" in session:
                            player_ids = [session["player_id"]]
                        if player_id in player_ids:
                            has_recent_session = True
                            break
                except:
                    continue
        
        if not has_recent_session:
            inactive_players.append(player_name)
    
    return {
        "monthly_evolution": monthly_evolution,
        "theme_stats": theme_stats,
        "coach_stats": coach_stats,
        "player_activity": dict(sorted_players),
        "least_active_players": dict(least_active_players),
        "inactive_players": inactive_players
    }

# Initialization endpoint
@api_router.get("/init")
async def init():
    await initialize_data()
    return {"message": "Initialization complete"}

# Include the API router
app.include_router(api_router)

# Mangum handler for Vercel serverless
handler = Mangum(app, lifespan="off", api_gateway_base_path="/api")