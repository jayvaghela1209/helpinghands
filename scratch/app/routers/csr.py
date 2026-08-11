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
    # Fetch corporate_profile_id for logged-in user
    corp_query = text("SELECT id FROM corporate_profiles WHERE user_id = :user_id")
    corp_res = await db.execute(corp_query, {"user_id": current_user["id"]})
    corp_row = corp_res.mappings().first()
    if not corp_row:
        return {"totals": {"pledged_amount": 0.0, "pledged_hours": 0.0}, "pledges": [], "reports": []}
    corporate_profile_id = corp_row["id"]

    # Sum of pledges
    pledge_sum_query = text("""
        SELECT COALESCE(SUM(pledged_amount), 0) as total_amount,
               COALESCE(SUM(pledged_hours), 0) as total_hours
        FROM csr_pledges
        WHERE corporate_profile_id = :corporate_profile_id
    """)
    sum_res = await db.execute(pledge_sum_query, {"corporate_profile_id": corporate_profile_id})
    totals = sum_res.mappings().first()

    # List of pledges with NGO names
    pledges_query = text("""
        SELECT p.id, p.pledged_amount, p.pledged_hours, p.status, p.created_at, np.organization_name as ngo_name
        FROM csr_pledges p
        JOIN ngo_profiles np ON p.ngo_profile_id = np.id
        WHERE p.corporate_profile_id = :corporate_profile_id
        ORDER BY p.created_at DESC
    """)
    pledges_res = await db.execute(pledges_query, {"corporate_profile_id": corporate_profile_id})
    pledges = pledges_res.mappings().all()

    # List of generated reports
    reports_query = text("""
        SELECT id, report_year, total_funds, total_employee_hours, generated_at
        FROM csr_reports
        WHERE corporate_profile_id = :corporate_profile_id
        ORDER BY report_year DESC
    """)
    reports_res = await db.execute(reports_query, {"corporate_profile_id": corporate_profile_id})
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

