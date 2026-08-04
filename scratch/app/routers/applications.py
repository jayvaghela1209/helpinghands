from fastapi import APIRouter, Depends, HTTPException, status, Body
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
class ReviewCreate(BaseModel):
    requirement_id: UUID
    rating: int = Field(..., ge=1, le=5)
    review_comment: Optional[str] = None

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

    # Check if volunteer already applied
    existing_query = text("""
        SELECT id FROM applications
        WHERE requirement_id = :requirement_id
          AND volunteer_profile_id = (SELECT id FROM volunteer_profiles WHERE user_id = :volunteer_user_id)
    """)
    existing_res = await db.execute(existing_query, {"requirement_id": id, "volunteer_user_id": current_user["id"]})
    if existing_res.first():
        raise HTTPException(status_code=400, detail="You have already applied to this volunteering need")

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
            detail="Failed to apply to requirement"
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
        SELECT a.id, a.status, a.applied_at, a.decided_at,
               r.id as requirement_id, r.title, r.category, r.event_date, r.location_name,
               COALESCE(at.status, 'none') as attendance_status,
               EXISTS (SELECT 1 FROM ngo_reviews nr WHERE nr.volunteer_profile_id = vp.id AND nr.requirement_id = r.id) as has_review
        FROM applications a
        JOIN requirements r ON a.requirement_id = r.id
        JOIN volunteer_profiles vp ON a.volunteer_profile_id = vp.id
        LEFT JOIN attendance at ON at.requirement_id = r.id AND at.volunteer_profile_id = vp.id
        WHERE vp.user_id = :user_id
        ORDER BY a.applied_at DESC
    """)
    result = await db.execute(query, {"user_id": current_user["id"]})
    return result.mappings().all()
from fastapi import Body

@router.post("/applications/{id}/checkin")
async def checkin_application(
    id: UUID,
    payload: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role([UserRole.volunteer]))
):
    """Check-in for accepted application based on geo-location."""
    latitude = payload.get("latitude")
    longitude = payload.get("longitude")
    if latitude is None or longitude is None:
        raise HTTPException(status_code=400, detail="Latitude and longitude required")
    # Verify application belongs to volunteer and is accepted
    app_query = text("""
        SELECT a.id, a.requirement_id, a.status, vp.id AS volunteer_profile_id
        FROM applications a
        JOIN volunteer_profiles vp ON a.volunteer_profile_id = vp.id
        WHERE a.id = :app_id AND vp.user_id = :user_id
    """)
    app_res = await db.execute(app_query, {"app_id": id, "user_id": current_user["id"]})
    app = app_res.mappings().first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    if app["status"] != "accepted":
        raise HTTPException(status_code=400, detail="Only accepted applications can be checked in")
    # Load requirement location and radius
    req_query = text("SELECT event_latitude, event_longitude, attendance_radius FROM requirements WHERE id = :req_id")
    req_res = await db.execute(req_query, {"req_id": app["requirement_id"]})
    req = req_res.mappings().first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")
    # Haversine distance calculation
    from math import radians, sin, cos, sqrt, atan2
    R = 6371000  # Earth radius in meters
    lat1, lon1 = radians(req["event_latitude"]), radians(req["event_longitude"])
    lat2, lon2 = radians(latitude), radians(longitude)
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    distance = R * c
    if distance > req["attendance_radius"]:
        raise HTTPException(status_code=400, detail="You're too far from the event location")
    # Upsert attendance row
    upsert_query = text("""
        INSERT INTO attendance (requirement_id, volunteer_profile_id, status, checkin_time, checkin_latitude, checkin_longitude, checkin_distance_meters)
        VALUES (:requirement_id, :volunteer_profile_id, 'checked_in', :now, :lat, :lon, :distance)
        ON CONFLICT (requirement_id, volunteer_profile_id) DO UPDATE SET
            status = EXCLUDED.status,
            checkin_time = EXCLUDED.checkin_time,
            checkin_latitude = EXCLUDED.checkin_latitude,
            checkin_longitude = EXCLUDED.checkin_longitude,
            checkin_distance_meters = EXCLUDED.checkin_distance_meters;
    """)
    await db.execute(upsert_query, {
        "requirement_id": app["requirement_id"],
        "volunteer_profile_id": app["volunteer_profile_id"],
        "now": datetime.now(timezone.utc),
        "lat": latitude,
        "lon": longitude,
        "distance": distance,
    })
    await db.commit()
    return {"status": "checked_in", "distance_meters": distance}
@router.post("/applications/{id}/checkout")
async def checkout_application(
    id: UUID,
    payload: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role([UserRole.volunteer]))
):
    """Check-out for a previously checked‑in attendance.
    Validates geolocation, computes worked hours, updates attendance, logs credits,
    and updates volunteer totals.
    """
    latitude = payload.get("latitude")
    longitude = payload.get("longitude")
    if latitude is None or longitude is None:
        raise HTTPException(status_code=400, detail="Latitude and longitude required")

    # Verify application belongs to volunteer
    app_query = text("""
        SELECT a.id, a.requirement_id, vp.id AS volunteer_profile_id
        FROM applications a
        JOIN volunteer_profiles vp ON a.volunteer_profile_id = vp.id
        WHERE a.id = :app_id AND vp.user_id = :user_id
    """)
    app_res = await db.execute(app_query, {"app_id": id, "user_id": current_user["id"]})
    app = app_res.mappings().first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    # Load existing attendance row (must be checked in)
    attend_query = text("""
        SELECT id, checkin_time FROM attendance
        WHERE requirement_id = :req_id AND volunteer_profile_id = :vol_id AND status = 'checked_in'
    """)
    attend_res = await db.execute(attend_query, {"req_id": app["requirement_id"], "vol_id": app["volunteer_profile_id"]})
    attendance = attend_res.mappings().first()
    if not attendance:
        raise HTTPException(status_code=400, detail="No active check‑in found for this application")

    # Load requirement location & radius (same as check‑in)
    req_query = text("SELECT event_latitude, event_longitude, attendance_radius FROM requirements WHERE id = :req_id")
    req_res = await db.execute(req_query, {"req_id": app["requirement_id"]})
    req = req_res.mappings().first()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")

    # Haversine distance calculation
    from math import radians, sin, cos, sqrt, atan2
    R = 6371000
    lat1, lon1 = radians(req["event_latitude"]), radians(req["event_longitude"])
    lat2, lon2 = radians(latitude), radians(longitude)
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    distance = R * c
    if distance > req["attendance_radius"]:
        raise HTTPException(status_code=400, detail="You're too far from the event location")

    # Compute worked hours
    checkout_time = datetime.now(timezone.utc)
    checkin_time = attendance["checkin_time"]
    worked_seconds = (checkout_time - checkin_time).total_seconds()
    worked_hours = worked_seconds / 3600.0

    # Update attendance row
    update_attend = text("""
        UPDATE attendance
        SET status = 'verified',
            checkout_time = :checkout_time,
            checkout_latitude = :lat,
            checkout_longitude = :lon,
            checkout_distance_meters = :distance,
            worked_hours = :worked_hours
        WHERE id = :att_id
    """)
    await db.execute(update_attend, {
        "checkout_time": checkout_time,
        "lat": latitude,
        "lon": longitude,
        "distance": distance,
        "worked_hours": worked_hours,
        "att_id": attendance["id"]
    })

    # Insert credits log (10 points per hour, rounded to nearest integer)
    points = int(round(worked_hours * 10))
    insert_log = text("""
        INSERT INTO credits_log (volunteer_profile_id, requirement_id, hours_change, points_change, reason)
        VALUES (:vol_id, :req_id, :hours_change, :points_change, 'attendance')
    """)
    await db.execute(insert_log, {
        "vol_id": app["volunteer_profile_id"],
        "req_id": app["requirement_id"],
        "hours_change": worked_hours,
        "points_change": points,
    })

    # Update volunteer profile totals
    update_vol = text("""
        UPDATE volunteer_profiles
        SET total_hours = total_hours + :hours,
            credit_points = credit_points + :points
        WHERE id = :vol_id
    """)
    await db.execute(update_vol, {
        "hours": worked_hours,
        "points": points,
        "vol_id": app["volunteer_profile_id"],
    })
    await db.commit()
    return {"status": "verified", "worked_hours": worked_hours, "points_awarded": points}

# Endpoint to submit review
@router.post("/reviews")
async def submit_review(
    review: ReviewCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role([UserRole.volunteer]))
):
    """Submit a review after verified attendance. Ensures one review per volunteer per requirement."""
    # Get volunteer_profile_id
    vp_query = text("""
        SELECT id FROM volunteer_profiles WHERE user_id = :user_id
    """)
    vp_res = await db.execute(vp_query, {"user_id": current_user["id"]})
    vp = vp_res.scalar()
    if not vp:
        raise HTTPException(status_code=404, detail="Volunteer profile not found")
    # Verify verified attendance exists
    attend_query = text("""
        SELECT 1 FROM attendance
        WHERE requirement_id = :req_id AND volunteer_profile_id = :vol_id AND status = 'verified'
    """)
    attend_res = await db.execute(attend_query, {"req_id": review.requirement_id, "vol_id": vp})
    if not attend_res.first():
        raise HTTPException(status_code=400, detail="No verified attendance for this requirement")
    # Check if review already exists
    existing = text("""
        SELECT 1 FROM ngo_reviews
        WHERE volunteer_profile_id = :vol_id AND requirement_id = :req_id
    """)
    existing_res = await db.execute(existing, {"vol_id": vp, "req_id": review.requirement_id})
    if existing_res.first():
        raise HTTPException(status_code=400, detail="Review already submitted")
    # Get ngo_profile_id from requirement
    ngo_query = text("""
        SELECT ngo_profile_id FROM requirements WHERE id = :req_id
    """)
    ngo_res = await db.execute(ngo_query, {"req_id": review.requirement_id})
    ngo_id = ngo_res.scalar()
    if not ngo_id:
        raise HTTPException(status_code=404, detail="Requirement not found")
    # Insert review
    insert_review = text("""
        INSERT INTO ngo_reviews (volunteer_profile_id, ngo_profile_id, requirement_id, rating, review_comment)
        VALUES (:vol_id, :ngo_id, :req_id, :rating, :comment)
    """)
    await db.execute(insert_review, {
        "vol_id": vp,
        "ngo_id": ngo_id,
        "req_id": review.requirement_id,
        "rating": review.rating,
        "comment": review.review_comment,
    })
    await db.commit()
    return {"status": "review_submitted"}
# TODO: def generate_certificate(volunteer_profile_id: UUID, requirement_id: UUID) -> bytes:
#   """Generate a PDF/PNG certificate for the verified attendance. Implementation
#   will be added in Phase 4."""
