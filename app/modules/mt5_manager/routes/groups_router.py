from fastapi import APIRouter, HTTPException
from app.modules.mt5_manager.groups import get_group_configurations
import logging

router = APIRouter(prefix="/groups")
logger = logging.getLogger(__name__)

@router.get("/{identifier}/group-configurations")
async def group_configurations(identifier: str):
    result = get_group_configurations(identifier)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result
