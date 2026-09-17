"""
===============================================================================
TattvaAI - Investigation Review Service
===============================================================================

Central validation, audit, and persistence service for human review decisions.

The human engineer is the ultimate decision authority. This service enforces:
1. Controlled review status validation (PENDING_REVIEW, ACCEPTED, REJECTED, ESCALATED, PARTIALLY_ACCEPTED).
2. Validation that selected hypotheses match actual AI candidate hypotheses.
3. Separation of AI-generated candidate hypotheses from human-accepted decisions.
4. Persistent audit trail across service restarts (SQLite ReviewRecord).
5. Synchronization with InvestigationStore and InvestigationMemory.

===============================================================================
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Union

from app.database.database import create_tables
from app.database.models import Investigation, ReviewRecord
from app.database.session import SessionLocal
from app.memory.investigation_memory import investigation_memory
from app.models.review import (
    ReviewAuditRecord,
    ReviewDecision,
    ReviewStatus,
    ReviewSubmission,
)
from app.services.investigation_store import investigation_store

logger = logging.getLogger("TattvaAI")

VALID_REVIEW_STATUSES = {status.value for status in ReviewStatus}


class InvestigationReviewService:
    """
    Service coordinating human review actions, decision validation,
    audit persistence, and memory synchronization.
    """

    def __init__(self) -> None:
        create_tables()

    def get_candidate_hypotheses(self, investigation_data: Dict[str, Any]) -> List[str]:
        """
        Extract all candidate hypothesis strings from an investigation's root causes,
        hypotheses, and reasoning outputs.
        """
        candidates: List[str] = []

        # 1. From root causes (list of dicts or RootCause objects)
        report = investigation_data.get("report") or investigation_data.get("final_report") or {}
        root_causes = report.get("root_causes") or investigation_data.get("root_causes") or []
        for rc in root_causes:
            if isinstance(rc, dict):
                pc = rc.get("probable_cause") or rc.get("hypothesis")
                if pc and pc not in candidates:
                    candidates.append(pc)
            elif hasattr(rc, "probable_cause") and rc.probable_cause:
                if rc.probable_cause not in candidates:
                    candidates.append(rc.probable_cause)

        # 2. From reasoning / hypotheses
        reasoning = report.get("reasoning") or investigation_data.get("reasoning") or {}
        hypotheses = reasoning.get("hypotheses") or []
        for hyp in hypotheses:
            if isinstance(hyp, dict):
                h_text = hyp.get("hypothesis") or hyp.get("description")
                if h_text and h_text not in candidates:
                    candidates.append(h_text)
            elif isinstance(hyp, str) and hyp not in candidates:
                candidates.append(hyp)

        # 3. From top-level hypotheses
        top_hypotheses = investigation_data.get("hypotheses") or []
        for hyp in top_hypotheses:
            if isinstance(hyp, dict):
                h_text = hyp.get("hypothesis") or hyp.get("description")
                if h_text and h_text not in candidates:
                    candidates.append(h_text)
            elif isinstance(hyp, str) and hyp not in candidates:
                candidates.append(hyp)

        return candidates

    def validate_review(
        self,
        investigation_id: str,
        submission: Union[ReviewSubmission, Dict[str, Any]],
        investigation_data: Dict[str, Any],
    ) -> None:
        """
        Validate that the review submission adheres to all constraints:
        1. Review status is one of the allowed controlled vocabulary values.
        2. If a selected hypothesis is provided, it must exist in candidate hypotheses.
        """
        if isinstance(submission, dict):
            status = str(submission.get("status", "")).upper()
            selected_hypothesis = submission.get("selected_hypothesis")
        else:
            status = str(submission.status).upper()
            selected_hypothesis = submission.selected_hypothesis

        # Status validation
        if status not in VALID_REVIEW_STATUSES:
            raise ValueError(
                f"Invalid review status '{status}'. Must be one of: {sorted(VALID_REVIEW_STATUSES)}"
            )

        # Selected hypothesis validation
        if selected_hypothesis:
            candidates = self.get_candidate_hypotheses(investigation_data)
            # Check for exact or substring match
            norm_selected = selected_hypothesis.strip().lower()
            matched = any(
                norm_selected == c.strip().lower()
                or norm_selected in c.strip().lower()
                or c.strip().lower() in norm_selected
                for c in candidates
            )
            if not matched:
                raise ValueError(
                    f"Selected hypothesis '{selected_hypothesis}' does not match any candidate "
                    f"hypothesis in investigation '{investigation_id}'. Candidates: {candidates}"
                )

    def get_review(self, investigation_id: str) -> Optional[ReviewDecision]:
        """
        Retrieve the latest review decision for an investigation.
        If no review has been submitted yet but the investigation exists,
        returns a default PENDING_REVIEW decision.
        """
        # 1. Check SQLite for latest review record
        try:
            db = SessionLocal()
            try:
                record = (
                    db.query(ReviewRecord)
                    .filter(ReviewRecord.investigation_id == investigation_id)
                    .order_by(ReviewRecord.created_at.desc())
                    .first()
                )
                if record:
                    return ReviewDecision(
                        review_id=record.review_id,
                        investigation_id=record.investigation_id,
                        status=ReviewStatus(record.new_status),
                        selected_hypothesis=record.selected_hypothesis,
                        reviewer_notes=record.reviewer_notes,
                        reviewed_at=record.created_at.isoformat() if record.created_at else None,
                        reviewer_identifier=record.reviewer_identifier,
                        recommendation_decisions=record.recommendation_decisions or {},
                        resolution_summary=record.resolution_summary,
                    )
            finally:
                db.close()
        except Exception as e:
            logger.debug("Database error fetching review: %s", e)

        # 2. Check InvestigationStore
        store_item = investigation_store.get(investigation_id)
        if store_item and store_item.get("review_decision"):
            rd = store_item["review_decision"]
            if isinstance(rd, dict):
                return ReviewDecision(**rd)

        # 3. If investigation exists, return default PENDING_REVIEW decision
        if store_item or investigation_memory.get_investigation(investigation_id):
            return ReviewDecision(
                investigation_id=investigation_id,
                status=ReviewStatus.PENDING_REVIEW,
                reviewed_at=None,
            )

        return None

    def submit_review(
        self,
        investigation_id: str,
        submission: Union[ReviewSubmission, Dict[str, Any]],
    ) -> ReviewDecision:
        """
        Validate, persist, and synchronize a human review decision.
        """
        # Normalize submission
        if isinstance(submission, dict):
            sub_obj = ReviewSubmission(**submission)
        else:
            sub_obj = submission

        status_str = sub_obj.status.upper()

        # Locate investigation data
        inv_data = investigation_store.get(investigation_id)
        if not inv_data:
            mem_record = investigation_memory.get_investigation(investigation_id)
            if mem_record:
                inv_data = mem_record.to_dict()

        if not inv_data:
            raise LookupError(f"Investigation '{investigation_id}' not found.")

        # Validate review constraints
        self.validate_review(investigation_id, sub_obj, inv_data)

        # Determine old status
        old_status = inv_data.get("review_status") or "PENDING_REVIEW"

        now_utc = datetime.now(timezone.utc)
        now_iso = now_utc.isoformat()

        decision = ReviewDecision(
            investigation_id=investigation_id,
            incident_id=inv_data.get("incident_id", investigation_id),
            status=ReviewStatus(status_str),
            selected_hypothesis=sub_obj.selected_hypothesis,
            reviewer_notes=sub_obj.reviewer_notes,
            reviewed_at=now_iso,
            reviewer_identifier=sub_obj.reviewer_identifier,
            recommendation_decisions=sub_obj.recommendation_decisions or {},
            evidence_confirmed=sub_obj.evidence_confirmed or [],
            resolution_summary=sub_obj.resolution,
        )

        decision_dict = decision.to_dict()

        # 1. Update InvestigationStore
        investigation_store.update_review(investigation_id, decision_dict)

        # 2. Update InvestigationMemory
        investigation_memory.update_review_outcome(
            investigation_id=investigation_id,
            accepted_status=decision.status.value,
            resolution=decision.resolution_summary,
            selected_hypothesis=decision.selected_hypothesis,
            reviewer_notes=decision.reviewer_notes,
        )

        # 3. Persist ReviewRecord to SQLite for durable audit trail
        try:
            db = SessionLocal()
            try:
                review_row = ReviewRecord(
                    review_id=decision.review_id,
                    investigation_id=investigation_id,
                    old_status=old_status,
                    new_status=decision.status.value,
                    selected_hypothesis=decision.selected_hypothesis,
                    reviewer_notes=decision.reviewer_notes,
                    reviewer_identifier=decision.reviewer_identifier,
                    resolution_summary=decision.resolution_summary,
                    recommendation_decisions=decision.recommendation_decisions,
                    created_at=now_utc,
                )
                db.add(review_row)

                # Also update Investigation row if present
                inv_row = (
                    db.query(Investigation)
                    .filter(
                        (Investigation.incident_id == investigation_id)
                        | (Investigation.id == (int(investigation_id) if investigation_id.isdigit() else -1))
                    )
                    .first()
                )
                if inv_row and isinstance(inv_row.report, dict):
                    report_copy = dict(inv_row.report)
                    report_copy["review_status"] = decision.status.value
                    report_copy["review_decision"] = decision_dict
                    report_copy["selected_hypothesis"] = decision.selected_hypothesis
                    report_copy["reviewer_notes"] = decision.reviewer_notes
                    report_copy["resolution"] = decision.resolution_summary
                    report_copy["reviewed_at"] = now_iso
                    inv_row.report = report_copy
                    inv_row.status = (
                        "RESOLVED" if decision.status == ReviewStatus.ACCEPTED else inv_row.status
                    )

                db.commit()
                logger.info(
                    "InvestigationReviewService: Persisted review '%s' for investigation '%s' (Status: %s)",
                    decision.review_id,
                    investigation_id,
                    decision.status.value,
                )
            finally:
                db.close()
        except Exception as e:
            logger.warning("Failed to persist ReviewRecord to SQLite: %s", e)

        return decision


review_service = InvestigationReviewService()
