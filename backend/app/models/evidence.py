"""
===============================================================================
TattvaAI - Evidence Domain Model
===============================================================================

Represents one normalized piece of investigation evidence.

Evidence is the canonical object exchanged between every AI agent inside
TattvaAI.

Every investigation agent (Trace, Logs, Metrics, Dependencies, Alerts,
Historical) converts raw telemetry into Evidence objects.

Evidence is later consumed by:

• Correlation Engine
• Reasoning Engine
• Root Cause Engine
• Recommendation Engine

Flow
----
Telemetry
        ↓
AI Agent
        ↓
Evidence
        ↓
Correlation Engine
        ↓
Root Cause Analysis

===============================================================================
"""

from __future__ import annotations

from datetime import datetime
from typing import Any
from typing import Optional

from pydantic import BaseModel
from pydantic import Field


class Evidence(BaseModel):
    """
    Canonical investigation evidence.
    """

    # -------------------------------------------------------------------------
    # Identification
    # -------------------------------------------------------------------------

    evidence_id: Optional[str] = None

    investigation_id: Optional[str] = None

    # -------------------------------------------------------------------------
    # Producer
    # -------------------------------------------------------------------------

    source: str
    # trace
    # logs
    # metrics
    # dependency
    # alert
    # history

    agent_name: str = "TattvaAI"

    # -------------------------------------------------------------------------
    # Classification
    # -------------------------------------------------------------------------

    category: str
    # Performance
    # Application
    # Infrastructure
    # Security
    # Database
    # Network
    # AI

    type: str

    severity: str

    confidence: int = Field(
        ge=0,
        le=100,
    )

    weight: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
    )

    # -------------------------------------------------------------------------
    # Target
    # -------------------------------------------------------------------------

    service_name: str

    endpoint: Optional[str] = None

    operation: Optional[str] = None

    # -------------------------------------------------------------------------
    # AI Finding
    # -------------------------------------------------------------------------

    title: str

    summary: str

    recommendation: Optional[str] = None

    # -------------------------------------------------------------------------
    # Correlation References
    # -------------------------------------------------------------------------

    trace_id: Optional[str] = None

    span_id: Optional[str] = None

    metric_name: Optional[str] = None

    log_id: Optional[str] = None

    alert_id: Optional[str] = None

    dependency_id: Optional[str] = None

    historical_incident_id: Optional[str] = None

    # -------------------------------------------------------------------------
    # Metadata
    # -------------------------------------------------------------------------

    tags: list[str] = Field(
        default_factory=list
    )

    metadata: dict[str, Any] = Field(
        default_factory=dict
    )

    raw: dict[str, Any] = Field(
        default_factory=dict
    )

    # -------------------------------------------------------------------------
    # Timing
    # -------------------------------------------------------------------------

    timestamp: datetime = Field(
        default_factory=datetime.utcnow
    )

    # -------------------------------------------------------------------------
    # Helper Properties
    # -------------------------------------------------------------------------

    @property
    def critical(self) -> bool:
        """
        Returns True when evidence is CRITICAL.
        """
        return self.severity.upper() == "CRITICAL"

    @property
    def high(self) -> bool:
        """
        Returns True when evidence is HIGH.
        """
        return self.severity.upper() == "HIGH"

    @property
    def medium(self) -> bool:
        """
        Returns True when evidence is MEDIUM.
        """
        return self.severity.upper() == "MEDIUM"

    @property
    def low(self) -> bool:
        """
        Returns True when evidence is LOW.
        """
        return self.severity.upper() == "LOW"

    @property
    def slow(self) -> bool:
        """
        Returns True when evidence indicates elevated latency or slow performance.
        """
        return "slow" in (self.type or "").lower() or float(self.raw.get("duration_ms", 0.0)) >= 1000.0

    @property
    def reliable(self) -> bool:
        """
        Returns True when the evidence confidence is high.
        """
        return self.confidence >= 80

    @property
    def weak(self) -> bool:
        """
        Returns True when the evidence confidence is low.
        """
        return self.confidence < 50

    # -------------------------------------------------------------------------
    # Utility Methods
    # -------------------------------------------------------------------------

    def summary_text(self) -> str:
        """
        Returns a concise human-readable summary.
        """
        return (
            f"[{self.severity}] "
            f"{self.service_name} - "
            f"{self.title}"
        )
