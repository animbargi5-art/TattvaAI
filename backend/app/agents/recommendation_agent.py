"""
Backward-compatibility shim for RecommendationAgent.
Recommendation analysis has been refactored to app.decision.recommendation_engine.
"""

from app.decision.recommendation_engine import RecommendationEngine, RecommendationEngine as RecommendationAgent

__all__ = ["RecommendationAgent", "RecommendationEngine"]
