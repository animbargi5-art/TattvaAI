"""
===============================================================================
TattvaAI - Memory Package
===============================================================================

The Memory package provides persistent investigation memory and historical
learning for the TattvaAI Autonomous Incident Investigation Platform.

It stores completed investigation records and enables deterministic historical
retrieval of similar incidents to supply supporting context for AI reasoning.
===============================================================================
"""

from .investigation_memory import (
    HistoricalInvestigationMatch,
    InvestigationMemory,
    InvestigationRecord,
    investigation_memory,
)
from .manager import MemoryManager

__all__ = [
    "InvestigationMemory",
    "investigation_memory",
    "InvestigationRecord",
    "HistoricalInvestigationMatch",
    "MemoryManager",
]
