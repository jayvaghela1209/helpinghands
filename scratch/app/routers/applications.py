from fastapi import APIRouter, Depends, HTTPException, status, Body, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone
import io
import uuid

from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas
from reportlab.lib import colors

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
        # Update application status
        update_app = text(
            """
                UPDATE applications
                SET status = :status, decided_at = :decided_at
                WHERE id = :id
            """
        )
        await db.execute(update_app, {
            "id": id,
            "status": request.status,
            "decided_at": datetime.now(timezone.utc)
        })

        # If accepted, update requirements table
        if request.status == "accepted":
            if app["seats_filled"] >= app["seats_total"]:
                raise HTTPException(status_code=400, detail="Capacity limit reached. Cannot accept more volunteers.")
            update_req = text(
                """
                    UPDATE requirements
                    SET seats_filled = seats_filled + 1
                    WHERE id = :requirement_id
                """
            )
            await db.execute(update_req, {"requirement_id": app["requirement_id"]})

        await db.commit()
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

@router.post("/applications/{id}/withdraw")
async def withdraw_application(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role([UserRole.volunteer]))
):
    # Verify application belongs to volunteer
    app_query = text("""
        SELECT a.id, a.volunteer_profile_id, a.status, a.applied_at,
               a.requirement_id
        FROM applications a
        JOIN volunteer_profiles vp ON a.volunteer_profile_id = vp.id
        WHERE a.id = :id AND vp.user_id = :user_id
    """)
    app_res = await db.execute(app_query, {"id": id, "user_id": current_user["id"]})
    app = app_res.mappings().first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    # Enforce 48-hour rule
    now = datetime.now(timezone.utc)
    applied_at = app["applied_at"]
    if not applied_at:
        raise HTTPException(status_code=400, detail="Application timestamp missing")
    elapsed = now - applied_at
    if elapsed.total_seconds() > 48 * 3600:
        raise HTTPException(status_code=400, detail="Withdrawal window has expired")
    # Prevent withdrawal after check-in or verification
    attend_check = text("""
        SELECT status FROM attendance
        WHERE requirement_id = :req_id AND volunteer_profile_id = :vol_id
    """)
    attend_res = await db.execute(attend_check, {"req_id": app["requirement_id"], "vol_id": app["volunteer_profile_id"]})
    attend_row = attend_res.first()
    if attend_row:
        att_status = attend_row[0] if isinstance(attend_row, tuple) else (getattr(attend_row, 'status', None) or attend_row.get('status'))
        if att_status in ("checked_in", "verified"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot withdraw after check-in or event completion"
            )

    # If the application was accepted, decrement seats_filled (prevent negative)
    if app["status"] == "accepted":
        dec_req = text("""
            UPDATE requirements
            SET seats_filled = GREATEST(seats_filled - 1, 0)
            WHERE id = :req_id
        """)
        await db.execute(dec_req, {"req_id": app["requirement_id"]})
    # Update status to withdrawn
    await db.execute(
        text("UPDATE applications SET status = 'withdrawn', decided_at = :now WHERE id = :id"),
        {"now": now, "id": id}
    )
    await db.commit()
    return {"status": "withdrawn", "application_id": id}


