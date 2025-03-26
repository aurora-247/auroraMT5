import MetaTrader5 as mt5
import os
import logging

logger = logging.getLogger(__name__)

# Module-level global for the service instance.
_service_instance = None

def get_mt5_service_instance(path: str, login: int, password: str, server: str):
    global _service_instance
    # If an instance exists and is connected, return it.
    if _service_instance is not None and _service_instance._connected:
        return _service_instance
    # Otherwise, create a new instance (or replace the old one).
    _service_instance = MetaTrader5Service(path, login, password, server)
    return _service_instance

class MetaTrader5Service:
    def __init__(self, path: str, login: int, password: str, server: str):
        self.login = login
        self.password = password
        self.server = server
        self.path = path
        self._connected = False  # Connection state flag

        logger.debug(f"MetaTrader5Service created with path: {self.path}, login: {self.login}, server: {self.server}")

        if not os.path.exists(self.path):
            err_msg = f"MT5 Terminal not found at {self.path}"
            logger.error(err_msg)
            self._error = err_msg  # store error message
            # Note: Not raising an exception; instead, store the error message.
        else:
            self._error = None

    def connect(self) -> str:
        # Check if already connected.
        if self._connected:
            logger.info("MT5 is already connected.")
            return "Already connected"

        # If there was an error during initialization (e.g., terminal not found), return it.
        if self._error:
            return self._error

        logger.debug("Starting connection process: initializing MT5")
        # Attempt to initialize MT5 with credentials (using portable mode if required)
        if not mt5.initialize(path=self.path, login=self.login, password=self.password, server=self.server, portable=True):
            error_info = mt5.last_error()
            err_msg = f"MT5 Initialization Failed: {error_info}"
            logger.error(err_msg)
            return err_msg
        else:
            logger.info("MT5 initialize() successful.")

        logger.debug("Attempting to log in to MT5")
        authorized = mt5.login(self.login, password=self.password, server=self.server)
        if not authorized:
            error_info = mt5.last_error()
            err_msg = f"MT5 Login Failed: {error_info}"
            logger.error(err_msg)
            return err_msg
        logger.info("MT5 login successful.")
        self._connected = True
        return "Connected"

    def disconnect(self) -> str:
        # Check if there is an active connection.
        if not self._connected:
            logger.error("No active connection to disconnect.")
            return "No active connection"
        logger.debug("Shutting down MT5")
        mt5.shutdown()
        logger.info("MT5 shutdown successfully.")
        self._connected = False
        return "Disconnected"

    def get_positions(self):
        logger.debug("Fetching positions from MT5")
        positions = mt5.positions_get()
        logger.debug(f"Retrieved positions: {positions}")
        return positions
