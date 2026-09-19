from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel
from pydantic import Field

from app.models.evidence import Evidence
from app.models.trace import Trace
from app.models.log import Log
from app.models.metric import Metric
from app.models.dependency import Dependency
from app.models.alert import Alert
from app.models.correlation import Correlation

from app.models.root_cause import RootCause
from app.models.recommendation import Recommendation
from app.models.investigation_report import InvestigationReport
from app.models.historical_incident import HistoricalIncident



class InvestigationState(BaseModel):
    """
    Shared state that flows through every LangGraph node.
    """

    # -------------------------------------------------
    # Incident
    # -------------------------------------------------

    incident_id: str

    service_name: str

    incident: dict[str, Any] = Field(default_factory=dict)

    telemetry_source: Optional[str] = None
    telemetry_mode: Optional[str] = None
    environment: str = "production"

    # -------------------------------------------------
    # Raw Telemetry
    # -------------------------------------------------

    traces: list[Trace] = Field(default_factory=list)

    logs: list[Log] = Field(default_factory=list)

    metrics: list[Metric] = Field(default_factory=list)

    dependencies: list[Dependency] = Field(default_factory=list)

    alerts: list[Alert] = Field(default_factory=list)

    historical_incidents: list[HistoricalIncident] = Field(default_factory=list)
    historical_context: list[dict[str, Any]] = Field(default_factory=list)

    # -------------------------------------------------
    # Investigation
    # -------------------------------------------------

    evidence: list[Evidence] = Field(default_factory=list)

    correlations: list[Correlation] = Field(default_factory=list)

    root_causes: list[RootCause] = Field(default_factory=list)

    recommendations: list[Recommendation] = Field(default_factory=list)

    reasoning: dict[str, Any] = Field(default_factory=dict)

    # -------------------------------------------------
    # Investigation Graph
    # -------------------------------------------------

    graph: dict[str, Any] = Field(default_factory=dict)

    # -------------------------------------------------
    # Timeline
    # -------------------------------------------------

    timeline: list[str] = Field(default_factory=list)

    # -------------------------------------------------
    # Execution
    # -------------------------------------------------

    current_agent: str = ""

    completed_agents: list[str] = Field(default_factory=list)

    failed_agents: list[str] = Field(default_factory=list)

    pipeline_execution: list[dict[str, Any]] = Field(default_factory=list)

    # -------------------------------------------------
    # Report & Review
    # -------------------------------------------------

    confidence: int = 0

    final_report: InvestigationReport | None = None

    review_status: str = "PENDING_REVIEW"

    review_decision: dict[str, Any] | None = None

    selected_hypothesis: str | None = None

    reviewer_notes: str | None = None

    resolution: str | None = None

    reviewed_at: str | None = None