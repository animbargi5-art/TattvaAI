"""
===============================================================================
TattvaAI - Inventory Service
===============================================================================
Handles inventory lookups with controlled incident scenarios.

Incident Scenarios:
- FAILURE: Service unavailable (503)
- Normal: Standard inventory lookup
===============================================================================
"""

import random
import time
import logging
from typing import Optional

from fastapi import FastAPI, HTTPException, Query

from telemetry import setup_telemetry

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Inventory Service")

setup_telemetry(
    app,
    "inventory-service"
)


@app.get("/")
async def home():
    return {"service": "inventory"}


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "inventory"}


@app.get("/inventory/{product_id}")
async def inventory(
    product_id: int,
    incident_mode: Optional[str] = Query(None, description="Incident scenario: FAILURE or None")
):
    """
    Check inventory for a product with optional incident scenarios.
    
    Incident Modes:
    - FAILURE: Simulate inventory service failure (503)
    - None: Normal operation
    """
    
    logger.info(f"Inventory request for product_id={product_id}, incident_mode={incident_mode}")
    
    # INCIDENT SCENARIO: DEPENDENCY_FAILURE (Inventory unavailable)
    if incident_mode == "FAILURE":
        logger.error(f"Simulating inventory service failure for product_id={product_id}")
        raise HTTPException(
            status_code=503,
            detail="Inventory service temporarily unavailable - database connection failed"
        )
    
    # NORMAL OPERATION
    time.sleep(random.uniform(0.05, 0.2))
    stock_level = random.randint(1, 100)
    
    logger.info(f"Inventory checked for product_id={product_id}, stock={stock_level}")
    
    return {
        "product_id": product_id,
        "stock": stock_level,
        "warehouse": "us-east-1",
        "last_updated": int(time.time())
    }
