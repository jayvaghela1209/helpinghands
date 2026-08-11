from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
import re

from app.db import get_db
from app.routers.auth import require_role
from app.schemas.auth import UserRole

router = APIRouter(prefix="/api/ngo", tags=["NGO"])

ALLOWED_FOCUS_AREAS = [
    'Education',
    'Healthcare',
    'Environment & Sustainability',
    'Gender Equality',
    'Rural Development',
    'Poverty & Hunger',
    'Disaster Relief',
    'Skill Development'
]

class NgoProfileCreateUpdate(BaseModel):
    organization_name: str = Field(..., max_length=200)
    registration_number: Optional[str] = Field(None, max_length=9)
    pan_number: Optional[str] = Field(None, max_length=10)
    darpan_id: Optional[str] = Field(None, max_length=16)
    focus_areas: List[str] = []

    @field_validator('registration_number')
    @classmethod
    def validate_registration_number(cls, v):
        if v and not re.fullmatch(r'\d{1,9}', v):
            raise ValueError('Registration number must contain maximum 9 numeric digits only.')
        return v

    @field_validator('darpan_id')
    @classmethod
    def validate_darpan_id(cls, v):
        if v and (len(v) < 14 or len(v) > 16):
            raise ValueError('NGO Darpan ID must be between 14 and 16 characters.')
        return v

    @field_validator('pan_number')
    @classmethod
    def validate_pan_number(cls, v):
        if v and len(v) != 10:
            raise ValueError('PAN number must be exactly 10 characters.')
        return v

@router.get("/focus-areas")
async def get_focus_areas():
    """Return the canonical list of allowed NGO focus areas."""
    return {"focus_areas": ALLOWED_FOCUS_AREAS}

@router.get("/profile")
async def get_ngo_profile(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role([UserRole.ngo]))
):
    query = text("""
        SELECT p.*, u.name as user_name, u.email as user_email,
               (SELECT ROUND(AVG(rating)::numeric, 1) FROM ngo_reviews WHERE ngo_profile_id = p.id) AS avg_rating,
               (SELECT COUNT(*) FROM ngo_reviews WHERE ngo_profile_id = p.id) AS rating_count
        FROM ngo_profiles p
        JOIN users u ON p.user_id = u.id
        WHERE p.user_id = :user_id
    """)
    result = await db.execute(query, {"user_id": current_user["id"]})
    prof = result.mappings().first()
    if not prof:
        return {
            "has_profile": False,
            "user_id": str(current_user["id"]),
            "user_name": current_user["name"],
            "user_email": current_user["email"]
        }

    res_dict = dict(prof)
    res_dict["has_profile"] = True
    return res_dict

@router.post("/profile")
@router.put("/profile")
async def create_or_update_ngo_profile(
    request: NgoProfileCreateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role([UserRole.ngo]))
):
    # Validate focus_areas against allowed list
    for fa in request.focus_areas:
        if fa not in ALLOWED_FOCUS_AREAS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid focus area '{fa}'. Allowed values: {ALLOWED_FOCUS_AREAS}"
            )

    check_query = text("SELECT id FROM ngo_profiles WHERE user_id = :user_id")
    res = await db.execute(check_query, {"user_id": current_user["id"]})
    existing = res.mappings().first()

    try:
        if existing:
            update_query = text("""
                UPDATE ngo_profiles
                SET organization_name = :organization_name,
                    registration_number = :registration_number,
                    pan_number = :pan_number,
                    darpan_id = :darpan_id,
                    focus_areas = :focus_areas,
                    updated_at = NOW()
                WHERE user_id = :user_id
                RETURNING *
            """)
            updated = await db.execute(update_query, {
                "user_id": current_user["id"],
                "organization_name": request.organization_name,
                "registration_number": request.registration_number,
                "pan_number": request.pan_number,
                "darpan_id": request.darpan_id,
                "focus_areas": request.focus_areas
            })
            await db.commit()
            res_dict = dict(updated.mappings().first())
            res_dict["has_profile"] = True
            return res_dict
        else:
            # Auto-approve NGOs so they appear in Browse NGOs immediately
            insert_query = text("""
                INSERT INTO ngo_profiles (user_id, organization_name, registration_number, pan_number, darpan_id, focus_areas, verification_status)
                VALUES (:user_id, :organization_name, :registration_number, :pan_number, :darpan_id, :focus_areas, 'approved')
                RETURNING *
            """)
            inserted = await db.execute(insert_query, {
                "user_id": current_user["id"],
                "organization_name": request.organization_name,
                "registration_number": request.registration_number,
                "pan_number": request.pan_number,
                "darpan_id": request.darpan_id,
                "focus_areas": request.focus_areas
            })
            await db.commit()
            res_dict = dict(inserted.mappings().first())
            res_dict["has_profile"] = True
            return res_dict
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Failed to save NGO profile: {str(e)}"
        )

@router.get("/pledges")
async def get_received_pledges(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role([UserRole.ngo]))
):
    # Fetch the NGO profile ID for the logged-in user
    ngo_query = text("SELECT id FROM ngo_profiles WHERE user_id = :user_id")
    ngo_res = await db.execute(ngo_query, {"user_id": current_user["id"]})
    ngo_row = ngo_res.mappings().first()
    if not ngo_row:
        return []

    ngo_profile_id = ngo_row["id"]

    # Query CSR pledges with corporate company name and optional requirement title
    pledges_query = text("""
        SELECT p.id, p.pledged_amount, p.pledged_hours, p.status, p.created_at,
               cp.company_name as corporate_name,
               req.title as requirement_title
        FROM csr_pledges p
        JOIN corporate_profiles cp ON p.corporate_profile_id = cp.id
        LEFT JOIN requirements req ON p.requirement_id = req.id
        WHERE p.ngo_profile_id = :ngo_profile_id
        ORDER BY p.created_at DESC
    """)
    pledges_res = await db.execute(pledges_query, {"ngo_profile_id": ngo_profile_id})
    return pledges_res.mappings().all()

