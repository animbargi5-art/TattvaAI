"""
===============================================================================
TattvaAI - Investigation Orchestrator
===============================================================================

Purpose
-------
Orchestrates the sequential execution of AI investigation agents and decision
engines, providing a programmatic alternative to the LangGraph pipeline.

Flow
----
InvestigationState
        ↓
Collect Evidence (Traces, Logs, Metrics, Dependencies, Alerts, History)
        ↓
Correlate Evidence Across Signals
        ↓
Build / Compile Graph Workflow
        ↓
AI Reasoning, Root Cause Analysis & Recommendations
        ↓
Generate Final Investigation Report
===============================================================================
"""

from __future__ import annotations

from typing import Any, Dict, Optional
from uuid import uuid4

from app.agents.trace_agent import TraceAgent
from app.agents.logs_agent import LogsAgent
from app.agents.metrics_agent import MetricsAgent
from app.agents.dependency_agent import DependencyAgent
from app.agents.alert_agent import AlertAgent
from app.agents.historical_agent import HistoricalAgent
from app.agents.report_agent import ReportAgent

from app.decision.correlation_engine import CorrelationEngine
from app.decision.investigation_engine import InvestigationEngine
from app.decision.root_cause_engine import RootCauseEngine
from app.decision.recommendation_engine import RecommendationEngine
from app.decision.reasoning_engine import ReasoningEngine
from app.graph.graph_builder import GraphBuilder
from app.schemas.investigation_state import InvestigationState
from app.memory import InvestigationMemory, investigation_memory
from app.core.logger import logger


class InvestigationOrchestrator:
    """
    Orchestrates sequential investigation steps across agents and engines.
    """

    def __init__(
        self,
        memory: Optional[InvestigationMemory] = None,
        coordinator: Optional[Any] = None,
    ) -> None:
        self.memory = memory or investigation_memory
        self.coordinator = coordinator

        # Telemetry & investigation agents
        self.trace_agent = TraceAgent()
        self.logs_agent = LogsAgent()
        self.metrics_agent = MetricsAgent()

        self.dependency_agent = DependencyAgent()
        self.alert_agent = AlertAgent()
        self.historical_agent = HistoricalAgent()

        # Decision & reasoning engines
        self.correlation_engine = CorrelationEngine()
        self.graph_builder = GraphBuilder()

        self.investigation_engine = InvestigationEngine(memory=self.memory)
        self.root_cause_engine = RootCauseEngine()
        self.recommendation_engine = RecommendationEngine()
        self.reasoning_engine = ReasoningEngine()
        self.report_agent = ReportAgent()

        # Backward compatibility aliases
        self.root_cause_agent = self.root_cause_engine
        self.recommendation_agent = self.recommendation_engine

    async def run(
        self,
        state: Optional[InvestigationState] = None,
        service_name: str = "payment-service",
        incident_id: Optional[str] = None,
    ) -> InvestigationState:
        """
        Run the complete end-to-end investigation pipeline sequentially.
        """
        if state is None:
            if incident_id is None:
                incident_id = f"INC-{uuid4().hex[:8].upper()}"
            state = InvestigationState(
                incident_id=incident_id,
                service_name=service_name,
            )

        # 1. Collect evidence
        state = await self.collect_evidence(state)

        # 2. Inform coordinator if provided
        if self.coordinator and hasattr(self.coordinator, "build_incident"):
            try:
                self.coordinator.build_incident(state)
            except TypeError:
                self.coordinator.build_incident()

        # 3. Correlate evidence across signals
        state = self.correlate(state)

        # 4. Build/compile graph
        self.build_graph()

        # 5. AI Reasoning, Root Cause & Recommendations
        state = await self.reason(state)
        state = await self.find_root_cause(state)
        state = await self.generate_recommendations(state)

        # 6. Generate final report
        return await self.generate_report(state)

    async def collect_evidence(
        self,
        state: InvestigationState,
    ) -> InvestigationState:
        """
        Run all evidence gathering agents.
        """
        logger.info("========== COLLECTING EVIDENCE ==========")
        state = await self.trace_agent.run(state)
        state = await self.logs_agent.run(state)
        state = await self.metrics_agent.run(state)
        state = await self.dependency_agent.run(state)
        state = await self.alert_agent.run(state)
        state = await self.historical_agent.run(state)
        return state

    def correlate(
        self,
        state: InvestigationState,
    ) -> InvestigationState:
        """
        Run cross-signal correlation analysis.
        """
        logger.info("========== CORRELATING EVIDENCE ==========")
        return self.correlation_engine.execute(state)

    def build_graph(self):
        """
        Compile the investigation state graph.
        """
        logger.info("========== BUILDING KNOWLEDGE GRAPH ==========")
        return self.graph_builder.compile()

    async def reason(
        self,
        state: InvestigationState,
    ) -> InvestigationState:
        """
        Run AI reasoning on gathered evidence and correlations.
        """
        logger.info("========== REASONING ==========")
        return await self.investigation_engine.execute(state)

    async def find_root_cause(
        self,
        state: InvestigationState,
    ) -> InvestigationState:
        """
        Determine incident root cause if not already determined.
        """
        logger.info("========== ROOT CAUSE ANALYSIS ==========")
        if not state.root_causes and state.evidence:
            state = self.root_cause_engine.execute(state)
        return state

    async def generate_recommendations(
        self,
        state: InvestigationState,
    ) -> InvestigationState:
        """
        Generate remediation recommendations.
        """
        logger.info("========== GENERATING RECOMMENDATIONS ==========")
        if not state.recommendations and state.evidence:
            state = self.recommendation_engine.execute(state)
        return state

    async def generate_report(
        self,
        state: InvestigationState,
    ) -> InvestigationState:
        """
        Generate the final investigation report.
        """
        logger.info("========== GENERATING FINAL REPORT ==========")
        return await self.report_agent.run(state)