"""
===============================================================================
TattvaAI - Mock / Synthetic Telemetry Source
===============================================================================

Purpose
-------
Provides deterministic, synthetic telemetry evidence for offline testing, local
development, and product demonstrations without requiring external observability
backends or live credentials.

Target Scenario
---------------
"Payments API is experiencing elevated failures."
Demonstrates realistic relationships between:
• HTTP 504 / 500 failed traces with high latency (2850ms)
• Correlated timeout and connection pool exhaustion logs
• Elevated P95 response time and error rate metrics
• Upstream bank-gateway dependency degradation (25% error rate, 2450ms latency)
• Active critical alerts for payment gateway timeouts
• Historical incidents with similar root causes (INC-HIST-082)

NOTE: This mock provider is strictly for offline testing and demo mode.
===============================================================================
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, List, Optional

from app.core.logger import logger
from app.models.alert import Alert
from app.models.dependency import Dependency
from app.models.historical_incident import HistoricalIncident
from app.models.log import Log
from app.models.metric import Metric
from app.models.trace import Trace
from app.telemetry.sources.base import TelemetrySource


class MockLegacySignozAdapter:
    """
    Adapter providing backward-compatible methods for tools that historically
    accessed signoz-specific helper functions (e.g. aggregate_traces, list_metrics).
    """

    async def aggregate_traces(self, service_name: str, **kwargs: Any) -> dict[str, Any]:
        return {
            "service_name": service_name,
            "total_spans": 5,
            "error_spans": 3,
            "error_rate": 0.60,
            "p95_latency_ms": 2850.0,
            "p99_latency_ms": 3100.0,
            "is_mock": True,
        }

    async def get_trace_details(self, trace_id: str, **kwargs: Any) -> dict[str, Any]:
        return {
            "trace_id": trace_id,
            "status": "ERROR" if "err" in trace_id or "50" in trace_id else "OK",
            "spans_count": 4,
            "is_mock": True,
        }

    async def list_metrics(self) -> list[str]:
        return [
            "response_time",
            "error_rate",
            "request_count",
            "cpu_utilization",
            "memory_utilization",
            "db_connection_pool_active",
        ]

    async def top_metrics(self) -> list[dict[str, Any]]:
        return [
            {"name": "response_time", "p95": 2850.0, "unit": "ms"},
            {"name": "error_rate", "value": 0.25, "unit": "ratio"},
            {"name": "request_count", "value": 1250, "unit": "requests"},
        ]

    async def health_check(self) -> bool:
        return True


class MockTelemetrySource(TelemetrySource):
    """
    Synthetic evidence provider generating deterministic signals for the
    payment-service failure scenario.
    """

    def __init__(self) -> None:
        self.signoz = MockLegacySignozAdapter()
        logger.info("Initialized MockTelemetrySource (deterministic offline evidence)")

    # -------------------------------------------------------------------------
    # Traces
    # -------------------------------------------------------------------------

    async def get_traces(
        self,
        service_name: str,
        **kwargs: Any,
    ) -> List[Trace]:
        """
        Return deterministic trace data showing elevated latency and HTTP 500/504
        failures for payment transactions.
        """
        now = datetime.utcnow()
        target_service = service_name or "payment-service"

        traces: List[Trace] = [
            Trace(
                trace_id="mock-trace-pay-504-01",
                span_id="span-pay-01-root",
                service_name=target_service,
                operation_name=f"POST /{target_service}/api/v1/payments/process",
                endpoint=f"/{target_service}/api/v1/payments/process",
                http_method="POST",
                span_kind="SERVER",
                duration_ms=2850.0,
                status_code=504,
                status="ERROR",
                error_message="Gateway timeout: upstream banking partner timed out after 2500ms",
                timestamp=now - timedelta(minutes=2),
                attributes={
                    "http.method": "POST",
                    "http.route": f"/{target_service}/api/v1/payments/process",
                    "http.status_code": "504",
                    "error": "true",
                    "payment.provider": "bank-gateway",
                    "demo.scenario": "elevated_failures",
                },
            ),
            Trace(
                trace_id="mock-trace-pay-500-02",
                span_id="span-pay-02-root",
                service_name=target_service,
                operation_name=f"POST /{target_service}/api/v1/payments/process",
                endpoint=f"/{target_service}/api/v1/payments/process",
                http_method="POST",
                span_kind="SERVER",
                duration_ms=3100.0,
                status_code=500,
                status="ERROR",
                error_message="Connection pool exhausted waiting for bank-gateway response",
                timestamp=now - timedelta(minutes=4),
                attributes={
                    "http.method": "POST",
                    "http.route": f"/{target_service}/api/v1/payments/process",
                    "http.status_code": "500",
                    "error": "true",
                    "db.pool.exhausted": "true",
                    "demo.scenario": "elevated_failures",
                },
            ),
            Trace(
                trace_id="mock-trace-pay-200-03",
                span_id="span-pay-03-root",
                service_name=target_service,
                operation_name=f"GET /{target_service}/health",
                endpoint=f"/{target_service}/health",
                http_method="GET",
                span_kind="SERVER",
                duration_ms=18.5,
                status_code=200,
                status="OK",
                timestamp=now - timedelta(minutes=6),
                attributes={
                    "http.method": "GET",
                    "http.route": f"/{target_service}/health",
                    "http.status_code": "200",
                    "demo.scenario": "elevated_failures",
                },
            ),
            Trace(
                trace_id="mock-trace-pay-200-04",
                span_id="span-pay-04-root",
                service_name=target_service,
                operation_name=f"POST /{target_service}/api/v1/payments/refund",
                endpoint=f"/{target_service}/api/v1/payments/refund",
                http_method="POST",
                span_kind="SERVER",
                duration_ms=185.0,
                status_code=200,
                status="OK",
                timestamp=now - timedelta(minutes=8),
                attributes={
                    "http.method": "POST",
                    "http.route": f"/{target_service}/api/v1/payments/refund",
                    "http.status_code": "200",
                    "demo.scenario": "elevated_failures",
                },
            ),
            Trace(
                trace_id="mock-trace-pay-504-05",
                span_id="span-pay-05-root",
                service_name=target_service,
                operation_name=f"POST /{target_service}/api/v1/payments/process",
                endpoint=f"/{target_service}/api/v1/payments/process",
                http_method="POST",
                span_kind="SERVER",
                duration_ms=2650.0,
                status_code=504,
                status="ERROR",
                error_message="Gateway timeout: upstream banking partner timed out after 2500ms",
                timestamp=now - timedelta(minutes=10),
                attributes={
                    "http.method": "POST",
                    "http.route": f"/{target_service}/api/v1/payments/process",
                    "http.status_code": "504",
                    "error": "true",
                    "payment.provider": "bank-gateway",
                    "demo.scenario": "elevated_failures",
                },
            ),
        ]

        logger.info("MockTelemetrySource: generated %d deterministic traces for %s", len(traces), target_service)
        return traces

    # -------------------------------------------------------------------------
    # Logs
    # -------------------------------------------------------------------------

    async def get_logs(
        self,
        service_name: str,
        **kwargs: Any,
    ) -> List[Log]:
        """
        Return deterministic log records with matching trace correlation and
        timeout exceptions.
        """
        now = datetime.utcnow()
        target_service = service_name or "payment-service"

        logs: List[Log] = [
            Log(
                log_id="mock-log-01",
                trace_id="mock-trace-pay-504-01",
                span_id="span-pay-01-root",
                service_name=target_service,
                severity="ERROR",
                message="Connection timeout to bank-gateway: Failed to obtain payment authorization within 2500ms for order_id=ord_98432",
                exception_type="GatewayTimeoutException",
                exception_message="Upstream bank gateway timed out after 2500ms",
                timestamp=now - timedelta(minutes=2),
                attributes={
                    "component": "PaymentClient",
                    "target.host": "bank-gateway.partner.net",
                    "order.id": "ord_98432",
                    "demo.scenario": "elevated_failures",
                },
            ),
            Log(
                log_id="mock-log-02",
                trace_id="mock-trace-pay-500-02",
                span_id="span-pay-02-root",
                service_name=target_service,
                severity="ERROR",
                message="HTTP 500: Connection pool exhausted while dispatching payment request to bank-gateway (active_connections=50/50)",
                exception_type="ConnectionPoolExhaustedException",
                exception_message="No connections available in pool for host bank-gateway",
                timestamp=now - timedelta(minutes=4),
                attributes={
                    "component": "HttpConnectionPool",
                    "pool.active": "50",
                    "pool.max": "50",
                    "demo.scenario": "elevated_failures",
                },
            ),
            Log(
                log_id="mock-log-03",
                trace_id="mock-trace-pay-504-05",
                span_id="span-pay-05-root",
                service_name=target_service,
                severity="WARN",
                message="High latency warning: Upstream bank-gateway p99 response time exceeded 2500ms threshold",
                timestamp=now - timedelta(minutes=10),
                attributes={
                    "component": "LatencyMonitor",
                    "p99_ms": "2850",
                    "demo.scenario": "elevated_failures",
                },
            ),
            Log(
                log_id="mock-log-04",
                trace_id="mock-trace-pay-200-03",
                span_id="span-pay-03-root",
                service_name=target_service,
                severity="INFO",
                message="Health check succeeded. All local processes healthy.",
                timestamp=now - timedelta(minutes=6),
                attributes={
                    "component": "HealthCheckHandler",
                    "status": "UP",
                    "demo.scenario": "elevated_failures",
                },
            ),
            Log(
                log_id="mock-log-05",
                trace_id="mock-trace-pay-200-04",
                span_id="span-pay-04-root",
                service_name=target_service,
                severity="INFO",
                message="Refund processed successfully for order_id=ord_98120 amount=$49.99",
                timestamp=now - timedelta(minutes=8),
                attributes={
                    "component": "RefundHandler",
                    "order.id": "ord_98120",
                    "demo.scenario": "elevated_failures",
                },
            ),
        ]

        logger.info("MockTelemetrySource: generated %d deterministic logs for %s", len(logs), target_service)
        return logs

    # -------------------------------------------------------------------------
    # Metrics
    # -------------------------------------------------------------------------

    async def get_metrics(
        self,
        service_name: str,
        metric_name: Optional[str] = None,
        **kwargs: Any,
    ) -> List[Metric]:
        """
        Return operational metric points reflecting the degraded payment scenario.
        """
        now = datetime.utcnow()
        target_service = service_name or "payment-service"
        metric_key = (metric_name or "response_time").lower()

        metrics: List[Metric] = []

        if "error" in metric_key or "fail" in metric_key:
            for i in range(5):
                metrics.append(
                    Metric(
                        metric_name="error_rate",
                        value=0.25 - (i * 0.03),
                        unit="ratio",
                        metric_type="Gauge",
                        aggregation="avg",
                        service_name=target_service,
                        labels={"endpoint": "/api/v1/payments/process"},
                        warning_threshold=0.05,
                        critical_threshold=0.15,
                        baseline=0.01,
                        timestamp=now - timedelta(minutes=i * 2),
                    )
                )
        elif "request" in metric_key or "count" in metric_key:
            for i in range(5):
                metrics.append(
                    Metric(
                        metric_name="request_count",
                        value=1250.0 - (i * 50),
                        unit="requests",
                        metric_type="Counter",
                        aggregation="sum",
                        service_name=target_service,
                        labels={"endpoint": "/api/v1/payments/process"},
                        timestamp=now - timedelta(minutes=i * 2),
                    )
                )
        else:
            # Default response_time / latency metrics
            for i in range(5):
                metrics.append(
                    Metric(
                        metric_name="response_time",
                        value=2850.0 - (i * 120.0),
                        unit="ms",
                        metric_type="Histogram",
                        aggregation="p95",
                        service_name=target_service,
                        labels={"endpoint": "/api/v1/payments/process"},
                        warning_threshold=500.0,
                        critical_threshold=1000.0,
                        baseline=120.0,
                        timestamp=now - timedelta(minutes=i * 2),
                    )
                )

        logger.info(
            "MockTelemetrySource: generated %d deterministic metrics (%s) for %s",
            len(metrics),
            metric_key,
            target_service,
        )
        return metrics

    # -------------------------------------------------------------------------
    # Dependencies
    # -------------------------------------------------------------------------

    async def get_dependencies(
        self,
        service_name: str,
        **kwargs: Any,
    ) -> List[Dependency]:
        """
        Return service topology demonstrating elevated error rate and high latency
        to the upstream bank-gateway.
        """
        target_service = service_name or "payment-service"

        dependencies: List[Dependency] = [
            Dependency(
                dependency_id=f"dep-{target_service}-bank-gateway",
                source_service=target_service,
                target_service="bank-gateway",
                relationship="calls",
                request_count=450,
                success_count=338,
                error_count=112,
                error_rate=0.248,
                average_latency_ms=2450.0,
                p50_latency_ms=2100.0,
                p95_latency_ms=2850.0,
                p99_latency_ms=3100.0,
                protocol="HTTP",
                environment="demo",
            ),
            Dependency(
                dependency_id=f"dep-{target_service}-order-service",
                source_service=target_service,
                target_service="order-service",
                relationship="calls",
                request_count=520,
                success_count=515,
                error_count=5,
                error_rate=0.009,
                average_latency_ms=42.0,
                p50_latency_ms=35.0,
                p95_latency_ms=75.0,
                p99_latency_ms=88.0,
                protocol="HTTP",
                environment="demo",
            ),
            Dependency(
                dependency_id=f"dep-{target_service}-postgres-payments",
                source_service=target_service,
                target_service="postgres-payments",
                relationship="queries",
                request_count=1800,
                success_count=1800,
                error_count=0,
                error_rate=0.0,
                average_latency_ms=12.5,
                p50_latency_ms=10.0,
                p95_latency_ms=22.0,
                p99_latency_ms=30.0,
                protocol="TCP",
                environment="demo",
            ),
        ]

        logger.info(
            "MockTelemetrySource: generated %d deterministic dependencies for %s",
            len(dependencies),
            target_service,
        )
        return dependencies

    # -------------------------------------------------------------------------
    # Alerts
    # -------------------------------------------------------------------------

    async def get_alerts(
        self,
        service_name: Optional[str] = None,
        **kwargs: Any,
    ) -> List[Alert]:
        """
        Return active firing alerts for payment gateway timeout and error thresholds.
        """
        now = datetime.utcnow()
        target_service = service_name or "payment-service"

        alerts: List[Alert] = [
            Alert(
                alert_id="mock-alert-pay-01",
                name="PaymentGatewayTimeoutHigh",
                rule_name="payment_gateway_latency_rule",
                service_name=target_service,
                severity="CRITICAL",
                status="FIRING",
                summary=f"Upstream bank-gateway latency exceeded 2500ms in {target_service}",
                description="Upstream bank gateway response time exceeded 2500ms for > 15% of transactions over 5m window",
                source="synthetic-monitor",
                fired_at=now - timedelta(minutes=25),
                last_updated=now - timedelta(minutes=2),
                labels={
                    "alertname": "PaymentGatewayTimeoutHigh",
                    "service": target_service,
                    "target": "bank-gateway",
                    "severity": "CRITICAL",
                },
            ),
            Alert(
                alert_id="mock-alert-pay-02",
                name="PaymentFailureRateHigh",
                rule_name="payment_failure_rate_rule",
                service_name=target_service,
                severity="HIGH",
                status="FIRING",
                summary=f"Error rate for {target_service} exceeds 20%",
                description="HTTP 5xx failure rate for POST /api/v1/payments/process exceeded 20% over 5m window",
                source="synthetic-monitor",
                fired_at=now - timedelta(minutes=18),
                last_updated=now - timedelta(minutes=3),
                labels={
                    "alertname": "PaymentFailureRateHigh",
                    "service": target_service,
                    "severity": "HIGH",
                },
            ),
        ]

        logger.info("MockTelemetrySource: generated %d deterministic alerts for %s", len(alerts), target_service)
        return alerts

    # -------------------------------------------------------------------------
    # Historical Incidents
    # -------------------------------------------------------------------------

    async def get_historical_incidents(
        self,
        service_name: str,
        **kwargs: Any,
    ) -> List[HistoricalIncident]:
        """
        Return historical incidents with matching failure patterns.
        """
        target_service = service_name or "payment-service"
        resolved_at = datetime.utcnow() - timedelta(days=14)

        return [
            HistoricalIncident(
                incident_id="INC-HIST-082",
                title=f"Upstream bank-gateway latency spike leading to payment timeouts in {target_service}",
                service_name=target_service,
                endpoint="/api/v1/payments/process",
                operation="POST /api/v1/payments/process",
                environment="production",
                severity="HIGH",
                status="RESOLVED",
                root_cause="Upstream banking partner gateway experienced database lock contention, causing API timeouts and connection pool starvation in payment-service.",
                resolution="Configured aggressive circuit breaker (trip at 10% errors) and increased downstream socket timeout from 2.5s to 4s with exponential backoff.",
                confidence=92,
                similarity_score=0.91,
                occurrence_count=2,
                resolved_by="SRE Incident Team",
                previous_recommendation="Trip circuit breaker to fail fast and divert traffic to secondary payment provider.",
                started_at=resolved_at - timedelta(hours=3),
                resolved_at=resolved_at,
                tags=[target_service, "bank-gateway", "timeout", "circuit-breaker"],
                metadata={"scenario": "elevated_failures", "source": "synthetic_knowledge_base"},
            )
        ]

    # -------------------------------------------------------------------------
    # Health Check
    # -------------------------------------------------------------------------

    async def health_check(self) -> bool:
        """
        Mock source is always available.
        """
        return True
