"""
===============================================================================
TattvaAI - Recommendation Domain Model
===============================================================================

Represents an AI-generated recommendation produced after root cause
analysis.

Recommendations provide concrete remediation steps that can be executed
by engineers or automated systems to resolve an incident.

This model is transport-independent and represents the canonical
recommendation object inside TattvaAI.

Flow
----
Evidence
        ↓
Correlation
        ↓
Root Cause
        ↓
Recommendation Engine
        ↓
Recommendation
        ↓
Investigation Report

===============================================================================
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel
from pydantic import Field


class Recommendation(BaseModel):
    """
    Canonical AI recommendation.
    """

    # -------------------------------------------------------------------------
    # Identification
    # -------------------------------------------------------------------------

    recommendation_id: Optional[str] = None

    investigation_id: Optional[str] = None

    # -------------------------------------------------------------------------
    # Target Service
    # -------------------------------------------------------------------------

    service_name: str

    # -------------------------------------------------------------------------
    # Classification
    # -------------------------------------------------------------------------

    priority: str

    category: str
    # Immediate
    # Short-Term
    # Long-Term
    # Preventive

    confidence: int = Field(
        ge=0,
        le=100,
    )

    # -------------------------------------------------------------------------
    # Recommendation
    # -------------------------------------------------------------------------

    title: str

    description: str

    action: str

    steps: list[str] = Field(
        default_factory=list
    )

    expected_impact: str

    estimated_time: Optional[str] = None

    rollback_plan: Optional[str] = None

    runbook_url: Optional[str] = None

    # -------------------------------------------------------------------------
    # Automation
    # -------------------------------------------------------------------------

    automated: bool = True

    automation_supported: bool = False

    # -------------------------------------------------------------------------
    # AI Metadata
    # -------------------------------------------------------------------------

    generated_by: str = "RecommendationEngine"

    tags: list[str] = Field(
        default_factory=list
    )

    metadata: dict[str, str] = Field(
        default_factory=dict
    )

    # -------------------------------------------------------------------------
    # Timestamp
    # -------------------------------------------------------------------------

    generated_at: datetime = Field(
        default_factory=datetime.utcnow
    )

    # -------------------------------------------------------------------------
    # Helper Properties
    # -------------------------------------------------------------------------

    @property
    def high_priority(self) -> bool:
        """
        Returns True when the recommendation priority is HIGH.
        """

        return self.priority.upper() == "HIGH"

    @property
    def type(self) -> str:
        """
        Alias for category.
        """
        return self.category

    @property
    def immediate(self) -> bool:

        """
        Returns True when immediate action is required.
        """

        return self.category.upper() == "IMMEDIATE"

    @property
    def automatable(self) -> bool:
        """
        Returns True when the recommendation can be executed
        automatically.
        """

        return self.automation_supported

    @property
    def high_confidence(self) -> bool:
        """
        Returns True when recommendation confidence is high.
        """

        return self.confidence >= 90

    # -------------------------------------------------------------------------
    # Utility Methods
    # -------------------------------------------------------------------------

    def summary_text(self) -> str:
        """
        Returns a concise human-readable recommendation summary.
        """

        return (
            f"{self.service_name} | "
            f"{self.priority} | "
            f"{self.title}"
        )