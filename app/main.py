from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.routes import router as api_router
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from app.core.db import engine, init_db


import logging.config
import os
import sys

sys.stdout.reconfigure(encoding="utf-8") # type: ignore

# ✅ Create FastAPI app
app = FastAPI(title="MT5 Dashboard")

# ✅ Allow WebSockets from any host
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"]) # type: ignore

# ✅ Configure CORS (Fix for WebSockets)
app.add_middleware(
    CORSMiddleware, # type: ignore
    allow_origins=["*"],  # ✅ Allow WebSockets from any frontend
    allow_credentials=True,
    allow_methods=["*"],  # ✅ Ensure WebSockets work properly
    allow_headers=["*"],
)

# ✅ Include API Routers
app.include_router(api_router, prefix="/api/v1")

# ✅ Logging Configuration
log_folder = "app/logs"
if not os.path.exists(log_folder):
    os.makedirs(log_folder)

LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {"format": "%(asctime)s - %(levelname)s - %(message)s"}
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "default",
            "level": "DEBUG",
            "stream": "ext://sys.stdout",
        },
        "file": {
            "class": "logging.FileHandler",
            "formatter": "default",
            "level": "DEBUG",
            "filename": os.path.join(log_folder, "app.log"),
            "mode": "a",
            "encoding": "utf-8",
        },
    },
    "root": {
        "level": "DEBUG",
        "handlers": ["console", "file"],
    },
}

logging.config.dictConfig(LOGGING_CONFIG)

@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        await init_db()


@app.get("/")
async def root():
    return {"message": "MT5 Dashboard Backend Running"}
