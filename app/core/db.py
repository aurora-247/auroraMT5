from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "postgresql+asyncpg://postgres:Amman%405050@localhost:5432/aurora"

# 1) create the engine
engine = create_async_engine(DATABASE_URL, echo=True, future=True)

# 2) async session factory
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# 3) base class for your models
Base = declarative_base()


# 4) FastAPI dependency to get an async DB session
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

# 5) Helper to create all tables in an async context
async def init_db():
    # run the Base.metadata.create_all() inside an async transaction
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)