# app/models/symbol_mapping.py

from sqlalchemy import Column, Integer, String
from app.db.db import Base

class SymbolMapping(Base):
    __tablename__ = "symbol_mappings"

    id              = Column(Integer, primary_key=True, index=True)
    manager_id      = Column(String, index=True, nullable=False)
    terminal_id     = Column(String, index=True, nullable=False)
    manager_symbol  = Column(String, nullable=False)
    terminal_symbol = Column(String, nullable=False)
