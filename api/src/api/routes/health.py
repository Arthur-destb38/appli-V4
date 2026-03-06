from __future__ import annotations

import time
from typing import Any

from fastapi import APIRouter
from sqlalchemy import text
from sqlmodel import Session

from ..db import get_engine

router = APIRouter(prefix="/health", tags=["health"])

_START_TIME = time.time()


@router.get("", summary="Health check")
async def get_health() -> dict[str, Any]:
    """
    Returns service health status.

    - **status**: "ok" if the service is running
    - **db**: "connected" | error message
    - **uptime_seconds**: seconds since the process started
    """
    db_status = "connected"
    try:
        engine = get_engine()
        with Session(engine) as session:
            session.execute(text("SELECT 1"))
    except Exception as exc:
        db_status = f"error: {exc}"

    status = "ok" if db_status == "connected" else "degraded"

    return {
        "status": status,
        "version": "0.1.0",
        "db": db_status,
        "uptime_seconds": round(time.time() - _START_TIME, 1),
    }
