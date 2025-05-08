import os
import logging
import MetaTrader5 as mt5
from datetime import datetime
from typing import Dict, Optional, Tuple, List

logger = logging.getLogger(__name__)

# Store multiple service instances keyed by identifier\ n_service_instances: Dict[str, "MetaTrader5Service"] = {}

_service_instances: Dict[str, "MetaTrader5Service"] = {}

class MetaTrader5Service:
    def __init__(self, path: str, login: int, password: str, server: str):
        self.login = login
        self.password = password
        self.server = server
        self.path = path
        self._connected = False
        self._error: Optional[str] = None

        logger.debug(f"Created MT5Service: path={path}, login={login}, server={server}")
        if not os.path.exists(self.path):
            self._error = f"MT5 terminal not found at {self.path}"
            logger.error(self._error)

    def connect(self) -> str:
        if self._connected:
            return "Already connected"
        if self._error:
            return self._error
        # Initialize
        if not mt5.initialize(path=self.path, login=self.login,
                               password=self.password, server=self.server,
                               portable=False):
            err = mt5.last_error()
            msg = f"MT5 initialize failed: {err}"
            logger.error(msg)
            return msg
        # Login
        if not mt5.login(self.login, password=self.password, server=self.server):
            err = mt5.last_error()
            mt5.shutdown()
            msg = f"MT5 login failed: {err}"
            logger.error(msg)
            return msg
        self._connected = True
        logger.info("MT5 connected and logged in")
        return "Connected"

    def disconnect(self) -> str:
        if not self._connected:
            return "No active connection"
        mt5.shutdown()
        self._connected = False
        logger.info("MT5 disconnected")
        return "Disconnected"

    def get_deal_history(
        self,
        from_date: datetime,
        to_date: Optional[datetime] = None,
        group_filter: str = "*,!*EUR*,!*GBP*"
    ) -> Tuple[Optional[List[dict]], Optional[str]]:
        if not self._connected:
            msg = "Not connected to MT5"
            logger.error(msg)
            return None, msg
        if to_date is None:
            to_date = datetime.now()
        deals = mt5.history_deals_get(from_date, to_date, group=group_filter)
        if deals is None:
            err = mt5.last_error()
            logger.error(f"history_deals_get failed: {err}")
            return None, err
        result: List[dict] = []
        for d in deals:
            dd = d._asdict()
            ts = dd.get("time")
            if isinstance(ts, (int, float)):
                dd["time"] = datetime.fromtimestamp(ts).isoformat()
            result.append(dd)
        return result, None

    def get_symbols(
        self,
        symbol_mask: Optional[str] = None,
        group_filter: Optional[str] = None
    ) -> Tuple[Optional[List[dict]], Optional[str]]:
        """
        Retrieve available symbols. If symbol_mask is provided, uses it as a filter;
        else if group_filter is provided, uses as group argument; otherwise returns all symbols.
        """
        if not self._connected:
            msg = "Not connected to MT5"
            logger.error(msg)
            return None, msg
        try:
            if symbol_mask:
                syms = mt5.symbols_get(symbol_mask)
            elif group_filter:
                syms = mt5.symbols_get(group=group_filter)
            else:
                syms = mt5.symbols_get()
        except Exception as e:
            logger.error(f"symbols_get exception: {e}")
            return None, str(e)
        result: List[dict] = []
        for s in syms:
            info = s._asdict() if hasattr(s, '_asdict') else dict(s.__dict__)
            result.append(info)
        return result, None


def get_mt5_service(
    identifier: str,
    path: str,
    login: int,
    password: str,
    server: str
) -> MetaTrader5Service:
    """Return or create an MT5 service instance for this identifier."""
    svc = _service_instances.get(identifier)
    if svc and svc._connected:
        return svc
    # (Re)create instance
    svc = MetaTrader5Service(path, login, password, server)
    _service_instances[identifier] = svc
    return svc


def get_existing_service(identifier: str) -> Optional[MetaTrader5Service]:
    """Retrieve an existing service instance by identifier, if any."""
    return _service_instances.get(identifier)


def get_all_services() -> Dict[str, MetaTrader5Service]:
    """
    Return the dict of all MT5Service instances (keyed by identifier),
    whether connected or not.
    """
    return _service_instances
