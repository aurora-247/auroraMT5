from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from typing import List

from app.core.deps import get_db
from app.modules.mt5_manager.routes.routes import router as mt5_manager_router
from app.modules.metatrader5.routes import router as metatrader5_router
from app.modules.system_info import get_system_info

# ← Import your SQLAlchemy ORM model, not the Pydantic one
from app.models.symbol_mapping import SymbolMapping as SymbolMappingModel
from app.core.mapping import MappingSchema
from app.core.mapping import MappingSchema

router = APIRouter()

# Mount sub-routers
router.include_router(
    mt5_manager_router,
    prefix="/mt5-manager",
    tags=["MT5 Manager"]
)
router.include_router(
    metatrader5_router,
    prefix="/metatrader5",
    tags=["MT5 Terminal"]
)

@router.get("/system-info")
def system_info():
    return get_system_info()


@router.get("/mappings/symbols", response_model=List[MappingSchema])
async def get_mappings(
    manager_id: str,
    terminal_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns the list of saved mappings for the given manager_id & terminal_id.
    Always returns a list (empty if none found).
    """
    result = await db.execute(
        select(SymbolMappingModel).where(
            SymbolMappingModel.manager_id  == manager_id,
            SymbolMappingModel.terminal_id == terminal_id
        )
    )
    return result.scalars().all()


@router.post("/mappings/symbols")
async def save_mappings(
    mappings: List[MappingSchema],
    db: AsyncSession = Depends(get_db)
):
    """
    Replaces existing mappings for a manager_id/terminal_id pair.
    Deletes any old rows, then inserts the supplied list.
    """
    if not mappings:
        return {"status": "no mappings provided"}

    # All entries share the same manager_id and terminal_id
    mgr = mappings[0].manager_id
    term = mappings[0].terminal_id

    # 1) delete existing
    await db.execute(
        delete(SymbolMappingModel).where(
            SymbolMappingModel.manager_id  == mgr,
            SymbolMappingModel.terminal_id == term
        )
    )

    # 2) insert new
    for m in mappings:
        db.add(
            SymbolMappingModel(
                manager_id      = m.manager_id,
                terminal_id     = m.terminal_id,
                manager_symbol  = m.manager_symbol,
                terminal_symbol = m.terminal_symbol
            )
        )

    await db.commit()
    return {"status": "saved"}