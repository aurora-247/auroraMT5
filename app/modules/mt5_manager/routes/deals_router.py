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
        # Accept the connection to avoid a 403 error then immediately close it with a policy violation code (1008)
        await websocket.accept()
        await websocket.close(code=1008)
        return

    # Accept the connection only once
    await websocket.accept()
    logger.info(f"✅ WebSocket connected: {identifier}")

    try:
        # Subscribe and stream deals repeatedly to the client
        await mt5_managers[identifier].subscribe_to_deals(websocket)
    except WebSocketDisconnect:
        logger.warning(f"🔴 WebSocket disconnected: {identifier}")
    except Exception as e:
        logger.error(f"⚠️ WebSocket error for {identifier}: {str(e)}")
    finally:
        logger.info(f"✅ WebSocket closed for: {identifier}")


# ✅ REST API to fetch latest deals for a specific instance
@router.get("/{identifier}/latest")
def get_latest_deals(identifier: str):
    """
    Retrieve the latest deals for a specific MT5 Manager instance.
    """
    if identifier not in mt5_managers:
        return {"error": "Manager instance not found."}

    return mt5_managers[identifier].get_latest_deals()


@router.get("/{identifier}/by-group")
def get_deals_by_group(identifier: str, groups: str, days: int = 100):
    """
    Get deals history for a group (or comma separated groups) within the last `days` days,
    using the current MT5 session associated with the identifier.
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

    date_to = datetime.datetime.now()
    date_from = date_to - datetime.timedelta(days=days)
    deals = manager_instance.manager.DealRequestByGroup(groups, date_from, date_to)
    if deals == False:
        error = f"Failed to request deals: {MT5Manager.LastError()}"
        raise HTTPException(status_code=500, detail=error)
    parsed_deals = [parse_deal(deal) for deal in deals]
    return {"deals": parsed_deals}


@router.get("/{identifier}/by-group-symbol")
def get_deals_by_group_symbol(identifier: str, groups: str, symbol: str, days: int = 100):
    """
    Get deals history for the specified group(s) and symbol within the last `days` days,
    using the current MT5 session associated with the identifier.
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

    date_to = datetime.datetime.now()
    date_from = date_to - datetime.timedelta(days=days)
    deals = manager_instance.manager.DealRequestByGroupSymbol(groups, symbol, date_from, date_to)
    if deals == False:
        error = f"Failed to request deals: {MT5Manager.LastError()}"
        raise HTTPException(status_code=500, detail=error)
    parsed_deals = [parse_deal(deal) for deal in deals]
    return {"deals": parsed_deals}


@router.get("/{identifier}/by-logins")
def get_deals_by_logins(identifier: str, logins: str, days: int = 100):
    """
    Get deals history for the provided comma-separated logins within the last `days` days,
    using the current MT5 session associated with the identifier.
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

    date_to = datetime.datetime.now()
    date_from = date_to - datetime.timedelta(days=days)
    deals = manager_instance.manager.DealRequestByLogins(logins_list, date_from, date_to)
    if deals == False:
        error = f"Failed to request deals: {MT5Manager.LastError()}"
        raise HTTPException(status_code=500, detail=error)
    parsed_deals = [parse_deal(deal) for deal in deals]
    return {"deals": parsed_deals}


@router.get("/{identifier}/by-logins-symbol")
def get_deals_by_logins_symbol(identifier: str, logins: str, symbol: str, days: int = 100):
    """
    Get deals history for the provided comma-separated logins and symbol within the last `days` days,
    using the current MT5 session associated with the identifier.
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

    date_to = datetime.datetime.now()
    date_from = date_to - datetime.timedelta(days=days)
    deals = manager_instance.manager.DealRequestByLoginsSymbol(logins_list, symbol, date_from, date_to)
    if deals == False:
        error = f"Failed to request deals: {MT5Manager.LastError()}"
        raise HTTPException(status_code=500, detail=error)
    parsed_deals = [parse_deal(deal) for deal in deals]
    return {"deals": parsed_deals}


