"""
===============================================================================
TattvaAI - Metric Domain Model
===============================================================================

Represents a normalized metric used throughout the
TattvaAI investigation pipeline.

This model is transport-independent and represents the canonical
metric object inside TattvaAI.

Every metric retrieved from SigNoz, OpenTelemetry, Prometheus, or any
other metrics platform must first be converted into this model before
being consumed by the investigation pipeline.

Flow
----
SigNoz / OpenTelemetry / Prometheus
        ↓
MCP Gateway
        ↓
Telemetry Service
        ↓
Metrics Tool
        ↓
Metric
        ↓
Metrics Agent
        ↓
Evidence

===============================================================================
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel
from pydantic import Field


class Metric(BaseModel):
    """
    Canonical telemetry metric.
    """

    # -------------------------------------------------------------------------
    # Metric Identification
    # -------------------------------------------------------------------------

    metric_name: str

    value: float

    unit: Optional[str] = None

    # -------------------------------------------------------------------------
    # Metric Metadata
    # -------------------------------------------------------------------------

    metric_type: Optional[str] = None
    # Gauge
    # Counter
    # Histogram
    # Summary

    aggregation: Optional[str] = None
    # avg
    # sum
    # max
    # min
    # p95
    # p99

    # -------------------------------------------------------------------------
    # Service Information
    # -------------------------------------------------------------------------

    service_name: str

    host: Optional[str] = None

    environment: Optional[str] = None

    namespace: Optional[str] = None

    service_version: Optional[str] = None

    # -------------------------------------------------------------------------
    # Labels
    # -------------------------------------------------------------------------

    labels: dict[str, str] = Field(default_factory=dict)

    # -------------------------------------------------------------------------
    # Thresholds
    # -------------------------------------------------------------------------

    warning_threshold: Optional[float] = None

    critical_threshold: Optional[float] = None

    baseline: Optional[float] = None

    # -------------------------------------------------------------------------
    # Timing
    # -------------------------------------------------------------------------

    timestamp: Optional[datetime] = None

    # -------------------------------------------------------------------------
    # Helper Properties
    # -------------------------------------------------------------------------

    @property
    def is_cpu(self) -> bool:
        return "cpu" in self.metric_name.lower()

    @property
    def is_memory(self) -> bool:
        return "memory" in self.metric_name.lower()

    @property
    def is_latency(self) -> bool:
        return (
            "latency" in self.metric_name.lower()
            or "duration" in self.metric_name.lower()
            or "response_time" in self.metric_name.lower()
        )


    @property
    def is_error_rate(self) -> bool:
        return "error" in self.metric_name.lower()

    @property
    def is_request_rate(self) -> bool:
        return (
            "request" in self.metric_name.lower()
            or "throughput" in self.metric_name.lower()
        )

    @property
    def exceeds_warning(self) -> bool:
        """
        Returns True if the metric exceeds the warning threshold.
        """

        if self.warning_threshold is None:
            return False

        return self.value >= self.warning_threshold

    @property
    def exceeds_critical(self) -> bool:
        """
        Returns True if the metric exceeds the critical threshold.
        """

        if self.critical_threshold is None:
            return False

        return self.value >= self.critical_threshold

    @property
    def healthy(self) -> bool:
        """
        Returns True when the metric is within configured limits.
        """

        return not (
            self.exceeds_warning
            or self.exceeds_critical
        )

    # -------------------------------------------------------------------------
    # Utility Methods
    # -------------------------------------------------------------------------

    def exceeds(
        self,
        threshold: float,
    ) -> bool:
        """
        Returns True if the metric value exceeds the supplied threshold.
        """

        return self.value >= threshold

    def below(
        self,
        threshold: float,
    ) -> bool:
        """
        Returns True if the metric value is below the supplied threshold.
        """

        return self.value <= threshold

    def deviation(self) -> Optional[float]:
        """
        Returns deviation from baseline.

        Positive values indicate the metric is above baseline.
        Negative values indicate the metric is below baseline.
        """

        if self.baseline is None:
            return None

        return self.value - self.baseline

    def summary(self) -> str:
        """
        Returns a concise human-readable summary.
        """

        return (
            f"{self.service_name} | "
            f"{self.metric_name} = "
            f"{self.value} {self.unit or ''}"
        )