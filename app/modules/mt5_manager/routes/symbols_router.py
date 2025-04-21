# app/modules/mt5_manager/symbols_router.py

import MT5Manager
import logging
from fastapi import APIRouter, HTTPException
from typing import Any, Dict, List

from app.modules.mt5_manager.manager import mt5_managers

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/symbols", tags=["symbols"])


@router.get("/{identifier}", summary="List all symbol configurations")
def list_symbols(identifier: str):
    """
    Retrieve and return all symbol configurations from an MT5 Manager instance.
    """
    # 1) Validate
    if identifier not in mt5_managers:
        logger.warning(f"Symbols request for unknown identifier: {identifier}")
        raise HTTPException(status_code=404, detail="Manager instance not found")

    svc = mt5_managers[identifier]

    # 2) Ensure connected
    if not svc.connected:
        logger.debug(f"Connecting MT5ManagerService for identifier {identifier}")
        if not svc.connect():
            err = MT5Manager.LastError()
            logger.error(f"Failed to connect for {identifier}: {err}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to connect MT5 Manager: {err}"
            )

    # 3) Fetch total symbol count
    total = svc.manager.SymbolTotal()
    if total is False or total <= 0:
        return {"count": 0, "symbols": []}

    symbols: List[Dict[str, Any]] = []

    # 4) Enumerate every symbol by index
    for idx in range(total):
        sym = svc.manager.SymbolNext(idx)
        if not sym:
            logger.warning(f"SymbolNext returned None at index {idx}")
            continue

        # 5) Extract all non-private, non-callable attributes
        info: Dict[str, Any] = {}
        for attr in dir(sym):
            if attr.startswith("_"):
                continue
            value = getattr(sym, attr)
            if callable(value):
                continue
            info[attr] = value

        symbols.append(info)

    return {"count": len(symbols), "symbols": symbols}
