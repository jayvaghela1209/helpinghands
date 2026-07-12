from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone
import math

from app.db import get_db
from app.routers.auth import get_current_user, require_role
from app.schemas.auth import UserRole

router = APIRouter(prefix="/api", tags=["Attendance"])

class CheckinRequest(BaseModel):
    latitude: float
    longitude: float

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

@router.post("/requirements/{id}/checkin")
async def checkin(
    id: UUID,
    request: CheckinRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role([UserRole.volunteer]))
):
    # Verify the volunteer was accepted for this requirement
    app_query = text("""
        SELECT status FROM applications
        WHERE requirement_id = :requirement_id AND volunteer_id = :volunteer_id
    """)
    app_res = await db.execute(app_query, {
        "requirement_id": id,
        "volunteer_id": current_user["id"]
    })
    app = app_res.mappings().first()
    if not app or app["status"] != "accepted":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must be an accepted volunteer to check in to this event"
        )

    # Fetch requirement location details
    req_query = text("SELECT latitude, longitude, title FROM requirements WHERE id = :id")
    req_res = await db.execute(req_query, {"id": id})
    req = req_res.mappings().first()
    
    if not req or req["latitude"] is None or req["longitude"] is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This event does not have valid coordinates for geo-verification"
        )

    distance = calculate_haversine_distance(
        request.latitude, request.longitude,
        float(req["latitude"]), float(req["longitude"])
    )
    
    # 200 meters geo-fence limit
    GEOFENCE_LIMIT_METERS = 200.0
    present = distance <= GEOFENCE_LIMIT_METERS

    if not present:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Check-in failed. You are {round(distance, 1)} meters away from the event location (Limit is 200m)."
        )

    try:
        # Default hours earned: 4.0 hours, default points: 20
        HOURS_EARNED = 4.0
        POINTS_EARNED = 20
        
        async with db.begin():
            # 1. Insert attendance record
            attendance_insert = text("""
                INSERT INTO attendance (requirement_id, volunteer_id, present, checkin_latitude, checkin_longitude, distance_meters, checked_in_at)
                VALUES (:requirement_id, :volunteer_id, :present, :checkin_lat, :checkin_lon, :distance, :checked_in_at)
                ON CONFLICT (requirement_id, volunteer_id) DO UPDATE 
                SET present = true, checkin_latitude = :checkin_lat, checkin_longitude = :checkin_lon, distance_meters = :distance, checked_in_at = :checked_in_at
            """)
            await db.execute(attendance_insert, {
                "requirement_id": id,
                "volunteer_id": current_user["id"],
                "present": True,
                "checkin_lat": request.latitude,
                "checkin_lon": request.longitude,
                "distance": distance,
                "checked_in_at": datetime.now(timezone.utc)
            })

            # 2. Reward the volunteer profile
            profile_update = text("""
                UPDATE volunteer_profiles
                SET total_hours = total_hours + :hours,
                    credit_points = credit_points + :points,
                    trust_score = GREATEST(0, LEAST(100, trust_score + 1))
                WHERE user_id = :user_id
            """)
            await db.execute(profile_update, {
                "hours": HOURS_EARNED,
                "points": POINTS_EARNED,
                "user_id": current_user["id"]
            })

            # 3. Add to credits audit log
            log_insert = text("""
                INSERT INTO credits_log (volunteer_id, requirement_id, points_change, hours_change, reason)
                VALUES (:volunteer_id, :requirement_id, :points_change, :hours_change, :reason)
            """)
            await db.execute(log_insert, {
                "volunteer_id": current_user["id"],
                "requirement_id": id,
                "points_change": POINTS_EARNED,
                "hours_change": HOURS_EARNED,
                "reason": f"Checked in at {req['title']}"
            })
            
        return {
            "status": "success",
            "message": "Checked in successfully!",
            "distance_meters": round(distance, 1),
            "hours_rewarded": HOURS_EARNED,
            "points_rewarded": POINTS_EARNED
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Check-in execution failed: {str(e)}"
        )

@router.get("/requirements/{id}/attendance")
async def get_attendance(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role([UserRole.ngo]))
):
    # Verify ownership
    req_query = text("SELECT ngo_id FROM requirements WHERE id = :id")
    req_res = await db.execute(req_query, {"id": id})
    req = req_res.mappings().first()
    if not req or req["ngo_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden: You are not authorized to view this data")

    query = text("""
        SELECT att.id, att.present, att.checked_in_at, att.distance_meters, u.name, u.email
        FROM attendance att
        JOIN users u ON att.volunteer_id = u.id
        WHERE att.requirement_id = :requirement_id
        ORDER BY att.checked_in_at DESC
    """)
    result = await db.execute(query, {"requirement_id": id})
    return result.mappings().all()

@router.post("/attendance/{id}/verify")
async def verify_attendance(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role([UserRole.ngo]))
):
    att_query = text("""
        SELECT a.id, a.volunteer_id, a.requirement_id, a.present, r.ngo_id
        FROM attendance a
        JOIN requirements r ON a.requirement_id = r.id
        WHERE a.id = :id
    """)
    att_res = await db.execute(att_query, {"id": id})
    att = att_res.mappings().first()
    
    if not att:
        raise HTTPException(status_code=404, detail="Attendance record not found")
        
    if att["ngo_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden: You are not authorized to verify this attendance record")

    try:
        async with db.begin():
            query = text("""
                UPDATE attendance
                SET present = true, marked_by = :marked_by
                WHERE id = :id
            """)
            await db.execute(query, {
                "id": id,
                "marked_by": current_user["id"]
            })
            
            # Since they are manually marked present, we reward them as well
            HOURS_EARNED = 4.0
            POINTS_EARNED = 20
            
            profile_update = text("""
                UPDATE volunteer_profiles
                SET total_hours = total_hours + :hours,
                    credit_points = credit_points + :points
                WHERE user_id = :user_id
            """)
            await db.execute(profile_update, {
                "hours": HOURS_EARNED,
                "points": POINTS_EARNED,
                "user_id": att["volunteer_id"]
            })

            log_insert = text("""
                INSERT INTO credits_log (volunteer_id, requirement_id, points_change, hours_change, reason)
                VALUES (:volunteer_id, :requirement_id, :points_change, :hours_change, :reason)
            """)
            await db.execute(log_insert, {
                "volunteer_id": att["volunteer_id"],
                "requirement_id": att["requirement_id"],
                "points_change": POINTS_EARNED,
                "hours_change": HOURS_EARNED,
                "reason": "Manual attendance override"
            })
            
        return {"status": "success", "message": "Attendance record marked as present & rewarded"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to verify attendance: {str(e)}")
