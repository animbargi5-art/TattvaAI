"""
===============================================================================
TattvaAI Domain Models
===============================================================================

Central exports for all domain models.

These models are transport-independent and represent the canonical
business objects used throughout the TattvaAI investigation pipeline.

Layers
------
Telemetry
    Trace
    Log
    Metric
    Dependency
    Alert

Investigation
    Evidence
    HistoricalIncident
    Correlation

Decision
    RootCause
    Recommendation

Review
    ReviewStatus
    ReviewDecision
    ReviewSubmission
    ReviewAuditRecord

Output
    InvestigationReport

===============================================================================
"""

# ---------------------------------------------------------------------
# Telemetry Models
# ---------------------------------------------------------------------

from app.models.trace import Trace
from app.models.log import Log
from app.models.metric import Metric
from app.models.dependency import Dependency
from app.models.alert import Alert

# ---------------------------------------------------------------------
# Investigation Models
# ---------------------------------------------------------------------

from app.models.evidence import Evidence
from app.models.historical_incident import HistoricalIncident
from app.models.correlation import Correlation

# ---------------------------------------------------------------------
# Decision Models
# ---------------------------------------------------------------------

from app.models.root_cause import RootCause
from app.models.recommendation import Recommendation

# ---------------------------------------------------------------------
# Review Models
# ---------------------------------------------------------------------

from app.models.review import (
    ReviewStatus,
    ReviewDecision,
    ReviewSubmission,
    ReviewAuditRecord,
)

# ---------------------------------------------------------------------
# Output Models
# ---------------------------------------------------------------------

from app.models.investigation_report import InvestigationReport

__all__ = [
    # Telemetry
    "Trace",
    "Log",
    "Metric",
    "Dependency",
    "Alert",

    # Investigation
    "Evidence",
    "HistoricalIncident",
    "Correlation",

    # Decision
    "RootCause",
    "Recommendation",

    # Review
    "ReviewStatus",
    "ReviewDecision",
    "ReviewSubmission",
    "ReviewAuditRecord",

    # Output
    "InvestigationReport",
]
