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


def _decimal_to_native(val: Any) -> Any:
    """Recursively convert DynamoDB Decimal instances back to standard Python ints/floats."""
    if isinstance(val, Decimal):
        return int(val) if val % 1 == 0 else float(val)
    if isinstance(val, dict):
        return {k: _decimal_to_native(v) for k, v in val.items()}
    if isinstance(val, list):
        return [_decimal_to_native(v) for v in val]
    return val


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
                    "[DynamoDB] Initialized DynamoDB Table resource (Region: %s, Table: %s)",
                    self.region,
                    self.table_name,
                )
            except Exception as e:
                logger.error("[DynamoDB] Failed to initialize DynamoDB resource: %s", e)
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
        When AWS_ENABLED=true, persists to DynamoDB and raises DynamoDBServiceError on failure.
        """
        if hasattr(investigation, "model_dump"):
            data = investigation.model_dump(mode="json")
        elif not isinstance(investigation, dict):
            data = dict(investigation)
        else:
            data = dict(investigation)

        # 1. Check if DynamoDB is enabled
        if not self.is_available():
            logger.info(
                "[DynamoDB] DynamoDB is disabled (AWS_ENABLED=%s). Skipping remote persistence.",
                self.aws_enabled,
            )
            if raise_if_disabled:
                raise DynamoDBConfigurationError("DynamoDB service is disabled.")
            return data

        # 2. Initialize table resource
        table = self._get_table()
        if table is None:
            msg = f"[DynamoDB] Table resource could not be initialized (Region: {self.region}, Table: {self.table_name})"
            logger.error(msg)
            raise DynamoDBServiceError(msg)

        # 3. Extract and strictly validate the DynamoDB partition key: 'incident_id'
        inc_id = str(
            data.get("incident_id")
            or data.get("investigation_id")
            or data.get("id")
            or ""
        ).strip()

        if not inc_id or inc_id.lower() in ("none", "undefined", "null", "unknown", ""):
            msg = f"[DynamoDB] Cannot save investigation: missing or invalid partition key 'incident_id' (value: '{inc_id}')"
            logger.error(msg)
            raise DynamoDBServiceError(msg)

        # Ensure consistent IDs across data
        data["incident_id"] = inc_id
        data["investigation_id"] = inc_id
        data["id"] = inc_id

        # 4. Serialize with floats converted to Decimal for DynamoDB compatibility
        try:
            item = json.loads(json.dumps(data, default=str), parse_float=Decimal)
            item["incident_id"] = inc_id
        except Exception as e:
            msg = f"[DynamoDB] Failed to serialize investigation data for incident '{inc_id}': {e}"
            logger.error(msg)
            raise DynamoDBServiceError(msg) from e

        # 5. Attempt put_item with structured logging
        logger.info(
            "[DynamoDB] Attempting DynamoDB put_item into table '%s' (Region: %s) for incident_id '%s'",
            self.table_name,
            self.region,
            inc_id,
        )

        try:
            table.put_item(Item=item)
            logger.info(
                "[DynamoDB] Successful put_item: saved investigation '%s' to DynamoDB table '%s'",
                inc_id,
                self.table_name,
            )
            return data
        except (ClientError, BotoCoreError) as e:
            logger.error(
                "[DynamoDB] AWS error saving incident '%s' to table '%s': %s (Type: %s)",
                inc_id,
                self.table_name,
                e,
                type(e).__name__,
            )
            raise DynamoDBServiceError(
                f"DynamoDB put_item failed for incident '{inc_id}' in table '{self.table_name}': {e}"
            ) from e
        except Exception as e:
            logger.error(
                "[DynamoDB] Unexpected error saving incident '%s' to table '%s': %s (Type: %s)",
                inc_id,
                self.table_name,
                e,
                type(e).__name__,
            )
            raise DynamoDBServiceError(
                f"Unexpected error saving incident '{inc_id}' to table '{self.table_name}': {e}"
            ) from e

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
                "[DynamoDB] DynamoDB is disabled (AWS_ENABLED=%s). get_investigation returns None.",
                self.aws_enabled,
            )
            if raise_if_disabled:
                raise DynamoDBConfigurationError("DynamoDB service is disabled.")
            return None

        table = self._get_table()
        if table is None:
            msg = f"[DynamoDB] Table resource could not be initialized for get_investigation (Table: {self.table_name})"
            logger.error(msg)
            if raise_if_disabled:
                raise DynamoDBServiceError(msg)
            return None

        inc_id = str(investigation_id).strip()
        logger.info(
            "[DynamoDB] Attempting get_item from table '%s' for incident_id '%s'",
            self.table_name,
            inc_id,
        )

        try:
            response = table.get_item(Key={"incident_id": inc_id})
            item = response.get("Item")
            if item:
                logger.info(
                    "[DynamoDB] Found investigation '%s' in table '%s'",
                    inc_id,
                    self.table_name,
                )
                return _decimal_to_native(item)
            logger.info(
                "[DynamoDB] Investigation '%s' not found in table '%s'",
                inc_id,
                self.table_name,
            )
            return None

        except (ClientError, BotoCoreError) as e:
            logger.error("[DynamoDB] get_item failed for '%s' in table '%s': %s", inc_id, self.table_name, e)
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
                "[DynamoDB] DynamoDB is disabled (AWS_ENABLED=%s). list_investigations returns empty list.",
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
            logger.info("[DynamoDB] Attempting scan on table '%s' (limit=%d)", self.table_name, limit)
            response = table.scan(Limit=limit)
            items = response.get("Items", [])
            # Filter out user entities if stored in the same table
            filtered_items = [
                item for item in items
                if not str(item.get("incident_id", "")).startswith("USER#")
            ]
            logger.info("[DynamoDB] Scan returned %d investigation items from table '%s'", len(filtered_items), self.table_name)
            return [_decimal_to_native(item) for item in filtered_items]

        except (ClientError, BotoCoreError) as e:
            logger.error("[DynamoDB] scan failed on table '%s': %s", self.table_name, e)
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
                "[DynamoDB] DynamoDB is disabled (AWS_ENABLED=%s). delete_investigation returns False.",
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

        inc_id = str(investigation_id).strip()
        logger.info("[DynamoDB] Attempting delete_item on table '%s' for incident_id '%s'", self.table_name, inc_id)
        try:
            table.delete_item(Key={"incident_id": inc_id})
            logger.info("[DynamoDB] Deleted investigation '%s' from DynamoDB table '%s'", inc_id, self.table_name)
            return True
        except (ClientError, BotoCoreError) as e:
            logger.error("[DynamoDB] delete_item failed for '%s': %s", inc_id, e)
            if raise_if_disabled:
                raise DynamoDBServiceError(f"DynamoDB delete_item failed: {e}") from e
            return False


# Global DynamoDB Service instance
dynamodb_service = DynamoDBService()
