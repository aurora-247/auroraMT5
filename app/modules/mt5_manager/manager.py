import MT5Manager
import logging
import asyncio
import threading
from fastapi import WebSocket
from typing import Dict, List
from app.modules.database import SessionLocal, MT5Group
from app.modules.mt5_manager.deals_mapping import parse_deal

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)  # Enable detailed logging

# ✅ Global storage for multiple MT5Manager instances
mt5_managers: Dict[str, "MT5ManagerService"] = {}

class MT5ManagerService:
    class DealSink:
        def __init__(self, service: "MT5ManagerService"):
            self.service = service

        def OnDealAdd(self, deal):
            deal_str = deal.Print() if hasattr(deal, "Print") else str(deal)
            logger.info(f"OnDealAdd: {deal_str}")
            deal_info = parse_deal(deal)
            self.service.latest_deals.append(deal_info)
            logger.debug(f"Deal stored: {deal_info}")

        def OnDealUpdate(self, deal):
            deal_str = deal.Print() if hasattr(deal, "Print") else str(deal)
            logger.info(f"OnDealUpdate: {deal_str}")

        def OnDealDelete(self, deal):
            deal_str = deal.Print() if hasattr(deal, "Print") else str(deal)
            logger.info(f"OnDealDelete: {deal_str}")

        def OnDealClear(self, deal):
            deal_str = deal.Print() if hasattr(deal, "Print") else str(deal)
            logger.info(f"OnDealClear: {deal_str}")

        def OnDealSync(self, deal):
            deal_str = deal.Print() if hasattr(deal, "Print") else str(deal)
            logger.info(f"OnDealSync: {deal_str}")

        def OnDealPerform(self, deal):
            deal_str = deal.Print() if hasattr(deal, "Print") else str(deal)
            logger.info(f"OnDealPerform: {deal_str}")

        def OnDealPerformCloseBy(self, deal):
            deal_str = deal.Print() if hasattr(deal, "Print") else str(deal)
            logger.info(f"OnDealPerformCloseBy: {deal_str}")

    def __init__(self, identifier: str, server: str, login: int, password: str):
        self.identifier = identifier  # Unique ID for each manager
        self.server = server
        self.login = login
        self.password = password
        self.manager = MT5Manager.ManagerAPI()
        self.connected = False
        self.deals_subscribers: List[WebSocket] = []
        self.positions_subscribers: List[WebSocket] = []
        self.thread = None
        self.latest_deals: List[Dict] = []  # Storage for incoming deals
        self.deals_sink = self.DealSink(self)

    def connect(self) -> bool:
        """Connect to MT5 Manager if not already connected, and wait for the connection result."""
        if self.connected:
            logger.info(f"Already connected: {self.identifier}")
            return True

        # Subscribe to deals before connecting
        # if not self.manager.DealSubscribe(self.deals_sink):
        #     logger.error(f"Failed to subscribe to deals: {MT5Manager.LastError()}")
        #     return False
        # else:
        #     logger.info("✅ Subscribed to deals successfully before connecting.")

        # Use an event to signal when connection is done
        connection_event = threading.Event()

        def run_connection():
            logger.debug(f"Starting connection: {self.identifier}")
            if self.manager.Connect(
                    self.server,
                    self.login,
                    self.password,
                    MT5Manager.ManagerAPI.EnPumpModes.PUMP_MODE_POSITIONS,
                    120000,
            ):
                self.connected = True
                logger.info(f"✅ Connected: {self.identifier}")
            else:
                logger.error(f"⚠️ Failed to connect {self.identifier}: {MT5Manager.LastError()}")
            connection_event.set()  # Signal that connection attempt is complete

        # Start connection in a separate thread
        self.thread = threading.Thread(target=run_connection)
        self.thread.start()

        # Wait for the connection to complete (with a timeout, e.g., 120 seconds)
        if not connection_event.wait(timeout=120):
            logger.error(f"Connection attempt timed out for {self.identifier}")
            return False

        return self.connected

        # Start connection in a separate thread
        self.thread = threading.Thread(target=run_connection)
        self.thread.start()
        return True

    def disconnect(self) -> bool:
        """Disconnect MT5 Manager."""
        if not self.connected:
            logger.warning(f"⚠️ {self.identifier} is not connected.")
            return False

        logger.debug(f"Disconnecting {self.identifier}...")
        self.manager.Disconnect()
        self.connected = False
        logger.info(f"✅ {self.identifier} disconnected.")
        return True

    def get_groups(self):
        """Retrieve all groups from MT5 Manager and store in SQLite."""
        if not self.connected:
            return {"error": "Not connected to MT5 Manager."}

        logger.debug("Fetching groups from MT5 Manager.")
        total_groups = self.manager.GroupRequestArray()

        if isinstance(total_groups, list) and total_groups:
            db = SessionLocal()
            groups = []

            for group in total_groups:
                group_data = {
                    "group_name": getattr(group, "Group", "Unknown"),
                    "max_users": getattr(group, "LimitUsers", None),
                    "leverage": getattr(group, "Leverage", None),
                    "currency": getattr(group, "Currency", None),
                    "description": getattr(group, "Comment", ""),
                }
                groups.append(group_data)
                existing_group = db.query(MT5Group).filter(MT5Group.group_name == group_data["group_name"]).first()
                if not existing_group:
                    db_group = MT5Group(**group_data)
                    db.add(db_group)

            db.commit()
            db.close()
            logger.info(f"✅ Stored {len(groups)} groups.")
            return {"groups": groups}

        return {"error": "No groups found."}

    async def subscribe_to_deals(self, websocket: WebSocket):
        """
        WebSocket handler for live deals streaming.
        This method subscribes to deals only when the subscribe endpoint is hit.
        """
        # Subscribe to deals only if not already subscribed
        if not getattr(self, "deals_subscribed", False):
            if not self.manager.DealSubscribe(self.deals_sink):
                logger.error(f"Failed to subscribe to deals: {MT5Manager.LastError()}")
                await websocket.close(code=1011)  # Close connection on failure
                return
            else:
                logger.info("✅ Subscribed to deals successfully via subscribe endpoint.")
                self.deals_subscribed = True

        self.deals_subscribers.append(websocket)
        logger.info("✅ New WebSocket client connected for live deals.")

        try:
            while True:
                deals = self.get_latest_deals()
                if deals:
                    logger.debug(f"Sending deals: {deals}")
                    try:
                        await websocket.send_json({"deals": deals})
                    except Exception as send_err:
                        logger.error(f"Error sending deals: {repr(send_err)}")
                        break
                await asyncio.sleep(1)
        except Exception as e:
            logger.error(f"WebSocket error: {repr(e)}")
        finally:
            if websocket in self.deals_subscribers:
                self.deals_subscribers.remove(websocket)
            logger.info("WebSocket client disconnected from deals stream.")

    async def subscribe_to_positions(self, websocket: WebSocket):
        """WebSocket handler for live positions streaming."""
        await websocket.accept()
        self.positions_subscribers.append(websocket)
        logger.info(f"✅ WebSocket client connected for live positions on {self.identifier}.")

        try:
            while True:
                positions = self.get_latest_positions()
                if positions:
                    logger.debug(f"Sending positions: {positions}")
                    try:
                        await websocket.send_json({"positions": positions})
                    except Exception as send_err:
                        logger.error(f"Error sending positions: {str(send_err)}")
                        break
                await asyncio.sleep(1)
        except Exception as e:
            logger.error(f"WebSocket error: {str(e)}")
        finally:
            if websocket in self.positions_subscribers:
                self.positions_subscribers.remove(websocket)
            logger.info("WebSocket client disconnected from positions stream.")

    def get_latest_deals(self):
        """Return and clear the latest deals collected by the DealSink."""
        deals = self.latest_deals.copy()
        if deals:
            logger.debug(f"Retrieved latest deals: {deals}")
        self.latest_deals.clear()
        return deals

    def get_latest_positions(self):
        """Fetch latest open positions."""
        if not self.connected:
            return {"error": "Not connected to MT5 Manager."}

        logger.debug("Fetching latest positions.")
        positions = self.manager.PositionRequest()

        if not positions or not isinstance(positions, list):
            return []

        results = [
            {
                "ticket": getattr(position, "Ticket", "Unknown"),
                "symbol": getattr(position, "Symbol", "Unknown"),
                "type": getattr(position, "Type", "Unknown"),
                "volume": getattr(position, "Volume", 0),
                "price_open": getattr(position, "PriceOpen", 0),
                "profit": getattr(position, "Profit", 0),
                "time_open": getattr(position, "TimeString", "Unknown"),
            }
            for position in positions
        ]
        logger.debug(f"Latest positions: {results}")
        return results

# ✅ Manage multiple MT5Manager instances
def get_or_create_mt5_manager(identifier: str, server: str, login: int, password: str):
    """
    Return the existing MT5ManagerService for this identifier if it exists,
    otherwise create it, store it, and optionally connect.
    """
    if identifier in mt5_managers:
        logger.debug(f"Manager for {identifier} already exists.")
        return mt5_managers[identifier]

    manager = MT5ManagerService(identifier, server, login, password)
    mt5_managers[identifier] = manager
    return manager
