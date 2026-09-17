"""
===============================================================================
TattvaAI - Amazon DynamoDB Service Abstraction
===============================================================================

Purpose
-------
Service abstraction for persistent investigation state and report storage
using Amazon DynamoDB.

Features
--------
â€¢ Uses boto3 DynamoDB resource
â€¢ Configured via application settings (AWS_REGION, DYNAMODB_TABLE_NAME, AWS_ENABLED)
â€¢ Standard AWS credential chain resolution (zero hardcoded secrets)
â€¢ Graceful, controlled behavior when AWS is disabled for local development
â€¢ Clean serialization (converts floats to Decimal where needed for DynamoDB)

===============================================================================
"""

from __future__ import annotations

import json
from decimal import Decimal
from typing import Any, Dict, List, Optional

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.core.logger import logger
from app.core.settings import settings


class DynamoDBServiceError(Exception):
    """Base exception for DynamoDB service operations."""
    pass


class DynamoDBConfigurationError(DynamoDBServiceError):
    """Raised when DynamoDB is requested but not properly configured."""
    pass


class DynamoDBService:
    """
    Service abstraction for Amazon DynamoDB storage.
    """

    def __init__(
        self,
        region: Optional[str] = None,
        table_name: Optional[str] = None,
        aws_enabled: Optional[bool] = None,
    ) -> None:
        self.region = region or settings.AWS_REGION
        self.table_name = table_name or settings.DYNAMODB_TABLE_NAME
        self.aws_enabled = settings.AWS_ENABLED if aws_enabled is None else aws_enabled
        self._resource = None
        self._table = None

    def is_available(self) -> bool:
        """Check if DynamoDB service is enabled and configured."""
        return bool(self.aws_enabled)

    def _get_table(self):
        """Lazily initialize and return the DynamoDB Table resource."""
        if not self.aws_enabled:
            return None

        if self._table is None:
            try:
                self._resource = boto3.resource(
                    "dynamodb",
                    region_name=self.region,
                )
                self._table = self._resource.Table(self.table_name)
                logger.info(
                    "Initialized DynamoDB Table resource (Region: %s, Table: %s)",
                    self.region,
                    self.table_name,
                )
            except Exception as e:
                logger.warning("Failed to initialize DynamoDB resource: %s", e)
                self._table = None

        return self._table

    def save_investigation(
        self,
        investigation: Dict[str, Any] | Any,
        raise_if_disabled: bool = False,
    ) -> Dict[str, Any]:
        """
        Save an investigation record to Amazon DynamoDB.

        When AWS_ENABLED=false, gracefully skips remote persistence
        and returns the investigation payload unchanged.
        """
        if hasattr(investigation, "model_dump"):
            data = investigation.model_dump(mode="json")
        elif not isinstance(investigation, dict):
            data = dict(investigation)
        else:
            data = dict(investigation)

        if not self.is_available():
            logger.info(
                "DynamoDB is disabled (AWS_ENABLED=%s). Skipping remote persistence.",
                self.aws_enabled,
            )
            if raise_if_disabled:
                raise DynamoDBConfigurationError("DynamoDB service is disabled.")
            return data

        table = self._get_table()
        if table is None:
            msg = "DynamoDB table resource could not be initialized."
            logger.error(msg)
            if raise_if_disabled:
                raise DynamoDBServiceError(msg)
            return data

        try:
            # DynamoDB requires floats to be serialized as Decimal or strings
            item = json.loads(json.dumps(data), parse_float=Decimal)
            # Ensure primary key is populated
            if "incident_id" not in item:
                item["incident_id"] = str(data.get("investigation_id", "UNKNOWN"))

            table.put_item(Item=item)
            logger.info("Saved investigation '%s' to DynamoDB table '%s'", item.get("incident_id"), self.table_name)
            return data

        except (ClientError, BotoCoreError) as e:
            logger.error("Failed to put item into DynamoDB: %s", e)
            if raise_if_disabled:
                raise DynamoDBServiceError(f"DynamoDB put_item failed: {e}") from e
            return data
        except Exception as e:
            logger.error("Unexpected error saving to DynamoDB: %s", e)
            if raise_if_disabled:
                raise DynamoDBServiceError(f"Unexpected DynamoDB error: {e}") from e
            return data

    def get_investigation(
        self,
        investigation_id: str,
        raise_if_disabled: bool = False,
    ) -> Optional[Dict[str, Any]]:
        """
        Retrieve an investigation by incident_id from DynamoDB.
        """
        if not self.is_available():
            logger.info(
                "DynamoDB is disabled (AWS_ENABLED=%s). get_investigation returns None.",
                self.aws_enabled,
            )
            if raise_if_disabled:
                raise DynamoDBConfigurationError("DynamoDB service is disabled.")
            return None

        table = self._get_table()
        if table is None:
            if raise_if_disabled:
                raise DynamoDBServiceError("DynamoDB table resource is not available.")
            return None

        try:
            response = table.get_item(Key={"incident_id": str(investigation_id)})
            item = response.get("Item")
            if item:
                # Convert Decimals back to standard floats/ints for JSON compatibility
                return json.loads(json.dumps(item, default=float))
            return None

        except (ClientError, BotoCoreError) as e:
            logger.error("DynamoDB get_item failed for '%s': %s", investigation_id, e)
            if raise_if_disabled:
                raise DynamoDBServiceError(f"DynamoDB get_item failed: {e}") from e
            return None

    def list_investigations(
        self,
        limit: int = 20,
        raise_if_disabled: bool = False,
    ) -> List[Dict[str, Any]]:
        """
        List recent investigations from DynamoDB.
        """
        if not self.is_available():
            logger.info(
                "DynamoDB is disabled (AWS_ENABLED=%s). list_investigations returns empty list.",
                self.aws_enabled,
            )
            if raise_if_disabled:
                raise DynamoDBConfigurationError("DynamoDB service is disabled.")
            return []

        table = self._get_table()
        if table is None:
            if raise_if_disabled:
                raise DynamoDBServiceError("DynamoDB table resource is not available.")
            return []

        try:
            response = table.scan(Limit=limit)
            items = response.get("Items", [])
            return json.loads(json.dumps(items, default=float))

        except (ClientError, BotoCoreError) as e:
            logger.error("DynamoDB scan failed: %s", e)
            if raise_if_disabled:
                raise DynamoDBServiceError(f"DynamoDB scan failed: {e}") from e
            return []

    def delete_investigation(
        self,
        investigation_id: str,
        raise_if_disabled: bool = False,
    ) -> bool:
        """
        Delete an investigation record by incident_id from DynamoDB.
        """
        if not self.is_available():
            logger.info(
                "DynamoDB is disabled (AWS_ENABLED=%s). delete_investigation returns False.",
                self.aws_enabled,
            )
            if raise_if_disabled:
                raise DynamoDBConfigurationError("DynamoDB service is disabled.")
            return False

        table = self._get_table()
        if table is None:
            if raise_if_disabled:
                raise DynamoDBServiceError("DynamoDB table resource is not available.")
            return False

        try:
            table.delete_item(Key={"incident_id": str(investigation_id)})
            logger.info("Deleted investigation '%s' from DynamoDB table '%s'", investigation_id, self.table_name)
            return True
        except (ClientError, BotoCoreError) as e:
            logger.error("DynamoDB delete_item failed for '%s': %s", investigation_id, e)
            if raise_if_disabled:
                raise DynamoDBServiceError(f"DynamoDB delete_item failed: {e}") from e
            return False


# Global DynamoDB Service instance
dynamodb_service = DynamoDBService()
