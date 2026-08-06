from fastapi import APIRouter, Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession
# pyrefly: ignore [missing-import]
from sqlalchemy import text
from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone

from app.db import get_db
from app.routers.auth import get_current_user, require_role
from app.schemas.auth import UserRole

router = APIRouter(prefix="/api/csr", tags=["CSR Compliance"])

class PledgeCreate(BaseModel):
    ngo_id: UUID
    requirement_id: Optional[UUID] = None
    pledged_amount: float = Field(..., ge=0)
    pledged_hours: Optional[float] = Field(0.0, ge=0)

class ReportGenerate(BaseModel):
    report_year: int

@router.post("/pledges", status_code=status.HTTP_201_CREATED)
async def create_pledge(
    request: PledgeCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role([UserRole.corporate]))
):
    # Verify NGO profile exists (using its profile ID)
    ngo_query = text("SELECT id FROM ngo_profiles WHERE id = :ngo_profile_id")
    ngo_res = await db.execute(ngo_query, {"ngo_profile_id": request.ngo_id})
    if not ngo_res.mappings().first():
        raise HTTPException(status_code=404, detail="NGO profile not found")

    # Get corporate_profile_id for current user
    corp_query = text("SELECT id FROM corporate_profiles WHERE user_id = :user_id")
    corp_res = await db.execute(corp_query, {"user_id": current_user["id"]})
    corp_row = corp_res.mappings().first()
    if not corp_row:
        raise HTTPException(status_code=400, detail="Corporate profile not found for user")
    corporate_profile_id = corp_row["id"]

    # Handle volunteer hours default of 0.0 when None
    pledged_hours = request.pledged_hours if request.pledged_hours is not None else 0.0

    try:
        query = text("""
            INSERT INTO csr_pledges (
                corporate_profile_id,
                ngo_profile_id,
                requirement_id,
                pledged_amount,
                pledged_hours,
                status
            ) VALUES (
                :corporate_profile_id,
                :ngo_profile_id,
                :requirement_id,
                :pledged_amount,
                :pledged_hours,
                'pending'
            ) RETURNING id, corporate_profile_id, ngo_profile_id, requirement_id, pledged_amount, pledged_hours, status, created_at
        """)
        result = await db.execute(query, {
            "corporate_profile_id": corporate_profile_id,
            "ngo_profile_id": request.ngo_id,
            "requirement_id": request.requirement_id,
            "pledged_amount": request.pledged_amount,
            "pledged_hours": pledged_hours,
        })
        await db.commit()
        return result.mappings().first()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to create CSR pledge: {str(e)}")

@router.get("/dashboard")
async def get_csr_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role([UserRole.corporate]))
):
    # Sum of pledges
    pledge_sum_query = text("""
        SELECT COALESCE(SUM(pledged_amount), 0) as total_amount,
               COALESCE(SUM(pledged_hours), 0) as total_hours
        FROM csr_pledges
        WHERE corporate_id = :corporate_id
    """)
    sum_res = await db.execute(pledge_sum_query, {"corporate_id": current_user["id"]})
    totals = sum_res.mappings().first()

    # List of pledges with NGO names
    pledges_query = text("""
        SELECT p.id, p.pledged_amount, p.pledged_hours, p.status, p.created_at, u.name as ngo_name
        FROM csr_pledges p
        JOIN users u ON p.ngo_id = u.id
        WHERE p.corporate_id = :corporate_id
        ORDER BY p.created_at DESC
    """)
    pledges_res = await db.execute(pledges_query, {"corporate_id": current_user["id"]})
    pledges = pledges_res.mappings().all()

    # List of generated reports
    reports_query = text("""
        SELECT id, report_year, total_funds_spent, total_hours_logged, verified_by_auditor, generated_at
        FROM csr_reports
        WHERE corporate_id = :corporate_id
        ORDER BY report_year DESC
    """)
    reports_res = await db.execute(reports_query, {"corporate_id": current_user["id"]})
    reports = reports_res.mappings().all()

    return {
        "totals": {
            "pledged_amount": float(totals["total_amount"]),
            "pledged_hours": float(totals["total_hours"])
        },
        "pledges": pledges,
        "reports": reports
    }

@router.get("/my-pledges")
async def get_corporate_pledges(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role([UserRole.corporate]))
):
    # Get corporate_profile_id for current user
    corp_query = text("SELECT id FROM corporate_profiles WHERE user_id = :user_id")
    corp_res = await db.execute(corp_query, {"user_id": current_user["id"]})
    corp_row = corp_res.mappings().first()
    if not corp_row:
        return []
    corporate_profile_id = corp_row["id"]

    pledges_query = text("""
        SELECT p.id, p.pledged_amount, p.pledged_hours, p.status, p.created_at, p.requirement_id,
               np.organization_name as ngo_name,
               req.title as requirement_title
        FROM csr_pledges p
        JOIN ngo_profiles np ON p.ngo_profile_id = np.id
        LEFT JOIN requirements req ON p.requirement_id = req.id
        WHERE p.corporate_profile_id = :corporate_profile_id
        ORDER BY p.created_at DESC
    """)
    pledges_res = await db.execute(pledges_query, {"corporate_profile_id": corporate_profile_id})
    return pledges_res.mappings().all()