@router.get("/{identifier}/by-tickets")
def get_deals_by_tickets(identifier: str, tickets: str):
    """
    Get deals history for the provided comma-separated deal IDs,
    using the current MT5 session associated with the identifier.
    """
    try:
        # Convert ticket strings to integers
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

    # Call the DealRequestByTickets method with the list of integers.
    deals = manager_instance.manager.DealRequestByTickets(tickets_list)
    if deals == False:
        error = f"Failed to request deals: {MT5Manager.LastError()}"
        raise HTTPException(status_code=500, detail=error)
    parsed_deals = [parse_deal(deal) for deal in deals]
    return {"deals": parsed_deals}


@router.get("/{identifier}/page")
def get_deals_page(
        identifier: str,
        login: int,
        days: int = 100,
        offset: int = 0,
        total: int = 50
):
    """
    Get paged deals history for a client (login),
    using the current MT5 session associated with the identifier.

    Parameters:
    - `identifier` (str): The MT5 session identifier.
    - `login` (int): The login of the client whose deals should be retrieved.
    - `days` (int, optional): The number of days from which to start fetching deals (default is 100).
    - `offset` (int, optional): The index of the deal from which to start retrieving (default is 0).
    - `total` (int, optional): The number of deals to retrieve (default is 50).

    Returns:
    - JSON response with the list of deals for the given login.
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

    # Calculate the date range based on `days`
    date_to = int(datetime.datetime.now().timestamp())  # Convert to Unix timestamp (seconds)
    date_from = date_to - (days * 86400)  # Convert days to seconds

    # Request paginated deals from MT5
    deals = manager_instance.manager.DealRequestPage(login, date_from, date_to, offset, total)
    if not deals:
        error = f"Failed to request deals: {manager_instance.manager.LastError()}"
        raise HTTPException(status_code=500, detail=error)

    parsed_deals = [parse_deal(deal) for deal in deals]
    return {"deals": parsed_deals}


@router.get("/deals/by-group")
def get_deals_by_group(groups: str, days: int = 100):
    """
    Get deals history for a group (or comma separated groups) within the last `days` days.
    """
    date_to = datetime.datetime.now()
    date_from = date_to - datetime.timedelta(days=days)

    manager = MT5Manager.ManagerAPI()
    if manager.Connect("demo.forexriver.net:437", 1017, "0nR*RgRb", 0, 3000000):
        deals = manager.DealRequestByGroup(groups, date_from, date_to)
        if deals == False:
            error = f"Failed to request deals: {MT5Manager.LastError()}"
            manager.Disconnect()
            raise HTTPException(status_code=500, detail=error)
        parsed_deals = [parse_deal(deal) for deal in deals]
        manager.Disconnect()
        return {"deals": parsed_deals}
    else:
        raise HTTPException(status_code=500, detail=f"Failed to connect to server: {MT5Manager.LastError()}")


@router.get("/deals/by-group-symbol")
def get_deals_by_group_symbol(groups: str, symbol: str, days: int = 100):
    """
    Get deals history for the specified group(s) and symbol within the last `days` days.
    """
    date_to = datetime.datetime.now()
    date_from = date_to - datetime.timedelta(days=days)

    manager = MT5Manager.ManagerAPI()
    if manager.Connect("demo.forexriver.net:437", 1017, "0nR*RgRb", 0, 3000000):
        deals = manager.DealRequestByGroupSymbol(groups, symbol, date_from, date_to)
        if deals == False:
            error = f"Failed to request deals: {MT5Manager.LastError()}"
            manager.Disconnect()
            raise HTTPException(status_code=500, detail=error)
        parsed_deals = [parse_deal(deal) for deal in deals]
        manager.Disconnect()
        return {"deals": parsed_deals}
    else:
        raise HTTPException(status_code=500, detail=f"Failed to connect to server: {MT5Manager.LastError()}")


@router.get("/deals/by-logins")
def get_deals_by_logins(logins: str, days: int = 100):
    """
    Get deals history for the provided comma-separated logins within the last `days` days.
    """
    try:
        logins_list = [int(x.strip()) for x in logins.split(',')]
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid 'logins' parameter format")

    date_to = datetime.datetime.now()
    date_from = date_to - datetime.timedelta(days=days)

    manager = MT5Manager.ManagerAPI()
    if manager.Connect("demo.forexriver.net:437", 1017, "0nR*RgRb", 0, 3000000):
        deals = manager.DealRequestByLogins(logins_list, date_from, date_to)
        if deals == False:
            error = f"Failed to request deals: {MT5Manager.LastError()}"
            manager.Disconnect()
            raise HTTPException(status_code=500, detail=error)
        parsed_deals = [parse_deal(deal) for deal in deals]
        manager.Disconnect()
        return {"deals": parsed_deals}
    else:
        raise HTTPException(status_code=500, detail=f"Failed to connect to server: {MT5Manager.LastError()}")


@router.get("/deals/by-logins-symbol")
def get_deals_by_logins_symbol(logins: str, symbol: str, days: int = 100):
    """
    Get deals history for the provided comma-separated logins and symbol within the last `days` days.
    """
    try:
        logins_list = [int(x.strip()) for x in logins.split(',')]
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid 'logins' parameter format")

    date_to = datetime.datetime.now()
    date_from = date_to - datetime.timedelta(days=days)

    manager = MT5Manager.ManagerAPI()
    if manager.Connect("demo.forexriver.net:437", 1017, "0nR*RgRb", 0, 3000000):
        deals = manager.DealRequestByLoginsSymbol(logins_list, symbol, date_from, date_to)
        if deals == False:
            error = f"Failed to request deals: {MT5Manager.LastError()}"
            manager.Disconnect()
            raise HTTPException(status_code=500, detail=error)
        parsed_deals = [parse_deal(deal) for deal in deals]
        manager.Disconnect()
        return {"deals": parsed_deals}
    else:
        raise HTTPException(status_code=500, detail=f"Failed to connect to server: {MT5Manager.LastError()}")


@router.get("/deals/by-tickets")
def get_deals_by_tickets(tickets: str, days: int = 100):
    """
    Get deals history for the provided comma-separated tickets within the last `days` days.
    """
    tickets_list = [ticket.strip() for ticket in tickets.split(',')]

    date_to = datetime.datetime.now()
    date_from = date_to - datetime.timedelta(days=days)

    manager = MT5Manager.ManagerAPI()
    if manager.Connect("demo.forexriver.net:437", 1017, "0nR*RgRb", 0, 3000000):
        deals = manager.DealRequestByTickets(tickets_list, date_from, date_to)
        if deals == False:
            error = f"Failed to request deals: {MT5Manager.LastError()}"
            manager.Disconnect()
            raise HTTPException(status_code=500, detail=error)
        parsed_deals = [parse_deal(deal) for deal in deals]
        manager.Disconnect()
        return {"deals": parsed_deals}
    else:
        raise HTTPException(status_code=500, detail=f"Failed to connect to server: {MT5Manager.LastError()}")


@router.get("/deals/page")
def get_deals_page(login: int, page: int = 1, page_size: int = 50):
    """
    Get paged deals history for a client (login).
    """
    manager = MT5Manager.ManagerAPI()
    if manager.Connect("demo.forexriver.net:437", 1017, "0nR*RgRb", 0, 3000000):
        deals = manager.DealRequestPage(login, page, page_size)
        if deals == False:
            error = f"Failed to request deals: {MT5Manager.LastError()}"
            manager.Disconnect()
            raise HTTPException(status_code=500, detail=error)
        parsed_deals = [parse_deal(deal) for deal in deals]
        manager.Disconnect()
        return {"deals": parsed_deals}
    else:
        raise HTTPException(status_code=500, detail=f"Failed to connect to server: {MT5Manager.LastError()}")
