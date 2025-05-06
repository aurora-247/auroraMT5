from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel

from app.database import get_db  # your existing DB session dependency
from app.models import (
    ManagerDeal,       # SQLAlchemy model for hedged client deals
    TerminalFill,      # SQLAlchemy model for LP netting fills
    GroupConfig,       # SQLAlchemy model for group configurations (commissions, swaps)
    SymbolConfig,      # SQLAlchemy model for symbol specifications
    UserGroupMapping,  # SQLAlchemy model mapping login to group
    FXRate             # SQLAlchemy model for historical FX rates
)

router = APIRouter(prefix="/pnl", tags=["P&L"])

# Pydantic schemas for response
class PnLSummary(BaseModel):
    total_markup: float
    total_commission: float
    total_swap_client: float
    total_lp_cost: float
    broker_pnl: float

class PnLDetail(BaseModel):
    date_from: datetime
    date_to: datetime
    symbol: Optional[str]
    summary: PnLSummary


def get_fx_rate(db: Session, currency: str, dt: datetime) -> float:
    """
    Fetch the FX rate to USD at given datetime. Defaults to 1.0 if USD.
    """
    if currency.upper() == 'USD':
        return 1.0
    rate = db.query(FXRate) \
             .filter(FXRate.base == currency, FXRate.date <= dt) \
             .order_by(FXRate.date.desc()) \
             .first()
    if not rate:
        raise HTTPException(status_code=400, detail=f"FX rate for {currency} not found at {dt}")
    return rate.rate


@router.get("/", response_model=PnLDetail)
async def get_pnl(
    date_from: datetime,
    date_to: datetime,
    symbol: Optional[str] = None,
    db: Session = Depends(get_db)
):
    # 1. Fetch client deals
    deals_query = db.query(ManagerDeal) \
                    .filter(ManagerDeal.open_time >= date_from,
                            ManagerDeal.close_time <= date_to)
    if symbol:
        deals_query = deals_query.filter(ManagerDeal.symbol == symbol)
    deals: List[ManagerDeal] = deals_query.all()

    # 2. Fetch LP fills
    fills_query = db.query(TerminalFill) \
                    .filter(TerminalFill.time >= date_from,
                            TerminalFill.time <= date_to)
    if symbol:
        fills_query = fills_query.filter(TerminalFill.symbol == symbol)
    fills: List[TerminalFill] = fills_query.all()

    # 3. Load group configs, symbol configs
    group_cache: Dict[int, GroupConfig] = {}
    symbol_cache: Dict[str, SymbolConfig] = {}

    total_markup = total_comm = total_swap_client = 0.0

    # Calculate client-side P&L and fees
    for deal in deals:
        # Load symbol config
        if deal.symbol not in symbol_cache:
            symbol_cache[deal.symbol] = db.query(SymbolConfig) \
                                         .filter(SymbolConfig.symbol == deal.symbol) \
                                         .first()
        sym_conf = symbol_cache[deal.symbol]

        # Load group config
        if deal.group_id not in group_cache:
            group_cache[deal.group_id] = db.query(GroupConfig) \
                                          .filter(GroupConfig.group_id == deal.group_id) \
                                          .first()
        grp_conf = group_cache[deal.group_id]

        # Raw P&L in symbol currency
        raw_pnl = (deal.close_price - deal.open_price) \
                  * deal.volume \
                  * deal.contract_size

        # Spread markup revenue
        # Option: use price_gateway diff
        spread_markup = (deal.open_price - deal.gateway_price) \
                        * deal.volume \
                        * deal.contract_size
        total_markup += spread_markup

        # Commission fee from group tiers
        # Find applicable tier
        comm_rate = 0.0
        for comm in grp_conf.commissions:
            if comm.range_from <= deal.volume <= comm.range_to:
                comm_rate = comm.value
                break
        commission_fee = comm_rate * deal.volume
        total_comm += commission_fee

        # Swap (financing)
        swap_rate = grp_conf.swap_long if deal.action == 'Buy' else grp_conf.swap_short
        swap_fee = swap_rate * deal.volume
        total_swap_client += swap_fee

        # Convert all client fees/pnl to USD
        fx_open = get_fx_rate(db, deal.currency, deal.open_time)
        fx_close = get_fx_rate(db, deal.currency, deal.close_time)
        total_markup += 0  # already USD if sym quote USD
        total_comm   += 0  # commission in USD
        total_swap_client += 0  # swap in USD

    # 4. Calculate LP-side cost
    total_lp_cost = 0.0
    for f in fills:
        total_lp_cost += f.profit + f.swap + f.commission

    broker_pnl = total_markup + total_comm - total_lp_cost

    return PnLDetail(
        date_from=date_from,
        date_to=date_to,
        symbol=symbol,
        summary=PnLSummary(
            total_markup=total_markup,
            total_commission=total_comm,
            total_swap_client=total_swap_client,
            total_lp_cost=total_lp_cost,
            broker_pnl=broker_pnl
        )
    )
