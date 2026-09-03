"""
Platform Operator Router
------------------------
Isolated authentication and verification management for the Platform Operator role.

This module uses its OWN JWT secret and its own login endpoint so that it never
touches the normal Supabase-based user authentication flow.

Credentials are read exclusively from environment variables:
  PLATFORM_OPERATOR_EMAIL         — the operator's login email
  PLATFORM_OPERATOR_PASSWORD_HASH — bcrypt hash of the operator's password

To generate a hash for a new password run:
  python -c "import bcrypt; print(bcrypt.hashpw(b'YourPassword', bcrypt.gensalt()).decode())"

The operator token is a standard HS256 JWT signed with PLATFORM_OPERATOR_JWT_SECRET.
Normal user tokens (signed with SUPABASE_JWT_SECRET) are REJECTED by this module,
and platform-operator tokens are REJECTED by the normal get_current_user dependency.
"""

import os
import re
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession
# pyrefly: ignore [missing-import]
from sqlalchemy import text
from pydantic import BaseModel, EmailStr

from app.db import get_db

router = APIRouter(prefix="/api/platform-operator", tags=["Platform Operator"])

# ---------------------------------------------------------------------------
# Environment configuration — NEVER hard-code credentials here
# ---------------------------------------------------------------------------
_PO_EMAIL = os.getenv("PLATFORM_OPERATOR_EMAIL", "")
_PO_PASSWORD_HASH = os.getenv("PLATFORM_OPERATOR_PASSWORD_HASH", "")
_PO_JWT_SECRET = os.getenv(
    "PLATFORM_OPERATOR_JWT_SECRET",
    os.getenv("SUPABASE_JWT_SECRET", "super-secret-jwt-key")
)
_PO_TOKEN_AUDIENCE = "platform-operator"

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class OperatorLoginRequest(BaseModel):
    email: EmailStr
    password: str

class RejectRequest(BaseModel):
    reason: str = ""


# ---------------------------------------------------------------------------
# Token helpers — isolated from normal user auth
# ---------------------------------------------------------------------------

_po_security = HTTPBearer()

def _issue_operator_token() -> str:
    payload = {
        "sub": "platform-operator",
        "aud": _PO_TOKEN_AUDIENCE,
        "iat": int(datetime.now(timezone.utc).timestamp()),
        "exp": int((datetime.now(timezone.utc) + timedelta(hours=8)).timestamp()),
    }
    return jwt.encode(payload, _PO_JWT_SECRET, algorithm="HS256")


def _verify_operator_token(
    credentials: HTTPAuthorizationCredentials = Depends(_po_security),
) -> None:
    """Dependency: validates the platform-operator JWT. Raises 401/403 on failure."""
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            _PO_JWT_SECRET,
            algorithms=["HS256"],
            audience=_PO_TOKEN_AUDIENCE,
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Operator token has expired")
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid operator token: {exc}")

    if payload.get("sub") != "platform-operator":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a platform-operator token")


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

@router.post("/login")
async def operator_login(request: OperatorLoginRequest):
    """
    Authenticate as the Platform Operator.
    Returns a short-lived JWT specific to the platform-operator audience.
    """
    if not _PO_EMAIL or not _PO_PASSWORD_HASH:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Platform Operator credentials are not configured on this server.",
        )

    # Case-insensitive email comparison
    if request.email.strip().lower() != _PO_EMAIL.strip().lower():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
        )

    try:
        password_matches = bcrypt.checkpw(
            request.password.encode("utf-8"),
            _PO_PASSWORD_HASH.encode("utf-8"),
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error verifying credentials.",
        )

    if not password_matches:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
        )

    token = _issue_operator_token()
    return {"access_token": token, "token_type": "bearer"}


# ---------------------------------------------------------------------------
# Verification Requests  (NGOs + Corporates)
# ---------------------------------------------------------------------------

