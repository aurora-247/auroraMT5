from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.db import Base

DATABASE_URL = "sqlite:///./aurora.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# Group model for SQLite
class MT5Group(Base):
    __tablename__ = "mt5_groups"

    id = Column(Integer, primary_key=True, index=True)
    group_name = Column(String, unique=True, index=True, nullable=False)
    max_users = Column(Integer, nullable=True)
    leverage = Column(Float, nullable=True)
    currency = Column(String, nullable=True)
    description = Column(String, nullable=True)


class MT5Position(Base):
    __tablename__ = "mt5_positions"

    id = Column(Integer, primary_key=True, index=True)
    ticket = Column(Integer, unique=True, index=True)
    login = Column(Integer, nullable=False)
    symbol = Column(String, nullable=False)
    volume = Column(Float, nullable=False)
    price_open = Column(Float, nullable=False)
    price_close = Column(Float, nullable=False)
    profit = Column(Float, nullable=False)
    time_open = Column(DateTime, nullable=False)
    time_close = Column(DateTime, nullable=False)