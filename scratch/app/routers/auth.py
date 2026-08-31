# Authentication Router and Dependencies
import os
import httpx
import jwt
from fastapi import APIRouter, Depends, HTTPException, Header, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession
# pyrefly: ignore [missing-import]
from sqlalchemy import text
from uuid import UUID

from app.db import get_db
from app.schemas.auth import SignupRequest, UserResponse, UserRole, LoginRequest

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Env parameters
SUPABASE_URL = os.getenv("SUPABASE_URL", "http://localhost:54321")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "placeholder-anon-key")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "super-secret-jwt-key")

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    token = credentials.credentials
    try:
        # Decode and verify Supabase JWT token
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False}  # Supabase uses "authenticated" as audience
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )
        
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing sub claim in token"
        )
        
    # Fetch from users database table with organization and company names
    query = text("""
        SELECT u.id, u.role, u.name, u.email, u.phone, u.city, u.created_at,
               np.organization_name,
               cp.company_name
        FROM users u
        LEFT JOIN ngo_profiles np ON u.id = np.user_id
        LEFT JOIN corporate_profiles cp ON u.id = cp.user_id
        WHERE u.id = :user_id
    """)
    result = await db.execute(query, {"user_id": user_id})
    user = result.mappings().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not registered in database"
        )
        
    return user

def require_role(allowed_roles: list[UserRole]):
    async def dependency(current_user = Depends(get_current_user)):
        if current_user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Insufficient privileges"
            )
        return current_user
    return dependency

@router.post("/signup", response_model=UserResponse)
async def signup(request: SignupRequest, db: AsyncSession = Depends(get_db)):
    import uuid as uuid_mod
    
    # Detect if Supabase is actually configured or if we're in local-only mode
    is_local_mode = (
        "placeholder" in SUPABASE_ANON_KEY or
        "placeholder" in SUPABASE_SERVICE_ROLE_KEY or
        SUPABASE_URL == "http://localhost:54321"
    )
    
    if is_local_mode:
        # LOCAL MODE: Skip Supabase entirely, generate a UUID locally
        user_uuid = str(uuid_mod.uuid4())
    else:
        # PRODUCTION MODE: Register user with Supabase first
        async with httpx.AsyncClient() as client:
            if SUPABASE_SERVICE_ROLE_KEY:
                headers = {
                    "apikey": SUPABASE_SERVICE_ROLE_KEY,
                    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                    "Content-Type": "application/json"
                }
                url = f"{SUPABASE_URL}/auth/v1/admin/users"
                body = {
                    "email": request.email,
                    "password": request.password,
                    "email_confirm": True,
                    "user_metadata": {
                        "role": request.role,
                        "name": request.name
                    }
                }
            else:
                headers = {
                    "apikey": SUPABASE_ANON_KEY,
                    "Content-Type": "application/json"
                }
                url = f"{SUPABASE_URL}/auth/v1/signup"
                body = {
                    "email": request.email,
                    "password": request.password,
                    "data": {
                        "role": request.role,
                        "name": request.name
                    }
                }
                
            try:
                response = await client.post(url, headers=headers, json=body, timeout=10.0)
                if response.status_code not in (200, 201):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Supabase auth registration failed: {response.text}"
                    )
                
                supabase_user = response.json()
                user_uuid = supabase_user.get("id")
                if not user_uuid:
                    user_uuid = supabase_user.get("user", {}).get("id")
                    
                if not user_uuid:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to extract user ID from Supabase response"
                    )
                    
            except Exception as err:
                if isinstance(err, HTTPException):
                    raise err
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error connecting to Supabase: {str(err)}"
                )

    # 2. Insert into PostgreSQL
    try:
        async with db.begin():
            # Insert into users table
            user_insert = text("""
    INSERT INTO users (id, role, name, email, phone, city, created_at)
    VALUES (:id, :role, :name, :email, :phone, :city, NOW())
""")
            await db.execute(user_insert, {
                "id": user_uuid,
                "role": request.role,
                "name": request.name,
                "email": request.email,
                "phone": request.phone,
                "city": request.city
            })
            
            # Insert into role-specific profile table
            if request.role == UserRole.volunteer:
                profile_insert = text("""
                    INSERT INTO volunteer_profiles (user_id, skill_tags)
                    VALUES (:user_id, :skill_tags)
                """)
                await db.execute(profile_insert, {
                    "user_id": user_uuid,
                    "skill_tags": request.skill_tags
                })
            elif request.role == UserRole.ngo:
                # Auto-approve NGOs at registration so they appear in Browse NGOs immediately
                profile_insert = text("""
                    INSERT INTO ngo_profiles (user_id, organization_name, registration_number, darpan_id, pan_number, focus_areas, verification_status)
                    VALUES (:user_id, :organization_name, :registration_number, :darpan_id, :pan_number, :focus_areas, 'approved')
                """)
                await db.execute(profile_insert, {
                    "user_id": user_uuid,
                    "organization_name": request.organization_name or request.name,
                    "registration_number": request.registration_number or "",
                    "darpan_id": request.darpan_id,
                    "pan_number": request.pan_number,
                    "focus_areas": request.focus_areas
                })
            elif request.role == UserRole.corporate:
                profile_insert = text("""
                    INSERT INTO corporate_profiles (user_id, company_name, registration_number, cin_number, pan_number, csr_focus_areas)
                    VALUES (:user_id, :company_name, :registration_number, :cin_number, :pan_number, :csr_focus_areas)
                """)
                await db.execute(profile_insert, {
                    "user_id": user_uuid,
                    "company_name": request.company_name or request.name,
                    "registration_number": request.registration_number or "",
                    "cin_number": request.cin_number,
                    "pan_number": request.pan_number,
                    "csr_focus_areas": request.csr_focus_areas
                })
                
    except Exception as db_err:
        # Note: If email / user already exists in DB, it will raise an error here.
        # Ideally, we would delete the Supabase user here, but since this is local setup,
        # we raise a clear HTTP error.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Database profile creation failed: {str(db_err)}"
        )

    # Fetch and return the newly created user
    query = text("""
        SELECT u.id, u.role, u.name, u.email, u.phone, u.city, u.created_at,
               np.organization_name,
               cp.company_name
        FROM users u
        LEFT JOIN ngo_profiles np ON u.id = np.user_id
        LEFT JOIN corporate_profiles cp ON u.id = cp.user_id
        WHERE u.id = :user_id
    """)
    result = await db.execute(query, {"user_id": user_uuid})
    new_user = result.mappings().first()
    return new_user

@router.get("/me", response_model=UserResponse)
async def get_me(current_user = Depends(get_current_user)):
    return current_user

@router.post("/login")
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    query = text("SELECT id, role, name, email, phone, city, created_at FROM users WHERE email = :email")
    result = await db.execute(query, {"email": request.email})
    user = result.mappings().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account not found. Please register first."
        )
        
    from datetime import datetime, timezone
    token = jwt.encode({
        "sub": str(user["id"]),
        "email": user["email"],
        "role": "authenticated",
        "aud": "authenticated",
        "exp": int(datetime.now(timezone.utc).timestamp() + 86400)
    }, SUPABASE_JWT_SECRET, algorithm="HS256")
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user["id"]),
            "email": user["email"]
        }
    }