@router.get("/verification-requests")
async def list_verification_requests(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_operator_token),
):
    """
    Returns all NGO and Corporate profiles grouped by verification status.
    The operator can review pending, approved, and rejected entries.
    """
    # --- NGOs ---
    ngo_query = text("""
        SELECT
            np.id,
            'ngo'                       AS entity_type,
            np.organization_name        AS display_name,
            u.name                      AS contact_name,
            u.email,
            u.phone,
            u.city,
            np.registration_number,
            np.darpan_id,
            np.pan_number,
            np.focus_areas,
            np.verification_status,
            u.created_at
        FROM ngo_profiles np
        JOIN users u ON np.user_id = u.id
        ORDER BY
            CASE np.verification_status
                WHEN 'pending'  THEN 0
                WHEN 'approved' THEN 1
                WHEN 'rejected' THEN 2
                ELSE 3
            END,
            u.created_at DESC
    """)
    ngo_res = await db.execute(ngo_query)
    ngos = [dict(r) for r in ngo_res.mappings().all()]

    # --- Corporates ---
    corp_query = text("""
        SELECT
            cp.id,
            'corporate'                 AS entity_type,
            cp.company_name             AS display_name,
            u.name                      AS contact_name,
            u.email,
            u.phone,
            u.city,
            cp.registration_number,
            cp.cin_number,
            cp.pan_number,
            cp.csr_focus_areas          AS focus_areas,
            cp.verification_status,
            u.created_at
        FROM corporate_profiles cp
        JOIN users u ON cp.user_id = u.id
        ORDER BY
            CASE cp.verification_status
                WHEN 'pending'  THEN 0
                WHEN 'approved' THEN 1
                WHEN 'rejected' THEN 2
                ELSE 3
            END,
            u.created_at DESC
    """)
    corp_res = await db.execute(corp_query)
    corps = [dict(r) for r in corp_res.mappings().all()]

    # --- Volunteers (read-only overview) ---
    vol_query = text("""
        SELECT
            vp.id,
            'volunteer'             AS entity_type,
            u.name                  AS display_name,
            u.email,
            u.phone,
            u.city,
            vp.skill_tags,
            vp.total_hours,
            vp.credit_points,
            u.created_at
        FROM volunteer_profiles vp
        JOIN users u ON vp.user_id = u.id
        ORDER BY u.created_at DESC
    """)
    vol_res = await db.execute(vol_query)
    volunteers = [dict(r) for r in vol_res.mappings().all()]

    return {
        "ngos": ngos,
        "corporates": corps,
        "volunteers": volunteers,
    }


@router.get("/verification-requests/{profile_id}")
async def get_verification_request_detail(
    profile_id: UUID,
    entity_type: str,                       # query param: "ngo" or "corporate"
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_operator_token),
):
    """
    Returns full detail for a single NGO or Corporate profile.
    Pass entity_type=ngo or entity_type=corporate as a query parameter.
    """
    entity_type = entity_type.lower().strip()
    if entity_type not in ("ngo", "corporate"):
        raise HTTPException(status_code=400, detail="entity_type must be 'ngo' or 'corporate'")

    if entity_type == "ngo":
        query = text("""
            SELECT
                np.*,
                u.name      AS contact_name,
                u.email,
                u.phone,
                u.city,
                u.created_at
            FROM ngo_profiles np
            JOIN users u ON np.user_id = u.id
            WHERE np.id = :profile_id
        """)
    else:
        query = text("""
            SELECT
                cp.*,
                u.name      AS contact_name,
                u.email,
                u.phone,
                u.city,
                u.created_at
            FROM corporate_profiles cp
            JOIN users u ON cp.user_id = u.id
            WHERE cp.id = :profile_id
        """)

    res = await db.execute(query, {"profile_id": profile_id})
    row = res.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail=f"{entity_type.upper()} profile not found")

    return dict(row)


# ---------------------------------------------------------------------------
# Approve
# ---------------------------------------------------------------------------

@router.post("/verification-requests/{profile_id}/approve")
async def approve_verification(
    profile_id: UUID,
    entity_type: str,                       # query param: "ngo" or "corporate"
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_operator_token),
):
    """Sets verification_status = 'approved' for the given NGO or Corporate profile."""
    entity_type = entity_type.lower().strip()
    if entity_type not in ("ngo", "corporate"):
        raise HTTPException(status_code=400, detail="entity_type must be 'ngo' or 'corporate'")

    table = "ngo_profiles" if entity_type == "ngo" else "corporate_profiles"

    # Check the profile actually exists
    check = await db.execute(
        text(f"SELECT id FROM {table} WHERE id = :id"),
        {"id": profile_id},
    )
    if not check.mappings().first():
        raise HTTPException(status_code=404, detail=f"{entity_type.upper()} profile not found")

    await db.execute(
        text(f"""
            UPDATE {table}
            SET verification_status = 'approved',
                updated_at = NOW()
            WHERE id = :id
        """),
        {"id": profile_id},
    )
    await db.commit()
    return {"status": "approved", "profile_id": str(profile_id), "entity_type": entity_type}


