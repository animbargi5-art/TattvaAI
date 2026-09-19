from opentelemetry import trace, metrics
from opentelemetry._logs import set_logger_provider

from opentelemetry.sdk.resources import Resource

from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import (
    PeriodicExportingMetricReader,
)

from opentelemetry.sdk._logs import LoggerProvider
from opentelemetry.sdk._logs.export import (
    BatchLogRecordProcessor,
)

from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import (
    OTLPSpanExporter,
)

from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import (
    OTLPMetricExporter,
)

# ⭐ THIS IMPORT WAS MISSING
from opentelemetry.exporter.otlp.proto.grpc._log_exporter import (
    OTLPLogExporter,
)

from opentelemetry.instrumentation.fastapi import (
    FastAPIInstrumentor,
)

from opentelemetry.instrumentation.requests import (
    RequestsInstrumentor,
)

from opentelemetry.instrumentation.logging import (
    LoggingInstrumentor,
)

import time
from contextlib import contextmanager
from typing import Any, Dict, List, Optional

from app.core.settings import settings
from app.core.logger import logger


def setup_tracing(app):

    resource = Resource.create(
        {
            "service.name": settings.OTEL_SERVICE_NAME,
        }
    )

    # In demo mode, use console exporters instead of OTLP
    if settings.DEMO_MODE:
        print("[INFO] Running in DEMO MODE - Using console exporters for telemetry")

        # Import console exporters
        from opentelemetry.sdk.trace.export import ConsoleSpanExporter
        from opentelemetry.sdk.metrics.export import ConsoleMetricExporter
        from opentelemetry.sdk._logs.export import ConsoleLogExporter

        # -----------------------------
        # Tracing (Console)
        # -----------------------------
        tracer_provider = TracerProvider(resource=resource)
        console_trace_exporter = ConsoleSpanExporter()
        tracer_provider.add_span_processor(BatchSpanProcessor(console_trace_exporter))
        trace.set_tracer_provider(tracer_provider)

        # -----------------------------
        # Metrics (Console)
        # -----------------------------
        console_metric_exporter = ConsoleMetricExporter()
        metric_reader = PeriodicExportingMetricReader(console_metric_exporter)
        meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
        metrics.set_meter_provider(meter_provider)

        # -----------------------------
        # Logs (Console)
        # -----------------------------
        console_log_exporter = ConsoleLogExporter()
        logger_provider = LoggerProvider(resource=resource)
        logger_provider.add_log_record_processor(BatchLogRecordProcessor(console_log_exporter))
        set_logger_provider(logger_provider)

        print("[OK] OpenTelemetry initialized in DEMO MODE (Console exporters)")

    else:
        # Production mode with OTLP exporters
        print("[INFO] Running in PRODUCTION MODE - Using OTLP exporters")

        # -----------------------------
        # Tracing
        # -----------------------------

        tracer_provider = TracerProvider(
            resource=resource
        )

        trace_exporter = OTLPSpanExporter(
            endpoint=settings.OTEL_EXPORTER_OTLP_ENDPOINT,
            insecure=True,
        )

        tracer_provider.add_span_processor(
            BatchSpanProcessor(trace_exporter)
        )

        trace.set_tracer_provider(tracer_provider)

        # -----------------------------
        # Metrics
        # -----------------------------

        metric_exporter = OTLPMetricExporter(
            endpoint=settings.OTEL_EXPORTER_OTLP_ENDPOINT,
            insecure=True,
        )

        metric_reader = PeriodicExportingMetricReader(
            metric_exporter
        )

        meter_provider = MeterProvider(
            resource=resource,
            metric_readers=[metric_reader],
        )

        metrics.set_meter_provider(
            meter_provider
        )

        # -----------------------------
        # Logs
        # -----------------------------

        log_exporter = OTLPLogExporter(
            endpoint=settings.OTEL_EXPORTER_OTLP_ENDPOINT,
            insecure=True,
        )

        logger_provider = LoggerProvider(
            resource=resource,
        )

        logger_provider.add_log_record_processor(
            BatchLogRecordProcessor(
                log_exporter
            )
        )

        set_logger_provider(
            logger_provider
        )

        print("[OK] OpenTelemetry initialized in PRODUCTION MODE")

    # -----------------------------
    # Common Instrumentation
    # -----------------------------

    LoggingInstrumentor().instrument(
        set_logging_format=True
    )

    FastAPIInstrumentor.instrument_app(app)
    RequestsInstrumentor().instrument()


# =============================================================================
# Agent Observability & Tracing
# =============================================================================

