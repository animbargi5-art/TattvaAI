"""
===============================================================================
TattvaAI - Root Cause Domain Model
===============================================================================

Represents the most probable root cause identified during an AI
investigation.

A RootCause is generated after analyzing correlated evidence collected
from traces, logs, metrics, alerts, dependencies, and historical
incidents.

This model is transport-independent and represents the canonical
AI decision produced by the Root Cause Engine.

Flow
----
Evidence
        ↓
Correlation Engine
        ↓
Correlation
        ↓
Reasoning Engine
        ↓
Root Cause Engine
        ↓
RootCause
        ↓
Recommendation Engine

===============================================================================
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel
from pydantic import Field

from app.models.correlation import Correlation


class RootCause(BaseModel):
    """
    Canonical root cause model.
    """

    # -------------------------------------------------------------------------
    # Identification
    # -------------------------------------------------------------------------

    root_cause_id: Optional[str] = None

    investigation_id: Optional[str] = None

    # -------------------------------------------------------------------------
    # Target Service
    # -------------------------------------------------------------------------

    service_name: str

    # -------------------------------------------------------------------------
    # Classification
    # -------------------------------------------------------------------------

    severity: str

    confidence: int = Field(
        ge=0,
        le=100,
    )

    priority: str = "MEDIUM"

    cause_type: str = "Application"
    # Application
    # Infrastructure
    # Database
    # Network
    # Configuration
    # Security
    # AI

    # -------------------------------------------------------------------------
    # AI Decision
    # -------------------------------------------------------------------------

    title: str

    summary: str

    probable_cause: str

    reasoning: list[str] = Field(
        default_factory=list
    )

    # -------------------------------------------------------------------------
    # Supporting Correlations
    # -------------------------------------------------------------------------

    correlations: list[Correlation] = Field(
        default_factory=list
    )

    # -------------------------------------------------------------------------
    # Impact Analysis
    # -------------------------------------------------------------------------

    impacted_services: list[str] = Field(
        default_factory=list
    )

    affected_endpoints: list[str] = Field(
        default_factory=list
    )

    # -------------------------------------------------------------------------
    # Statistics
    # -------------------------------------------------------------------------

    evidence_count: int = 0

    correlation_count: int = 0

    # -------------------------------------------------------------------------
    # Metadata
    # -------------------------------------------------------------------------

    tags: list[str] = Field(
        default_factory=list
    )

    metadata: dict[str, str] = Field(
        default_factory=dict
    )

    # -------------------------------------------------------------------------
    # Timestamp
    # -------------------------------------------------------------------------

    detected_at: datetime = Field(
        default_factory=datetime.utcnow
    )

    # -------------------------------------------------------------------------
    # Helper Properties
    # -------------------------------------------------------------------------

    @property
    def cause(self) -> str:
        """
        Alias for probable_cause for backward compatibility.
        """
        return self.probable_cause

    @property
    def critical(self) -> bool:
        """
        Returns True for critical root causes.
        """
        return self.severity.upper() == "CRITICAL"

    @property
    def high_confidence(self) -> bool:
        """
        Returns True when AI confidence is high.
        """
        return self.confidence >= 90

    @property
    def multi_service(self) -> bool:
        """
        Returns True when multiple services are affected.
        """
        return len(self.impacted_services) > 1

    @property
    def has_reasoning(self) -> bool:
        """
        Returns True when AI reasoning is available.
        """
        return len(self.reasoning) > 0

    # -------------------------------------------------------------------------
    # Utility Methods
    # -------------------------------------------------------------------------

    def add_correlation(
        self,
        correlation: Correlation,
    ) -> None:
        """
        Adds a supporting correlation and updates statistics.
        """
        self.correlations.append(correlation)
        self.correlation_count = len(self.correlations)

        self.evidence_count = sum(
            item.evidence_count
            for item in self.correlations
        )

    def summary_text(self) -> str:
        """
        Returns a concise human-readable summary.
        """
        return (
            f"{self.service_name} | "
            f"{self.cause_type} | "
            f"{self.probable_cause} | "
            f"{self.confidence}% confidence"
        )
