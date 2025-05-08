# app/db/session.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from .config import settings
from .base import Base

# 1) engine
engine = create_async_engine(settings.database_url, echo=True, future=True)

# 2) session factory
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# 3) Base.metadata
async def init_db():
    await engine.run_sync(Base.metadata.create_all)

# 4) FastAPI dependency
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
