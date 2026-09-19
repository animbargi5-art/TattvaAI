"""
Backward-compatibility shim for CorrelationEngine.
The CorrelationEngine has been refactored to app.decision.correlation_engine.
"""

from app.decision.correlation_engine import CorrelationEngine, CorrelationType

__all__ = ["CorrelationEngine", "CorrelationType"]
