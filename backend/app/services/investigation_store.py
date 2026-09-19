"""
===============================================================================
TattvaAI - Investigation Store
===============================================================================

Provides unified investigation access by bridging fast in-memory caching with
durable persistent storage (SQLite / DynamoDB via InvestigationRepository).
Survives backend server restarts and ensures all historical investigations
can be retrieved, exported to PDF, and reviewed.
"""

from __future__ import annotations

import json
from collections import OrderedDict
from datetime import datetime, timezone
from typing import Any, List, Optional

from app.core.logger import logger


class InvestigationStore:
    def __init__(self) -> None:
        self._items: OrderedDict[str, dict[str, Any]] = OrderedDict()

    def _row_to_dict(self, row: Any) -> dict[str, Any]:
        """Convert a database Investigation model row or DynamoDB dict to a standard investigation dict."""
        if isinstance(row, dict):
            d = dict(row)
            inc_id = str(d.get("incident_id") or d.get("investigation_id") or d.get("id") or "")
            if inc_id:
                d["id"] = inc_id
                d["investigation_id"] = inc_id
                d["incident_id"] = inc_id

            report = d.get("report") or d.get("final_report") or {}
            if isinstance(report, str):
                try:
                    report = json.loads(report)
                except Exception:
                    report = {}
            elif hasattr(report, "model_dump"):
                report = report.model_dump()
            elif not isinstance(report, dict):
                report = dict(report)

            d["report"] = report
            d["final_report"] = report

            if not d.get("title") or d.get("title") == "Unknown Incident":
                service = d.get("service_name") or report.get("service_name") or "Service"
                clean_service = service.replace("-", " ").replace("_", " ").title()
                d["title"] = f"Incident: {clean_service} Service"
                report["title"] = d["title"]

            raw_status = d.get("status") or report.get("status")
            final_status = "COMPLETED" if raw_status in (None, "", "UNKNOWN") else str(raw_status).upper()
            d["status"] = final_status
            report["status"] = final_status

            telemetry_source = d.get("telemetry_source") or report.get("telemetry_source") or "mock"
            telemetry_mode = d.get("telemetry_mode") or report.get("telemetry_mode") or ("DEMO" if telemetry_source in ("mock", "demo") else "LIVE")
            d["telemetry_source"] = telemetry_source
            d["telemetry_mode"] = telemetry_mode
            report["telemetry_source"] = telemetry_source
            report["telemetry_mode"] = telemetry_mode
            d["environment"] = d.get("environment") or report.get("environment") or "production"
            d["pipeline_execution"] = d.get("pipeline_execution") or report.get("pipeline_execution") or []

            review_status = d.get("review_status") or report.get("review_status") or "PENDING_REVIEW"
            d["review_status"] = review_status
            d["human_review"] = d.get("human_review") or report.get("human_review") or {
                "status": review_status,
                "review_status": review_status,
                "review_decision": d.get("review_decision") or report.get("review_decision"),
                "reviewer_notes": d.get("reviewer_notes") or report.get("reviewer_notes"),
                "reviewed_at": d.get("reviewed_at") or report.get("reviewed_at"),
            }

            return d

        if hasattr(row, "__dict__"):
            inc_id = getattr(row, "incident_id", None) or str(getattr(row, "id", ""))
            report = getattr(row, "report", {}) or {}
            if isinstance(report, str):
                try:
                    report = json.loads(report)
                except Exception:
                    report = {}
            elif hasattr(report, "model_dump"):
                report = report.model_dump()
            elif not isinstance(report, dict):
                report = dict(report)

            # Map hypotheses to root_causes if needed
            if "hypotheses" in report and "root_causes" not in report:
                report["root_causes"] = [
                    {
                        "service_name": report.get("service_name", "service"),
                        "probable_cause": h,
                        "confidence": report.get("confidence", 80),
                    }
                    if isinstance(h, str)
                    else h
                    for h in report["hypotheses"]
                ]

            service_name = report.get("service_name") or "service"
            clean_service = service_name.replace("-", " ").replace("_", " ").title()

            raw_title = getattr(row, "title", None) or report.get("title")
            if not raw_title or raw_title == "Unknown Incident":
                title = f"Incident: {clean_service} Service"
            else:
                title = raw_title
            report["title"] = title

            raw_status = getattr(row, "status", None) or report.get("status")
            final_status = "COMPLETED" if raw_status in (None, "", "UNKNOWN") else str(raw_status).upper()
            report["status"] = final_status

            created_val = getattr(row, "created_at", None)
            if created_val and hasattr(created_val, "isoformat"):
                created_str = created_val.isoformat()
            else:
                created_str = report.get("created_at") or datetime.now(timezone.utc).isoformat()

            review_status = (
                report.get("review_status")
                or report.get("accepted_status")
                or "PENDING_REVIEW"
            )

            return {
                "id": inc_id,
                "investigation_id": inc_id,
                "incident_id": inc_id,
                "db_id": getattr(row, "id", None),
                "title": title,
                "service_name": service_name,
                "severity": getattr(row, "severity", None) or report.get("severity", "LOW"),
                "status": final_status,
                "confidence": getattr(row, "confidence", None) or report.get("confidence", 0),
                "review_status": review_status,
                "review_decision": report.get("review_decision"),
                "selected_hypothesis": report.get("selected_hypothesis"),
                "reviewer_notes": report.get("reviewer_notes"),
                "resolution": report.get("resolution"),
                "reviewed_at": report.get("reviewed_at"),
                "report": report,
                "final_report": report,
                "created_at": created_str,
            }

        return dict(row)

    def save(self, result: dict[str, Any] | Any) -> dict[str, Any]:
        """Save investigation to memory cache and persist to durable repository."""
        if hasattr(result, "model_dump"):
            result = result.model_dump()
        elif not isinstance(result, dict):
            result = dict(result)

        investigation_id = str(result.get("investigation_id") or result.get("incident_id"))
        report = result.get("final_report") or result.get("report") or {}
        if hasattr(report, "model_dump"):
            report = report.model_dump()
        report_status = report.get("status")
        report_status = getattr(report_status, "value", report_status)
        report_status = str(report_status).upper() if report_status else None

        review_status = (
            result.get("review_status")
            or report.get("review_status")
            or "PENDING_REVIEW"
        )
        report["review_status"] = review_status

        # Normalize title and status to avoid Unknown Incident / UNKNOWN
        service_name = result.get("service_name") or report.get("service_name") or "service"
        clean_service = service_name.replace("-", " ").replace("_", " ").title()
        raw_title = report.get("title") or result.get("title")
        if not raw_title or raw_title == "Unknown Incident":
            title = f"Incident: {clean_service} Service"
        else:
            title = raw_title
        report["title"] = title

        final_status = "COMPLETED" if report_status in (None, "", "UNKNOWN") else report_status
        incident = result.get("incident") or {}
        telemetry_source = str(incident.get("telemetry_source") or result.get("telemetry_source") or report.get("telemetry_source") or "mock").lower()
        telemetry_mode = "DEMO" if telemetry_source in ("mock", "demo") else "LIVE"
        environment = str(incident.get("environment") or result.get("environment") or report.get("environment") or "production")
        pipeline_execution = incident.get("pipeline_execution") or result.get("pipeline_execution") or report.get("pipeline_execution") or []

        report["telemetry_source"] = telemetry_source
        report["telemetry_mode"] = telemetry_mode
        report["environment"] = environment
        report["pipeline_execution"] = pipeline_execution

        human_review_dict = {
            "status": review_status,
            "review_status": review_status,
            "decision": result.get("review_decision", {}).get("decision") if isinstance(result.get("review_decision"), dict) else review_status,
            "review_decision": result.get("review_decision") or report.get("review_decision"),
            "reviewer_notes": result.get("reviewer_notes") or report.get("reviewer_notes"),
            "reviewed_at": result.get("reviewed_at") or report.get("reviewed_at"),
        }
        report["human_review"] = human_review_dict

        item = {
            **result,
            "id": investigation_id,
            "investigation_id": investigation_id,
            "incident_id": result.get("incident_id", investigation_id),
            "service_name": service_name,
            "title": title,
            "status": final_status,
            "severity": report.get("severity") or "LOW",
            "confidence": result.get("confidence", report.get("confidence", 0)),
            "telemetry_source": telemetry_source,
            "telemetry_mode": telemetry_mode,
            "environment": environment,
            "pipeline_execution": pipeline_execution,
            "review_status": review_status,
            "review_decision": result.get("review_decision") or report.get("review_decision"),
            "selected_hypothesis": result.get("selected_hypothesis") or report.get("selected_hypothesis"),
            "reviewer_notes": result.get("reviewer_notes") or report.get("reviewer_notes"),
            "resolution": result.get("resolution") or report.get("resolution"),
            "reviewed_at": result.get("reviewed_at") or report.get("reviewed_at"),
            "human_review": human_review_dict,
            "report": report,
            "final_report": report,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        self._items[investigation_id] = item
        self._items.move_to_end(investigation_id)
        while len(self._items) > 50:
            self._items.popitem(last=False)

        # Persist to durable repository (SQLite / DynamoDB)
        from app.core.settings import settings
        from app.database.investigation_repository import get_investigation_repository

        is_dynamo = (settings.PERSISTENCE_PROVIDER or "").lower() == "dynamodb"
        try:
            repo = get_investigation_repository()
            logger.info(
                "[InvestigationStore] Persisting incident '%s' (Provider: %s, AWS_ENABLED: %s, Table: %s, Repository: %s)",
                investigation_id,
                settings.PERSISTENCE_PROVIDER,
                settings.AWS_ENABLED,
                settings.DYNAMODB_TABLE_NAME if is_dynamo else "N/A",
                repo.__class__.__name__,
            )
            repo.save_investigation(item)
        except Exception as e:
            logger.error(
                "Error persisting investigation '%s' to repository (%s): %s",
                investigation_id,
                settings.PERSISTENCE_PROVIDER,
                e,
            )
            # In AWS production with DynamoDB configured, fail clearly so caller knows persistence failed
            if is_dynamo and settings.AWS_ENABLED:
                raise

        return item

    def get(self, investigation_id: str) -> dict[str, Any] | None:
        """
        Retrieve investigation by ID.
        Checks in-memory cache first, then falls back to durable database storage.
        """
        if not investigation_id or str(investigation_id).lower() in ("undefined", "null"):
            return None

        inv_str = str(investigation_id).strip()

        # 1. Check in-memory cache by primary key
        item = self._items.get(inv_str)
        if item:
            return item

        # 2. Check in-memory cache by incident_id or id attributes
        for val in self._items.values():
            if str(val.get("incident_id")) == inv_str or str(val.get("id")) == inv_str:
                return val

        # 3. Fallback to durable SQLite / DynamoDB repository
        try:
            from app.database.investigation_repository import get_investigation_repository
            repo = get_investigation_repository()
            row = repo.get_investigation_by_id(inv_str)
            if row:
                converted = self._row_to_dict(row)
                self._items[inv_str] = converted
                return converted
        except Exception as e:
            logger.warning(f"Error querying persistent repository for investigation '{investigation_id}': {e}")

        return None

    def update_review(self, investigation_id: str, review_decision: dict[str, Any]) -> dict[str, Any] | None:
        """Update review decision in memory and in durable repository."""
        item = self.get(investigation_id)
        if not item:
            return None

        status = review_decision.get("status", "PENDING_REVIEW")
        selected_hyp = review_decision.get("selected_hypothesis")
        notes = review_decision.get("reviewer_notes")
        resolution = review_decision.get("resolution_summary") or review_decision.get("resolution")
        reviewed_at = review_decision.get("reviewed_at")

        human_review_dict = {
            "status": status,
            "review_status": status,
            "decision": review_decision.get("decision") or status,
            "review_decision": review_decision,
            "notes": notes,
            "reviewer_notes": notes,
            "reviewer": review_decision.get("reviewer") or review_decision.get("reviewer_identifier"),
            "reviewed_at": reviewed_at,
        }
        item["review_status"] = status
        item["review_decision"] = review_decision
        item["selected_hypothesis"] = selected_hyp
        item["reviewer_notes"] = notes
        item["resolution"] = resolution
        item["reviewed_at"] = reviewed_at
        item["human_review"] = human_review_dict

        # Update nested report dicts
        for key in ("report", "final_report"):
            if isinstance(item.get(key), dict):
                item[key]["review_status"] = status
                item[key]["review_decision"] = review_decision
                item[key]["selected_hypothesis"] = selected_hyp
                item[key]["reviewer_notes"] = notes
                item[key]["resolution"] = resolution
                item[key]["reviewed_at"] = reviewed_at
                item[key]["human_review"] = human_review_dict

        # Update durable repository (SQLite / DynamoDB)
        try:
            from app.database.investigation_repository import get_investigation_repository
            repo = get_investigation_repository()
            if hasattr(repo, "save_investigation"):
                repo.save_investigation(item)
            elif hasattr(repo, "db"):
                db_row = repo.get_investigation_by_id(investigation_id)
                if db_row and hasattr(db_row, "report") and isinstance(db_row.report, dict):
                    db_row.report["review_status"] = status
                    db_row.report["review_decision"] = review_decision
                    db_row.report["selected_hypothesis"] = selected_hyp
                    db_row.report["reviewer_notes"] = notes
                    db_row.report["resolution"] = resolution
                    db_row.report["reviewed_at"] = reviewed_at
                    repo.db.commit()
        except Exception as e:
            logger.warning(f"Error persisting review update to repository: {e}")

        return item

    def list(self, limit: int | None = None) -> list[dict[str, Any]]:
        """List investigations, merging live in-memory cache with durable database records."""
        seen_ids = set()
        merged: List[dict[str, Any]] = []

        # 1. In-memory items
        for item in reversed(self._items.values()):
            inv_id = str(item.get("investigation_id") or item.get("id") or item.get("incident_id"))
            if inv_id and inv_id not in seen_ids:
                seen_ids.add(inv_id)
                merged.append(item)

        # 2. Durable database items
        try:
            from app.database.investigation_repository import get_investigation_repository
            repo = get_investigation_repository()
            rows = repo.get_all_investigations()
            for row in reversed(rows):
                converted = self._row_to_dict(row)
                c_id = str(converted.get("investigation_id") or converted.get("id") or converted.get("incident_id"))
                if c_id and c_id not in seen_ids:
                    seen_ids.add(c_id)
                    merged.append(converted)
        except Exception as e:
            logger.warning(f"Error listing from InvestigationRepository: {e}")

        return merged if limit is None else merged[:limit]

    def delete(self, investigation_id: str) -> bool:
        """Delete from both in-memory cache and durable database."""
        inv_str = str(investigation_id)
        deleted = self._items.pop(inv_str, None) is not None

        try:
            from app.database.investigation_repository import get_investigation_repository
            repo = get_investigation_repository()
            repo_deleted = repo.delete_investigation(inv_str)
            return deleted or repo_deleted
        except Exception as e:
            logger.warning(f"Error deleting from InvestigationRepository: {e}")
            return deleted


investigation_store = InvestigationStore()
