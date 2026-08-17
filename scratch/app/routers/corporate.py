from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
import re

from app.db import get_db
from app.routers.auth import require_role
from app.schemas.auth import UserRole

router = APIRouter(prefix="/api/corporate", tags=["Corporate"])


class CorporateProfileUpdate(BaseModel):
    company_name: str = Field(..., max_length=200)
    registration_number: Optional[str] = Field(None, max_length=9)
    csr_focus_areas: Optional[List[str]] = []

    @field_validator('registration_number', mode='before')
    @classmethod
    def validate_registration_number(cls, v):
        if v is None or v == '':
            return v
        v = str(v).strip()
        if v and not re.fullmatch(r'\d{1,9}', v):
            raise ValueError('Registration number must contain maximum 9 numeric digits only.')
        return v


@router.get("/profile")
async def get_corporate_profile(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role([UserRole.corporate]))
):
    query = text("""
        SELECT p.*, u.name as user_name, u.email as user_email
        FROM corporate_profiles p
        JOIN users u ON p.user_id = u.id
        WHERE p.user_id = :user_id
    """)
    result = await db.execute(query, {"user_id": current_user["id"]})
    prof = result.mappings().first()
    if not prof:
        return {
            "has_profile": False,
            "user_id": str(current_user["id"]),
            "user_name": current_user["name"],
            "user_email": current_user["email"]
        }

    res_dict = dict(prof)
    res_dict["has_profile"] = True
    return res_dict


@router.post("/profile")
@router.put("/profile")
async def create_or_update_corporate_profile(
    request: CorporateProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role([UserRole.corporate]))
):
    check_query = text("SELECT id, cin_number FROM corporate_profiles WHERE user_id = :user_id")
    res = await db.execute(check_query, {"user_id": current_user["id"]})
    existing = res.mappings().first()

    try:
        if existing:
            # UPDATE: cin_number is immutable and not updated
            update_query = text("""
                UPDATE corporate_profiles
                SET company_name = :company_name,
                    registration_number = :registration_number,
                    csr_focus_areas = :csr_focus_areas,
                    updated_at = NOW()
                WHERE user_id = :user_id
                RETURNING *
            """)
            updated = await db.execute(update_query, {
                "user_id": current_user["id"],
                "company_name": request.company_name,
                "registration_number": request.registration_number,
                "csr_focus_areas": request.csr_focus_areas
            })
            await db.commit()
            res_dict = dict(updated.mappings().first())
            res_dict["has_profile"] = True
            return res_dict
        else:
            # CREATE: Profile should have been created at signup, so this shouldn't happen
            raise HTTPException(
                status_code=400,
                detail="Corporate profile does not exist. Please register first."
            )
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Failed to update corporate profile: {str(e)}"
        )
