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

class RequirementUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    category: Optional[str] = Field(None, max_length=100)
    skill_tags: Optional[List[str]] = None
    seats_total: Optional[int] = Field(None, gt=0)
    event_date: Optional[date] = None
    location_name: Optional[str] = Field(None, max_length=255)
    event_latitude: Optional[float] = None
    event_longitude: Optional[float] = None
    is_urgent: Optional[bool] = None

class StatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(draft|open|completed|cancelled)$")

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_requirement(
    request: RequirementCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role([UserRole.ngo]))
):
    try:
        query = text("""
            INSERT INTO requirements (ngo_profile_id, title, description, category, skill_tags, seats_total, event_date, location_name, event_latitude, event_longitude, attendance_radius, is_urgent, status)
            VALUES ((SELECT id FROM ngo_profiles WHERE user_id = :ngo_user_id), :title, :description, :category, :skill_tags, :seats_total, :event_date, :location_name, :event_latitude, :event_longitude, :attendance_radius, :is_urgent, 'open')
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
    # Base condition: ONLY requirements with status='open' are shown to volunteers
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
    query = text("""
        SELECT * FROM requirements 
        WHERE ngo_profile_id = (SELECT id FROM ngo_profiles WHERE user_id = :ngo_user_id) 
        ORDER BY created_at DESC
    """)
    result = await db.execute(query, {"ngo_user_id": current_user["id"]})
    return result.mappings().all()
@router.get("/{id}")
async def get_requirement(
    id: UUID,
    db: AsyncSession = Depends(get_db)
):
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


@router.get("/{id}/details")
async def get_requirement_details(
    id: UUID,
    db: AsyncSession = Depends(get_db)
):
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

@router.patch("/{id}/status")
async def update_requirement_status(
    id: UUID,
    request: StatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role([UserRole.ngo]))
):
    # Verify requirement belongs to current NGO
    check_query = text("""
        SELECT id, status FROM requirements 
        WHERE id = :id AND ngo_profile_id = (SELECT id FROM ngo_profiles WHERE user_id = :ngo_user_id)
    """)
    res = await db.execute(check_query, {"id": id, "ngo_user_id": current_user["id"]})
    req = res.mappings().first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found or access denied")

    new_status = request.status
    if new_status not in ['draft', 'open', 'completed', 'cancelled']:
        raise HTTPException(status_code=400, detail="Invalid status. Allowed values: draft, open, completed, cancelled")

    try:
        update_query = text("""
            UPDATE requirements
            SET status = :status, updated_at = NOW()
            WHERE id = :id
            RETURNING id, title, status
        """)
        updated = await db.execute(update_query, {"id": id, "status": new_status})
        await db.commit()
        return updated.mappings().first()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to update requirement status: {str(e)}")

@router.put("/{id}")
async def edit_requirement(
    id: UUID,
    request: RequirementUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role([UserRole.ngo]))
):
    # Verify requirement belongs to current NGO and check current status
    check_query = text("""
        SELECT id, status FROM requirements 
        WHERE id = :id AND ngo_profile_id = (SELECT id FROM ngo_profiles WHERE user_id = :ngo_user_id)
    """)
    res = await db.execute(check_query, {"id": id, "ngo_user_id": current_user["id"]})
    req = res.mappings().first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found or access denied")

    if req["status"] not in ['draft', 'open']:
        raise HTTPException(
            status_code=400, 
            detail=f"Editing is only allowed while status is draft or open. Current status: {req['status']}"
        )

    fields_to_update = []
    params = {"id": id}

    if request.title is not None:
        fields_to_update.append("title = :title")
        params["title"] = request.title
    if request.description is not None:
        fields_to_update.append("description = :description")
        params["description"] = request.description
    if request.category is not None:
        fields_to_update.append("category = :category")
        params["category"] = request.category
    if request.skill_tags is not None:
        fields_to_update.append("skill_tags = :skill_tags")
        params["skill_tags"] = request.skill_tags
    if request.seats_total is not None:
        fields_to_update.append("seats_total = :seats_total")
        params["seats_total"] = request.seats_total
    if request.event_date is not None:
        fields_to_update.append("event_date = :event_date")
        params["event_date"] = request.event_date
    if request.location_name is not None:
        fields_to_update.append("location_name = :location_name")
        params["location_name"] = request.location_name
    if request.event_latitude is not None:
        fields_to_update.append("event_latitude = :event_latitude")
        params["event_latitude"] = request.event_latitude
    if request.event_longitude is not None:
        fields_to_update.append("event_longitude = :event_longitude")
        params["event_longitude"] = request.event_longitude
    if request.is_urgent is not None:
        fields_to_update.append("is_urgent = :is_urgent")
        params["is_urgent"] = request.is_urgent

    if not fields_to_update:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    fields_to_update.append("updated_at = NOW()")
    set_clause = ", ".join(fields_to_update)

    try:
        update_query = text(f"UPDATE requirements SET {set_clause} WHERE id = :id RETURNING *")
        result = await db.execute(update_query, params)
        await db.commit()
        return result.mappings().first()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to update requirement: {str(e)}")

@router.get("/{id}")
async def get_requirement_by_id(
    id: UUID,
    db: AsyncSession = Depends(get_db)
):
    query = text("""
        SELECT r.*, np.organization_name as ngo_name
        FROM requirements r
        JOIN ngo_profiles np ON r.ngo_profile_id = np.id
        WHERE r.id = :id
    """)
    res = await db.execute(query, {"id": id})
    req = res.mappings().first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")
    return req

