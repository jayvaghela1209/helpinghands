from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone

from app.db import get_db
from app.routers.auth import get_current_user, require_role
from app.schemas.auth import UserRole

router = APIRouter(prefix="/api", tags=["Applications"])

class StatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(accepted|rejected)$")

@router.post("/requirements/{id}/apply", status_code=status.HTTP_201_CREATED)
async def apply_to_requirement(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role([UserRole.volunteer]))
):
    # Verify requirement exists and is open
    req_query = text("SELECT status, seats_filled, seats_total FROM requirements WHERE id = :id")
    req_res = await db.execute(req_query, {"id": id})
    req = req_res.mappings().first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")
    if req["status"] != "open":
        raise HTTPException(status_code=400, detail="This opportunity is no longer open")
    if req["seats_filled"] >= req["seats_total"]:
        raise HTTPException(status_code=400, detail="All volunteer seats for this opportunity are filled")

    try:
        query = text("""
            INSERT INTO applications (requirement_id, volunteer_profile_id, status)
            VALUES (:requirement_id, (SELECT id FROM volunteer_profiles WHERE user_id = :volunteer_user_id), 'pending')
            RETURNING id, requirement_id, volunteer_profile_id, status, applied_at
        """)
        result = await db.execute(query, {
            "requirement_id": id,
            "volunteer_user_id": current_user["id"]
        })
        await db.commit()
        return result.mappings().first()
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already applied to this volunteering need"
        )

@router.get("/requirements/{id}/applicants")
async def list_applicants(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role([UserRole.ngo]))
):
    # Check if this requirement belongs to the NGO
    req_query = text("""
        SELECT r.ngo_profile_id 
        FROM requirements r
        JOIN ngo_profiles np ON r.ngo_profile_id = np.id
        WHERE r.id = :id AND np.user_id = :user_id
    """)
    req_res = await db.execute(req_query, {"id": id, "user_id": current_user["id"]})
    req = req_res.scalar()
    if not req:
        raise HTTPException(status_code=403, detail="Forbidden: You do not own this requirement posting")

    query = text("""
        SELECT a.id, a.status, a.applied_at, u.name, u.email, u.phone, u.city, vp.skill_tags
        FROM applications a
        JOIN volunteer_profiles vp ON a.volunteer_profile_id = vp.id
        JOIN users u ON vp.user_id = u.id
        WHERE a.requirement_id = :requirement_id
        ORDER BY a.applied_at DESC
    """)
    result = await db.execute(query, {"requirement_id": id})
    return result.mappings().all()

@router.post("/applications/{id}/status")
async def decide_application(
    id: UUID,
    request: StatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role([UserRole.ngo]))
):
    # Retrieve application detail
    app_query = text("""
        SELECT a.id, a.requirement_id, a.volunteer_profile_id, a.status, r.ngo_profile_id, r.seats_filled, r.seats_total, np.user_id as ngo_user_id
        FROM applications a
        JOIN requirements r ON a.requirement_id = r.id
        JOIN ngo_profiles np ON r.ngo_profile_id = np.id
        WHERE a.id = :id
    """)
    app_res = await db.execute(app_query, {"id": id})
    app = app_res.mappings().first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
        
    if app["ngo_user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden: You are not authorized to manage this application")
        
    if app["status"] != "pending":
        raise HTTPException(status_code=400, detail="This application has already been decided")

    try:
        async with db.begin():
            # Update application status
            update_app = text("""
                UPDATE applications
                SET status = :status, decided_at = :decided_at
                WHERE id = :id
            """)
            await db.execute(update_app, {
                "id": id,
                "status": request.status,
                "decided_at": datetime.now(timezone.utc)
            })

            # If accepted, update requirements table
            if request.status == "accepted":
                if app["seats_filled"] >= app["seats_total"]:
                    raise HTTPException(status_code=400, detail="Capacity limit reached. Cannot accept more volunteers.")
                    
                update_req = text("""
                    UPDATE requirements
                    SET seats_filled = seats_filled + 1
                    WHERE id = :requirement_id
                """)
                await db.execute(update_req, {"requirement_id": app["requirement_id"]})
                
        return {"status": "success", "message": f"Application status set to {request.status}"}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=400, detail=f"Failed to update status: {str(e)}")

@router.get("/volunteers/applications")
async def list_my_applications(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role([UserRole.volunteer]))
):
    query = text("""
        SELECT a.id, a.status, a.applied_at, r.id as requirement_id, r.title, r.category, r.event_date, r.location_name
        FROM applications a
        JOIN requirements r ON a.requirement_id = r.id
        JOIN volunteer_profiles vp ON a.volunteer_profile_id = vp.id
        WHERE vp.user_id = :user_id
        ORDER BY a.applied_at DESC
    """)
    result = await db.execute(query, {"user_id": current_user["id"]})
    return result.mappings().all()
