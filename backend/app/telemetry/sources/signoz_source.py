"""
===============================================================================
TattvaAI - SigNoz Telemetry Source Provider
===============================================================================

Purpose
-------
SigNoz-specific provider implementing the TelemetrySource interface.
Encapsulates MCP/SigNoz API querying and normalizes responses into canonical
domain models.

Preserves complete existing SigNoz functionality behind the provider boundary.
===============================================================================
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any, List, Optional

from mcp.types import TextContent

from app.core.logger import logger
from app.models.alert import Alert
from app.models.dependency import Dependency
from app.models.historical_incident import HistoricalIncident
from app.models.log import Log
from app.models.metric import Metric
from app.models.trace import Trace
from app.signoz.telemetry_service import TelemetryService as SigNozTelemetryService
from app.telemetry.sources.base import TelemetrySource


class SigNozTelemetrySource(TelemetrySource):
    """
    SigNoz telemetry provider.
    Retrieves telemetry from SigNoz and normalizes into canonical domain objects.
    """

    def __init__(self, service: Optional[SigNozTelemetryService] = None) -> None:
        self.signoz = service or SigNozTelemetryService()
        logger.info("Initialized SigNozTelemetrySource provider")

    # =========================================================================
    # Helpers
    # =========================================================================

    def _extract_payload(self, raw: Any) -> dict:
        if isinstance(raw, dict):
            return raw

        if isinstance(raw, str):
            try:
                payload = json.loads(raw)
                return payload if isinstance(payload, dict) else {}
            except json.JSONDecodeError:
                return {}

        logger.debug("RAW MCP RESPONSE TYPE: %s", type(raw))

        if hasattr(raw, "content"):
            for item in raw.content:
                if isinstance(item, TextContent):
                    try:
                        return json.loads(item.text)
                    except Exception:
                        logger.exception("Unable to parse MCP response content.")

        return {}

    # =========================================================================
    # Traces
    # =========================================================================

    async def get_traces(
        self,
        service_name: str,
        **kwargs: Any,
    ) -> List[Trace]:
        raw = await self.signoz.search_traces(
            service_name,
            **kwargs,
        )

        payload = self._extract_payload(raw)

        rows = (
            payload.get("data", {})
            .get("data", {})
            .get("results", [{}])[0]
            .get("rows", [])
        )

        traces: List[Trace] = []

        for row in rows:
            data = row.get("data", {})
            status_code = (
                int(data.get("response_status_code", 0))
                if data.get("response_status_code")
                else None
            )

            traces.append(
                Trace(
                    trace_id=data.get("trace_id", ""),
                    span_id=data.get("span_id"),
                    service_name=data.get("service.name", service_name or "Unknown"),
                    operation_name=data.get("name", ""),
                    endpoint=data.get("name", ""),
                    http_method=(
                        data.get("http_method")
                        or data.get("http.request.method")
                    ),
                    duration_ms=round(
                        data.get("duration_nano", 0) / 1_000_000,
                        2,
                    ),
                    status_code=status_code,
                    status=str(data.get("response_status_code", "")),
                    timestamp=datetime.utcnow(),
                )
            )

        logger.info("SigNozTelemetrySource: Loaded %d traces", len(traces))
        return traces

    # =========================================================================
    # Logs
    # =========================================================================

    async def get_logs(
        self,
        service_name: str,
        **kwargs: Any,
    ) -> List[Log]:
        raw = await self.signoz.search_logs(
            service_name,
            **kwargs,
        )

        payload = self._extract_payload(raw)
        results = payload.get("data", {}).get("data", {}).get("results")
        rows = results[0].get("rows", []) if results else []

        logs: List[Log] = []

        for row in rows:
            data = row.get("data", {})
            logs.append(
                Log(
                    log_id=data.get("id"),
                    trace_id=data.get("trace_id"),
                    span_id=data.get("span_id"),
                    service_name=(
                        data.get("resources_string", {}).get(
                            "service.name",
                            service_name or "Unknown",
                        )
                    ),
                    severity=data.get("severity_text", "INFO"),
                    message=data.get("body", ""),
                    timestamp=datetime.utcnow(),
                )
            )

        logger.info("SigNozTelemetrySource: Loaded %d logs", len(logs))
        return logs

    # =========================================================================
    # Metrics
    # =========================================================================

    async def get_metrics(
        self,
        service_name: str,
        metric_name: Optional[str] = None,
        **kwargs: Any,
    ) -> List[Metric]:
        target_metric = metric_name or "response_time"
        raw = await self.signoz.query_metrics(
            service_name,
            target_metric,
            **kwargs,
        )

        payload = self._extract_payload(raw)
        results = payload.get("data", {}).get("data", {}).get("results", [])

        metrics: List[Metric] = []
        if not results:
            return metrics

        aggregations = results[0].get("aggregations", [])
        if not aggregations:
            return metrics

        series = aggregations[0].get("series", [])
        if not series:
            return metrics

        for point in series[0].get("values", []):
            metrics.append(
                Metric(
                    metric_name=target_metric,
                    service_name=service_name,
                    value=point.get("value", 0),
                    timestamp=datetime.utcnow(),
                )
            )

        logger.info("SigNozTelemetrySource: Loaded %d metrics", len(metrics))
        return metrics

    # =========================================================================
    # Dependencies
    # =========================================================================

    async def get_dependencies(
        self,
        service_name: str,
        **kwargs: Any,
    ) -> List[Dependency]:
        raw = await self.signoz.get_dependencies(
            service_name,
            **kwargs,
        )

        payload = self._extract_payload(raw)
        rows = payload.get("dependencies", [])

        dependencies: List[Dependency] = []
        for item in rows:
            dependencies.append(
                Dependency(
                    source_service=item.get("source", service_name),
                    target_service=item.get("target", ""),
                    average_latency_ms=item.get("latency_ms", 0),
                    error_rate=item.get("error_rate", 0),
                )
            )

        logger.info("SigNozTelemetrySource: Loaded %d dependencies", len(dependencies))
        return dependencies

    # =========================================================================
    # Alerts
    # =========================================================================

    async def get_alerts(
        self,
        service_name: Optional[str] = None,
        **kwargs: Any,
    ) -> List[Alert]:
        raw = await self.signoz.gateway.list_alerts()
        payload = self._extract_payload(raw)

        alerts: List[Alert] = []
        for item in payload.get("alerts", []):
            alert_service = item.get("service", "Unknown")
            if service_name and alert_service.lower() != service_name.lower():
                continue

            alerts.append(
                Alert(
                    alert_id=item.get("id", ""),
                    name=item.get("name", ""),
                    service_name=alert_service,
                    severity=item.get("severity", "LOW"),
                    status=item.get("status", "UNKNOWN"),
                )
            )

        logger.info("SigNozTelemetrySource: Loaded %d alerts", len(alerts))
        return alerts

    # =========================================================================
    # Historical Incidents
    # =========================================================================

    async def get_historical_incidents(
        self,
        service_name: str,
        **kwargs: Any,
    ) -> List[HistoricalIncident]:
        incidents = await self.signoz.get_historical_incidents_as_models(
            service_name=service_name,
            **kwargs,
        )
        logger.info("SigNozTelemetrySource: Retrieved %d historical incidents", len(incidents))
        return incidents

    # =========================================================================
    # Health Check
    # =========================================================================

    async def health_check(self) -> bool:
        return await self.signoz.health_check()
