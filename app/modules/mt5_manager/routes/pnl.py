from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel

from app.db.db import get_db
from app.models import (
    ManagerDeal,
    TerminalFill,
    GroupConfig,
    SymbolConfig,
    FXRate
)

router = APIRouter(prefix="/pnl", tags=["P&L"])

# Pydantic schemas for response
template = dict(
    total_markup=(float, ...),
    total_commission=(float, ...),
    total_swap_client=(float, ...),
    total_lp_cost=(float, ...),
    broker_pnl=(float, ...),
)
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

async def get_fx_rate(db: AsyncSession, currency: str, dt: datetime) -> float:
    """
    Fetch the FX rate to USD at given datetime. Defaults to 1.0 if USD.
    """
    if currency.upper() == 'USD':
        return 1.0
    qry = select(FXRate).where(FXRate.base == currency, FXRate.date <= dt).order_by(FXRate.date.desc())
    result = await db.execute(qry)
    rate_obj = result.scalars().first()
    if not rate_obj:
        raise HTTPException(status_code=400, detail=f"FX rate for {currency} not found at {dt}")
    return rate_obj.rate

@router.get("/", response_model=PnLDetail)
async def get_pnl(
    date_from: datetime,
    date_to: datetime,
    symbol: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    # 1. Fetch client deals
    deal_q = select(ManagerDeal).where(
        ManagerDeal.open_time >= date_from,
        ManagerDeal.close_time <= date_to
    )
    if symbol:
        deal_q = deal_q.where(ManagerDeal.symbol == symbol)
    deals_res = await db.execute(deal_q)
    deals: List[ManagerDeal] = deals_res.scalars().all()

    # 2. Fetch LP fills
    fill_q = select(TerminalFill).where(
        TerminalFill.time >= date_from,
        TerminalFill.time <= date_to
    )
    if symbol:
        fill_q = fill_q.where(TerminalFill.symbol == symbol)
    fills_res = await db.execute(fill_q)
    fills: List[TerminalFill] = fills_res.scalars().all()

    # 3. Load configs
    group_cache: Dict[int, GroupConfig] = {}
    symbol_cache: Dict[str, SymbolConfig] = {}

    total_markup = total_commission = total_swap_client = 0.0

    # Calculate client-side P&L and fees
    for deal in deals:
        sym_conf = symbol_cache.get(deal.symbol) or (symbol_cache.setdefault(deal.symbol, (await db.get(SymbolConfig, deal.symbol))))
        grp_conf = group_cache.get(deal.group_id) or (group_cache.setdefault(deal.group_id, (await db.get(GroupConfig, deal.group_id))))

        # Raw P&L in symbol currency
        raw_pnl = (deal.close_price - deal.open_price) * deal.volume * deal.contract_size

        # Spread markup revenue
        spread_markup = (deal.open_price - deal.gateway_price) * deal.volume * deal.contract_size
        total_markup += spread_markup

        # Commission fee from group tiers
        comm_rate = next((tier.value for tier in grp_conf.commissions if tier.range_from <= deal.volume <= tier.range_to), 0.0)
        commission_fee = comm_rate * deal.volume
        total_commission += commission_fee

        # Swap (financing)
        swap_rate = grp_conf.swap_long if deal.action == 'Buy' else grp_conf.swap_short
        swap_fee = swap_rate * deal.volume
        total_swap_client += swap_fee

    # 4. Calculate LP-side cost
    total_lp_cost = sum((f.profit + f.swap + f.commission) for f in fills)

    broker_pnl = total_markup + total_commission - total_lp_cost

    return PnLDetail(
        date_from=date_from,
        date_to=date_to,
        symbol=symbol,
        summary=PnLSummary(
            total_markup=total_markup,
            total_commission=total_commission,
            total_swap_client=total_swap_client,
            total_lp_cost=total_lp_cost,
            broker_pnl=broker_pnl
        )
    )
