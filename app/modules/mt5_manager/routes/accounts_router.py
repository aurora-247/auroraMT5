from fastapi import APIRouter
from app.modules.mt5_manager.manager import get_or_create_mt5_manager, mt5_managers

router = APIRouter(prefix="/accounts")


# ✅ Connect to an MT5 Manager instance
@router.post("/{identifier}/connect")
def connect_mt5_manager(identifier: str, server: str, login: int, password: str):
    """Connect to an MT5 Manager instance.
       Returns 'already connected' if the connection is already established.
    """
    manager = get_or_create_mt5_manager(identifier, server, login, password)
    if manager.connected:
        return {"status": "already connected"}

    success = manager.connect()
    return {"status": "connected" if success else "failed"}


# ✅ List active managers
@router.get("/")
def list_active_managers():
    """List all active MT5Manager instances along with connection details."""
    active = []
    for identifier, manager in mt5_managers.items():
        details = {
            "identifier": identifier,
            "server": manager.server,
            "login": manager.login,
            "connected": manager.connected,
        }
        active.append(details)
    return {"active_managers": active}


# ✅ Disconnect a manager
@router.get("/{identifier}/disconnect")
def disconnect_mt5_manager(identifier: str):
    """Disconnect a specific MT5 Manager instance."""
    if identifier in mt5_managers:
        success = mt5_managers[identifier].disconnect()
        del mt5_managers[identifier]
        return {"status": "disconnected" if success else "not connected"}
    return {"error": "Manager instance not found."}