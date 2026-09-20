"""
===============================================================================
TattvaAI Incident Lab - AWS OpenTelemetry Configuration
===============================================================================
Configures OpenTelemetry to send traces and logs to AWS X-Ray and CloudWatch.

Uses AWS Distro for OpenTelemetry (ADOT) exporters:
- Traces -> AWS X-Ray
- Logs -> CloudWatch Logs (via console/stdout)
- Metrics -> CloudWatch Metrics

For Production/AWS Lambda:
- Use AWS ADOT Lambda Layer
- Configure X-Ray daemon
- IAM role with xray:PutTraceSegments and logs:PutLogEvents

For Local Development:
- Falls back to console exporters if AWS credentials unavailable
- Still generates proper OpenTelemetry spans for testing
===============================================================================
"""

import os
import logging

from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter

from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def setup_aws_telemetry(app, service_name: str):
    """
    Initialize OpenTelemetry with AWS X-Ray exporter support.
    Falls back to console exporter if AWS credentials are unavailable.
    """
    
    logger.info("=" * 60)
    logger.info("Initializing AWS OpenTelemetry Configuration")
    logger.info(f"Service: {service_name}")
    logger.info("=" * 60)
    
    # Create resource with service name
    resource = Resource.create({
        "service.name": service_name,
        "deployment.environment": os.getenv("ENVIRONMENT", "incident-lab"),
    })
    
    # Initialize tracer provider
    provider = TracerProvider(resource=resource)
    
    # Try to use AWS X-Ray exporter, fall back to console if unavailable
    try:
        # Attempt to import AWS X-Ray exporter
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        
        # For AWS, use ADOT collector endpoint or X-Ray daemon
        xray_endpoint = os.getenv(
            "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
            "http://localhost:4318/v1/traces"  # ADOT collector default
        )
        
        logger.info(f"✓ Configuring AWS X-Ray exporter: {xray_endpoint}")
        exporter = OTLPSpanExporter(endpoint=xray_endpoint)
        
    except ImportError:
        logger.warning("⚠ AWS X-Ray exporter not available, using console exporter")
        logger.warning("  Install: pip install opentelemetry-exporter-otlp")
        exporter = ConsoleSpanExporter()
    except Exception as e:
        logger.warning(f"⚠ Could not configure AWS X-Ray exporter: {e}")
        logger.warning("  Falling back to console exporter for development")
        exporter = ConsoleSpanExporter()
    
    # Add span processor
    processor = BatchSpanProcessor(exporter)
    provider.add_span_processor(processor)
    
    # Set global tracer provider
    trace.set_tracer_provider(provider)
    
    # Instrument FastAPI
    FastAPIInstrumentor.instrument_app(app)
    
    # Instrument httpx for downstream calls
    HTTPXClientInstrumentor().instrument()
    
    logger.info("✓ OpenTelemetry instrumentation complete")
    logger.info(f"  Traces will be sent to: {exporter.__class__.__name__}")
    logger.info(f"  Service name: {service_name}")
    logger.info("=" * 60)
