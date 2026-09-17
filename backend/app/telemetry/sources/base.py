"""
===============================================================================
TattvaAI - Telemetry Source Interface
===============================================================================

Purpose
-------
Vendor-neutral interface for retrieving telemetry evidence for TattvaAI agents.
Implementations normalize telemetry signals into canonical domain models.

===============================================================================
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, List, Optional

from app.models.trace import Trace
from app.models.log import Log
from app.models.metric import Metric
from app.models.dependency import Dependency
from app.models.alert import Alert
from app.models.historical_incident import HistoricalIncident


class TelemetrySource(ABC):
    """
    Abstract interface for telemetry evidence sources.
    Decouples investigation agents from any single observability backend.
    """

    @abstractmethod
    async def get_traces(
        self,
        service_name: str,
        **kwargs: Any,
    ) -> List[Trace]:
        """Retrieve distributed trace spans for the target service."""
        pass

    @abstractmethod
    async def get_logs(
        self,
        service_name: str,
        **kwargs: Any,
    ) -> List[Log]:
        """Retrieve structured logs for the target service."""
        pass

    @abstractmethod
    async def get_metrics(
        self,
        service_name: str,
        metric_name: Optional[str] = None,
        **kwargs: Any,
    ) -> List[Metric]:
        """Retrieve operational metric data points for the target service."""
        pass

    @abstractmethod
    async def get_dependencies(
        self,
        service_name: str,
        **kwargs: Any,
    ) -> List[Dependency]:
        """Retrieve service topology and dependency health."""
        pass

    @abstractmethod
    async def get_alerts(
        self,
        service_name: Optional[str] = None,
        **kwargs: Any,
    ) -> List[Alert]:
        """Retrieve active or triggered alerts."""
        pass

    @abstractmethod
    async def get_historical_incidents(
        self,
        service_name: str,
        **kwargs: Any,
    ) -> List[HistoricalIncident]:
        """Retrieve historical incidents for cross-incident pattern matching."""
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        """Verify provider availability and connectivity."""
        pass
