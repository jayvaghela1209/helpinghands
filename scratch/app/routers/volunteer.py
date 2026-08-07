from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.db import get_db
from app.schemas.auth import UserRole
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/volunteer", tags=["Volunteer"])

# Get volunteer profile details (including read‑only computed fields)
@router.get("/profile", response_model=dict)
async def get_volunteer_profile(current_user = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # current_user is fetched from auth dependency; ensure role is volunteer
    if current_user["role"] != UserRole.volunteer:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only volunteers can access this endpoint")

    query = text(
        """
        SELECT u.name, u.phone, u.city, vp.skill_tags, vp.total_hours, vp.credit_points, vp.trust_score
        FROM users u
        JOIN volunteer_profiles vp ON u.id = vp.user_id
        WHERE u.id = :user_id
        """
    )
    result = await db.execute(query, {"user_id": current_user["id"]})
    profile = result.mappings().first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Volunteer profile not found")
    return dict(profile)

# Update editable fields of volunteer profile (name, phone, city, skill_tags)
@router.put("/profile", response_model=dict)
@router.put("/profile", response_model=dict)
async def update_volunteer_profile(
    payload: dict,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user["role"] != UserRole.volunteer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only volunteers can update their profile"
        )

    # Validate allowed keys
    allowed_keys = {"name", "phone", "city", "skill_tags"}
    update_data = {k: v for k, v in payload.items() if k in allowed_keys}

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid fields to update"
        )

    try:
        # Update users table
        user_fields = {"name", "phone", "city"}
        user_updates = {
            k: v for k, v in update_data.items()
            if k in user_fields
        }

        if user_updates:
            set_clause = ", ".join(
                [f"{k} = :{k}" for k in user_updates]
            )

            user_query = text(
                f"""
                UPDATE users
                SET {set_clause},
                    updated_at = NOW()
                WHERE id = :user_id
                """
            )

            await db.execute(
                user_query,
                {
                    **user_updates,
                    "user_id": current_user["id"]
                }
            )

        # Update volunteer profile
        if "skill_tags" in update_data:
            vp_query = text(
                """
                UPDATE volunteer_profiles
                SET skill_tags = :skill_tags,
                    updated_at = NOW()
                WHERE user_id = :user_id
                """
            )

            await db.execute(
                vp_query,
                {
                    "skill_tags": update_data["skill_tags"],
                    "user_id": current_user["id"]
                }
            )

        await db.commit()

    except Exception:
        await db.rollback()
        raise

    return await get_volunteer_profile(
        current_user=current_user,
        db=db
    )