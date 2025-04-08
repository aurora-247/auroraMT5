from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Query
from app.modules.mt5_manager.deals_mapping import parse_deal
from app.modules.mt5_manager.manager import mt5_managers
import logging
import datetime
import MT5Manager

router = APIRouter(prefix="/deals")
logger = logging.getLogger(__name__)

@router.websocket("/ws/{identifier}")
async def websocket_deals(websocket: WebSocket, identifier: str):
    """
    WebSocket for streaming live deals for a specific MT5 Manager instance.
    """
    logger.info(f"🔵 WebSocket connection attempt: {identifier}")

    if identifier not in mt5_managers:
        logger.warning(f"❌ WebSocket rejected: Manager instance '{identifier}' not found.")
        await websocket.accept()
        await websocket.close(code=1008)
        return

    await websocket.accept()
    logger.info(f"✅ WebSocket connected: {identifier}")

    try:
        await mt5_managers[identifier].subscribe_to_deals(websocket)
    except WebSocketDisconnect:
        logger.warning(f"🔴 WebSocket disconnected: {identifier}")
    except Exception as e:
        logger.error(f"⚠️ WebSocket error for {identifier}: {str(e)}")
    finally:
        logger.info(f"✅ WebSocket closed for: {identifier}")


@router.get("/{identifier}/latest")
def get_latest_deals(identifier: str):
    """
    Retrieve the latest deals for a specific MT5 Manager instance.
    """
    if identifier not in mt5_managers:
        return {"error": "Manager instance not found."}
    return mt5_managers[identifier].get_latest_deals()


@router.get("/{identifier}/by-group")
def get_deals_by_group(
    identifier: str,
    groups: str,
    date_from: datetime.datetime = Query(..., description="Start date in ISO 8601 format (e.g., 2025-04-01T00:00:00)"),
    date_to: datetime.datetime = Query(..., description="End date in ISO 8601 format (e.g., 2025-04-08T23:59:59)")
):
    """
    Get deals history for a group (or comma separated groups) within a specified date range.
    """
    if identifier not in mt5_managers:
        raise HTTPException(status_code=404, detail="Manager session not found for identifier.")

    manager_instance = mt5_managers[identifier]
    if not manager_instance.connected:
        if not manager_instance.connect():
            raise HTTPException(
                status_code=500,
                detail=f"Failed to connect using session for {identifier}: {MT5Manager.LastError()}"
            )

    deals = manager_instance.manager.DealRequestByGroup(groups, date_from, date_to)
    if deals is False:
        error = f"Failed to request deals: {MT5Manager.LastError()}"
        raise HTTPException(status_code=500, detail=error)
    parsed_deals = [parse_deal(deal) for deal in deals]
    return {"deals": parsed_deals}


@router.get("/{identifier}/by-group-symbol")
def get_deals_by_group_symbol(
    identifier: str,
    groups: str,
    symbol: str,
    date_from: datetime.datetime = Query(..., description="Start date in ISO 8601 format"),
    date_to: datetime.datetime = Query(..., description="End date in ISO 8601 format")
):
    """
    Get deals history for the specified group(s) and symbol within a specified date range.
    """
    if identifier not in mt5_managers:
        raise HTTPException(status_code=404, detail="Manager session not found for identifier.")

    manager_instance = mt5_managers[identifier]
    if not manager_instance.connected:
        if not manager_instance.connect():
            raise HTTPException(
                status_code=500,
                detail=f"Failed to connect using session for {identifier}: {MT5Manager.LastError()}"
            )

    deals = manager_instance.manager.DealRequestByGroupSymbol(groups, symbol, date_from, date_to)
    if deals is False:
        error = f"Failed to request deals: {MT5Manager.LastError()}"
        raise HTTPException(status_code=500, detail=error)
    parsed_deals = [parse_deal(deal) for deal in deals]
    return {"deals": parsed_deals}


