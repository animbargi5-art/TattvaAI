"""
===============================================================================
TattvaAI - Base Agent with Comprehensive Observability
===============================================================================

Base class for every AI Investigation Agent with built-in OpenTelemetry 
instrumentation, performance monitoring, and decision tracking.

Responsibilities
----------------
• Standard execution lifecycle
• Shared investigation state
• Shared memory access
• Agent observability and tracing
• LLM call monitoring
• Decision recording
• Performance metrics
• Error handling and recovery
• Evidence collection tracking

Every specialized agent inherits from this class.

Flow
----
initialize_observability()
        ↓
before_execute()
        ↓
execute() [with tracing]
        ↓
after_execute()

===============================================================================
"""

from __future__ import annotations

import time
import traceback
from typing import Any, Dict, List, Optional

from abc import ABC
from abc import abstractmethod

from app.core.logger import logger
from app.schemas.investigation_state import InvestigationState
from app.models.evidence import Evidence
from app.telemetry.tracing import AgentTracer, create_agent_tracer


class BaseAgent(ABC):
    """
    Base class for every AI Investigation Agent with observability.
    """

    def __init__(
        self,
        name: str,
        description: str,
    ) -> None:

        self.name = name
        self.description = description
        self.version = "1.0.0"
        self.logger = logger
        
        # Observability components
        self.tracer: Optional[AgentTracer] = None
        self.investigation_id: Optional[str] = None

    def initialize_observability(self, investigation_id: str):
        """
        Initialize observability tracing for this agent.
        
        Args:
            investigation_id: Unique identifier for the current investigation
        """
        self.investigation_id = investigation_id
        self.tracer = create_agent_tracer(investigation_id)

    # ------------------------------------------------------------------
    # Execution Lifecycle with Observability
    # ------------------------------------------------------------------

    async def before_execute(
        self,
        state: InvestigationState,
    ) -> None:
        """
        Runs before every agent execution with observability setup.
        """
        self.start_time = time.time()
        state.current_agent = self.name

        self.logger.info(f"Starting {self.name}")

        # Record investigation milestone
        if self.tracer:
            self.tracer.trace_investigation_milestone(
                milestone=f"{self.name}_start",
                progress_percentage=len(state.completed_agents) / 8 * 100,
                evidence_collected=len(state.evidence),
                confidence_score=state.confidence / 100,
                time_elapsed_ms=0
            )

    @abstractmethod
    async def execute(
        self,
        state: InvestigationState,
    ) -> InvestigationState:
        """
        Every child agent must implement this with observability.
        """
        ...

    async def execute_with_observability(
        self,
        state: InvestigationState,
        operation_name: str = "investigate"
    ) -> InvestigationState:
        """
        Execute agent operation with full observability tracking.
        """
        if not self.tracer:
            # Fallback to regular execution
            return await self.execute(state)

        with self.tracer.trace_agent_execution(
            self.name, 
            operation_name,
            metadata={
                "evidence_count": len(state.evidence),
                "confidence": state.confidence,
                "completed_agents": len(state.completed_agents)
            }
        ) as span:
            
            try:
                # Execute the actual agent operation
                result_state = await self.execute(state)
                
                # Record agent decision if state changed
                if len(result_state.evidence) > len(state.evidence):
                    new_evidence_count = len(result_state.evidence) - len(state.evidence)
                    
                    decision = self.tracer.create_agent_decision(
                        agent_role=self.name,
                        reasoning=f"Collected {new_evidence_count} new evidence items during {operation_name}",
                        confidence=result_state.confidence / 100,
                        evidence=[f"Evidence item {i}" for i in range(new_evidence_count)]
                    )
                    self.tracer.trace_agent_decision(decision)
                
                return result_state
                
            except Exception as e:
                # Log error and re-raise
                self.logger.error(f"Agent {self.name} failed: {str(e)}")
                raise

    async def after_execute(
        self,
        state: InvestigationState,
    ) -> None:
        """
        Runs after successful execution with observability.
        """
        elapsed = round(time.time() - self.start_time, 3)
        
        state.completed_agents.append(self.name)
        
        # Record completion milestone
        if self.tracer:
            self.tracer.trace_investigation_milestone(
                milestone=f"{self.name}_complete",
                progress_percentage=len(state.completed_agents) / 8 * 100,
                evidence_collected=len(state.evidence),
                confidence_score=state.confidence / 100,
                time_elapsed_ms=elapsed * 1000
            )

        self.logger.info(f"{self.name} completed in {elapsed}s")

    async def run(
        self,
        state: InvestigationState,
    ) -> InvestigationState:
        """
        Standard execution flow with observability.
        """
        await self.before_execute(state)

        try:
            # Use observability-enabled execution
            state = await self.execute_with_observability(state)
            await self.after_execute(state)
            return state

        except Exception as ex:
            state.failed_agents.append(self.name)
            self.logger.exception(ex)
            traceback.print_exc()
            raise

    # ------------------------------------------------------------------
    # Observability Helper Methods
    # ------------------------------------------------------------------

    def record_llm_call(
        self,
        model: str,
        prompt_tokens: int,
        completion_tokens: int,
        latency_ms: float,
        cost_usd: float,
        success: bool = True,
        error_message: Optional[str] = None
    ):
        """Record LLM API call metrics."""
        if self.tracer:
            self.tracer.trace_llm_call(
                model=model,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                latency_ms=latency_ms,
                cost_usd=cost_usd,
                success=success,
                error_message=error_message,
                agent_role=self.name
            )

    def record_evidence_collection(
        self,
        evidence_type: str,
        evidence_count: int,
        source: str,
        query_time_ms: float,
        confidence: float
    ):
        """Record evidence collection activity."""
        if self.tracer:
            self.tracer.trace_evidence_collection(
                evidence_type=evidence_type,
                evidence_count=evidence_count,
                source=source,
                query_time_ms=query_time_ms,
                confidence=confidence
            )

    def record_decision(
        self,
        reasoning: str,
        confidence: float,
        evidence: List[str],
        alternatives_considered: List[str] = None
    ):
        """Record an agent decision with reasoning."""
        if self.tracer:
            decision = self.tracer.create_agent_decision(
                agent_role=self.name,
                reasoning=reasoning,
                confidence=confidence,
                evidence=evidence,
                alternatives_considered=alternatives_considered or []
            )
            self.tracer.trace_agent_decision(decision)

    # ------------------------------------------------------------------
    # Legacy Helper Methods (Enhanced with Observability)
    # ------------------------------------------------------------------

    def add_evidence(
        self,
        state: InvestigationState,
        evidence: Evidence,
    ) -> None:
        state.evidence.append(evidence)
        
        # Record evidence collection
        self.record_evidence_collection(
            evidence_type=evidence.type if hasattr(evidence, 'type') else "unknown",
            evidence_count=1,
            source=evidence.source if hasattr(evidence, 'source') else "unknown",
            query_time_ms=100,  # Default estimate
            confidence=0.8      # Default confidence
        )

    def add_timeline(
        self,
        state: InvestigationState,
        event: str,
    ) -> None:
        state.timeline.append(event)

    def add_hypothesis(
        self,
        state: InvestigationState,
        hypothesis: dict,
    ) -> None:
        state.hypotheses.append(hypothesis)

    def add_recommendation(
        self,
        state: InvestigationState,
        recommendation: dict,
    ) -> None:
        state.recommendations.append(recommendation)

    def set_confidence(
        self,
        state: InvestigationState,
        confidence: int,
    ) -> None:
        state.confidence = confidence

    def log(
        self,
        message: str,
    ) -> None:
        self.logger.info(message)
