import asyncio
from sqlalchemy import text
from app.db import async_session

async def verify():
    print("Connecting to the database and checking schema integrity...")
    try:
        async with async_session() as session:
            # Fetch public tables
            result = await session.execute(text(
                "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
            ))
            tables = [row[0] for row in result.fetchall()]
            print("Found tables in public schema:")
            for table in sorted(tables):
                print(f" - {table}")
            
            # Core user/profile tables checking
            core_tables = ['users', 'volunteer_profiles', 'ngo_profiles', 'corporate_profiles', 'requirements']
            missing = [table for table in core_tables if table not in tables]
            if missing:
                print(f"[-] ERROR: Missing core schema tables: {missing}")
                exit(1)
            else:
                print("[+] Success: All core schema tables are present in the database.")
    except Exception as err:
        print(f"[-] ERROR: Database query verification failed: {str(err)}")
        exit(1)

if __name__ == "__main__":
    asyncio.run(verify())