@router.post("/reports/generate", status_code=status.HTTP_200_OK)
async def generate_csr_report(
    request: ReportGenerate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role([UserRole.corporate]))
):
    # 1. Fetch corporate profile and user info
    corp_query = text("""
        SELECT cp.id, cp.company_name, cp.registration_number, cp.cin_number, cp.pan_number, cp.verification_status, u.email
        FROM corporate_profiles cp
        JOIN users u ON cp.user_id = u.id
        WHERE cp.user_id = :user_id
    """)
    corp_res = await db.execute(corp_query, {"user_id": current_user["id"]})
    corp_info = corp_res.mappings().first()
    if not corp_info:
        raise HTTPException(status_code=400, detail="Corporate profile not found")
    corporate_profile_id = corp_info["id"]

    report_year = request.report_year

    # 2. Calculate Summary Cards Metrics for selected report year
    stats_query = text("""
        SELECT 
            COALESCE(SUM(pledged_amount), 0) as total_funding,
            COALESCE(SUM(pledged_hours), 0) as employee_volunteer_hours,
            COUNT(DISTINCT ngo_profile_id) as ngos_supported,
            COUNT(DISTINCT requirement_id) as sponsored_requirements,
            COUNT(id) as total_csr_pledges,
            COALESCE(SUM(CASE WHEN status = 'approved' THEN pledged_amount ELSE 0 END), 0) as approved_csr_funding,
            COALESCE(SUM(CASE WHEN status = 'pending' THEN pledged_amount ELSE 0 END), 0) as pending_csr_funding
        FROM csr_pledges
        WHERE corporate_profile_id = :corporate_profile_id
          AND EXTRACT(YEAR FROM created_at) = :report_year
    """)
    stats_res = await db.execute(stats_query, {
        "corporate_profile_id": corporate_profile_id,
        "report_year": report_year
    })
    stats = stats_res.mappings().first()

    total_funding = float(stats["total_funding"])
    ngos_supported = int(stats["ngos_supported"])
    avg_funding = (total_funding / ngos_supported) if ngos_supported > 0 else 0.0

    summary_cards = {
        "total_funding": total_funding,
        "employee_volunteer_hours": float(stats["employee_volunteer_hours"]),
        "ngos_supported": ngos_supported,
        "sponsored_requirements": int(stats["sponsored_requirements"]),
        "total_csr_pledges": int(stats["total_csr_pledges"]),
        "approved_csr_funding": float(stats["approved_csr_funding"]),
        "pending_csr_funding": float(stats["pending_csr_funding"]),
        "avg_funding_per_ngo": float(avg_funding)
    }

    # 3. Calculate Monthly Data for Bar Chart, Line Chart & Area Chart
    monthly_query = text("""
        SELECT 
            EXTRACT(MONTH FROM created_at)::int as month_num,
            COALESCE(SUM(pledged_amount), 0) as monthly_funding,
            COALESCE(SUM(pledged_hours), 0) as monthly_hours
        FROM csr_pledges
        WHERE corporate_profile_id = :corporate_profile_id
          AND EXTRACT(YEAR FROM created_at) = :report_year
        GROUP BY month_num
        ORDER BY month_num
    """)
    monthly_res = await db.execute(monthly_query, {
        "corporate_profile_id": corporate_profile_id,
        "report_year": report_year
    })
    monthly_rows = {r["month_num"]: r for r in monthly_res.mappings().all()}

    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    monthly_data = []
    cumulative = 0.0
    for m in range(1, 13):
        m_info = monthly_rows.get(m, {"monthly_funding": 0, "monthly_hours": 0})
        funding = float(m_info["monthly_funding"])
        hours = float(m_info["monthly_hours"])
        cumulative += funding
        monthly_data.append({
            "month": month_names[m - 1],
            "funding": funding,
            "hours": hours,
            "cumulative_funding": cumulative
        })

    # 4. NGO Distribution for Pie Chart
    ngo_dist_query = text("""
        SELECT np.organization_name as ngo_name,
               COALESCE(SUM(p.pledged_amount), 0) as amount
        FROM csr_pledges p
        JOIN ngo_profiles np ON p.ngo_profile_id = np.id
        WHERE p.corporate_profile_id = :corporate_profile_id
          AND EXTRACT(YEAR FROM p.created_at) = :report_year
        GROUP BY np.organization_name
        ORDER BY amount DESC
    """)
    ngo_dist_res = await db.execute(ngo_dist_query, {
        "corporate_profile_id": corporate_profile_id,
        "report_year": report_year
    })
    ngo_distribution = [
        {"ngo_name": r["ngo_name"], "amount": float(r["amount"])}
        for r in ngo_dist_res.mappings().all()
    ]

    # 5. Sponsorship Status Distribution for Doughnut Chart
    status_query = text("""
        SELECT status, COUNT(*) as count
        FROM csr_pledges
        WHERE corporate_profile_id = :corporate_profile_id
          AND EXTRACT(YEAR FROM created_at) = :report_year
        GROUP BY status
    """)
    status_res = await db.execute(status_query, {
        "corporate_profile_id": corporate_profile_id,
        "report_year": report_year
    })
    status_distribution = [
        {"status": r["status"], "count": int(r["count"])}
        for r in status_res.mappings().all()
    ]

    # 6. Detailed Tables Data

    # Table 1: CSR Funding Summary
    t1_query = text("""
        SELECT np.organization_name as ngo_name,
               COALESCE(SUM(p.pledged_amount), 0) as total_funding,
               COUNT(p.id) as donation_count,
               MAX(p.created_at) as latest_donation_date
        FROM csr_pledges p
        JOIN ngo_profiles np ON p.ngo_profile_id = np.id
        WHERE p.corporate_profile_id = :corporate_profile_id
          AND EXTRACT(YEAR FROM p.created_at) = :report_year
        GROUP BY np.organization_name
        ORDER BY total_funding DESC
    """)
    t1_res = await db.execute(t1_query, {
        "corporate_profile_id": corporate_profile_id,
        "report_year": report_year
    })
    table_1_funding_summary = [
        {
            "ngo_name": r["ngo_name"],
            "total_funding": float(r["total_funding"]),
            "donation_count": int(r["donation_count"]),
            "latest_donation_date": r["latest_donation_date"].isoformat() if r["latest_donation_date"] else None
        }
        for r in t1_res.mappings().all()
    ]

    # Table 2: Requirement Sponsorship Summary
    t2_query = text("""
        SELECT req.title as requirement_name,
               np.organization_name as ngo_name,
               p.pledged_amount as sponsored_amount,
               p.status,
               p.created_at as sponsorship_date
        FROM csr_pledges p
        JOIN ngo_profiles np ON p.ngo_profile_id = np.id
        JOIN requirements req ON p.requirement_id = req.id
        WHERE p.corporate_profile_id = :corporate_profile_id
          AND p.requirement_id IS NOT NULL
          AND EXTRACT(YEAR FROM p.created_at) = :report_year
        ORDER BY p.created_at DESC
    """)
    t2_res = await db.execute(t2_query, {
        "corporate_profile_id": corporate_profile_id,
        "report_year": report_year
    })
    table_2_sponsorship_summary = [
        {
            "requirement_name": r["requirement_name"],
            "ngo_name": r["ngo_name"],
            "sponsored_amount": float(r["sponsored_amount"]),
            "status": r["status"],
            "sponsorship_date": r["sponsorship_date"].isoformat() if r["sponsorship_date"] else None
        }
        for r in t2_res.mappings().all()
    ]

    # Table 3: Employee Volunteer Summary
    t3_query = text("""
        SELECT u.name as employee_name,
               np.organization_name as ngo_name,
               cep.credited_hours as volunteer_hours,
               cep.recorded_at as activity_date
        FROM csr_employee_participation cep
        JOIN volunteer_profiles vp ON cep.volunteer_profile_id = vp.id
        JOIN users u ON vp.user_id = u.id
        JOIN attendance att ON cep.attendance_id = att.id
        JOIN requirements req ON att.requirement_id = req.id
        JOIN ngo_profiles np ON req.ngo_profile_id = np.id
        WHERE cep.corporate_profile_id = :corporate_profile_id
          AND EXTRACT(YEAR FROM cep.recorded_at) = :report_year
        ORDER BY cep.recorded_at DESC
    """)
    t3_res = await db.execute(t3_query, {
        "corporate_profile_id": corporate_profile_id,
        "report_year": report_year
    })
    table_3_volunteer_summary = [
        {
            "employee_name": r["employee_name"],
            "ngo_name": r["ngo_name"],
            "volunteer_hours": float(r["volunteer_hours"]),
            "activity_date": r["activity_date"].isoformat() if r["activity_date"] else None
        }
        for r in t3_res.mappings().all()
    ]

    # Table 4: CSR Pledges
    t4_query = text("""
        SELECT COALESCE(req.title, CONCAT('General NGO Funding - ', np.organization_name)) as pledge_title,
               p.pledged_amount as amount,
               p.status,
               p.created_at as created_date
        FROM csr_pledges p
        JOIN ngo_profiles np ON p.ngo_profile_id = np.id
        LEFT JOIN requirements req ON p.requirement_id = req.id
        WHERE p.corporate_profile_id = :corporate_profile_id
          AND EXTRACT(YEAR FROM p.created_at) = :report_year
        ORDER BY p.created_at DESC
    """)
    t4_res = await db.execute(t4_query, {
        "corporate_profile_id": corporate_profile_id,
        "report_year": report_year
    })
    table_4_pledges = [
        {
            "pledge_title": r["pledge_title"],
            "amount": float(r["amount"]),
            "status": r["status"],
            "created_date": r["created_date"].isoformat() if r["created_date"] else None
        }
        for r in t4_res.mappings().all()
    ]

    # Save snapshot record into csr_reports table
    try:
        save_query = text("""
            INSERT INTO csr_reports (corporate_profile_id, report_year, total_funds, total_employee_hours, generated_at)
            VALUES (:corporate_profile_id, :report_year, :total_funds, :total_employee_hours, NOW())
            ON CONFLICT (corporate_profile_id, report_year)
            DO UPDATE SET 
                total_funds = EXCLUDED.total_funds,
                total_employee_hours = EXCLUDED.total_employee_hours,
                generated_at = NOW()
        """)
        await db.execute(save_query, {
            "corporate_profile_id": corporate_profile_id,
            "report_year": report_year,
            "total_funds": total_funding,
            "total_employee_hours": summary_cards["employee_volunteer_hours"]
        })
        await db.commit()
    except Exception:
        await db.rollback()

    return {
        "corporate_info": {
            "company_name": corp_info["company_name"],
            "registration_number": corp_info["registration_number"],
            "cin_number": corp_info["cin_number"],
            "pan_number": corp_info["pan_number"],
            "verification_status": corp_info["verification_status"],
            "email": corp_info["email"]
        },
        "report_year": report_year,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary_cards": summary_cards,
        "monthly_data": monthly_data,
        "ngo_distribution": ngo_distribution,
        "status_distribution": status_distribution,
        "tables": {
            "funding_summary": table_1_funding_summary,
            "sponsorship_summary": table_2_sponsorship_summary,
            "volunteer_summary": table_3_volunteer_summary,
            "pledges": table_4_pledges
        }
    }

@router.get("/ngos")
async def list_verified_ngos(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role([UserRole.corporate]))
):
    # Fetch eligible NGOs (exclude only suspended/rejected) along with their average ratings, total reviews count, and active open requirements count
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
        WHERE np.verification_status NOT IN ('suspended', 'rejected')
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
    # Fetch details of a specific eligible NGO (exclude only suspended/rejected)
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
        WHERE np.id = :ngo_profile_id AND np.verification_status NOT IN ('suspended', 'rejected')
    """)
    res = await db.execute(profile_query, {"ngo_profile_id": ngo_profile_id})
    profile = res.mappings().first()
    if not profile:
        raise HTTPException(status_code=404, detail="NGO profile not found or not accessible")

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
