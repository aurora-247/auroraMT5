from fastapi import APIRouter
from app.modules.mt5_manager.routes.routes import router as mt5_manager_router
from app.modules.metatrader5.routes import router as metatrader5_router
from app.modules.system_info import get_system_info

router = APIRouter()

router.include_router(mt5_manager_router, prefix="/mt5-manager", tags=["MT5 Manager"])
router.include_router(metatrader5_router, prefix="/metatrader5", tags=["MT5 Terminal"])

@router.get("/system-info")
def system_info():
    """
    API endpoint to fetch system specifications.
    """
    return get_system_info()