"""
===============================================================================
TattvaAI - Investigation Engine
===============================================================================

Purpose
-------
Coordinates the complete AI investigation and reasoning pipeline incorporating
Amazon Bedrock.

Flow
----
InvestigationState
        ↓
CorrelationEngine (cross-signal relationships)
        ↓
Structured Investigation Context
        ↓
Amazon Bedrock Reasoning Provider (Hypotheses, Causal Chain, Recommendations)
        ↓
Canonical Model Consolidation & Human Review Preparation
        ↓
Updated InvestigationState
===============================================================================
"""

from __future__ import annotations

from typing import Optional

from app.core.logger import logger
from app.decision.correlation_engine import CorrelationEngine
from app.decision.reasoning_engine import ReasoningEngine
from app.decision.recommendation_engine import RecommendationEngine
from app.decision.root_cause_engine import RootCauseEngine
from app.decision.reasoning_provider import (
    ReasoningProvider,
    BedrockReasoningProvider,
    get_reasoning_provider,
)
from app.schemas.investigation_state import InvestigationState
from app.memory import InvestigationMemory, investigation_memory
from app.models.root_cause import RootCause
from app.models.recommendation import Recommendation


class InvestigationEngine:
    """
    Orchestrates decision making and Amazon Bedrock reasoning for investigations.
    """

    def __init__(
        self,
        reasoning_provider: Optional[ReasoningProvider] = None,
        memory: Optional[InvestigationMemory] = None,
    ) -> None:
        self.correlation_engine = CorrelationEngine()
        self.reasoning_provider = reasoning_provider or get_reasoning_provider()
        self.memory = memory or investigation_memory
        self.root_cause_engine = RootCauseEngine()
        self.recommendation_engine = RecommendationEngine()
        self.reasoning_engine = ReasoningEngine()

    async def execute(
        self,
        state: InvestigationState,
    ) -> InvestigationState:
        """
        Execute full investigation workflow:
        1. Discover cross-signal correlations across gathered evidence
        2. Retrieve relevant historical investigations from InvestigationMemory
        3. Execute Amazon Bedrock evidence-grounded AI reasoning
        4. Convert structured hypotheses, causal chain, and recommendations into canonical state
        """
        # --------------------------------------------------------------
        # 1. Evidence Correlation Phase
        # --------------------------------------------------------------
        state = self.correlation_engine.execute(state)

        # --------------------------------------------------------------
        # 2. Historical Memory Retrieval Phase
        # --------------------------------------------------------------
        try:
            historical_matches = self.memory.find_similar_investigations(state)
            state.historical_context = [m.to_dict() for m in historical_matches]
            if historical_matches:
                top_match = historical_matches[0]
                state.timeline.append(
                    f"Investigation Memory retrieved {len(historical_matches)} similar historical investigation(s) "
                    f"({top_match.incident_id}, similarity: {top_match.similarity_score:.2f})."
                )
                logger.info(
                    "InvestigationEngine: Retrieved %d historical memory matches (Top: %s, Score: %.2f)",
                    len(historical_matches),
                    top_match.incident_id,
                    top_match.similarity_score,
                )
        except Exception as e:
            logger.warning("InvestigationEngine: Historical memory retrieval warning: %s", e)

        # --------------------------------------------------------------
        # 3. Amazon Bedrock AI Reasoning Phase
        # --------------------------------------------------------------
        try:
            reasoning_result = await self.reasoning_provider.investigate(state)

            # Store structured reasoning in state (with backward-compatible UI keys)
            state.reasoning = reasoning_result.to_dict()
            state.confidence = (
                int(reasoning_result.confidence * 100)
                if reasoning_result.confidence <= 1.0
                else int(reasoning_result.confidence)
            )

            # Convert Bedrock hypotheses to canonical RootCause models
            for hyp in reasoning_result.hypotheses:
                conf_int = int(hyp.confidence * 100) if hyp.confidence <= 1.0 else int(hyp.confidence)
                state.root_causes.append(
                    RootCause(
                        service_name=state.service_name,
                        severity="CRITICAL" if conf_int >= 80 else "HIGH",
                        confidence=max(0, min(100, conf_int)),
                        title=f"Probable Cause: {state.service_name}",
                        summary=hyp.hypothesis,
                        probable_cause=hyp.hypothesis,
                        reasoning=[hyp.reasoning] + hyp.supporting_evidence_ids,
                        impacted_services=[state.service_name],
                    )
                )

            # Convert Bedrock recommendations to canonical Recommendation models
            for rec in reasoning_result.recommendations:
                rec_priority = "P1" if rec.priority in ["CRITICAL", "HIGH", "P1"] else "P2"
                state.recommendations.append(
                    Recommendation(
                        service_name=state.service_name,
                        priority=rec_priority,
                        category="Immediate" if rec.type.upper() == "IMMEDIATE" else "Long-Term",
                        confidence=state.confidence,
                        title=f"Remediation Action ({rec.type})",
                        description=rec.reasoning or rec.action,
                        action=rec.action,
                        expected_impact="Restores baseline service health and mitigates failure propagation.",
                    )
                )

            # Ensure at least 1 root cause and recommendation exists if evidence exists
            if not state.root_causes and state.evidence:
                state = self.root_cause_engine.execute(state)
            if not state.recommendations and state.evidence:
                state = self.recommendation_engine.execute(state)

            is_live_bedrock = (
                isinstance(self.reasoning_provider, BedrockReasoningProvider)
                and self.reasoning_provider.is_available()
            )
            provider_label = "Amazon Bedrock" if is_live_bedrock else "Amazon Bedrock (Mock Provider)"
            state.timeline.append(
                f"{provider_label} AI reasoning completed (Confidence: {state.confidence}%)."
            )

        except Exception as e:
            logger.error("Error during Bedrock reasoning execution: %s", e)
            # Fallback to local heuristic engines if unexpected exception occurs
            state = self.root_cause_engine.execute(state)
            state = self.recommendation_engine.execute(state)
            reasoning = self.reasoning_engine.execute(state)
            state.reasoning = reasoning
            state.timeline.append(f"AI Reasoning executed via fallback engine ({e}).")

        return state