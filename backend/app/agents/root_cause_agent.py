"""
Backward-compatibility shim for RootCauseAgent.
Root cause analysis has been refactored to app.decision.root_cause_engine.
"""

from app.decision.root_cause_engine import RootCauseEngine, RootCauseEngine as RootCauseAgent

__all__ = ["RootCauseAgent", "RootCauseEngine"]
