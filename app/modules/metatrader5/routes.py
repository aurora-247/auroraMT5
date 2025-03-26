from fastapi import APIRouter, Query
import logging
from app.modules.metatrader5.terminal import get_mt5_service_instance, _service_instance

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/connect/")
def connect_metatrader5(
    login: int = Query(..., title="Login ID", description="MetaTrader5 login ID"),
    password: str = Query(..., title="Password", description="MetaTrader5 password"),
    server: str = Query(..., title="Server Address", description="MetaTrader5 server address"),
    path: str = Query(..., title="Terminal Path", description="File path to MetaTrader5 terminal")
):
    logger.debug(f"Received connect request with login: {login}, server: {server}, path: {path}")
    service = get_mt5_service_instance(path, login, password, server)
    result = service.connect()
    logger.info(f"Connect endpoint result: {result}")
    return {"status": result}

@router.get("/disconnect")
def disconnect_metatrader5():
    logger.debug("Received disconnect request")
    # Use the module-level instance if available.
    from app.modules.metatrader5.terminal import _service_instance
    if _service_instance is not None:
        result = _service_instance.disconnect()
        logger.info(f"Disconnect endpoint result: {result}")
        return {"status": result}
    logger.error("Disconnect endpoint: No active connection")
    return {"error": "No active connection"}
