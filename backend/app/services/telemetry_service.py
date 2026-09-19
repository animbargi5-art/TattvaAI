"""
===============================================================================
TattvaAI - Application Telemetry Service
===============================================================================

Purpose
-------
Vendor-neutral telemetry application service. Decoupled from any single observability
backend by delegating to a configured TelemetrySource provider (Mock, OTLP, SigNoz).

Responsibilities
----------------
• Provide a unified telemetry query interface for investigation tools and agents
• Delegate data retrieval to the configured TelemetrySource implementation
• Preserve backward compatibility for existing tools and pipeline agents
• Avoid hardcoded vendor dependencies in the core investigation workflow

Architecture
------------
Investigation Tools (TraceTool, LogsTool, MetricsTool, etc.)
       ↓
Application Telemetry Service (TelemetryService)
       ↓
TelemetrySource Abstraction
   ├── MockTelemetrySource (offline/deterministic demo evidence)
   ├── OTLPTelemetrySource (OpenTelemetry collector/backend boundary)
   └── SigNozTelemetrySource (SigNoz MCP provider)
===============================================================================
"""

from __future__ import annotations

from typing import Any, List, Optional

from app.core.logger import logger
from app.models.alert import Alert
from app.models.dependency import Dependency
from app.models.historical_incident import HistoricalIncident
from app.models.log import Log
from app.models.metric import Metric
from app.models.trace import Trace
from app.telemetry.sources import TelemetrySource, get_telemetry_source


class TelemetryService:
    """
    Core application telemetry service.
    Delegates to the active TelemetrySource provider dynamically based on runtime context.
    """

    def __init__(self, source: Optional[TelemetrySource] = None) -> None:
        self._explicit_source: Optional[TelemetrySource] = source

    @property
    def source(self) -> TelemetrySource:
        """Resolve current active TelemetrySource dynamically per investigation."""
        if self._explicit_source is not None:
            return self._explicit_source
        active_source = get_telemetry_source()
        return active_source

    @property
    def signoz(self) -> Any:
        """
        Backward-compatible access to the provider's underlying signoz adapter/service.
        Allows existing tools with legacy helper calls to function seamlessly.
        """
        return getattr(self.source, "signoz", self.source)

    # =========================================================================
    # Traces
    # =========================================================================

    async def get_traces(
        self,
        service_name: str,
        **kwargs: Any,
    ) -> List[Trace]:
        """
        Retrieve distributed traces for the target service.
        """
        return await self.source.get_traces(
            service_name=service_name,
            **kwargs,
        )

    # =========================================================================
    # Logs
    # =========================================================================

    async def get_logs(
        self,
        service_name: str,
        **kwargs: Any,
    ) -> List[Log]:
        """
        Retrieve structured logs for the target service.
        """
        return await self.source.get_logs(
            service_name=service_name,
            **kwargs,
        )

    # =========================================================================
    # Metrics
    # =========================================================================

    async def get_metrics(
        self,
        service_name: str,
        metric_name: Optional[str] = "response_time",
        **kwargs: Any,
    ) -> List[Metric]:
        """
        Retrieve operational metrics for the target service.
        """
        return await self.source.get_metrics(
            service_name=service_name,
            metric_name=metric_name,
            **kwargs,
        )

    # =========================================================================
    # Dependencies
    # =========================================================================

    async def get_dependencies(
        self,
        service_name: str,
        **kwargs: Any,
    ) -> List[Dependency]:
        """
        Retrieve service topology and dependency health.
        """
        return await self.source.get_dependencies(
            service_name=service_name,
            **kwargs,
        )

    # =========================================================================
    # Alerts
    # =========================================================================

    async def get_alerts(
        self,
        service_name: Optional[str] = None,
        **kwargs: Any,
    ) -> List[Alert]:
        """
        Retrieve active alerts.
        """
        return await self.source.get_alerts(
            service_name=service_name,
            **kwargs,
        )

    # =========================================================================
    # Historical Incidents
    # =========================================================================

    async def get_historical_incidents(
        self,
        service_name: str,
        **kwargs: Any,
    ) -> List[HistoricalIncident]:
        """
        Retrieve historical incidents for the target service.
        """
        return await self.source.get_historical_incidents(
            service_name=service_name,
            **kwargs,
        )

    # =========================================================================
    # Health Check
    # =========================================================================

    async def health_check(self) -> bool:
        """
        Verify telemetry provider availability.
        """
        return await self.source.health_check()
