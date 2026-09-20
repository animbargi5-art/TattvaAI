"""
===============================================================================
TattvaAI - Gateway Service (API Entry Point)
===============================================================================
Main API gateway that orchestrates requests to downstream microservices.

Provides incident lab endpoints for controlled telemetry generation:
- /api/orders?incident_mode=HEALTHY - Normal operation
- /api/orders?incident_mode=PAYMENT_TIMEOUT - Payment gateway timeout
- /api/orders?incident_mode=PAYMENT_FAILURE - Payment service failure  
- /api/orders?incident_mode=HIGH_LATENCY - Slow order processing
- /api/orders?incident_mode=DEPENDENCY_FAILURE - Inventory service failure
===============================================================================
"""

import logging
from typing import Optional

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import httpx

from telemetry import setup_telemetry

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Gateway Service - TattvaAI Incident Lab"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

setup_telemetry(
    app,
    "gateway-service"
)


@app.get("/")
async def home():
    return {
        "service": "gateway",
        "version": "1.0.0",
        "incident_lab": "enabled"
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "gateway"}


@app.get("/api/orders")
async def get_orders(
    incident_mode: Optional[str] = Query(
        None, 
        description="Incident scenario: HEALTHY, PAYMENT_TIMEOUT, PAYMENT_FAILURE, HIGH_LATENCY, DEPENDENCY_FAILURE"
    )
):
    """
    API Gateway endpoint for order processing.
    
    Generates REAL AWS CloudWatch logs, X-Ray traces, and telemetry
    based on the specified incident scenario.
    
    Scenarios:
    - HEALTHY: Normal operation (200 OK, ~1-2s)
    - PAYMENT_TIMEOUT: Payment gateway timeout (504, ~12s)
    - PAYMENT_FAILURE: Payment service internal error (500)
    - HIGH_LATENCY: Slow processing (200 OK, ~5-7s)
    - DEPENDENCY_FAILURE: Inventory service unavailable (partial 503)
    """
    
    logger.info(f"Gateway received request for /api/orders with incident_mode={incident_mode}")
    
    # Map incident modes to downstream service parameters
    order_incident_mode = incident_mode if incident_mode in ["PAYMENT_TIMEOUT", "PAYMENT_FAILURE", "HIGH_LATENCY", "DEPENDENCY_FAILURE"] else None
    
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            logger.info(f"Forwarding request to order service with mode={order_incident_mode}")
            
            if order_incident_mode:
                response = await client.get(
                    f"http://order:8000/orders?incident_mode={order_incident_mode}"
                )
            else:
                response = await client.get("http://order:8000/orders")
            
            logger.info(f"Gateway request completed with status={response.status_code}")
            
            return {
                **response.json(),
                "gateway_timestamp": httpx._utils.default_clock(),
                "incident_scenario": incident_mode or "HEALTHY"
            }
            
    except httpx.TimeoutException as e:
        logger.error(f"Timeout error in gateway: {str(e)}")
        return {
            "error": "gateway_timeout",
            "message": "Request to order service timed out",
            "incident_scenario": incident_mode,
            "status": "failed"
        }
    except Exception as e:
        logger.error(f"Error in gateway: {str(e)}")
        return {
            "error": "gateway_error", 
            "message": str(e),
            "incident_scenario": incident_mode,
            "status": "failed"
        }


@app.get("/api/lab/scenarios")
async def list_scenarios():
    """
    List available incident lab scenarios.
    """
    return {
        "scenarios": [
            {
                "name": "HEALTHY",
                "description": "Normal operation - all services healthy",
                "expected_status": 200,
                "expected_duration": "1-2s"
            },
            {
                "name": "PAYMENT_TIMEOUT",
                "description": "Payment gateway timeout scenario",
                "expected_status": 200,
                "expected_duration": "12+ seconds",
                "telemetry": ["X-Ray trace with high latency", "CloudWatch timeout logs", "Partial order completion"]
            },
            {
                "name": "PAYMENT_FAILURE",
                "description": "Payment service internal error",
                "expected_status": 200,
                "expected_duration": "1-2s",
                "telemetry": ["X-Ray trace with fault", "CloudWatch error logs", "500 response from payment"]
            },
            {
                "name": "HIGH_LATENCY",
                "description": "Slow order processing",
                "expected_status": 200,
                "expected_duration": "5-7s",
                "telemetry": ["X-Ray trace with extended segments", "CloudWatch latency warnings"]
            },
            {
                "name": "DEPENDENCY_FAILURE",
                "description": "Inventory service unavailable",
                "expected_status": 200,
                "expected_duration": "1-2s",
                "telemetry": ["X-Ray trace with fault segments", "CloudWatch 503 errors", "Degraded service response"]
            }
        ]
    }
