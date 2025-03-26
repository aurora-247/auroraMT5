from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.modules.mt5_manager.manager import mt5_managers
import  logging

# ✅ Create a separate router for positions
router = APIRouter(prefix="/positions")

logger = logging.getLogger(__name__)

# ✅ WebSocket endpoint for streaming live positions
@router.websocket("/ws/{identifier}")
async def websocket_positions(websocket: WebSocket, identifier: str):
    """
    WebSocket for streaming live positions for a specific MT5 Manager instance.
    """
    logger.info(f"🔵 Attempting WebSocket connection: {identifier}")

    if identifier not in mt5_managers:
        await websocket.close()
        logger.warning(f"❌ WebSocket rejected: Manager instance '{identifier}' not found.")
        return

    await websocket.accept()  # ✅ Ensure WebSocket is explicitly accepted
    logger.info(f"✅ WebSocket connected: {identifier}")

    try:
        await mt5_managers[identifier].subscribe_to_positions(websocket)
    except WebSocketDisconnect:
        logger.warning(f"🔴 WebSocket disconnected: {identifier}")
    finally:
        logger.info(f"✅ WebSocket closed for: {identifier}")


# ✅ REST API to fetch latest positions for a specific instance
@router.get("/{identifier}/latest")
def get_latest_positions(identifier: str):
    """
    Retrieve the latest open positions for a specific MT5 Manager instance.
    """
    if identifier not in mt5_managers:
        return {"error": "Manager instance not found."}

    return mt5_managers[identifier].get_latest_positions()


# ✅ REST API to fetch positions by group
@router.get("/{identifier}/{group_name}")
def get_positions_by_group(identifier: str, group_name: str):
    """
    Retrieve all positions for a specific group from an MT5 Manager instance.
    """
    if identifier not in mt5_managers:
        return {"error": "Manager instance not found."}

    return mt5_managers[identifier].get_position_history_by_group(group_name)


# ✅ REST API to fetch stored positions from the database
@router.get("/stored")
def get_stored_positions():
    """
    Retrieve all stored positions from the database.
    """
    from app.modules.database import SessionLocal, MT5Position
    from sqlalchemy.orm import Session

    db: Session = SessionLocal()
    positions = db.query(MT5Position).all()
    db.close()

    return {"positions": [
        {
            "ticket": p.ticket,
            "login": p.login,
            "symbol": p.symbol,
            "volume": p.volume,
            "price_open": p.price_open,
            "price_close": p.price_close,
            "profit": p.profit,
            "time_open": p.time_open,
            "time_close": p.time_close
        } for p in positions
    ]}
