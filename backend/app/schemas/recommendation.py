"""
===============================================================================
TattvaAI - Recommendation Schema
===============================================================================

Defines Pydantic schemas for AI remediation recommendations and actions.
===============================================================================
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.recommendation import Recommendation


class RecommendationAction(BaseModel):
    """
    Actionable remediation task generated from investigation findings.
    """

    model_config = ConfigDict(
        validate_assignment=True,
        extra="allow",
        arbitrary_types_allowed=True,
    )

    action_id: Optional[str] = None
    title: str = ""
    description: str = ""
    command: Optional[str] = None
    priority: str = "P1"
    category: str = "Immediate"


class RecommendationSummary(BaseModel):
    """
    Consolidated summary of remediation recommendations.
    """

    model_config = ConfigDict(
        validate_assignment=True,
        extra="allow",
        arbitrary_types_allowed=True,
    )

    immediate_actions: List[str] = Field(default_factory=list)
    long_term_actions: List[str] = Field(default_factory=list)
    total_recommendations: int = 0


__all__ = [
    "Recommendation",
    "RecommendationAction",
    "RecommendationSummary",
]
