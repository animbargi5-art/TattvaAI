"""
===============================================================================
TattvaAI - Metrics Agent
===============================================================================

Purpose
-------
Analyzes application metrics and converts them into investigation evidence.

Responsibilities
----------------
• Retrieve normalized metrics
• Analyze metric anomalies
• Generate Evidence objects
• Update InvestigationState

Flow
----
InvestigationState
        ↓
MetricsTool
        ↓
Metric
        ↓
Evidence
        ↓
InvestigationState

===============================================================================
"""

from __future__ import annotations

from app.agents.base_agent import BaseAgent

from app.models.metric import Metric
from app.models.evidence import Evidence

from app.schemas.investigation_state import InvestigationState

from app.tools.metrics_tool import MetricsTool


class MetricsAgent(BaseAgent):
    """
    AI agent responsible for metric analysis.
    """

    CPU_THRESHOLD = 85

    MEMORY_THRESHOLD = 85

    LATENCY_THRESHOLD = 1000

    ERROR_RATE_THRESHOLD = 5

    REQUEST_RATE_THRESHOLD = 30

    def __init__(self):

        super().__init__(

            name="Metrics Agent",

            description="Analyzes application metrics.",

        )

        self.metrics_tool = MetricsTool()

    # ------------------------------------------------------------------
    # Execute
    # ------------------------------------------------------------------

    async def execute(
        self,
        state: InvestigationState,
    ) -> InvestigationState:

        #
        # Retrieve metrics
        #

        metrics = await self.metrics_tool.execute(

            service_name=state.service_name,

            metric_name="*",

        )

        state.metrics = metrics

        highest_confidence = state.confidence

        #
        # Analyze metrics
        #

        for metric in metrics:

            evidence = self.analyze_metric(metric)

            if evidence is None:

                continue

            self.add_evidence(

                state,

                evidence,

            )

            highest_confidence = max(

                highest_confidence,

                evidence.confidence,

            )

        self.set_confidence(

            state,

            highest_confidence,

        )

        self.add_timeline(

            state,

            f"Metrics Agent analyzed {len(metrics)} metric(s).",

        )

        return state

    # ------------------------------------------------------------------
    # Metric Analysis
    # ------------------------------------------------------------------

    def analyze_metric(

        self,

        metric: Metric,

    ) -> Evidence | None:

        #
        # CPU
        #

        if metric.is_cpu and metric.exceeds(

            self.CPU_THRESHOLD

        ):

            return self.create_evidence(

                metric,

                "High CPU Usage",

                "Infrastructure",

                "HIGH",

                90,

                f"CPU usage reached {metric.value}{metric.unit or ''}.",

                "Investigate CPU intensive workloads.",

            )

        #
        # Memory
        #

        if metric.is_memory and metric.exceeds(

            self.MEMORY_THRESHOLD

        ):

            return self.create_evidence(

                metric,

                "High Memory Usage",

                "Infrastructure",

                "HIGH",

                90,

                f"Memory usage reached {metric.value}{metric.unit or ''}.",

                "Inspect memory leaks and garbage collection.",

            )

        #
        # Latency
        #

        if metric.is_latency and metric.exceeds(

            self.LATENCY_THRESHOLD

        ):

            return self.create_evidence(

                metric,

                "High Latency",

                "Performance",

                "HIGH",

                95,

                f"Latency increased to {metric.value}{metric.unit or ' ms'}.",

                "Inspect slow queries and external dependencies.",

            )

        #
        # Error Rate
        #

        if metric.is_error_rate and (
            metric.exceeds(self.ERROR_RATE_THRESHOLD)
            or (metric.value <= 1.0 and metric.value * 100 >= self.ERROR_RATE_THRESHOLD)
        ):


            return self.create_evidence(

                metric,

                "High Error Rate",

                "Application",

                "CRITICAL",

                98,

                f"Error rate reached {metric.value}{metric.unit or '%'}.",

                "Review application logs and recent deployments.",

            )

        #
        # Request Rate
        #

        if metric.is_request_rate and metric.exceeds(

            self.REQUEST_RATE_THRESHOLD

        ):

            return self.create_evidence(

                metric,

                "High Traffic",

                "Infrastructure",

                "MEDIUM",

                80,

                f"Request rate reached {metric.value}{metric.unit or ''}.",

                "Verify autoscaling and backend capacity.",

            )

        return None

    # ------------------------------------------------------------------
    # Evidence Builder
    # ------------------------------------------------------------------

    def create_evidence(

        self,

        metric: Metric,

        evidence_type: str,

        category: str,

        severity: str,

        confidence: int,

        summary: str,

        recommendation: str,

    ) -> Evidence:

        return Evidence(

            source="metrics",

            category=category,

            type=evidence_type,

            severity=severity,

            confidence=confidence,

            service_name=metric.service_name,

            title=evidence_type,

            summary=summary,

            recommendation=recommendation,

            metric_name=metric.metric_name,

            timestamp=metric.timestamp,

            raw=metric.model_dump(),

        )