class AgentTracer:
    """
    Tracer for AI investigation agents integrating with OpenTelemetry.
    Provides methods to trace agent execution spans, investigation milestones,
    LLM API calls, evidence collection, and agent decisions.
    """

    def __init__(self, investigation_id: str):
        self.investigation_id = investigation_id
        self.tracer = trace.get_tracer("tattvaai.agent")

    @contextmanager
    def trace_agent_execution(
        self,
        agent_name: str,
        operation_name: str = "investigate",
        metadata: Optional[Dict[str, Any]] = None,
    ):
        """
        Context manager for tracing agent execution span.
        """
        span_name = f"{agent_name}.{operation_name}"
        with self.tracer.start_as_current_span(span_name) as span:
            span.set_attribute("investigation_id", self.investigation_id)
            span.set_attribute("agent.name", agent_name)
            span.set_attribute("agent.operation", operation_name)
            if metadata:
                for k, v in metadata.items():
                    if isinstance(v, (str, int, float, bool)):
                        span.set_attribute(f"metadata.{k}", v)
                    else:
                        span.set_attribute(f"metadata.{k}", str(v))
            try:
                yield span
            except Exception as e:
                span.record_exception(e)
                span.set_status(trace.StatusCode.ERROR, str(e))
                raise

    def trace_investigation_milestone(
        self,
        milestone: str,
        progress_percentage: float,
        evidence_collected: int,
        confidence_score: float,
        time_elapsed_ms: float,
    ) -> None:
        """Record an investigation milestone event."""
        span = trace.get_current_span()
        attrs = {
            "investigation_id": self.investigation_id,
            "milestone": milestone,
            "progress_percentage": progress_percentage,
            "evidence_collected": evidence_collected,
            "confidence_score": confidence_score,
            "time_elapsed_ms": time_elapsed_ms,
        }
        if span and span.is_recording():
            span.add_event(f"milestone.{milestone}", attributes=attrs)
        else:
            logger.debug(f"[Milestone] {attrs}")

    def create_agent_decision(
        self,
        agent_role: str,
        reasoning: str,
        confidence: float,
        evidence: List[str],
        alternatives_considered: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Create a structured agent decision record."""
        return {
            "agent_role": agent_role,
            "reasoning": reasoning,
            "confidence": confidence,
            "evidence": evidence,
            "alternatives_considered": alternatives_considered or [],
            "investigation_id": self.investigation_id,
            "timestamp": time.time(),
        }

    def trace_agent_decision(self, decision: Dict[str, Any]) -> None:
        """Record an agent decision as a span event."""
        span = trace.get_current_span()
        attrs = {
            "investigation_id": self.investigation_id,
            "decision.agent_role": decision.get("agent_role", ""),
            "decision.reasoning": decision.get("reasoning", ""),
            "decision.confidence": decision.get("confidence", 0.0),
            "decision.evidence_count": len(decision.get("evidence", [])),
        }
        if span and span.is_recording():
            span.add_event("agent_decision", attributes=attrs)
        else:
            logger.debug(f"[Agent Decision] {attrs}")

    def trace_llm_call(
        self,
        model: str,
        prompt_tokens: int,
        completion_tokens: int,
        latency_ms: float,
        cost_usd: float,
        success: bool = True,
        error_message: Optional[str] = None,
        agent_role: str = "",
    ) -> None:
        """Record an LLM API call event and metrics."""
        span = trace.get_current_span()
        attrs = {
            "investigation_id": self.investigation_id,
            "llm.model": model,
            "llm.prompt_tokens": prompt_tokens,
            "llm.completion_tokens": completion_tokens,
            "llm.latency_ms": latency_ms,
            "llm.cost_usd": cost_usd,
            "llm.success": success,
            "llm.agent_role": agent_role,
        }
        if error_message:
            attrs["llm.error_message"] = error_message
        if span and span.is_recording():
            span.add_event("llm_call", attributes=attrs)
        else:
            logger.debug(f"[LLM Call] {attrs}")

    def trace_evidence_collection(
        self,
        evidence_type: str,
        evidence_count: int,
        source: str,
        query_time_ms: float,
        confidence: float,
    ) -> None:
        """Record evidence collection event."""
        span = trace.get_current_span()
        attrs = {
            "investigation_id": self.investigation_id,
            "evidence.type": evidence_type,
            "evidence.count": evidence_count,
            "evidence.source": source,
            "evidence.query_time_ms": query_time_ms,
            "evidence.confidence": confidence,
        }
        if span and span.is_recording():
            span.add_event("evidence_collection", attributes=attrs)
        else:
            logger.debug(f"[Evidence Collection] {attrs}")


def create_agent_tracer(investigation_id: str) -> AgentTracer:
    """Create an AgentTracer instance for an investigation."""
    return AgentTracer(investigation_id)


# Backward compatibility alias
create_agent_trace = create_agent_tracer