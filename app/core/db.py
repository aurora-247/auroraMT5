from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "postgresql+asyncpg://postgres:YourPass@localhost:5432/aurora"

# 1) Async engine
engine = create_async_engine(DATABASE_URL, echo=True, future=True)

# 2) Async session factory
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# 3) Base for all models
Base = declarative_base()

# 4) FastAPI dependency
async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session

# 5) Init helper (called in startup)
async def init_db():
    await engine.run_sync(Base.metadata.create_all)