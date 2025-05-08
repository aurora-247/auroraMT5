from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "postgresql+asyncpg://postgres:Amman%405050@localhost:5432/aurora"

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
    # Acquire an AsyncConnection (and begin a transaction under the hood)
    async with engine.begin() as conn:
        # run all the Base.metadata.create_all() in a sync context
        await conn.run_sync(Base.metadata.create_all)