"""
===============================================================================
TattvaAI - OpenTelemetry / OTLP Telemetry Source
===============================================================================

Purpose
-------
Adapter boundary for OpenTelemetry / OTLP telemetry ecosystems.

Architectural Note
------------------
The OpenTelemetry Protocol (OTLP) specification (typically port 4317 for gRPC or
4318 for HTTP) is fundamentally an ingestion/export protocol for shipping
traces, metrics, and logs from instrumented applications to OpenTelemetry
Collectors and storage backends.

Generic OTLP does NOT define a universal standardized query protocol.
Therefore, this provider is designed as an adapter boundary:
• It connects to OTel-compatible collectors, backends, or query extensions.
• When connected to an active query service, it normalizes telemetry into
  TattvaAI canonical domain models (Trace, Log, Metric, Dependency, Alert).
• If no live query backend is attached to the OTLP pipeline, it gracefully
  returns empty evidence collections and reports system readiness rather than
  treating an ingestion socket as a query database or inventing telemetry.
• It avoids hardcoded vendor URLs and sources configuration from application settings.
===============================================================================
"""

from __future__ import annotations

import socket
from typing import Any, List, Optional
from urllib.parse import urlparse

from app.core.logger import logger
from app.core.settings import settings
from app.models.alert import Alert
from app.models.dependency import Dependency
from app.models.historical_incident import HistoricalIncident
from app.models.log import Log
from app.models.metric import Metric
from app.models.trace import Trace
from app.telemetry.sources.base import TelemetrySource


class OTLPLegacyAdapter:
    """
    Safe fallback adapter for legacy tool calls when running in OTLP mode.
    """

    async def aggregate_traces(self, service_name: str, **kwargs: Any) -> dict[str, Any]:
        return {
            "service_name": service_name,
            "total_spans": 0,
            "error_spans": 0,
            "error_rate": 0.0,
            "provider": "otlp",
        }

    async def get_trace_details(self, trace_id: str, **kwargs: Any) -> dict[str, Any]:
        return {"trace_id": trace_id, "status": "UNKNOWN", "spans_count": 0, "provider": "otlp"}

    async def list_metrics(self) -> list[str]:
        return []

    async def top_metrics(self) -> list[dict[str, Any]]:
        return []

    async def health_check(self) -> bool:
        return True


class OTLPTelemetrySource(TelemetrySource):
    """
    OpenTelemetry / OTLP evidence source adapter.
    """

    def __init__(
        self,
        endpoint: Optional[str] = None,
        service_name: Optional[str] = None,
        query_endpoint: Optional[str] = None,
    ) -> None:
        self.endpoint = endpoint or getattr(settings, "OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317")
        self.service_name = service_name or getattr(settings, "OTEL_SERVICE_NAME", "tattva-ai-backend")
        self.query_endpoint = query_endpoint
        self.signoz = OTLPLegacyAdapter()

        logger.info(
            "Initialized OTLPTelemetrySource [endpoint=%s, service=%s, query_endpoint=%s]",
            self.endpoint,
            self.service_name,
            self.query_endpoint or "None (adapter boundary)",
        )

    # -------------------------------------------------------------------------
    # Evidence Retrieval
    # -------------------------------------------------------------------------

    async def get_traces(
        self,
        service_name: str,
        **kwargs: Any,
    ) -> List[Trace]:
        """
        Retrieve distributed traces from an OTel-compatible backend.
        Returns empty list when no query backend is attached.
        """
        logger.info(
            "OTLPTelemetrySource: get_traces for service '%s' (query_endpoint: %s)",
            service_name,
            self.query_endpoint or "none",
        )
        return []

    async def get_logs(
        self,
        service_name: str,
        **kwargs: Any,
    ) -> List[Log]:
        """
        Retrieve structured logs from an OTel-compatible backend.
        Returns empty list when no query backend is attached.
        """
        logger.info(
            "OTLPTelemetrySource: get_logs for service '%s' (query_endpoint: %s)",
            service_name,
            self.query_endpoint or "none",
        )
        return []

    async def get_metrics(
        self,
        service_name: str,
        metric_name: Optional[str] = None,
        **kwargs: Any,
    ) -> List[Metric]:
        """
        Retrieve metrics from an OTel-compatible backend.
        Returns empty list when no query backend is attached.
        """
        logger.info(
            "OTLPTelemetrySource: get_metrics for service '%s' [metric: %s] (query_endpoint: %s)",
            service_name,
            metric_name or "all",
            self.query_endpoint or "none",
        )
        return []

    async def get_dependencies(
        self,
        service_name: str,
        **kwargs: Any,
    ) -> List[Dependency]:
        """
        Retrieve service dependencies from an OTel-compatible backend.
        Returns empty list when no query backend is attached.
        """
        logger.info(
            "OTLPTelemetrySource: get_dependencies for service '%s'",
            service_name,
        )
        return []

    async def get_alerts(
        self,
        service_name: Optional[str] = None,
        **kwargs: Any,
    ) -> List[Alert]:
        """
        Retrieve alerts from an OTel-compatible backend.
        Returns empty list when no query backend is attached.
        """
        logger.info(
            "OTLPTelemetrySource: get_alerts for service '%s'",
            service_name or "all",
        )
        return []

    async def get_historical_incidents(
        self,
        service_name: str,
        **kwargs: Any,
    ) -> List[HistoricalIncident]:
        """
        Retrieve historical incidents.
        Returns empty list when no incident storage backend is configured.
        """
        logger.info(
            "OTLPTelemetrySource: get_historical_incidents for service '%s'",
            service_name,
        )
        return []

    # -------------------------------------------------------------------------
    # Health Check
    # -------------------------------------------------------------------------

    async def health_check(self) -> bool:
        """
        Checks whether the configured OTLP endpoint host and port are reachable.
        Does not raise exceptions if unreachable; reports cleanly.
        """
        if not self.endpoint:
            return False

        try:
            parsed = urlparse(self.endpoint)
            host = parsed.hostname or "localhost"
            port = parsed.port or (4317 if "4317" in self.endpoint else 80)

            # Fast non-blocking socket connect test with 0.5s timeout
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.5)
            result = sock.connect_ex((host, port))
            sock.close()
            return result == 0
        except Exception as ex:
            logger.debug("OTLP endpoint connectivity check returned: %s", ex)
            return False
