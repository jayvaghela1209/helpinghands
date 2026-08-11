from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone
import math
import logging

from app.db import get_db
from app.routers.auth import get_current_user, require_role
from app.schemas.auth import UserRole

logger = logging.getLogger(__name__)

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
        WHERE requirement_id = :requirement_id 
          AND volunteer_profile_id = (SELECT id FROM volunteer_profiles WHERE user_id = :volunteer_user_id)
    """)
    app_res = await db.execute(app_query, {
        "requirement_id": id,
        "volunteer_user_id": current_user["id"]
    })
    app = app_res.mappings().first()
    if not app or app["status"] != "accepted":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must be an accepted volunteer to check in to this event"
        )

    # Fetch requirement location and per-requirement attendance radius
    req_query = text("SELECT event_latitude, event_longitude, attendance_radius, title FROM requirements WHERE id = :id")
    req_res = await db.execute(req_query, {"id": id})
    req = req_res.mappings().first()

    if not req or req["event_latitude"] is None or req["event_longitude"] is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This event does not have valid coordinates for geo-verification"
        )

    # Guard against the sentinel (0.0, 0.0) stored when the requirement was created
    # with a location name only (no GPS coordinates).  0.0/0.0 is the Gulf of Guinea —
    # no legitimate event will ever be located there.
    if float(req["event_latitude"]) == 0.0 and float(req["event_longitude"]) == 0.0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "This event uses a location name only and does not support GPS check-in. "
                "Please contact the NGO for manual attendance verification."
            )
        )

    # Use the radius stored in this specific requirement.
    if req["attendance_radius"] is None:
     raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This event does not have a valid attendance radius"
       )

    allowed_radius = float(req["attendance_radius"])

    distance = calculate_haversine_distance(
        request.latitude, request.longitude,
        float(req["event_latitude"]), float(req["event_longitude"])
    )

    # Diagnostic log — logs the actual per-requirement radius from the database
    logger.info(
        "Checkin attempt | volunteer=(%.6f, %.6f) event=(%.6f, %.6f) "
        "allowed_radius=%.1fm distance=%.2fm",
        request.latitude, request.longitude,
        float(req["event_latitude"]), float(req["event_longitude"]),
        allowed_radius, distance
    )

    # Compare distance against this requirement's stored radius
    present = distance <= allowed_radius

    if not present:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "detail": "You're too far from the event location",
                "distance": round(distance, 2),
                "allowed_radius": allowed_radius,
            }
        )

    try:
        # Default hours earned: 4.0 hours, default points: 20
        HOURS_EARNED = 4.0
        POINTS_EARNED = 20

        # 1. Insert attendance record
        attendance_insert = text("""
            INSERT INTO attendance (requirement_id, volunteer_profile_id, status, checkin_latitude, checkin_longitude, checkin_distance_meters, checkin_time)
            VALUES (:requirement_id, (SELECT id FROM volunteer_profiles WHERE user_id = :volunteer_user_id), 'checked_in', :checkin_lat, :checkin_lon, :distance, :checkin_time)
            ON CONFLICT (requirement_id, volunteer_profile_id) DO UPDATE 
            SET status = 'checked_in', checkin_latitude = :checkin_lat, checkin_longitude = :checkin_lon, checkin_distance_meters = :distance, checkin_time = :checkin_time
        """)
        await db.execute(attendance_insert, {
            "requirement_id": id,
            "volunteer_user_id": current_user["id"],
            "checkin_lat": request.latitude,
            "checkin_lon": request.longitude,
            "distance": distance,
            "checkin_time": datetime.now(timezone.utc)
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
            INSERT INTO credits_log (volunteer_profile_id, requirement_id, points_change, hours_change, reason, remarks)
            VALUES ((SELECT id FROM volunteer_profiles WHERE user_id = :volunteer_user_id), :requirement_id, :points_change, :hours_change, 'attendance', :remarks)
        """)
        await db.execute(log_insert, {
            "volunteer_user_id": current_user["id"],
            "requirement_id": id,
            "points_change": POINTS_EARNED,
            "hours_change": HOURS_EARNED,
            "remarks": f"Checked in at {req['title']}"
        })

        await db.commit()

        return {
            "success": True,
            "message": "Checked in successfully!",
            "distance": round(distance, 1),
            "allowed_radius": allowed_radius,
            "hours_rewarded": HOURS_EARNED,
            "points_rewarded": POINTS_EARNED
        }
    except Exception as e:
        await db.rollback()
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
    req_query = text("""
        SELECT r.ngo_profile_id 
        FROM requirements r
        JOIN ngo_profiles np ON r.ngo_profile_id = np.id
        WHERE r.id = :id AND np.user_id = :user_id
    """)
    req_res = await db.execute(req_query, {"id": id, "user_id": current_user["id"]})
    req = req_res.scalar()
    if not req:
        raise HTTPException(status_code=403, detail="Forbidden: You are not authorized to view this data")

    query = text("""
        SELECT att.id, att.status, att.checkin_time, att.checkout_time,
               att.checkin_distance_meters, u.name, u.email
        FROM attendance att
        JOIN volunteer_profiles vp ON att.volunteer_profile_id = vp.id
        JOIN users u ON vp.user_id = u.id
        WHERE att.requirement_id = :requirement_id
        ORDER BY att.checkin_time DESC
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
        SELECT a.id, a.volunteer_profile_id, a.requirement_id, a.status, r.ngo_profile_id, np.user_id as ngo_user_id
        FROM attendance a
        JOIN requirements r ON a.requirement_id = r.id
        JOIN ngo_profiles np ON r.ngo_profile_id = np.id
        WHERE a.id = :id
    """)
    att_res = await db.execute(att_query, {"id": id})
    att = att_res.mappings().first()
    
    if not att:
        raise HTTPException(status_code=404, detail="Attendance record not found")
        
    if att["ngo_user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden: You are not authorized to verify this attendance record")

    try:
        query = text("""
            UPDATE attendance
            SET status = 'verified'
            WHERE id = :id
        """)
        await db.execute(query, {"id": id})

        # Since they are manually marked present, we reward them as well
        HOURS_EARNED = 4.0
        POINTS_EARNED = 20

        profile_update = text("""
            UPDATE volunteer_profiles
            SET total_hours = total_hours + :hours,
                credit_points = credit_points + :points
            WHERE id = :volunteer_profile_id
        """)
        await db.execute(profile_update, {
            "hours": HOURS_EARNED,
            "points": POINTS_EARNED,
            "volunteer_profile_id": att["volunteer_profile_id"]
        })

        log_insert = text("""
            INSERT INTO credits_log (volunteer_profile_id, requirement_id, points_change, hours_change, reason, remarks)
            VALUES (:volunteer_profile_id, :requirement_id, :points_change, :hours_change, 'attendance', :remarks)
        """)
        await db.execute(log_insert, {
            "volunteer_profile_id": att["volunteer_profile_id"],
            "requirement_id": att["requirement_id"],
            "points_change": POINTS_EARNED,
            "hours_change": HOURS_EARNED,
            "remarks": "Manual attendance override"
        })

        await db.commit()

        return {"status": "success", "message": "Attendance record marked as present & rewarded"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to verify attendance: {str(e)}")