def build_certificate_pdf(
    volunteer_name: str,
    event_title: str,
    ngo_name: str,
    event_date: str,
    location_name: str,
    worked_hours: float,
    cert_number: str,
    issue_date: str
) -> bytes:
    """Generates a landscape PDF certificate using ReportLab matching HelpingHands visual styling."""
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=landscape(A4))
    width, height = landscape(A4)

    # Soft off-white canvas background
    c.setFillColor(colors.HexColor('#F8FAFC'))
    c.rect(0, 0, width, height, fill=1, stroke=0)

    # Outer Border Frame (Navy Blue)
    c.setStrokeColor(colors.HexColor('#1E3A8A'))
    c.setLineWidth(4)
    c.rect(25, 25, width - 50, height - 50)

    # Inner Border Frame (Gold / Amber Accent)
    c.setStrokeColor(colors.HexColor('#D97706'))
    c.setLineWidth(1.5)
    c.rect(32, 32, width - 64, height - 64)

    # Corner Decorative Accents
    c.setStrokeColor(colors.HexColor('#1E3A8A'))
    c.setLineWidth(2)
    # top-left
    c.line(36, height - 45, 60, height - 45)
    c.line(45, height - 36, 45, height - 60)
    # top-right
    c.line(width - 60, height - 45, width - 36, height - 45)
    c.line(width - 45, height - 36, width - 45, height - 60)
    # bottom-left
    c.line(36, 45, 60, 45)
    c.line(45, 36, 45, 60)
    # bottom-right
    c.line(width - 60, 45, width - 36, 45)
    c.line(width - 45, 36, width - 45, 60)

    # Top Branding Header
    c.setFont('Helvetica-Bold', 18)
    c.setFillColor(colors.HexColor('#1E3A8A'))
    c.drawCentredString(width / 2, height - 75, 'HELPINGHANDS')

    c.setFont('Helvetica-Bold', 9)
    c.setFillColor(colors.HexColor('#64748B'))
    c.drawCentredString(width / 2, height - 90, 'VERIFIED VOLUNTEERING & COMPLIANCE PLATFORM')

    # Horizontal Divider Line
    c.setStrokeColor(colors.HexColor('#CBD5E1'))
    c.setLineWidth(1)
    c.line(width / 2 - 160, height - 102, width / 2 + 160, height - 102)

    # Main Certificate Heading
    c.setFont('Helvetica-Bold', 28)
    c.setFillColor(colors.HexColor('#0F172A'))
    c.drawCentredString(width / 2, height - 145, 'CERTIFICATE OF RECOGNITION')

    # Subtitle
    c.setFont('Helvetica', 12)
    c.setFillColor(colors.HexColor('#475569'))
    c.drawCentredString(width / 2, height - 175, 'THIS CERTIFICATE IS PROUDLY PRESENTED TO')

    # Volunteer Full Name
    c.setFont('Helvetica-Bold', 24)
    c.setFillColor(colors.HexColor('#1E3A8A'))
    c.drawCentredString(width / 2, height - 215, volunteer_name or 'Volunteer')

    # Underline accent for volunteer name
    c.setStrokeColor(colors.HexColor('#D97706'))
    c.setLineWidth(1.5)
    c.line(width / 2 - 180, height - 225, width / 2 + 180, height - 225)

    # Recognition body text
    c.setFont('Helvetica', 12)
    c.setFillColor(colors.HexColor('#334155'))
    c.drawCentredString(width / 2, height - 260, 'For outstanding dedication, community service, and verified volunteer participation in')

    # Event / Opportunity Title
    c.setFont('Helvetica-Bold', 18)
    c.setFillColor(colors.HexColor('#0F172A'))
    c.drawCentredString(width / 2, height - 295, f'"{event_title}"')

    # NGO & Event details
    c.setFont('Helvetica-Bold', 11)
    c.setFillColor(colors.HexColor('#475569'))
    c.drawCentredString(width / 2, height - 325, f'Organized by: {ngo_name}')

    hours_val = float(worked_hours) if worked_hours is not None else 0.0
    c.setFont('Helvetica', 10)
    c.setFillColor(colors.HexColor('#64748B'))
    c.drawCentredString(
        width / 2, height - 345,
        f'Event Date: {event_date}   |   Location: {location_name or "Virtual"}   |   Verified Hours: {hours_val:.1f} hrs'
    )

    # Bottom Footer & Verification Meta
    c.setFont('Helvetica-Bold', 9)
    c.setFillColor(colors.HexColor('#1E3A8A'))
    c.drawString(70, 110, f'Certificate ID: {cert_number}')
    c.drawString(70, 95, f'Issue Date: {issue_date}')
    c.setFont('Helvetica', 8)
    c.setFillColor(colors.HexColor('#64748B'))
    c.drawString(70, 80, 'Verified via HelpingHands GPS & Attendance Audit')

    # Bottom Right Authorized Signature line
    c.setStrokeColor(colors.HexColor('#94A3B8'))
    c.setLineWidth(1)
    c.line(width - 250, 105, width - 70, 105)
    c.setFont('Helvetica-Bold', 10)
    c.setFillColor(colors.HexColor('#0F172A'))
    c.drawCentredString(width - 160, 90, 'Authorized Signatory')
    c.setFont('Helvetica', 8)
    c.setFillColor(colors.HexColor('#64748B'))
    c.drawCentredString(width - 160, 78, f'{ngo_name}')

    c.save()
    return buffer.getvalue()


