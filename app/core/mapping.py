from pydantic import BaseModel
from typing import List, Dict


# In-memory test data (replace with DB logic or read from file)
symbol_mappings: Dict[str, List[Dict[str, str]]] = {
    "1_1": [  # managerId_terminalId
        {"manager": "XAUUSD", "terminal": "GOLD"},
        {"manager": "US30", "terminal": "DOWJONES"},
    ]
}

class MappingSchema(BaseModel):
    manager_id: str
    terminal_id: str
    manager_symbol: str
    terminal_symbol: str

    class Config:
        orm_mode = True

class SymbolMapping(BaseModel):
    manager: str
    terminal: str

class SymbolMapResponse(BaseModel):
    symbol_map: List[SymbolMapping]


class SymbolMapSaveRequest(BaseModel):
    managerId: str
    terminalId: str
    symbol_map: List[SymbolMapping]


