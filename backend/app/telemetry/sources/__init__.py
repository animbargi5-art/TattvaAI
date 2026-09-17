"""
===============================================================================
TattvaAI - Telemetry Sources Package & Factory
===============================================================================

Purpose
-------
Provides pluggable telemetry evidence sources and a factory function to instantiate
the configured provider (mock, otlp, or signoz).
===============================================================================
"""

from __future__ import annotations

from typing import Optional

from app.core.logger import logger
from app.core.settings import settings
from app.telemetry.sources.base import TelemetrySource
from app.telemetry.sources.mock_source import MockTelemetrySource
from app.telemetry.sources.otlp_source import OTLPTelemetrySource
from app.telemetry.sources.signoz_source import SigNozTelemetrySource

SUPPORTED_TELEMETRY_SOURCES = {"mock", "otlp", "signoz"}


def get_telemetry_source(source_type: Optional[str] = None) -> TelemetrySource:
    """
    Factory function to instantiate and return the configured TelemetrySource provider.

    Selection precedence:
    1. Explicit `source_type` parameter
    2. `settings.DEMO_MODE` -> "mock" if enabled and no explicit source given
    3. `settings.TELEMETRY_SOURCE` (defaults to "mock")

    Raises:
        ValueError: If an unsupported or invalid source type is configured.
    """
    raw_source = source_type

    if raw_source is None:
        if getattr(settings, "DEMO_MODE", False):
            raw_source = "mock"
        else:
            raw_source = getattr(settings, "TELEMETRY_SOURCE", "mock")

    normalized = str(raw_source).strip().lower()

    if normalized == "mock":
        return MockTelemetrySource()
    elif normalized == "otlp":
        return OTLPTelemetrySource()
    elif normalized == "signoz":
        return SigNozTelemetrySource()
    else:
        raise ValueError(
            f"Invalid telemetry source configuration: '{raw_source}'. "
            f"Supported providers are: {sorted(list(SUPPORTED_TELEMETRY_SOURCES))}."
        )


__all__ = [
    "TelemetrySource",
    "MockTelemetrySource",
    "OTLPTelemetrySource",
    "SigNozTelemetrySource",
    "get_telemetry_source",
    "SUPPORTED_TELEMETRY_SOURCES",
]
