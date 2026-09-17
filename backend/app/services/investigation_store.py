"""Small in-memory store for completed investigations in the local demo stack."""

from __future__ import annotations

from collections import OrderedDict
from datetime import datetime, timezone
from typing import Any


class InvestigationStore:
    def __init__(self) -> None:
        self._items: OrderedDict[str, dict[str, Any]] = OrderedDict()

    def save(self, result: dict[str, Any] | Any) -> dict[str, Any]:
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

        item = {
            **result,
            "investigation_id": investigation_id,
            "incident_id": result.get("incident_id", investigation_id),
            "title": report.get("title") or f"Investigation for {result.get('service_name', 'service')}",
            "status": "COMPLETED" if report_status in (None, "", "UNKNOWN") else report_status,
            "severity": report.get("severity") or "LOW",
            "confidence": result.get("confidence", report.get("confidence", 0)),
            "review_status": review_status,
            "review_decision": result.get("review_decision") or report.get("review_decision"),
            "selected_hypothesis": result.get("selected_hypothesis") or report.get("selected_hypothesis"),
            "reviewer_notes": result.get("reviewer_notes") or report.get("reviewer_notes"),
            "resolution": result.get("resolution") or report.get("resolution"),
            "reviewed_at": result.get("reviewed_at") or report.get("reviewed_at"),
            "report": report,
            "final_report": report,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        self._items[investigation_id] = item
        self._items.move_to_end(investigation_id)
        while len(self._items) > 50:
            self._items.popitem(last=False)
        return item

    def get(self, investigation_id: str) -> dict[str, Any] | None:
        return self._items.get(str(investigation_id))

    def update_review(self, investigation_id: str, review_decision: dict[str, Any]) -> dict[str, Any] | None:
        item = self.get(investigation_id)
        if not item:
            return None
        status = review_decision.get("status", "PENDING_REVIEW")
        selected_hyp = review_decision.get("selected_hypothesis")
        notes = review_decision.get("reviewer_notes")
        resolution = review_decision.get("resolution_summary") or review_decision.get("resolution")
        reviewed_at = review_decision.get("reviewed_at")

        item["review_status"] = status
        item["review_decision"] = review_decision
        item["selected_hypothesis"] = selected_hyp
        item["reviewer_notes"] = notes
        item["resolution"] = resolution
        item["reviewed_at"] = reviewed_at

        # Update nested report dicts
        for key in ("report", "final_report"):
            if isinstance(item.get(key), dict):
                item[key]["review_status"] = status
                item[key]["review_decision"] = review_decision
                item[key]["selected_hypothesis"] = selected_hyp
                item[key]["reviewer_notes"] = notes
                item[key]["resolution"] = resolution
                item[key]["reviewed_at"] = reviewed_at

        return item

    def list(self, limit: int | None = None) -> list[dict[str, Any]]:
        items = list(reversed(self._items.values()))
        return items if limit is None else items[:limit]

    def delete(self, investigation_id: str) -> bool:
        return self._items.pop(str(investigation_id), None) is not None


investigation_store = InvestigationStore()
