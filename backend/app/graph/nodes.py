"""
===============================================================================
TattvaAI - Graph Nodes
===============================================================================

Purpose
-------
Defines every LangGraph node used in the investigation workflow.

Each node is only responsible for invoking one Agent or Engine.

Nodes should NEVER:

❌ Query SigNoz directly
❌ Perform AI reasoning
❌ Parse telemetry
❌ Generate reports themselves

Those responsibilities belong to the underlying agents and engines.

Flow
----
InvestigationState
        ↓
Trace Node
        ↓
Logs Node
        ↓
Metrics Node
        ↓
Dependency Node
        ↓
Historical Node
        ↓
Alert Node
        ↓
Investigation Node
        ↓
Report Node

===============================================================================
"""

from __future__ import annotations

from app.graph.state import InvestigationState

from app.agents.trace_agent import TraceAgent
from app.agents.logs_agent import LogsAgent
from app.agents.metrics_agent import MetricsAgent
from app.agents.dependency_agent import DependencyAgent
from app.agents.historical_agent import HistoricalAgent
from app.agents.alert_agent import AlertAgent
from app.agents.report_agent import ReportAgent

from app.decision.investigation_engine import InvestigationEngine


# ============================================================================
# Agent Instances
# ============================================================================

trace_agent = TraceAgent()

logs_agent = LogsAgent()

metrics_agent = MetricsAgent()

dependency_agent = DependencyAgent()

historical_agent = HistoricalAgent()

alert_agent = AlertAgent()

investigation_engine = InvestigationEngine()

report_agent = ReportAgent()


# ============================================================================
# Trace
# ============================================================================

async def trace_node(
    state: InvestigationState,
) -> InvestigationState:

    return await trace_agent.run(state)


# ============================================================================
# Logs
# ============================================================================

async def logs_node(
    state: InvestigationState,
) -> InvestigationState:

    return await logs_agent.run(state)


# ============================================================================
# Metrics
# ============================================================================

async def metrics_node(
    state: InvestigationState,
) -> InvestigationState:

    return await metrics_agent.run(state)


# ============================================================================
# Dependencies
# ============================================================================

async def dependency_node(
    state: InvestigationState,
) -> InvestigationState:

    return await dependency_agent.run(state)


# ============================================================================
# Historical
# ============================================================================

async def historical_node(
    state: InvestigationState,
) -> InvestigationState:

    return await historical_agent.run(state)


# ============================================================================
# Alerts
# ============================================================================

async def alert_node(
    state: InvestigationState,
) -> InvestigationState:

    return await alert_agent.run(state)


# ============================================================================
# Investigation
# ============================================================================

async def investigation_node(
    state: InvestigationState,
) -> InvestigationState:

    return await investigation_engine.execute(state)


# ============================================================================
# Report
# ============================================================================

async def report_node(
    state: InvestigationState,
) -> InvestigationState:

    return await report_agent.run(state)