from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from app.models import Base

DATABASE_URL = "postgresql+asyncpg://postgres:Amman%405050@localhost:5432/aurora"


engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()