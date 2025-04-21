from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Any, Dict, List
import MT5Manager

router = APIRouter(
    prefix="/mt5‑manager",
    tags=["mt5‑manager"],
    responses={404: {"description": "Not found"}},
)


class SymbolConfig(BaseModel):
    # we collect all non‐callable, non‐private attrs into a dict
    attributes: Dict[str, Any]


class SymbolListResponse(BaseModel):
    count: int
    symbols: List[SymbolConfig]

@router.get(
    "/symbols",
    response_model=SymbolListResponse,
    summary="List all MT5 Manager symbol configurations",
)
def list_manager_symbols(
    host: str = Query(..., description="MT5 Manager host:port, e.g. trade.mahfaza.com.jo:443"),
    login: int = Query(..., description="Manager login ID"),
    password: str = Query(..., description="Manager password"),
    timeout: int = Query(3000, description="Connection timeout in milliseconds"),
):
    """
    Connects to the MT5 Manager Administrator API and returns all symbol configurations.
    """
    admin = MT5Manager.AdminAPI()
    # the 4th parameter is reserved—must be 0
    if not admin.Connect(host, login, password, 0, timeout):
        err = MT5Manager.LastError()
        raise HTTPException(status_code=500, detail=f"Connection failed: {err}")

    try:
        total = admin.SymbolTotal()
        symbols = []

        for idx in range(total):
            cfg = admin.SymbolNext(idx)
            if not cfg:
                # skip if for some reason it returned None
                continue

            # pull out all public, non‐callable attributes
            data: Dict[str, Any] = {}
            for attr in dir(cfg):
                if attr.startswith("_"):
                    continue
                val = getattr(cfg, attr)
                if callable(val):
                    continue
                data[attr] = val
            symbols.append(SymbolConfig(attributes=data))

        return SymbolListResponse(count=len(symbols), symbols=symbols)

    finally:
        admin.Disconnect()
