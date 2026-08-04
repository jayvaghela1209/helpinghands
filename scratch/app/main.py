from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from sqlalchemy import text

from app.db import async_session
from app.routers import (
    auth_router,
    requirements_router,
    applications_router,
    attendance_router,
    csr_router,
    volunteer_router,
    ngo_router
)

app = FastAPI(
    title="HelpingHands — Verified Volunteering & CSR Compliance Platform API",
    version="1.0.0"
)

# Configure CORS for local React development
# Configure CORS
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "https://helpinghands-roan.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth_router)
app.include_router(requirements_router)
app.include_router(applications_router)
app.include_router(attendance_router)
app.include_router(csr_router)
app.include_router(volunteer_router)
app.include_router(ngo_router)

# Health check endpoint
@app.get("/health")
async def health_check():
    db_status = "offline"
    try:
        async with async_session() as session:
            await session.execute(text("SELECT 1"))
            db_status = "online"
    except Exception as err:
        # Log error locally if desired
        pass
        
    return {
        "status": "healthy" if db_status == "online" else "degraded",
        "database": db_status
    }