# ---------------------------------------------------------------------------
# Reject
# ---------------------------------------------------------------------------

@router.post("/verification-requests/{profile_id}/reject")
async def reject_verification(
    profile_id: UUID,
    entity_type: str,                       # query param: "ngo" or "corporate"
    request: RejectRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_operator_token),
):
    """Sets verification_status = 'rejected' for the given NGO or Corporate profile."""
    entity_type = entity_type.lower().strip()
    if entity_type not in ("ngo", "corporate"):
        raise HTTPException(status_code=400, detail="entity_type must be 'ngo' or 'corporate'")

    table = "ngo_profiles" if entity_type == "ngo" else "corporate_profiles"

    check = await db.execute(
        text(f"SELECT id FROM {table} WHERE id = :id"),
        {"id": profile_id},
    )
    if not check.mappings().first():
        raise HTTPException(status_code=404, detail=f"{entity_type.upper()} profile not found")

    await db.execute(
        text(f"""
            UPDATE {table}
            SET verification_status = 'rejected',
                updated_at = NOW()
            WHERE id = :id
        """),
        {"id": profile_id},
    )
    await db.commit()
    return {
        "status": "rejected",
        "profile_id": str(profile_id),
        "entity_type": entity_type,
        "reason": request.reason,
    }


# ---------------------------------------------------------------------------
# Flag
# ---------------------------------------------------------------------------

@router.post("/verification-requests/{profile_id}/flag")
async def flag_entity(
    profile_id: UUID,
    entity_type: str,                       # query param: "ngo" or "corporate"
    request: RejectRequest,                 # reuse RejectRequest for optional reason
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_operator_token),
):
    """Sets verification_status = 'flagged' for the given NGO or Corporate profile.

    Flagged entities remain visible to the operator but are treated as
    requiring review. The frontend can choose to restrict flagged accounts
    similarly to pending accounts.
    """
    entity_type = entity_type.lower().strip()
    if entity_type not in ("ngo", "corporate"):
        raise HTTPException(status_code=400, detail="entity_type must be 'ngo' or 'corporate'")

    table = "ngo_profiles" if entity_type == "ngo" else "corporate_profiles"

    check = await db.execute(
        text(f"SELECT id FROM {table} WHERE id = :id"),
        {"id": profile_id},
    )
    if not check.mappings().first():
        raise HTTPException(status_code=404, detail=f"{entity_type.upper()} profile not found")

    await db.execute(
        text(f"""
            UPDATE {table}
            SET verification_status = 'flagged',
                updated_at = NOW()
            WHERE id = :id
        """),
        {"id": profile_id},
    )
    await db.commit()
    return {
        "status": "flagged",
        "profile_id": str(profile_id),
        "entity_type": entity_type,
        "reason": request.reason,
    }


# ---------------------------------------------------------------------------
# Suspend
# ---------------------------------------------------------------------------

@router.post("/verification-requests/{profile_id}/suspend")
async def suspend_entity(
    profile_id: UUID,
    entity_type: str,                       # query param: "ngo" or "corporate"
    request: RejectRequest,                 # reuse RejectRequest for optional reason
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_verify_operator_token),
):
    """Sets verification_status = 'suspended' for the given NGO or Corporate profile.

    Suspended entities are excluded from public/corporate NGO listings and
    cannot perform verification-dependent actions.
    """
    entity_type = entity_type.lower().strip()
    if entity_type not in ("ngo", "corporate"):
        raise HTTPException(status_code=400, detail="entity_type must be 'ngo' or 'corporate'")

    table = "ngo_profiles" if entity_type == "ngo" else "corporate_profiles"

    check = await db.execute(
        text(f"SELECT id FROM {table} WHERE id = :id"),
        {"id": profile_id},
    )
    if not check.mappings().first():
        raise HTTPException(status_code=404, detail=f"{entity_type.upper()} profile not found")

    await db.execute(
        text(f"""
            UPDATE {table}
            SET verification_status = 'suspended',
                updated_at = NOW()
            WHERE id = :id
        """),
        {"id": profile_id},
    )
    await db.commit()
    return {
        "status": "suspended",
        "profile_id": str(profile_id),
        "entity_type": entity_type,
        "reason": request.reason,
    }
