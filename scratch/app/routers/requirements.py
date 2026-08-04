from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date
from uuid import UUID

from app.db import get_db
from app.routers.auth import get_current_user, require_role
from app.schemas.auth import UserRole

router = APIRouter(prefix="/api/requirements", tags=["Requirements"])

class RequirementCreate(BaseModel):
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    category: Optional[str] = Field(None, max_length=100)
    skill_tags: List[str] = []
    seats_total: int = Field(..., gt=0)
    event_date: date
    location_name: str = Field(..., max_length=255)
    event_latitude: float
    event_longitude: float
    attendance_radius: Optional[float] = 50.0
    is_urgent: bool = False

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_requirement(
    request: RequirementCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role([UserRole.ngo]))
):
    try:
        query = text("""
            INSERT INTO requirements (ngo_profile_id, title, description, category, skill_tags, seats_total, event_date, location_name, event_latitude, event_longitude, attendance_radius, is_urgent)
            VALUES ((SELECT id FROM ngo_profiles WHERE user_id = :ngo_user_id), :title, :description, :category, :skill_tags, :seats_total, :event_date, :location_name, :event_latitude, :event_longitude, :attendance_radius, :is_urgent)
            RETURNING id, ngo_profile_id, title, description, category, skill_tags, seats_total, seats_filled, event_date, location_name, event_latitude, event_longitude, attendance_radius, is_urgent, status, created_at
        """)
        
        result = await db.execute(query, {
            "ngo_user_id": current_user["id"],
            "title": request.title,
            "description": request.description,
            "category": request.category,
            "skill_tags": request.skill_tags,
            "seats_total": request.seats_total,
            "event_date": request.event_date,
            "location_name": request.location_name,
            "event_latitude": request.event_latitude,
            "event_longitude": request.event_longitude,
            "attendance_radius": request.attendance_radius,
            "is_urgent": request.is_urgent
        })
        await db.commit()
        return result.mappings().first()
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create requirement: {str(e)}"
        )

@router.get("")
async def list_requirements(
    category: Optional[str] = None,
    skill: Optional[str] = None,
    event_date: Optional[date] = None,
    location_name: Optional[str] = None,
    is_urgent: Optional[bool] = None,
    db: AsyncSession = Depends(get_db)
):
    # Base condition: only open requirements
    conditions = ["requirements.status = 'open'"]
    params = {}

    if category:
        conditions.append("requirements.category = :category")
        params["category"] = category
    if skill:
        conditions.append(":skill = ANY(requirements.skill_tags)")
        params["skill"] = skill
    if event_date:
        conditions.append("requirements.event_date = :event_date")
        params["event_date"] = event_date
    if location_name:
        conditions.append("requirements.location_name ILIKE :location_name")
        params["location_name"] = f"%{location_name}%"
    if is_urgent is not None:
        conditions.append("requirements.is_urgent = :is_urgent")
        params["is_urgent"] = is_urgent

    where_clause = " AND ".join(conditions)
    query_str = f"""
        SELECT requirements.*, ngo_profiles.organization_name
        FROM requirements
        JOIN ngo_profiles ON requirements.ngo_profile_id = ngo_profiles.id
        WHERE {where_clause}
        ORDER BY requirements.created_at DESC
    """
    result = await db.execute(text(query_str), params)
    return result.mappings().all()

@router.get("/ngo")
async def list_ngo_requirements(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role([UserRole.ngo]))
):
    query = text("SELECT * FROM requirements WHERE ngo_profile_id = (SELECT id FROM ngo_profiles WHERE user_id = :ngo_user_id) ORDER BY created_at DESC")
    result = await db.execute(query, {"ngo_user_id": current_user["id"]})
    return result.mappings().all()

@router.get("/{id}/details")
async def get_requirement_details(
    id: UUID,
    db: AsyncSession = Depends(get_db)
):
    # Fetch requirement with organization name and average NGO rating
    query = text("""
        SELECT r.*, ngo_profiles.organization_name,
               (SELECT AVG(rating) FROM ngo_reviews WHERE ngo_profile_id = r.ngo_profile_id) AS avg_rating
        FROM requirements r
        JOIN ngo_profiles ON r.ngo_profile_id = ngo_profiles.id
        WHERE r.id = :id
    """)
    result = await db.execute(query, {"id": id})
    req = result.mappings().first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")
    return req
