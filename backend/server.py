# Server.py
from fastapi import FastAPI, APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

import re
import os
import io
import json
import logging
import bcrypt
import jwt
import uuid
import requests

from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone, timedelta

import pdfplumber
import docx
from groq import Groq

# ================== ENV ==================
load_dotenv()

MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME")
JWT_SECRET = os.getenv("JWT_SECRET")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")

if not all([
    MONGO_URL,
    DB_NAME,
    JWT_SECRET,
    GROQ_API_KEY,
    RAPIDAPI_KEY
]):
    raise RuntimeError("Missing environment variables")


origins = [
    "https://skillgap-ai-main-gamma.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
]

# ================== APP ==================
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================== DB ==================
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# ================== AI ==================
client_ai = Groq(api_key=GROQ_API_KEY)

# ================== CONFIG ==================
JWT_ALG = "HS256"
JWT_EXPIRY_DAYS = 7

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ================== MODELS ==================
class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    token: str
    user: dict

class ChatMessageRequest(BaseModel):
    session_id: Optional[str] = None
    message: str

# ================== AUTH ==================
def hash_password(pw: str):
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw, hashed):
    return bcrypt.checkpw(pw.encode(), hashed.encode())

def create_token(user_id: str):
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRY_DAYS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except Exception:
        raise HTTPException(401, "Invalid token")

# ================== AUTH ROUTES ==================
@api_router.post("/auth/register", response_model=AuthResponse)
async def register(req: RegisterRequest):
    if await db.users.find_one({"email": req.email}):
        raise HTTPException(400, "Email exists")

    user_id = str(uuid.uuid4())

    await db.users.insert_one({
        "id": user_id,
        "name": req.name,
        "email": req.email,
        "password": hash_password(req.password)
    })

    return {
        "token": create_token(user_id),
        "user": {"id": user_id, "name": req.name, "email": req.email}
    }

