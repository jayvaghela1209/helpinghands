from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import date
from uuid import UUID

from app.db import get_db
from app.routers.auth import get_current_user, require_role
from app.schemas.auth import UserRole

router = APIRouter(prefix="/api/requirements", tags=["Requirements"])

DEFAULT_ATTENDANCE_RADIUS = 300.0

class RequirementCreate(BaseModel):
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    category: Optional[str] = Field(None, max_length=100)
    skill_tags: List[str] = []
    seats_total: int = Field(..., gt=0)
    event_date: date
    # All three location fields are required together — the frontend always
    # sends name + lat + lon as one confirmed, reverse-geocoded unit.
    location_name: str = Field(..., min_length=1, max_length=255)
    event_latitude: float = Field(..., ge=-90.0, le=90.0)
    event_longitude: float = Field(..., ge=-180.0, le=180.0)
    attendance_radius: Optional[float] = DEFAULT_ATTENDANCE_RADIUS
    is_urgent: bool = False

    @field_validator('event_date')
    @classmethod
    def validate_event_date(cls, v):
        if v < date.today():
            raise ValueError('Event date cannot be in the past. Please select today or a future date.')
        return v

    @field_validator('location_name')
    @classmethod
    def validate_location_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Location name cannot be blank.')
        return v.strip()

class RequirementUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    category: Optional[str] = Field(None, max_length=100)
    skill_tags: Optional[List[str]] = None
    seats_total: Optional[int] = Field(None, gt=0)
    event_date: Optional[date] = None
    location_name: Optional[str] = Field(None, min_length=1, max_length=255)
    event_latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    event_longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    attendance_radius: Optional[float] = Field(None, gt=0)
    is_urgent: Optional[bool] = None

    @field_validator('location_name')
    @classmethod
    def validate_location_name(cls, v):
        if v is not None and not v.strip():
            raise ValueError('Location name cannot be blank.')
        return v.strip() if v else v

    def validate_location_completeness(self) -> None:
        """
        When updating location, all three fields must arrive together.
        Reject partial updates that would leave the requirement in an
        inconsistent state (name without coords, or coords without name).
        """
        has_name = self.location_name is not None
        has_lat = self.event_latitude is not None
        has_lon = self.event_longitude is not None

        # If any location field is present, all three must be present
        if (has_name or has_lat or has_lon) and not (has_name and has_lat and has_lon):
            raise ValueError(
                "When updating location, provide location_name, event_latitude, "
                "and event_longitude together."
            )

        # Reject the sentinel
        if has_lat and has_lon and self.event_latitude == 0.0 and self.event_longitude == 0.0:
            raise ValueError(
                "Coordinates (0.0, 0.0) are not a valid event location."
            )

class StatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(draft|open|completed|cancelled)$")

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_requirement(
    request: RequirementCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role([UserRole.ngo]))
):
    # Location fields are all required and bounds-validated by the Pydantic schema.
    # No additional sentinel check here — (0.0, 0.0) is a valid coordinate.
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
            "attendance_radius": request.attendance_radius or DEFAULT_ATTENDANCE_RADIUS,
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

    # Validate location field completeness (name + lat + lon must arrive together)
    try:
        request.validate_location_completeness()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

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
    if request.attendance_radius is not None:
        fields_to_update.append("attendance_radius = :attendance_radius")
        params["attendance_radius"] = request.attendance_radius
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

