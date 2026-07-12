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

router = APIRouter(prefix="/api/csr", tags=["CSR Compliance"])

class PledgeCreate(BaseModel):
    ngo_id: UUID
    pledged_amount: float = Field(..., ge=0)
    pledged_hours: float = Field(..., ge=0)

class ReportGenerate(BaseModel):
    report_year: int

@router.post("/pledges", status_code=status.HTTP_201_CREATED)
async def create_pledge(
    request: PledgeCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role([UserRole.corporate]))
):
    # Verify NGO exists
    ngo_query = text("SELECT user_id FROM ngo_profiles WHERE user_id = :ngo_id")
    ngo_res = await db.execute(ngo_query, {"ngo_id": request.ngo_id})
    if not ngo_res.mappings().first():
        raise HTTPException(status_code=404, detail="NGO profile not found")

    try:
        query = text("""
            INSERT INTO csr_pledges (corporate_id, ngo_id, pledged_amount, pledged_hours, status)
            VALUES (:corporate_id, :ngo_id, :pledged_amount, :pledged_hours, 'pending')
            RETURNING id, corporate_id, ngo_id, pledged_amount, pledged_hours, status, created_at
        """)
        result = await db.execute(query, {
            "corporate_id": current_user["id"],
            "ngo_id": request.ngo_id,
            "pledged_amount": request.pledged_amount,
            "pledged_hours": request.pledged_hours
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
    query = text("""
        SELECT u.id, u.name, u.email, u.city, np.registration_no, np.darpan_id, np.focus_areas
        FROM users u
        JOIN ngo_profiles np ON u.id = np.user_id
    """)
    result = await db.execute(query)
    return result.mappings().all()
