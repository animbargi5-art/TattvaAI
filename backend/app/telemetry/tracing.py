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

from app.core.settings import settings


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

        print("✅ OpenTelemetry initialized in PRODUCTION MODE")

    # -----------------------------
    # Common Instrumentation 
    # -----------------------------
    
    LoggingInstrumentor().instrument(
        set_logging_format=True
    )

    FastAPIInstrumentor.instrument_app(app)
    RequestsInstrumentor().instrument()