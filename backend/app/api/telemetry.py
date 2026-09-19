"""
===============================================================================
TattvaAI - Telemetry Providers API
===============================================================================

Provides provider health checking and connection testing for:
1. Mock / Demo
2. SigNoz
3. AWS Observability (CloudWatch & X-Ray via IAM)
4. OpenTelemetry-compatible Backend (Query API verification)

Security: Never exposes secrets, API tokens, or AWS credentials to the client.
===============================================================================
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.core.logger import logger
from app.core.settings import settings
from app.telemetry.sources import (
    MockTelemetrySource,
    SigNozTelemetrySource,
    AWSObservabilitySource,
    OTLPTelemetrySource,
    get_telemetry_source,
)

router = APIRouter(
    prefix="/telemetry",
    tags=["Telemetry"],
)


class ProviderTestRequest(BaseModel):
    provider: str = Field(default="mock", description="Provider identifier: mock, signoz, aws, or opentelemetry")
    endpoint: Optional[str] = Field(default=None, description="Optional service endpoint")
    query_endpoint: Optional[str] = Field(default=None, description="Optional query/read API endpoint for OTel")
    region: Optional[str] = Field(default=None, description="Optional AWS region for AWS Observability")
    service_name: Optional[str] = Field(default=None, description="Target service name to test")


class ProviderTestResponse(BaseModel):
    connected: bool
    provider: str
    message: str
    capabilities: List[str] = Field(default_factory=list)
    mode: str = Field(default="LIVE", description="LIVE or DEMO")
    details: Dict[str, Any] = Field(default_factory=dict)


@router.get("/providers")
async def list_providers():
    """List available telemetry sources and their operational status."""
    return {
        "providers": [
            {
                "id": "mock",
                "name": "Mock / Demo",
                "description": "Deterministic synthetic demo telemetry for reliable offline testing and showcase.",
                "mode": "DEMO",
                "default": getattr(settings, "DEMO_MODE", False),
                "capabilities": ["traces", "logs", "metrics", "dependencies", "alerts", "historical_incidents"],
            },
            {
                "id": "signoz",
                "name": "SigNoz Observability",
                "description": "Live query backend for SigNoz traces, metrics, logs, and service maps.",
                "mode": "LIVE",
                "capabilities": ["traces", "logs", "metrics", "dependencies", "alerts"],
            },
            {
                "id": "aws",
                "name": "AWS Observability",
                "description": "AWS CloudWatch metrics/logs and AWS X-Ray distributed traces via IAM credentials.",
                "mode": "LIVE",
                "capabilities": ["traces", "logs", "metrics", "alerts", "dependencies"],
            },
            {
                "id": "opentelemetry",
                "name": "OpenTelemetry Query Backend",
                "description": "OpenTelemetry read/query backend for standards-compliant observability backends.",
                "mode": "LIVE",
                "capabilities": ["traces", "logs", "metrics"],
            },
        ],
        "active_default": "mock" if getattr(settings, "DEMO_MODE", False) else getattr(settings, "TELEMETRY_SOURCE", "mock"),
    }


@router.post("/providers/test", response_model=ProviderTestResponse)
async def test_provider_connection(payload: ProviderTestRequest):
    """
    Validate provider configuration and attempt a live telemetry check.
    Never exposes internal secrets or credentials.
    """
    raw_provider = (payload.provider or "mock").strip().lower()

    if raw_provider in ("mock", "demo"):
        return ProviderTestResponse(
            connected=True,
            provider="mock",
            message="Deterministic demo telemetry enabled. Ready for simulation.",
            capabilities=["traces", "logs", "metrics", "dependencies", "alerts", "historical_incidents"],
            mode="DEMO",
            details={"type": "synthetic", "service": payload.service_name or "gateway"},
        )

    elif raw_provider in ("signoz",):
        try:
            source = SigNozTelemetrySource()
            is_healthy = await source.health_check()
            if is_healthy:
                return ProviderTestResponse(
                    connected=True,
                    provider="signoz",
                    message="SigNoz telemetry service connected and responding.",
                    capabilities=["traces", "logs", "metrics", "dependencies", "alerts"],
                    mode="LIVE",
                    details={"status": "active"},
                )
            else:
                return ProviderTestResponse(
                    connected=False,
                    provider="signoz",
                    message="Unable to reach SigNoz endpoint. Verify that the SigNoz service is running and accessible.",
                    capabilities=[],
                    mode="LIVE",
                )
        except Exception as e:
            logger.warning("SigNoz connection test failed: %s", e)
            return ProviderTestResponse(
                connected=False,
                provider="signoz",
                message=f"SigNoz connection error: {str(e)[:120]}",
                capabilities=[],
                mode="LIVE",
            )

    elif raw_provider in ("aws", "cloudwatch", "xray", "aws_observability"):
        try:
            region = payload.region or getattr(settings, "AWS_DEFAULT_REGION", "us-east-1")
            source = AWSObservabilitySource(region=region)
            is_healthy = await source.health_check()
            if is_healthy:
                return ProviderTestResponse(
                    connected=True,
                    provider="aws",
                    message=f"AWS Observability connected in {region} via IAM.",
                    capabilities=["traces", "logs", "metrics", "alerts", "dependencies"],
                    mode="LIVE",
                    details={"region": region, "auth": "IAM Role / AWS SDK"},
                )
            else:
                return ProviderTestResponse(
                    connected=False,
                    provider="aws",
                    message=f"AWS CloudWatch check failed in region {region}. Verify IAM permissions.",
                    capabilities=[],
                    mode="LIVE",
                )
        except Exception as e:
            logger.warning("AWS connection test failed: %s", e)
            return ProviderTestResponse(
                connected=False,
                provider="aws",
                message=f"AWS connection error: {str(e)[:120]}",
                capabilities=[],
                mode="LIVE",
            )

    elif raw_provider in ("opentelemetry", "otlp"):
        query_endpoint = payload.query_endpoint or getattr(settings, "OTEL_QUERY_ENDPOINT", None)
        if not query_endpoint:
            return ProviderTestResponse(
                connected=False,
                provider="opentelemetry",
                message="OTLP export endpoint configured, but no Telemetry Query API endpoint was provided. OTLP is an export protocol; a query API is required to read telemetry.",
                capabilities=[],
                mode="LIVE",
                details={"notice": "OTLP ingestion differs from Telemetry Query API"},
            )

        try:
            import urllib.request
            req = urllib.request.Request(query_endpoint, headers={"User-Agent": "TattvaAI/1.0"})
            with urllib.request.urlopen(req, timeout=5) as resp:
                status_code = resp.getcode()
                if status_code in (200, 204):
                    return ProviderTestResponse(
                        connected=True,
                        provider="opentelemetry",
                        message=f"OpenTelemetry query endpoint responded with status {status_code}.",
                        capabilities=["traces", "logs", "metrics"],
                        mode="LIVE",
                    )
                else:
                    return ProviderTestResponse(
                        connected=False,
                        provider="opentelemetry",
                        message=f"OpenTelemetry query endpoint returned HTTP {status_code}.",
                        capabilities=[],
                        mode="LIVE",
                    )
        except Exception as e:
            return ProviderTestResponse(
                connected=False,
                provider="opentelemetry",
                message=f"Could not connect to query endpoint: {str(e)[:120]}",
                capabilities=[],
                mode="LIVE",
            )

    else:
        return ProviderTestResponse(
            connected=False,
            provider=raw_provider,
            message=f"Unsupported provider: '{raw_provider}'. Supported: mock, signoz, aws, opentelemetry.",
            capabilities=[],
            mode="DEMO",
        )
