from fastapi import APIRouter
from app.modules.mt5_manager.manager import mt5_managers

router = APIRouter(prefix="/symbols")

# ✅ Fetch symbols for a group
@router.get("/{identifier}/{group_name}/symbols")
def get_group_symbols(identifier: str, group_name: str):
    """Retrieve all symbols assigned to a specific group for an MT5 instance."""
    if identifier not in mt5_managers:
        return {"error": "Manager instance not found."}

    return mt5_managers[identifier].get_group_symbols(group_name)


# ✅ Fetch symbol configuration
@router.get("/{identifier}/{symbol_name}")
def get_symbol_configuration(identifier: str, symbol_name: str):
    """Retrieve configuration details of a specific symbol."""
    if identifier not in mt5_managers:
        return {"error": "Manager instance not found."}

    return mt5_managers[identifier].get_symbol_configuration(symbol_name)
