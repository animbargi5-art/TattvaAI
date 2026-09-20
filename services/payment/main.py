"""
===============================================================================
TattvaAI - Payment Service
===============================================================================
Simulates payment processing with controlled incident scenarios for testing.

Incident Scenarios:
- TIMEOUT: Payment gateway timeout (12s delay → 504)
- FAILURE: Payment service internal error (500)
- Normal: Realistic payment processing (0.2-1.5s)
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

app = FastAPI(
    title="Payment Service"
)

setup_telemetry(
    app,
    "payment-service"
)


@app.get("/")
async def home():
    return {
        "service": "payment"
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "payment"}


@app.get("/pay/{order_id}")
async def pay(
    order_id: int,
    incident_mode: Optional[str] = Query(None, description="Incident scenario: TIMEOUT, FAILURE, or None for normal")
):
    """
    Process payment with optional controlled incident scenarios.
    
    Incident Modes:
    - TIMEOUT: Simulate payment gateway timeout (10+ seconds delay)
    - FAILURE: Simulate payment service failure (500 error)
    - None: Normal operation with random realistic delay
    """
    
    logger.info(f"Payment request started for order_id={order_id}, incident_mode={incident_mode}")
    
    # INCIDENT SCENARIO: PAYMENT_GATEWAY_TIMEOUT
    if incident_mode == "TIMEOUT":
        logger.warning(f"Simulating payment gateway timeout for order_id={order_id}")
        time.sleep(12)  # Exceed typical timeout threshold
        logger.error(f"Payment gateway timeout for order_id={order_id}")
        raise HTTPException(
            status_code=504,
            detail="Payment gateway timeout - request exceeded maximum processing time"
        )
    
    # INCIDENT SCENARIO: PAYMENT_SERVICE_FAILURE
    if incident_mode == "FAILURE":
        logger.error(f"Simulating payment service failure for order_id={order_id}")
        raise HTTPException(
            status_code=500,
            detail="Payment service internal error - unable to process transaction"
        )
    
    # NORMAL OPERATION - realistic payment processing
    delay = random.uniform(0.2, 1.5)
    time.sleep(delay)
    
    logger.info(f"Payment processed successfully for order_id={order_id}, processing_time={round(delay, 2)}s")
    
    return {
        "status": "paid",
        "order_id": order_id,
        "processing_time": round(delay, 2),
        "gateway": "stripe",
        "transaction_id": f"txn_{order_id}_{int(time.time())}"
    }
