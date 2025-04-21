from fastapi import APIRouter
from app.modules.mt5_manager.routes import accounts_router, deals_router, positions_router, symbols_router, groups_router, symbols_router

router = APIRouter()

router.include_router(accounts_router.router)
router.include_router(deals_router.router)
router.include_router(positions_router.router)
router.include_router(symbols_router.router)
router.include_router(groups_router.router)
router.include_router(symbols_router.router)