@router.get("/{identifier}/by-logins")
def get_deals_by_logins(
    identifier: str,
    logins: str,
    date_from: datetime.datetime = Query(..., description="Start date in ISO 8601 format"),
    date_to: datetime.datetime = Query(..., description="End date in ISO 8601 format")
):
    """
    Get deals history for the provided comma-separated logins within a specified date range.
    """
    try:
        logins_list = [int(x.strip()) for x in logins.split(',')]
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid 'logins' parameter format")

    if identifier not in mt5_managers:
        raise HTTPException(status_code=404, detail="Manager session not found for identifier.")

    manager_instance = mt5_managers[identifier]
    if not manager_instance.connected:
        if not manager_instance.connect():
            raise HTTPException(
                status_code=500,
                detail=f"Failed to connect using session for {identifier}: {MT5Manager.LastError()}"
            )

    deals = manager_instance.manager.DealRequestByLogins(logins_list, date_from, date_to)
    if deals is False:
        error = f"Failed to request deals: {MT5Manager.LastError()}"
        raise HTTPException(status_code=500, detail=error)
    parsed_deals = [parse_deal(deal) for deal in deals]
    return {"deals": parsed_deals}


@router.get("/{identifier}/by-logins-symbol")
def get_deals_by_logins_symbol(
    identifier: str,
    logins: str,
    symbol: str,
    date_from: datetime.datetime = Query(..., description="Start date in ISO 8601 format"),
    date_to: datetime.datetime = Query(..., description="End date in ISO 8601 format")
):
    """
    Get deals history for the provided comma-separated logins and symbol within a specified date range.
    """
    try:
        logins_list = [int(x.strip()) for x in logins.split(',')]
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid 'logins' parameter format")

    if identifier not in mt5_managers:
        raise HTTPException(status_code=404, detail="Manager session not found for identifier.")

    manager_instance = mt5_managers[identifier]
    if not manager_instance.connected:
        if not manager_instance.connect():
            raise HTTPException(
                status_code=500,
                detail=f"Failed to connect using session for {identifier}: {MT5Manager.LastError()}"
            )

    deals = manager_instance.manager.DealRequestByLoginsSymbol(logins_list, symbol, date_from, date_to)
    if deals is False:
        error = f"Failed to request deals: {MT5Manager.LastError()}"
        raise HTTPException(status_code=500, detail=error)
    parsed_deals = [parse_deal(deal) for deal in deals]
    return {"deals": parsed_deals}


@router.get("/{identifier}/by-tickets")
def get_deals_by_tickets(identifier: str, tickets: str):
    """
    Get deals history for the provided comma-separated deal IDs.
    This endpoint does not use date filtering.
    """
    try:
        tickets_list = [int(ticket.strip()) for ticket in tickets.split(',')]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tickets format; tickets must be numeric.")

    if identifier not in mt5_managers:
        raise HTTPException(status_code=404, detail="Manager session not found for identifier.")

    manager_instance = mt5_managers[identifier]
    if not manager_instance.connected:
        if not manager_instance.connect():
            raise HTTPException(
                status_code=500,
                detail=f"Failed to connect using session for {identifier}: {MT5Manager.LastError()}"
            )

    deals = manager_instance.manager.DealRequestByTickets(tickets_list)
    if deals is False:
        error = f"Failed to request deals: {MT5Manager.LastError()}"
        raise HTTPException(status_code=500, detail=error)
    parsed_deals = [parse_deal(deal) for deal in deals]
    return {"deals": parsed_deals}


@router.get("/{identifier}/page")
def get_deals_page(
    identifier: str,
    login: int,
    date_from: datetime.datetime = Query(..., description="Start date in ISO 8601 format"),
    date_to: datetime.datetime = Query(..., description="End date in ISO 8601 format"),
    offset: int = 0,
    total: int = 50
):
    """
    Get paged deals history for a client (login) within a specified date range.
    Date values are converted to Unix timestamps before passing to the MT5 API.
    """
    if identifier not in mt5_managers:
        raise HTTPException(status_code=404, detail="Manager session not found for identifier.")

    manager_instance = mt5_managers[identifier]
    if not manager_instance.connected:
        if not manager_instance.connect():
            raise HTTPException(
                status_code=500,
                detail=f"Failed to connect using session for {identifier}: {manager_instance.manager.LastError()}"
            )

    timestamp_from = int(date_from.timestamp())
    timestamp_to = int(date_to.timestamp())

    deals = manager_instance.manager.DealRequestPage(login, timestamp_from, timestamp_to, offset, total)
    if not deals:
        error = f"Failed to request deals: {manager_instance.manager.LastError()}"
        raise HTTPException(status_code=500, detail=error)

    parsed_deals = [parse_deal(deal) for deal in deals]
    return {"deals": parsed_deals}