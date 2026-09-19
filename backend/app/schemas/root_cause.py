"""
===============================================================================
TattvaAI - Root Cause Schema
===============================================================================

Defines Pydantic schemas for root causes and candidate failure hypotheses.
===============================================================================
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.root_cause import RootCause


class RootCauseHypothesis(BaseModel):
    """
    Candidate failure hypothesis evaluated during incident investigation.
    """

    model_config = ConfigDict(
        validate_assignment=True,
        extra="allow",
        arbitrary_types_allowed=True,
    )

    hypothesis_id: Optional[str] = None
    hypothesis: str = ""
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    supporting_evidence_ids: List[str] = Field(default_factory=list)
    contradicting_evidence_ids: List[str] = Field(default_factory=list)
    reasoning: str = ""
    service_name: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


__all__ = [
    "RootCause",
    "RootCauseHypothesis",
]
