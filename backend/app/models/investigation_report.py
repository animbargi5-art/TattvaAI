"""
===============================================================================
TattvaAI - Investigation Report Domain Model
===============================================================================

Represents the final AI investigation report.

This report is the final output produced after the investigation
pipeline completes.

It combines every stage of the investigation including:

• Evidence
• Correlations
• Root Causes
• Recommendations
• Historical Context

This model is transport-independent and represents the canonical
investigation report inside TattvaAI.

Flow
----
Evidence
        ↓
Correlation Engine
        ↓
Investigation Memory
        ↓
Root Cause Engine
        ↓
Recommendation Engine
        ↓
Investigation Report

===============================================================================
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel
from pydantic import Field

from app.models.correlation import Correlation
from app.models.evidence import Evidence
from app.models.recommendation import Recommendation
from app.models.root_cause import RootCause


class InvestigationReport(BaseModel):
    """
    Canonical AI investigation report.
    """

    # -------------------------------------------------------------------------
    # Identification
    # -------------------------------------------------------------------------

    report_id: Optional[str] = None

    investigation_id: str

    incident_id: str

    # -------------------------------------------------------------------------
    # Incident Information
    # -------------------------------------------------------------------------

    service_name: str

    title: str

    status: str

    severity: str

    confidence: int = Field(
        ge=0,
        le=100,
    )

    # -------------------------------------------------------------------------
    # Investigation Results
    # -------------------------------------------------------------------------

    evidence: list[Evidence] = Field(
        default_factory=list
    )

    correlations: list[Correlation] = Field(
        default_factory=list
    )

    root_causes: list[RootCause] = Field(
        default_factory=list
    )

    recommendations: list[Recommendation] = Field(
        default_factory=list
    )

    historical_context: list[dict] = Field(
        default_factory=list
    )

    # -------------------------------------------------------------------------
    # Human Review & Decision
    # -------------------------------------------------------------------------

    review_status: str = "PENDING_REVIEW"

    review_decision: Optional[dict] = None

    selected_hypothesis: Optional[str] = None

    reviewer_notes: Optional[str] = None

    resolution: Optional[str] = None

    reviewed_at: Optional[datetime] = None

    # -------------------------------------------------------------------------
    # Investigation Timeline
    # -------------------------------------------------------------------------

    timeline: list[str] = Field(
        default_factory=list
    )

    # -------------------------------------------------------------------------
    # AI Summary
    # -------------------------------------------------------------------------

    executive_summary: str

    technical_summary: str

    reasoning: dict = Field(default_factory=dict)

    graph: dict = Field(default_factory=dict)

    # -------------------------------------------------------------------------
    # Statistics
    # -------------------------------------------------------------------------

    evidence_count: int = 0

    correlation_count: int = 0

    root_cause_count: int = 0

    recommendation_count: int = 0

    investigation_duration_seconds: float = 0.0

    # -------------------------------------------------------------------------
    # Metadata
    # -------------------------------------------------------------------------

    generated_by: str = "TattvaAI"

    version: str = "1.0"

    tags: list[str] = Field(
        default_factory=list
    )

    metadata: dict[str, str] = Field(
        default_factory=dict
    )

    pipeline_execution: list[dict] = Field(
        default_factory=list
    )

    # -------------------------------------------------------------------------
    # Timestamps
    # -------------------------------------------------------------------------

    started_at: Optional[datetime] = None

    completed_at: Optional[datetime] = None

    generated_at: datetime = Field(
        default_factory=datetime.utcnow
    )

    # -------------------------------------------------------------------------
    # Helper Properties
    # -------------------------------------------------------------------------

    @property
    def completed(self) -> bool:
        """
        Returns True if the investigation has completed.
        """

        return self.status.upper() == "COMPLETED"

    @property
    def failed(self) -> bool:
        """
        Returns True if the investigation failed.
        """

        return self.status.upper() == "FAILED"

    @property
    def has_root_cause(self) -> bool:
        """
        Returns True if at least one root cause was identified.
        """

        return len(self.root_causes) > 0

    @property
    def has_recommendations(self) -> bool:
        """
        Returns True if recommendations exist.
        """

        return len(self.recommendations) > 0

    @property
    def high_confidence(self) -> bool:
        """
        Returns True when investigation confidence is high.
        """

        return self.confidence >= 90

    # -------------------------------------------------------------------------
    # Utility Methods
    # -------------------------------------------------------------------------

    def refresh_statistics(self) -> None:
        """
        Recalculates report statistics.
        """

        self.evidence_count = len(self.evidence)
        self.correlation_count = len(self.correlations)
        self.root_cause_count = len(self.root_causes)
        self.recommendation_count = len(self.recommendations)

    def summary_text(self) -> str:
        """
        Returns a concise investigation summary.
        """

        return (
            f"{self.service_name} | "
            f"{self.severity} | "
            f"{self.confidence}% confidence"
        )
