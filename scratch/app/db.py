from app.config import DATABASE_URL
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# Create asynchronous engine
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    connect_args={
        "statement_cache_size": 0
    }
)

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
