# app/modules/mt5_manager/users.py

from typing import List, Dict, Any
from app.modules.mt5_manager.manager import mt5_managers
import MT5Manager

def fetch_users(identifier: str, group: str = "*") -> List[Dict[str, Any]]:
    """
    Fetch users from a specific group (default '*' = all groups) using an existing MT5ManagerService instance.
    """
    if identifier not in mt5_managers:
        raise ValueError("Manager instance not found.")

    manager_service = mt5_managers[identifier]

    if not manager_service.connected:
        if not manager_service.connect():
            raise ConnectionError(f"Failed to connect using session for {identifier}: {MT5Manager.LastError()}")

    users = manager_service.manager.UserGetByGroup(group)
    if users is False:
        raise RuntimeError(f"Failed to fetch users: {MT5Manager.LastError()}")

    results: List[Dict[str, Any]] = []
    for user in users:
        attrs = [
            attr for attr in dir(user)
            if not attr.startswith("_")
            and not callable(getattr(user, attr))
        ]
        record: Dict[str, Any] = {attr: getattr(user, attr) for attr in attrs}
        results.append(record)

    return results
