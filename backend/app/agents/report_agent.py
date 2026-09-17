"""
===============================================================================
TattvaAI - Report Agent
===============================================================================

Purpose
-------
Generates the final AI investigation report and persists it to memory.

Responsibilities
----------------
• Collect investigation results
• Build InvestigationReport model
• Attach historical context
• Generate executive summary
• Store final report inside InvestigationState
• Persist completed investigation into InvestigationMemory

Flow
----
InvestigationState
        ↓
ReportAgent
        ↓
InvestigationReport
        ↓
InvestigationMemory.save_investigation()
===============================================================================
"""

from __future__ import annotations

from datetime import datetime

from app.agents.base_agent import BaseAgent
from app.models.investigation_report import InvestigationReport
from app.schemas.investigation_state import InvestigationState


class ReportAgent(BaseAgent):
    """
    Generates the final AI investigation report.
    """

    def __init__(self):
        super().__init__(
            name="Report Agent",
            description="Generates the final AI investigation report.",
        )

    async def execute(
        self,
        state: InvestigationState,
    ) -> InvestigationState:
        report = InvestigationReport(
            investigation_id=state.incident_id,
            incident_id=state.incident_id,
            service_name=state.service_name,
            title=state.incident.get(
                "title",
                "Unknown Incident"
            ),
            status=state.incident.get(
                "status",
                "UNKNOWN"
            ),
            severity=self.highest_severity(state),
            confidence=state.confidence,
            evidence=state.evidence,
            correlations=state.correlations,
            root_causes=state.root_causes,
            recommendations=state.recommendations,
            historical_context=getattr(state, "historical_context", []),
            review_status=getattr(state, "review_status", "PENDING_REVIEW") or "PENDING_REVIEW",
            review_decision=getattr(state, "review_decision", None),
            selected_hypothesis=getattr(state, "selected_hypothesis", None),
            reviewer_notes=getattr(state, "reviewer_notes", None),
            resolution=getattr(state, "resolution", None),
            timeline=state.timeline,
            executive_summary=self.generate_summary(state),
            technical_summary=state.reasoning.get(
                "summary", "No additional technical summary is available."
            ),
            reasoning=state.reasoning,
            graph=state.reasoning.get("graph", {}),
            evidence_count=len(state.evidence),
            correlation_count=len(state.correlations),
            root_cause_count=len(state.root_causes),
            recommendation_count=len(state.recommendations),
            generated_at=datetime.utcnow(),
            generated_by="TattvaAI",
        )

        state.final_report = report

        # Persist completed investigation into InvestigationMemory
        try:
            from app.memory import investigation_memory
            investigation_memory.save_investigation(state)
        except Exception as e:
            self.log(f"Warning: Could not save to InvestigationMemory: {e}")

        self.add_timeline(
            state,
            "Report Agent generated final investigation report.",
        )

        return state

    # ------------------------------------------------------------------
    # Highest Severity
    # ------------------------------------------------------------------

    def highest_severity(
        self,
        state: InvestigationState,
    ) -> str:
        priority = {
            "CRITICAL": 4,
            "HIGH": 3,
            "MEDIUM": 2,
            "LOW": 1,
        }

        highest = "LOW"
        for root in state.root_causes:
            if priority.get(root.severity, 0) > priority.get(highest, 0):
                highest = root.severity

        return highest

    # ------------------------------------------------------------------
    # Executive Summary
    # ------------------------------------------------------------------

    def generate_summary(
        self,
        state: InvestigationState,
    ) -> str:
        services = sorted({
            correlation.service_name
            for correlation in state.correlations
        })

        affected = ", ".join(services) if services else "None"

        return (
            f"Investigation completed for "
            f"'{state.service_name}'. "
            f"{len(state.evidence)} evidence item(s), "
            f"{len(state.correlations)} correlation(s), "
            f"{len(state.root_causes)} root cause(s), "
            f"{len(state.recommendations)} recommendation(s). "
            f"Affected services: {affected}. "
            f"Confidence Score: {state.confidence}%."
        )
