import asyncio
# pyrefly: ignore [missing-import]
from sqlalchemy import text
from app.db import async_session

async def check():
    async with async_session() as session:
        # Check users
        users = await session.execute(text("SELECT id, role, name, email FROM users"))
        print("--- Users ---")
        for u in users.fetchall():
            print(u)
            
        # Check NGO profiles
        ngos = await session.execute(text("SELECT id, user_id, organization_name, verification_status FROM ngo_profiles"))
        print("\n--- NGOs ---")
        for n in ngos.fetchall():
            print(n)

        # Check Corporate profiles
        corporates = await session.execute(text("SELECT id, user_id, company_name, verification_status FROM corporate_profiles"))
        print("\n--- Corporates ---")
        for c in corporates.fetchall():
            print(c)

        # Check requirements
        reqs = await session.execute(text("SELECT id, title, ngo_profile_id, status FROM requirements"))
        print("\n--- Requirements ---")
        for r in reqs.fetchall():
            print(r)

if __name__ == "__main__":
    asyncio.run(check())
