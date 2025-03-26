import asyncio
import json
import websockets
from app.modules.mt5_manager.manager import MT5ManagerService

async def send_data(websocket):
    while True:
        deals = MT5ManagerService.get_deals()
        positions = MT5ManagerService.get_positions()

        data = {"deals": deals, "positions": positions}
        await websocket.send(json.dumps(data))

        await asyncio.sleep(1)  # Adjust polling frequency

async def websocket_endpoint(websocket, path):
    await send_data(websocket)

async def start_websocket_server():
    server = await websockets.serve(websocket_endpoint, "0.0.0.0", 8765)
    await server.wait_closed()

asyncio.run(start_websocket_server())
