"""
===============================================================================
TattvaAI - Evidence Schema
===============================================================================

Defines Pydantic schemas for normalized evidence and correlated evidence
collected across telemetry signals.
===============================================================================
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.evidence import Evidence


class CorrelatedEvidence(BaseModel):
    """
    Evidence item correlated across multiple telemetry sources.
    """

    model_config = ConfigDict(
        validate_assignment=True,
        extra="allow",
        arbitrary_types_allowed=True,
    )

    correlation_id: Optional[str] = None
    investigation_id: Optional[str] = None
    source_evidence_id: Optional[str] = None
    target_evidence_id: Optional[str] = None
    relationship: Optional[str] = None
    service_name: str = ""
    severity: str = "MEDIUM"
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    evidence_ids: List[str] = Field(default_factory=list)
    description: str = ""
    metadata: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class TraceEvidence(Evidence):
    """Trace-derived evidence."""
    pass


class LogEvidence(Evidence):
    """Log-derived evidence."""
    pass


class MetricEvidence(Evidence):
    """Metric-derived evidence."""
    pass


class DependencyEvidence(Evidence):
    """Dependency topology evidence."""
    pass


class HistoricalEvidence(Evidence):
    """Historical incident matching evidence."""
    pass


class AlertEvidence(Evidence):
    """Monitoring alert evidence."""
    pass


__all__ = [
    "Evidence",
    "CorrelatedEvidence",
    "TraceEvidence",
    "LogEvidence",
    "MetricEvidence",
    "DependencyEvidence",
    "HistoricalEvidence",
    "AlertEvidence",
]
