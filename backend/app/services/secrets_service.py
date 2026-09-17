"""
===============================================================================
TattvaAI - AWS Secrets Manager Service Abstraction
===============================================================================

Purpose:
--------
Provides secure secret retrieval from AWS Secrets Manager for production deployments.
Enforces strict security rules:
• Uses the standard AWS credential provider chain (IAM role, STS, or environment)
• Never prints or logs secret contents
• Does not auto-create secrets
• Gracefully falls back to environment variables when running locally / offline

===============================================================================
"""

from __future__ import annotations

import json
import os
from typing import Any, Dict, Optional

from app.core.logger import logger
from app.core.settings import settings


class SecretsManagerService:
    """
    Service wrapper for AWS Secrets Manager.
    """

    def __init__(
        self,
        region: Optional[str] = None,
        secret_name: Optional[str] = None,
        enabled: Optional[bool] = None,
    ) -> None:
        self.region = region or settings.AWS_REGION
        self.secret_name = secret_name or settings.AWS_SECRET_NAME
        self.enabled = settings.SECRETS_MANAGER_ENABLED if enabled is None else enabled
        self._client = None

    def is_enabled(self) -> bool:
        """Return True if Secrets Manager integration is actively enabled."""
        return bool(self.enabled and settings.AWS_ENABLED)

    def _get_client(self):
        if not self.is_enabled():
            return None

        if self._client is None:
            try:
                import boto3
                self._client = boto3.client("secretsmanager", region_name=self.region)
                logger.info(
                    "Initialized AWS Secrets Manager client (Region: %s, SecretName: %s)",
                    self.region,
                    self.secret_name,
                )
            except Exception as e:
                logger.warning("Failed to initialize boto3 secretsmanager client: %s", e)
                self._client = None
        return self._client

    def get_secret(self, secret_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Fetch and parse secrets from AWS Secrets Manager.

        SECURITY GUARANTEE:
        Secret values are never logged, printed, or exposed in exception messages.
        """
        target = secret_name or self.secret_name
        client = self._get_client()

        if client is None:
            logger.debug("Secrets Manager disabled or offline. Using local environment variables.")
            return {}

        try:
            response = client.get_secret_value(SecretId=target)
            if "SecretString" in response:
                secret_str = response["SecretString"]
                try:
                    return json.loads(secret_str)
                except Exception:
                    return {"secret": secret_str}
            return {}
        except Exception as e:
            # Mask secret value, log only the failure event without revealing sensitive info
            logger.warning("Secrets Manager: Failed to retrieve secret '%s': %s", target, type(e).__name__)
            return {}


secrets_service = SecretsManagerService()