@router.post("/reports/generate", status_code=status.HTTP_201_CREATED)
async def generate_csr_report(
    request: ReportGenerate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role([UserRole.corporate]))
):
    # Calculate sum of approved/pending pledges for simplicity in mock report
    summary_query = text("""
        SELECT COALESCE(SUM(pledged_amount), 0) as total_spent,
               COALESCE(SUM(pledged_hours), 0) as total_hours
        FROM csr_pledges
        WHERE corporate_id = :corporate_id
    """)
    sum_res = await db.execute(summary_query, {"corporate_id": current_user["id"]})
    summary = sum_res.mappings().first()

    try:
        query = text("""
            INSERT INTO csr_reports (corporate_id, report_year, total_funds_spent, total_hours_logged, verified_by_auditor)
            VALUES (:corporate_id, :report_year, :total_funds_spent, :total_hours_logged, false)
            RETURNING id, corporate_id, report_year, total_funds_spent, total_hours_logged, verified_by_auditor, generated_at
        """)
        result = await db.execute(query, {
            "corporate_id": current_user["id"],
            "report_year": request.report_year,
            "total_funds_spent": float(summary["total_spent"]),
            "total_hours_logged": float(summary["total_hours"])
        })
        await db.commit()
        return result.mappings().first()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to generate CSR report: {str(e)}")

@router.get("/ngos")
async def list_verified_ngos(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role([UserRole.corporate]))
):
    # Fetch only approved NGOs along with their average ratings, total reviews count, and active open requirements count
    query = text("""
        SELECT np.id as id,
               np.user_id as user_id,
               np.organization_name as name,
               np.focus_areas,
               np.registration_number,
               np.darpan_id,
               u.email,
               u.city,
               COALESCE(avg_rev.avg_rating, 0.0) as average_rating,
               COALESCE(avg_rev.total_reviews, 0) as total_reviews,
               COALESCE(req_count.active_requirements_count, 0) as active_requirements_count
        FROM ngo_profiles np
        JOIN users u ON np.user_id = u.id
        LEFT JOIN (
            SELECT ngo_profile_id, 
                   ROUND(AVG(rating), 1) as avg_rating, 
                   COUNT(*) as total_reviews
            FROM ngo_reviews
            GROUP BY ngo_profile_id
        ) avg_rev ON np.id = avg_rev.ngo_profile_id
        LEFT JOIN (
            SELECT ngo_profile_id, 
                   COUNT(*) as active_requirements_count
            FROM requirements
            WHERE status = 'open'
            GROUP BY ngo_profile_id
        ) req_count ON np.id = req_count.ngo_profile_id
        WHERE np.verification_status = 'approved'
        ORDER BY np.organization_name ASC
    """)
    result = await db.execute(query)
    return result.mappings().all()

@router.get("/ngos/{ngo_profile_id}")
async def get_ngo_details(
    ngo_profile_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role([UserRole.corporate]))
):
    # Fetch details of a specific approved NGO
    profile_query = text("""
        SELECT np.id, np.user_id, np.organization_name as name, np.registration_number, np.pan_number, np.darpan_id, np.focus_areas, np.verification_status,
               u.email, u.city,
               COALESCE(avg_rev.avg_rating, 0.0) as average_rating,
               COALESCE(avg_rev.total_reviews, 0) as total_reviews
        FROM ngo_profiles np
        JOIN users u ON np.user_id = u.id
        LEFT JOIN (
            SELECT ngo_profile_id, 
                   ROUND(AVG(rating), 1) as avg_rating, 
                   COUNT(*) as total_reviews
            FROM ngo_reviews
            GROUP BY ngo_profile_id
        ) avg_rev ON np.id = avg_rev.ngo_profile_id
        WHERE np.id = :ngo_profile_id AND np.verification_status = 'approved'
    """)
    res = await db.execute(profile_query, {"ngo_profile_id": ngo_profile_id})
    profile = res.mappings().first()
    if not profile:
        raise HTTPException(status_code=404, detail="NGO profile not found or not approved")

    # Fetch active open requirements (volunteering opportunities)
    reqs_query = text("""
        SELECT id, title, description, category, skill_tags, seats_total, seats_filled, event_date, location_name, is_urgent
        FROM requirements
        WHERE ngo_profile_id = :ngo_profile_id AND status = 'open'
        ORDER BY event_date ASC
    """)
    reqs_res = await db.execute(reqs_query, {"ngo_profile_id": ngo_profile_id})
    requirements = reqs_res.mappings().all()

    # Fetch all volunteer reviews for this NGO
    reviews_query = text("""
        SELECT nr.id, nr.rating, nr.review_comment, nr.created_at, u.name as volunteer_name
        FROM ngo_reviews nr
        JOIN volunteer_profiles vp ON nr.volunteer_profile_id = vp.id
        JOIN users u ON vp.user_id = u.id
        WHERE nr.ngo_profile_id = :ngo_profile_id
        ORDER BY nr.created_at DESC
    """)
    reviews_res = await db.execute(reviews_query, {"ngo_profile_id": ngo_profile_id})
    reviews = reviews_res.mappings().all()

    # Fetch CSR pledges for this NGO
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
    pledges = pledges_res.mappings().all()

    return {
        "profile": dict(profile),
        "requirements": [dict(r) for r in requirements],
        "reviews": [dict(rv) for rv in reviews],
        "pledges": [dict(pl) for pl in pledges]
    }
