"""
===============================================================================
TattvaAI - Investigation Repository Abstraction
===============================================================================

Purpose:
--------
Handles persistence operations for investigation reports, providing:
• SQLiteInvestigationRepository (default local / hackathon storage)
• DynamoDBInvestigationRepository (optional serverless AWS storage)

Factory:
--------
get_investigation_repository(provider: Optional[str] = None)
Configured via settings.PERSISTENCE_PROVIDER ('sqlite' or 'dynamodb').

===============================================================================
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

from sqlalchemy.exc import SQLAlchemyError

from app.core.logger import logger
from app.core.settings import settings
from app.database.models import Investigation
from app.database.session import SessionLocal
from app.models.investigation_report import InvestigationReport


class BaseInvestigationRepository(ABC):
    """Abstract base repository for investigation persistence."""

    @abstractmethod
    def save_investigation(self, report: InvestigationReport | Dict[str, Any]) -> Any:
        pass

    @abstractmethod
    def get_all_investigations(self) -> List[Any]:
        pass

    @abstractmethod
    def get_investigation_by_id(self, investigation_id: Any) -> Optional[Any]:
        pass

    @abstractmethod
    def delete_investigation(self, investigation_id: Any) -> bool:
        pass

    @abstractmethod
    def close(self) -> None:
        pass


class SQLiteInvestigationRepository(BaseInvestigationRepository):
    """
    Default local SQLite persistence repository using SQLAlchemy.
    """

    def __init__(self) -> None:
        self.db = SessionLocal()

    def save_investigation(
        self,
        report: InvestigationReport | Dict[str, Any],
    ) -> Investigation:
        try:
            if hasattr(report, "model_dump"):
                report_dict = report.model_dump(mode="json")
                inc_id = report.incident_id
                title = report.title
                severity = report.severity
                status = report.status
                confidence = report.confidence
            else:
                report_dict = dict(report)
                inc_id = str(report_dict.get("incident_id") or report_dict.get("investigation_id") or "")
                title = report_dict.get("title", "Investigation")
                severity = report_dict.get("severity", "LOW")
                status = report_dict.get("status", "COMPLETED")
                confidence = int(report_dict.get("confidence", 0))

            investigation = Investigation(
                incident_id=inc_id,
                title=title,
                severity=severity,
                status=status,
                confidence=confidence,
                report=report_dict,
            )
            self.db.add(investigation)
            self.db.commit()
            self.db.refresh(investigation)
            return investigation
        except SQLAlchemyError:
            self.db.rollback()
            raise

    def get_all_investigations(self) -> List[Investigation]:
        return self.db.query(Investigation).all()

    def get_investigation_by_id(
        self,
        investigation_id: int | str,
    ) -> Optional[Investigation]:
        if isinstance(investigation_id, int) or (isinstance(investigation_id, str) and investigation_id.isdigit()):
            row = self.db.query(Investigation).filter(Investigation.id == int(investigation_id)).first()
            if row:
                return row
        return self.db.query(Investigation).filter(Investigation.incident_id == str(investigation_id)).first()

    def delete_investigation(
        self,
        investigation_id: int | str,
    ) -> bool:
        investigation = self.get_investigation_by_id(investigation_id)
        if investigation is None:
            return False
        self.db.delete(investigation)
        self.db.commit()
        return True

    def close(self) -> None:
        self.db.close()


class DynamoDBInvestigationRepository(BaseInvestigationRepository):
    """
    Amazon DynamoDB persistence repository.
    Stores structured investigation state and review metadata serverlessly.
    """

    def __init__(self) -> None:
        from app.services.dynamodb_service import DynamoDBService

        self.service = DynamoDBService(
            region=settings.AWS_REGION,
            table_name=settings.DYNAMODB_TABLE_NAME,
            aws_enabled=settings.AWS_ENABLED,
        )

    def save_investigation(
        self,
        report: InvestigationReport | Dict[str, Any],
    ) -> Dict[str, Any]:
        data = report.model_dump(mode="json") if hasattr(report, "model_dump") else dict(report)
        logger.info(
            "[InvestigationRepository] DynamoDBInvestigationRepository delegating save to DynamoDBService (table: '%s')",
            self.service.table_name,
        )
        return self.service.save_investigation(data)

    def get_all_investigations(self) -> List[Dict[str, Any]]:
        return self.service.list_investigations()

    def get_investigation_by_id(
        self,
        investigation_id: Any,
    ) -> Optional[Dict[str, Any]]:
        return self.service.get_investigation(str(investigation_id))

    def delete_investigation(
        self,
        investigation_id: Any,
    ) -> bool:
        return self.service.delete_investigation(str(investigation_id))

    def close(self) -> None:
        pass


def get_investigation_repository(
    provider: Optional[str] = None,
) -> BaseInvestigationRepository:
    """
    Factory creating the configured investigation repository.
    Defaults to SQLite for local development; supports DynamoDB for AWS deployments.
    """
    prov = (provider or settings.PERSISTENCE_PROVIDER or "sqlite").lower()
    if prov == "dynamodb":
        logger.info("Using DynamoDBInvestigationRepository for persistence")
        return DynamoDBInvestigationRepository()
    return SQLiteInvestigationRepository()


# Backwards compatibility alias
InvestigationRepository = SQLiteInvestigationRepository
