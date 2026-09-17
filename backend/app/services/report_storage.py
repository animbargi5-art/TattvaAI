"""
===============================================================================
TattvaAI - Report Storage Abstraction
===============================================================================

Purpose:
--------
Provides an extensible archive storage layer for completed investigation reports.
Supports:
• LocalReportStorage (default local filesystem / memory archive)
• S3ReportStorage (Amazon S3 bucket archive for serverless production)

Factory:
--------
get_report_storage(provider: Optional[str] = None)
Configured via settings.REPORT_STORAGE_PROVIDER ('local' or 's3').

===============================================================================
"""

from __future__ import annotations

import json
import os
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

from app.core.logger import logger
from app.core.settings import settings


class BaseReportStorage(ABC):
    """Abstract base class for report archiving."""

    @abstractmethod
    def save_report(self, report_id: str, report_data: Dict[str, Any]) -> str:
        """Save report and return its storage location identifier or URI."""
        pass

    @abstractmethod
    def get_report(self, report_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve stored report JSON by report_id."""
        pass

    @abstractmethod
    def list_reports(self) -> List[str]:
        """List all stored report identifiers."""
        pass


class LocalReportStorage(BaseReportStorage):
    """
    Default local archive storage for investigation reports.
    Maintains an in-memory cache and local JSON file persistence.
    """

    def __init__(self, base_dir: str = "data/reports") -> None:
        self.base_dir = base_dir
        self._memory_cache: Dict[str, Dict[str, Any]] = {}
        try:
            os.makedirs(self.base_dir, exist_ok=True)
        except Exception:
            pass

    def save_report(self, report_id: str, report_data: Dict[str, Any]) -> str:
        self._memory_cache[report_id] = report_data
        file_path = os.path.join(self.base_dir, f"{report_id}.json")
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(report_data, f, indent=2, default=str)
            logger.info("LocalReportStorage: Saved report '%s' to %s", report_id, file_path)
            return f"local://{file_path}"
        except Exception as e:
            logger.debug("LocalReportStorage: Memory-only save for '%s' (%s)", report_id, e)
            return f"memory://{report_id}"

    def get_report(self, report_id: str) -> Optional[Dict[str, Any]]:
        if report_id in self._memory_cache:
            return self._memory_cache[report_id]

        file_path = os.path.join(self.base_dir, f"{report_id}.json")
        if os.path.exists(file_path):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self._memory_cache[report_id] = data
                return data
            except Exception as e:
                logger.warning("LocalReportStorage: Failed to read %s: %s", file_path, e)
        return None

    def list_reports(self) -> List[str]:
        ids = list(self._memory_cache.keys())
        if os.path.exists(self.base_dir):
            try:
                for f in os.listdir(self.base_dir):
                    if f.endswith(".json"):
                        rid = f[:-5]
                        if rid not in ids:
                            ids.append(rid)
            except Exception:
                pass
        return ids


class S3ReportStorage(BaseReportStorage):
    """
    Amazon S3 report storage implementation.
    Persists canonical investigation report JSON documents to an S3 bucket.
    """

    def __init__(
        self,
        bucket_name: Optional[str] = None,
        region: Optional[str] = None,
        aws_enabled: Optional[bool] = None,
    ) -> None:
        self.bucket_name = bucket_name or settings.S3_REPORT_BUCKET
        self.region = region or settings.S3_REGION
        self.aws_enabled = settings.AWS_ENABLED if aws_enabled is None else aws_enabled
        self._s3_client = None
        self._fallback_local = LocalReportStorage()

    def _get_client(self):
        if not self.aws_enabled:
            return None
        if self._s3_client is None:
            try:
                import boto3
                self._s3_client = boto3.client("s3", region_name=self.region)
            except Exception as e:
                logger.warning("S3ReportStorage: Failed to initialize boto3 S3 client: %s", e)
                self._s3_client = None
        return self._s3_client

    def _get_s3_key(self, report_id: str) -> str:
        return f"investigations/{report_id}/report.json"

    def save_report(self, report_id: str, report_data: Dict[str, Any]) -> str:
        client = self._get_client()
        if client is None:
            logger.info("S3ReportStorage: AWS disabled or S3 client unavailable; archiving locally.")
            return self._fallback_local.save_report(report_id, report_data)

        key = self._get_s3_key(report_id)
        try:
            body = json.dumps(report_data, indent=2, default=str).encode("utf-8")
            client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=body,
                ContentType="application/json",
            )
            s3_uri = f"s3://{self.bucket_name}/{key}"
            logger.info("S3ReportStorage: Archived report '%s' to %s", report_id, s3_uri)
            return s3_uri
        except Exception as e:
            logger.warning("S3ReportStorage: PutObject failed for '%s': %s. Falling back to local.", report_id, e)
            return self._fallback_local.save_report(report_id, report_data)

    def get_report(self, report_id: str) -> Optional[Dict[str, Any]]:
        client = self._get_client()
        if client is None:
            return self._fallback_local.get_report(report_id)

        key = self._get_s3_key(report_id)
        try:
            res = client.get_object(Bucket=self.bucket_name, Key=key)
            raw = res["Body"].read().decode("utf-8")
            return json.loads(raw)
        except Exception as e:
            logger.debug("S3ReportStorage: GetObject failed for '%s': %s", report_id, e)
            return self._fallback_local.get_report(report_id)

    def list_reports(self) -> List[str]:
        client = self._get_client()
        if client is None:
            return self._fallback_local.list_reports()

        try:
            res = client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix="investigations/",
            )
            reports = []
            for item in res.get("Contents", []):
                key = item.get("Key", "")
                if key.endswith("/report.json"):
                    parts = key.split("/")
                    if len(parts) >= 3:
                        reports.append(parts[1])
            return reports
        except Exception as e:
            logger.warning("S3ReportStorage: ListObjectsV2 failed: %s", e)
            return self._fallback_local.list_reports()


def get_report_storage(provider: Optional[str] = None) -> BaseReportStorage:
    """
    Factory creating the configured report storage provider.
    Defaults to LocalReportStorage; creates S3ReportStorage if requested.
    """
    prov = (provider or settings.REPORT_STORAGE_PROVIDER or "local").lower()
    if prov == "s3":
        logger.info("Using S3ReportStorage for investigation archiving")
        return S3ReportStorage()
    return LocalReportStorage()
