"""
===============================================================================
TattvaAI - Order Service
===============================================================================
Orchestrates order processing with inventory and payment dependencies.

Incident Scenarios:
- HIGH_LATENCY: Slow processing (5s delay)
- DEPENDENCY_FAILURE: Force downstream failure
- Normal: Standard order flow
===============================================================================
"""

import time
import logging
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
import httpx

from telemetry import setup_telemetry

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Order Service"
)

setup_telemetry(
    app,
    "order-service"
)


@app.get("/")
async def home():
    return {
        "service": "order"
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "order"}


@app.get("/orders")
async def get_orders(
    incident_mode: Optional[str] = Query(None, description="Incident scenario: HIGH_LATENCY, DEPENDENCY_FAILURE, PAYMENT_TIMEOUT, PAYMENT_FAILURE, or None")
):
    """
    Retrieve orders with inventory and payment processing.
    
    Incident Modes:
    - HIGH_LATENCY: Simulate slow order processing
    - DEPENDENCY_FAILURE: Simulate inventory service failure
    - PAYMENT_TIMEOUT: Trigger payment gateway timeout
    - PAYMENT_FAILURE: Trigger payment service failure
    - None: Normal operation
    """
    
    logger.info(f"Orders request started, incident_mode={incident_mode}")
    
    # INCIDENT SCENARIO: HIGH_LATENCY
    if incident_mode == "HIGH_LATENCY":
        logger.warning("Simulating high latency in order processing")
        time.sleep(5)  # Significant processing delay
        logger.info("High latency delay completed")
    
    orders = [
        {
            "id": 1,
            "product_id": 101,
            "product": "Laptop"
        },
        {
            "id": 2,
            "product_id": 102,
            "product": "Mouse"
        }
    ]
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        for order in orders:
            try:
                # INCIDENT SCENARIO: DEPENDENCY_FAILURE - force inventory failure
                if incident_mode == "DEPENDENCY_FAILURE":
                    inventory_url = f"http://inventory:8000/inventory/{order['id']}?incident_mode=FAILURE"
                else:
                    inventory_url = f"http://inventory:8000/inventory/{order['id']}"
                
                logger.info(f"Fetching inventory for order {order['id']}")
                inventory = await client.get(inventory_url)
                order["inventory"] = inventory.json()
                logger.info(f"Inventory fetched successfully for order {order['id']}")
                
            except Exception as e:
                logger.error(f"Inventory service error for order {order['id']}: {str(e)}")
                order["inventory"] = {"error": "inventory_unavailable", "details": str(e)}
            
            try:
                # Pass incident mode to payment service
                if incident_mode == "PAYMENT_TIMEOUT":
                    payment_url = f"http://payment:8000/pay/{order['id']}?incident_mode=TIMEOUT"
                elif incident_mode == "PAYMENT_FAILURE":
                    payment_url = f"http://payment:8000/pay/{order['id']}?incident_mode=FAILURE"
                else:
                    payment_url = f"http://payment:8000/pay/{order['id']}"
                
                logger.info(f"Processing payment for order {order['id']}")
                payment = await client.get(payment_url)
                order["payment"] = payment.json()
                logger.info(f"Payment processed successfully for order {order['id']}")
                
            except httpx.TimeoutException as e:
                logger.error(f"Payment timeout for order {order['id']}: {str(e)}")
                order["payment"] = {"error": "payment_timeout", "details": "Payment gateway timeout"}
            except Exception as e:
                logger.error(f"Payment service error for order {order['id']}: {str(e)}")
                order["payment"] = {"error": "payment_failed", "details": str(e)}
    
    logger.info(f"Orders request completed, total_orders={len(orders)}")
    
    return {
        "orders": orders,
        "total": len(orders),
        "incident_mode": incident_mode
    }
