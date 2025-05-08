from sqlalchemy import (
    Column, Integer, String, Float, DateTime, JSON, ForeignKey
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()

class ManagerDeal(Base):
    __tablename__ = "manager_deals"
    id            = Column(Integer, primary_key=True, index=True)
    ticket        = Column(Integer, unique=True, index=True)
    login         = Column(Integer, index=True)
    group_id      = Column(Integer, ForeignKey("user_groups.group_id"))
    symbol        = Column(String, index=True)
    open_time     = Column(DateTime)
    close_time    = Column(DateTime)
    open_price    = Column(Float)
    close_price   = Column(Float)
    gateway_price = Column(Float)
    volume        = Column(Float)
    contract_size = Column(Float)
    action        = Column(String)   # "Buy" / "Sell"
    profit        = Column(Float)
    swap          = Column(Float)
    commission    = Column(Float)
    # … any other fields you need


class TerminalFill(Base):
    __tablename__ = "terminal_fills"
    id          = Column(Integer, primary_key=True, index=True)
    ticket      = Column(Integer, index=True)
    symbol      = Column(String, index=True)
    time        = Column(DateTime)
    volume      = Column(Float)
    price       = Column(Float)
    profit      = Column(Float)
    swap        = Column(Float)
    commission  = Column(Float)
    # … etc


class UserGroupMapping(Base):
    __tablename__ = "user_groups"
    id        = Column(Integer, primary_key=True, index=True)
    login     = Column(Integer, unique=True, index=True)
    group_id  = Column(Integer, index=True)


class CommissionTier(Base):
    __tablename__ = "commission_tiers"
    id         = Column(Integer, primary_key=True, index=True)
    group_id   = Column(Integer, ForeignKey("group_configs.group_id"))
    category   = Column(String)   # e.g. "Metals", "Energies"
    range_from = Column(Float)
    range_to   = Column(Float)
    value      = Column(Float)


class GroupConfig(Base):
    __tablename__ = "group_configs"
    group_id     = Column(Integer, primary_key=True, index=True)
    # JSON field holding swap settings and any other group‐wide flags
    swap_long    = Column(Float)
    swap_short   = Column(Float)
    # relationship to tiers:
    commissions  = relationship("CommissionTier", backref="group")


class SymbolConfig(Base):
    __tablename__ = "symbol_configs"
    symbol        = Column(String, primary_key=True, index=True)
    contract_size = Column(Float)
    point         = Column(Float)
    digits        = Column(Integer)
    swap_long     = Column(Float)
    swap_short    = Column(Float)
    # … any other pricing fields

class FXRate(Base):
    __tablename__ = "fx_rates"
    id      = Column(Integer, primary_key=True, index=True)
    base    = Column(String, index=True)    # e.g. "EUR"
    date    = Column(DateTime, index=True)
    rate    = Column(Float)                 # USD per base

