from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from app.modules.mt5_manager.users import fetch_users

router = APIRouter(
    prefix="/users",
    tags=["users"],
    responses={404: {"description": "Manager instance not found"}},
)

@router.get("/{identifier}", response_model=List[Dict[str, Any]])
def get_users(
    identifier: str,
    group: str = Query("*", description="Group name to filter users. Use '*' for all groups.")
):
    """
    Retrieve users for a given MT5 Manager instance, optionally filtered by group.
    """
    try:
        return fetch_users(identifier, group)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except ConnectionError as ce:
        raise HTTPException(status_code=503, detail=str(ce))
    except RuntimeError as re:
        raise HTTPException(status_code=500, detail=str(re))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")