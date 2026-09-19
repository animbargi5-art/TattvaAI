"""
===============================================================================
TattvaAI - Telemetry Sources Package & Factory
===============================================================================

Purpose
-------
Provides pluggable telemetry evidence sources and a factory function to instantiate
the configured provider (mock, signoz, aws, or otlp).
Supports runtime context variable overrides per investigation.
===============================================================================
"""

from __future__ import annotations

import contextvars
from typing import Optional

from app.core.logger import logger
from app.core.settings import settings
from app.telemetry.sources.base import TelemetrySource
from app.telemetry.sources.mock_source import MockTelemetrySource
from app.telemetry.sources.otlp_source import OTLPTelemetrySource
from app.telemetry.sources.signoz_source import SigNozTelemetrySource
from app.telemetry.sources.aws_source import AWSObservabilitySource

SUPPORTED_TELEMETRY_SOURCES = {"mock", "otlp", "signoz", "aws"}

# Per-investigation runtime context variable
current_telemetry_source: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar(
    "current_telemetry_source", default=None
)


def get_telemetry_source(source_type: Optional[str] = None) -> TelemetrySource:
    """
    Factory function to instantiate and return the configured TelemetrySource provider.

    Selection precedence:
    1. Explicit `source_type` parameter
    2. Active `current_telemetry_source` context variable
    3. `settings.DEMO_MODE` -> "mock" if enabled and no explicit source given
    4. `settings.TELEMETRY_SOURCE` (defaults to "mock")

    Raises:
        ValueError: If an unsupported or invalid source type is configured.
    """
    raw_source = source_type

    if raw_source is None:
        raw_source = current_telemetry_source.get()

    if raw_source is None:
        if getattr(settings, "DEMO_MODE", False):
            raw_source = "mock"
        else:
            raw_source = getattr(settings, "TELEMETRY_SOURCE", "mock")

    normalized = str(raw_source).strip().lower()

    if normalized in ("mock", "demo"):
        return MockTelemetrySource()
    elif normalized in ("otlp", "opentelemetry"):
        return OTLPTelemetrySource()
    elif normalized in ("signoz",):
        return SigNozTelemetrySource()
    elif normalized in ("aws", "cloudwatch", "xray", "aws_observability"):
        return AWSObservabilitySource()
    else:
        logger.warning("Unrecognized telemetry source '%s', falling back to MockTelemetrySource", raw_source)
        return MockTelemetrySource()


__all__ = [
    "TelemetrySource",
    "MockTelemetrySource",
    "OTLPTelemetrySource",
    "SigNozTelemetrySource",
    "AWSObservabilitySource",
    "get_telemetry_source",
    "SUPPORTED_TELEMETRY_SOURCES",
    "current_telemetry_source",
]