@router.post("/applications/{id}/certificate")
async def generate_or_download_certificate(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role([UserRole.volunteer]))
):
    """Generates and downloads the official PDF certificate for a verified volunteering application.
    Enforces eligibility: attendance.status == 'verified' (both check-in and check-out completed).
    Prevents duplicates by creating or retrieving existing record from certificates table.
    """
    # 1. Fetch application details & volunteer profile
    app_query = text("""
        SELECT a.id, a.requirement_id, a.volunteer_profile_id, vp.id AS vp_id, u.name AS volunteer_name
        FROM applications a
        JOIN volunteer_profiles vp ON a.volunteer_profile_id = vp.id
        JOIN users u ON vp.user_id = u.id
        WHERE a.id = :app_id AND vp.user_id = :user_id
    """)
    app_res = await db.execute(app_query, {"app_id": id, "user_id": current_user["id"]})
    app = app_res.mappings().first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found for current volunteer")

    req_id = app["requirement_id"]
    vol_profile_id = app["volunteer_profile_id"]

    # 2. Verify attendance status == 'verified'
    attend_query = text("""
        SELECT status, worked_hours FROM attendance
        WHERE requirement_id = :req_id AND volunteer_profile_id = :vol_id
    """)
    attend_res = await db.execute(attend_query, {"req_id": req_id, "vol_id": vol_profile_id})
    attend = attend_res.mappings().first()

    if not attend or attend["status"] != "verified":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Certificate available only after verified check-out"
        )

    worked_hours = attend["worked_hours"] if attend["worked_hours"] is not None else 0.0

    # 3. Check for existing certificate in certificates table
    cert_query = text("""
        SELECT id, certificate_number, worked_hours, issue_date
        FROM certificates
        WHERE requirement_id = :req_id AND volunteer_profile_id = :vol_id
    """)
    cert_res = await db.execute(cert_query, {"req_id": req_id, "vol_id": vol_profile_id})
    cert_row = cert_res.mappings().first()

    if cert_row:
        cert_number = cert_row["certificate_number"]
        issue_date_str = str(cert_row["issue_date"])
        worked_hours = cert_row["worked_hours"]
    else:
        # Create new certificate record
        cert_number = f"HH-CERT-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        issue_date_val = datetime.now(timezone.utc).date()
        issue_date_str = str(issue_date_val)

        try:
            insert_cert = text("""
                INSERT INTO certificates (volunteer_profile_id, requirement_id, certificate_number, worked_hours, issue_date, status)
                VALUES (:vol_id, :req_id, :cert_no, :worked_hours, :issue_date, 'generated')
                RETURNING id, certificate_number, issue_date
            """)
            await db.execute(insert_cert, {
                "vol_id": vol_profile_id,
                "req_id": req_id,
                "cert_no": cert_number,
                "worked_hours": worked_hours,
                "issue_date": issue_date_val,
            })
            await db.commit()
        except Exception:
            await db.rollback()
            # In case of race condition, fetch existing row
            re_check = await db.execute(cert_query, {"req_id": req_id, "vol_id": vol_profile_id})
            re_cert = re_check.mappings().first()
            if re_cert:
                cert_number = re_cert["certificate_number"]
                issue_date_str = str(re_cert["issue_date"])
            else:
                raise HTTPException(status_code=400, detail="Failed to create certificate record")

    # 4. Fetch requirement and NGO details for rendering
    req_query = text("""
        SELECT r.title, r.event_date, r.location_name, np.organization_name
        FROM requirements r
        JOIN ngo_profiles np ON r.ngo_profile_id = np.id
        WHERE r.id = :req_id
    """)
    req_res = await db.execute(req_query, {"req_id": req_id})
    req_data = req_res.mappings().first()

    event_title = req_data["title"] if req_data else "Volunteering Event"
    ngo_name = req_data["organization_name"] if req_data else "HelpingHands Partner Organization"
    event_date_str = str(req_data["event_date"]) if req_data else issue_date_str
    location_name = req_data["location_name"] if req_data else "Event Location"

    # 5. Generate PDF
    pdf_bytes = build_certificate_pdf(
        volunteer_name=app["volunteer_name"],
        event_title=event_title,
        ngo_name=ngo_name,
        event_date=event_date_str,
        location_name=location_name,
        worked_hours=worked_hours,
        cert_number=cert_number,
        issue_date=issue_date_str
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="HelpingHands_Certificate_{cert_number}.pdf"'
        }
    )


@router.post("/requirements/{id}/certificate")
async def generate_certificate_by_requirement(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role([UserRole.volunteer]))
):
    """Generate or download certificate by requirement ID for the current volunteer."""
    app_query = text("""
        SELECT id FROM applications
        WHERE requirement_id = :req_id
          AND volunteer_profile_id = (SELECT id FROM volunteer_profiles WHERE user_id = :user_id)
    """)
    app_res = await db.execute(app_query, {"req_id": id, "user_id": current_user["id"]})
    app_id = app_res.scalar()
    if not app_id:
        raise HTTPException(status_code=404, detail="No application found for this requirement")

    return await generate_or_download_certificate(id=app_id, db=db, current_user=current_user)


@router.get("/certificates/my-certificates")
async def list_my_certificates(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role([UserRole.volunteer]))
):
    """List all earned certificates for the current logged-in volunteer."""
    query = text("""
        SELECT c.id, c.certificate_number, c.worked_hours, c.issue_date, c.status,
               r.id AS requirement_id, r.title AS requirement_title, r.event_date, r.location_name,
               np.organization_name AS ngo_name,
               a.id AS application_id
        FROM certificates c
        JOIN volunteer_profiles vp ON c.volunteer_profile_id = vp.id
        JOIN requirements r ON c.requirement_id = r.id
        JOIN ngo_profiles np ON r.ngo_profile_id = np.id
        LEFT JOIN applications a ON a.requirement_id = r.id AND a.volunteer_profile_id = vp.id
        WHERE vp.user_id = :user_id
        ORDER BY c.issue_date DESC, c.created_at DESC
    """)
    result = await db.execute(query, {"user_id": current_user["id"]})
    return result.mappings().all()


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
