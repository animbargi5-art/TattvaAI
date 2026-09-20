"""
===============================================================================
TattvaAI - Incident Lab API
===============================================================================
Controlled incident generation endpoints for testing and demo purposes.

Triggers REAL AWS telemetry from microservices, not fabricated data.
===============================================================================
"""

import httpx
import os
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.core.logger import logger

router = APIRouter(prefix="/incident-lab", tags=["Incident Lab"])

# Gateway service URL (can be localhost for dev, or deployed service)
GATEWAY_URL = os.getenv("GATEWAY_SERVICE_URL", "http://localhost:8001")


class IncidentTriggerResponse(BaseModel):
    scenario: str
    triggered_at: str
    gateway_url: str
    status: str
    duration_ms: Optional[float] = None
    response_status: Optional[int] = None
    telemetry_note: str


class ScenarioInfo(BaseModel):
    name: str
    description: str
    expected_telemetry: list[str]
    aws_services: list[str]


@router.get("/scenarios", response_model=list[ScenarioInfo])
async def list_scenarios():
    """
    List all available incident scenarios.
    """
    return [
        {
            "name": "HEALTHY",
            "description": "Normal request - all services operational",
            "expected_telemetry": [
                "AWS X-Ray trace with normal latency",
                "CloudWatch logs showing successful processing",
                "200 OK responses across all services"
            ],
            "aws_services": ["X-Ray", "CloudWatch Logs"]
        },
        {
            "name": "PAYMENT_TIMEOUT",
            "description": "Payment gateway timeout - simulates external payment processor delay",
            "expected_telemetry": [
                "AWS X-Ray trace showing >12s duration",
                "CloudWatch logs with timeout warnings",
                "X-Ray fault/error segments",
                "504 Gateway Timeout from payment service"
            ],
            "aws_services": ["X-Ray", "CloudWatch Logs"]
        },
        {
            "name": "PAYMENT_FAILURE",
            "description": "Payment service internal error - simulates service crash or bug",
            "expected_telemetry": [
                "AWS X-Ray trace with error annotation",
                "CloudWatch logs with error messages",
                "500 Internal Server Error from payment service",
                "Partial order completion"
            ],
            "aws_services": ["X-Ray", "CloudWatch Logs"]
        },
        {
            "name": "HIGH_LATENCY",
            "description": "Slow order processing - simulates database query slowdown",
            "expected_telemetry": [
                "AWS X-Ray trace showing 5-7s duration",
                "CloudWatch logs with latency warnings",
                "Extended order service processing time"
            ],
            "aws_services": ["X-Ray", "CloudWatch Logs"]
        },
        {
            "name": "DEPENDENCY_FAILURE",
            "description": "Inventory service failure - simulates downstream dependency unavailable",
            "expected_telemetry": [
                "AWS X-Ray trace with fault segment from inventory",
                "CloudWatch logs showing 503 errors",
                "Service dependency map showing inventory as root cause",
                "Partial degraded response"
            ],
            "aws_services": ["X-Ray", "CloudWatch Logs", "Service Map"]
        }
    ]


@router.post("/trigger/{scenario}", response_model=IncidentTriggerResponse)
async def trigger_incident(
    scenario: str
):
    """
    Trigger a controlled incident scenario.
    
    This generates REAL AWS telemetry from actual microservice execution.
    The telemetry is not fabricated - it comes from genuine AWS CloudWatch and X-Ray.
    """
    
    valid_scenarios = ["HEALTHY", "PAYMENT_TIMEOUT", "PAYMENT_FAILURE", "HIGH_LATENCY", "DEPENDENCY_FAILURE"]
    
    if scenario not in valid_scenarios:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid scenario. Must be one of: {', '.join(valid_scenarios)}"
        )
    
    logger.info(f"[Incident Lab] Triggering scenario: {scenario}")
    
    triggered_at = datetime.utcnow().isoformat() + "Z"
    
    try:
        start_time = datetime.utcnow()
        
        # Call the gateway service with the incident mode
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{GATEWAY_URL}/api/orders"
            params = {"incident_mode": scenario}
            
            logger.info(f"[Incident Lab] Calling gateway: {url} with params: {params}")
            
            response = await client.get(url, params=params)
            
            end_time = datetime.utcnow()
            duration_ms = (end_time - start_time).total_seconds() * 1000
            
            logger.info(f"[Incident Lab] Scenario {scenario} completed. Status: {response.status_code}, Duration: {duration_ms}ms")
            
            return IncidentTriggerResponse(
                scenario=scenario,
                triggered_at=triggered_at,
                gateway_url=url,
                status="completed",
                duration_ms=round(duration_ms, 2),
                response_status=response.status_code,
                telemetry_note=f"Real AWS telemetry generated. Check CloudWatch Logs and X-Ray traces for service: gateway-service, order-service, payment-service, inventory-service"
            )
            
    except httpx.TimeoutException as e:
        logger.error(f"[Incident Lab] Timeout triggering {scenario}: {str(e)}")
        return IncidentTriggerResponse(
            scenario=scenario,
            triggered_at=triggered_at,
            gateway_url=GATEWAY_URL,
            status="timeout",
            telemetry_note="Request timed out but telemetry may have been generated. Check AWS X-Ray for partial traces."
        )
    except Exception as e:
        logger.error(f"[Incident Lab] Error triggering {scenario}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to trigger incident: {str(e)}"
        )


@router.get("/status")
async def lab_status():
    """
    Check if the incident lab services are reachable.
    """
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{GATEWAY_URL}/health")
            
            if response.status_code == 200:
                return {
                    "status": "operational",
                    "gateway_url": GATEWAY_URL,
                    "message": "Incident lab services are reachable"
                }
            else:
                return {
                    "status": "degraded",
                    "gateway_url": GATEWAY_URL,
                    "message": f"Gateway returned status {response.status_code}"
                }
    except Exception as e:
        return {
            "status": "unavailable",
            "gateway_url": GATEWAY_URL,
            "message": f"Cannot reach gateway service: {str(e)}",
            "note": "Incident lab requires gateway service to be running"
        }
