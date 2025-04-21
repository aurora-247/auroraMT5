from fastapi import APIRouter, HTTPException, Query
from datetime import datetime
import logging
from typing import Optional

from app.modules.metatrader5.terminal import (
    get_mt5_service,
    get_existing_service,
    get_all_services
)

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/{identifier}/connect")
def connect_metatrader5(
    identifier: str,
    login: int = Query(..., description="MetaTrader5 login ID"),
    password: str = Query(..., description="MetaTrader5 password"),
    server: str = Query(..., description="MetaTrader5 server address"),
    path: str = Query(..., description="File path to MT5 terminal")
):
    service = get_mt5_service(identifier, path, login, password, server)
    status = service.connect()
    return {"identifier": identifier, "status": status}


@router.get("/active", summary="List all MT5 terminal service instances")
def list_active_services():
    """
    Returns all MT5Service instances you’ve spun up,
    along with their login/server and whether they’re connected.
    """
    services = get_all_services()
    result = []
    for identifier, svc in services.items():
        result.append({
            "identifier": identifier,
            "server": svc.server,
            "login": svc.login,
            "path": svc.path,
            "connected": svc._connected
        })
    return {"active_services": result}

@router.get("/{identifier}/disconnect")
def disconnect_metatrader5(identifier: str):
    service = get_existing_service(identifier)
    if not service:
        raise HTTPException(status_code=404, detail="Identifier not found")
    status = service.disconnect()
    return {"identifier": identifier, "status": status}

@router.get("/{identifier}/history")
def history_deals(
    identifier: str,
    from_date: datetime = Query(..., description="Start datetime, e.g. 2025-04-17T00:00:00"),
    to_date: Optional[datetime] = Query(None, description="End datetime, defaults to now"),
    group_filter: str = Query("*,!*EUR*,!*GBP*", description="MT5 group filter string")
):
    service = get_existing_service(identifier)
    if not service:
        raise HTTPException(status_code=404, detail="Identifier not found")
    deals, err = service.get_deal_history(from_date, to_date, group_filter)
    if err:
        raise HTTPException(status_code=500, detail=f"Error fetching deals: {err}")
    return {
        "identifier": identifier,
        "from_date": from_date.isoformat(),
        "to_date": (to_date or datetime.now()).isoformat(),
        "count": len(deals),
        "deals": deals
    }


@router.get("/{identifier}/symbols")
def list_symbols(
    identifier: str,
    symbol_mask: Optional[str] = Query(None, description="Symbol mask, e.g. '*RU*'"),
    group_filter: Optional[str] = Query(None, description="Group filter string, e.g. '*,!*USD*,!*EUR*'"),
):
    service = get_existing_service(identifier)
    if not service:
        raise HTTPException(status_code=404, detail="Identifier not found")
    syms, err = service.get_symbols(symbol_mask=symbol_mask, group_filter=group_filter)
    if err:
        raise HTTPException(status_code=500, detail=f"Error fetching symbols: {err}")
    return {"identifier": identifier, "count": len(syms), "symbols": syms}