@api_router.post("/auth/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    user = await db.users.find_one({"email": req.email})
    if not user or not verify_password(req.password, user["password"]):
        raise HTTPException(401, "Invalid credentials")

    return {
        "token": create_token(user["id"]),
        "user": {"id": user["id"], "name": user["name"], "email": user["email"]}
    }

# ================== RESUME PARSER ==================
def extract_text(file: UploadFile, content: bytes):
    if file.filename.endswith(".pdf"):
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            return "\n".join(p.extract_text() or "" for p in pdf.pages)

    if file.filename.endswith(".docx"):
        doc = docx.Document(io.BytesIO(content))
        return "\n".join(p.text for p in doc.paragraphs)

    return content.decode(errors="ignore")

# ================== CLEAN JSON ==================
def clean_json(text):
    text = re.sub(r"```json|```", "", text)
    return text.strip()

# ================== AI RESUME ==================
async def analyze_resume_llm(text, role, location=""):
    prompt = f"""
You are an expert ATS Resume Analyzer.

Analyze the resume for the target role.

Resume:
{text[:8000]}

Target Role:
{role}

Location:
{location}

Return ONLY valid JSON.

ATS Score must be between 0 and 100.

Scoring Rules:

90-100 = Excellent ATS Resume
80-89 = Very Good Resume
70-79 = Good Resume
60-69 = Needs Improvement
Below 60 = Poor Resume

Never return ATS scores below 40 unless the resume is extremely poor.

Return:

{{
  "ats_score": 0,
  "summary": "",
  "strengths": [],
  "missing_skills": [],
  "resume_improvements": [],
  "keyword_suggestions": []
}}
"""

    response = client_ai.chat.completions.create(
        model="openai/gpt-oss-20b",
        temperature=0.3,
        messages=[
            {
                "role": "system",
                "content": "Return only valid JSON."
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    ai_text = response.choices[0].message.content

    ai_text = ai_text.replace("```json", "")
    ai_text = ai_text.replace("```", "")
    ai_text = ai_text.strip()

    try:
        start = ai_text.find("{")
        end = ai_text.rfind("}") + 1

        if start >= 0 and end > start:
            ai_text = ai_text[start:end]

        return json.loads(ai_text)

    except Exception as e:
        print("ATS JSON Error:", e)

        return {
            "ats_score": 0,
            "summary": "Failed to analyze resume.",
            "strengths": [],
            "missing_skills": [],
            "resume_improvements": [],
            "keyword_suggestions": []
        }

# ================== RESUME ROUTE ==================
@api_router.post("/resume/analyze")
async def analyze(
    file: UploadFile = File(...),
    target_role: str = Form(...),
    location: str = Form(""),
    user=Depends(get_current_user)
):
    content = await file.read()
    text = extract_text(file, content)

    result = await analyze_resume_llm(
        text,
        target_role,
        location
    )

    await db.resume_profiles.update_one(
        {"user_id": user["id"]},
        {
            "$set": {
                "user_id": user["id"],
                "target_role": target_role,
                "location": location,
                "resume_text": text[:15000],
                "analysis": result,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )

    return result

# ================== CHAT ==================
@api_router.post("/chat/send")
async def chat(req: ChatMessageRequest, user=Depends(get_current_user)):

    session_id = req.session_id or str(uuid.uuid4())

    response = client_ai.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=[
            {
                "role": "system",
                "content": "You are a helpful career assistant."
            },
            {
                "role": "user",
                "content": req.message
            }
        ]
    )

    reply = response.choices[0].message.content

    # Save user message
    await db.chat_messages.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "user_id": user["id"],
        "role": "user",
        "content": req.message,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    # Save AI message
    await db.chat_messages.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "user_id": user["id"],
        "role": "assistant",
        "content": reply,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    # Create/update session
    await db.chat_sessions.update_one(
        {
            "id": session_id,
            "user_id": user["id"]
        },
        {
            "$setOnInsert": {
                "id": session_id,
                "user_id": user["id"],
                "title": req.message[:50]
            },
            "$set": {
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )

    return {
        "reply": reply,
        "session_id": session_id
    }

@api_router.get("/chat/sessions")
async def get_sessions(user=Depends(get_current_user)):
    sessions = await db.chat_sessions.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("updated_at", -1).to_list(100)

    return sessions


@api_router.get("/chat/sessions/{session_id}")
async def get_messages(session_id: str, user=Depends(get_current_user)):

    messages = await db.chat_messages.find(
        {
            "session_id": session_id,
            "user_id": user["id"]
        },
        {"_id": 0}
    ).sort("created_at", 1).to_list(500)

    return messages


@api_router.delete("/chat/sessions/{session_id}")
async def delete_session(session_id: str, user=Depends(get_current_user)):

    await db.chat_messages.delete_many({
        "session_id": session_id,
        "user_id": user["id"]
    })

    await db.chat_sessions.delete_one({
        "id": session_id,
        "user_id": user["id"]
    })

    return {"success": True}

async def get_ai_job_match(profile, job):

    prompt = f"""
You are an expert ATS recruiter.

Evaluate how well the candidate matches the job.

Resume Analysis:
{json.dumps(profile.get("analysis", {}), indent=2)}

Job Title:
{job.get("job_title","")}

Job Description:
{job.get("job_description","")[:4000]}

Match Score must be between 0 and 100.

Scoring Rules:

90-100 = Excellent match
80-89 = Strong match
70-79 = Good match
60-69 = Partial match
Below 60 = Weak match

Never return scores below 50 if the resume and role are related.

Return ONLY valid JSON:

{{
  "match_score": 0,
  "match_reason": ""
}}

"""

    try:

        response = client_ai.chat.completions.create(
            model="llama-3.3-70b-versatile",
            temperature=0.2,
            messages=[
                {
                    "role": "system",
                    "content": "Return only valid JSON."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        text = response.choices[0].message.content

        text = text.replace("```json", "")
        text = text.replace("```", "")
        text = text.strip()

        start = text.find("{")
        end = text.rfind("}") + 1

        if start >= 0 and end > start:
            text = text[start:end]

        return json.loads(text)

    except Exception as e:

        print(e)

        return {
            "match_score": 50,
            "match_reason": "Unable to evaluate match."
        }

# ================== JOB SEARCH ==================
@api_router.post("/jobs/search")
async def jobs(
    resume: UploadFile = File(...),
    role: str = Form(...),
    location: str = Form(""),
    user=Depends(get_current_user)
):

    content = await resume.read()
    resume_text = extract_text(resume, content)

    profile = await analyze_resume_llm(
        resume_text,
        role,
        location
    )

    url = "https://jsearch.p.rapidapi.com/search"

    query = role

    if location:
        query += f" in {location}"

    headers = {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
    }

    params = {
        "query": query,
        "page": "1",
        "num_pages": "1"
    }

    response = requests.get(
        url,
        headers=headers,
        params=params,
        timeout=30
    )

    jobs = response.json().get("data", [])

    results = []

    for job in jobs[:15]:

        ai_match = await get_ai_job_match(
            {
                "analysis": profile
            },
            job
        )

        results.append({
            "title": job.get("job_title"),
            "company": job.get("employer_name"),
            "location": job.get("job_city")
            or job.get("job_country"),
            "url": job.get("job_apply_link"),
            "source": "JSearch",
            "tags": [
                job.get("job_employment_type", "")
            ],
            "match_score": ai_match.get(
                "match_score",
                50
            ),
            "match_reason": ai_match.get(
                "match_reason",
                ""
            )
        })

    results.sort(
        key=lambda x: x["match_score"],
        reverse=True
    )

    return {
        "count": len(results),
        "jobs": results
    }

# ================== ROOT ==================
@api_router.get("/")
async def root():
    return {"msg": "API running"}

# ================== FINAL ==================
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
def shutdown():
    client.close()

# python -m uvicorn server:app --reload
