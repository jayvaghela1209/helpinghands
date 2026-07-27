import os
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/sahayog")

# Create asynchronous engine
engine = create_async_engine(DATABASE_URL, echo=False)

# Sessionmaker for async sessions
async_session = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Dependency to yield database sessions
async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
