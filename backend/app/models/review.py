"""
===============================================================================
TattvaAI - Human Review & Decision Domain Model
===============================================================================

Defines the human-in-the-loop review states, review decision models,
and audit trail structures for TattvaAI incident investigations.

The human engineer is the ultimate decision authority. AI-generated
hypotheses and recommendations are advisory and are not considered
confirmed root causes until human review occurs.

Review States:
--------------
- PENDING_REVIEW: Default state for all freshly generated AI investigations.
- ACCEPTED: Human reviewer accepted one or more candidate hypotheses.
- REJECTED: Human reviewer rejected the candidate hypotheses.
- ESCALATED: Human reviewer escalated the incident for senior / tier-3 review.
- PARTIALLY_ACCEPTED: Human reviewer accepted specific hypotheses with reservations.

===============================================================================
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


class ReviewStatus(str, Enum):
    """Controlled vocabulary for human review states."""

    PENDING_REVIEW = "PENDING_REVIEW"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    ESCALATED = "ESCALATED"
    PARTIALLY_ACCEPTED = "PARTIALLY_ACCEPTED"


class ReviewDecision(BaseModel):
    """
    Formal record of a human review decision on an incident investigation.
    """

    review_id: str = Field(
        default_factory=lambda: f"REV-{uuid4().hex[:8].upper()}",
        description="Unique identifier for this review event",
    )

    investigation_id: str = Field(
        ...,
        description="ID of the investigation that was reviewed",
    )

    incident_id: Optional[str] = Field(
        default=None,
        description="Associated incident ID",
    )

    status: ReviewStatus = Field(
        default=ReviewStatus.PENDING_REVIEW,
        description="Human review decision status",
    )

    selected_hypothesis: Optional[str] = Field(
        default=None,
        description="Human-confirmed root cause hypothesis text or identifier",
    )

    reviewer_notes: Optional[str] = Field(
        default=None,
        description="Detailed notes and observations entered by the human engineer",
    )

    reviewed_at: Optional[str] = Field(
        default=None,
        description="ISO 8601 UTC timestamp when the review decision was submitted",
    )

    reviewer_identifier: Optional[str] = Field(
        default=None,
        description="Username, email, or identity token of the reviewing engineer (nullable)",
    )

    recommendation_decisions: Dict[str, str] = Field(
        default_factory=dict,
        description="Status of individual recommendations (e.g., {'rec-0': 'ACCEPTED'})",
    )

    evidence_confirmed: List[str] = Field(
        default_factory=list,
        description="IDs of evidence explicitly verified by the human engineer",
    )

    resolution_summary: Optional[str] = Field(
        default=None,
        description="Actionable mitigation or resolution summary entered by the engineer",
    )

    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Supplemental audit metadata",
    )

    def to_dict(self) -> Dict[str, Any]:
        """Serialize review decision to a dictionary."""
        return self.model_dump(mode="json")


class ReviewSubmission(BaseModel):
    """
    Payload submitted by the human engineer via API or UI to record a review decision.
    """

    status: str = Field(
        ...,
        description="Review decision status (ACCEPTED, REJECTED, ESCALATED, etc.)",
    )

    selected_hypothesis: Optional[str] = Field(
        default=None,
        description="Selected candidate hypothesis matching an AI root cause",
    )

    reviewer_notes: Optional[str] = Field(
        default=None,
        description="Notes entered by the human reviewer",
    )

    resolution: Optional[str] = Field(
        default=None,
        description="Resolution summary or remediation notes",
    )

    reviewer_identifier: Optional[str] = Field(
        default=None,
        description="Identifier of the human reviewer (optional)",
    )

    recommendation_decisions: Optional[Dict[str, str]] = Field(
        default=None,
        description="Optional map of recommendation decisions",
    )

    evidence_confirmed: Optional[List[str]] = Field(
        default=None,
        description="Optional list of evidence IDs confirmed by human",
    )


class ReviewAuditRecord(BaseModel):
    """
    Audit trail entry capturing review transitions.
    """

    audit_id: str = Field(
        default_factory=lambda: f"AUD-{uuid4().hex[:8].upper()}",
    )
    review_id: str
    investigation_id: str
    old_status: str
    new_status: str
    selected_hypothesis: Optional[str] = None
    reviewer_notes: Optional[str] = None
    reviewer_identifier: Optional[str] = None
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
    )
