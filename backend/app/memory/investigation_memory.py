"""
===============================================================================
TattvaAI - Investigation Memory & Historical Learning (Phase 7)
===============================================================================

Purpose
-------
Provides persistent memory and deterministic historical learning across
investigations. Enables TattvaAI to:
1. Persist structured investigation outcomes (metadata, evidence summaries,
   correlations, hypotheses, causal chains, confidence, recommendations, and evidence IDs).
2. Retrieve relevant historical investigations matching service, dependencies,
   error patterns, and keywords.
3. Supply historical context to the Amazon Bedrock reasoning engine without
   treating historical incidents as proven root causes.

Architectural Principles:
-------------------------
1. Supporting Context Only: Historical incidents provide pattern corroboration,
   NEVER automatic current root cause proof.
2. Separate Collections: Current active evidence and historical context remain
   strictly separated to avoid contamination.
3. Real Evidence IDs: Preserves real evidence IDs and historical incident IDs.
4. Deterministic Scoring: Uses multi-attribute weighted scoring (service,
   dependency, error pattern, keyword) rather than opaque vector embeddings.
5. Offline-Ready: Fully functional offline with dual in-memory cache and SQLite
   backing (tattvaai.db). No external vector DB or API dependencies.
===============================================================================
"""

from __future__ import annotations

from datetime import datetime, timezone
import json
import re
import threading
from typing import Any, Dict, List, Optional, Set, Union

from pydantic import BaseModel, Field

from app.core.logger import logger
from app.models.historical_incident import HistoricalIncident
from app.schemas.investigation_state import InvestigationState


# =============================================================================
# Investigation Memory Data Models
# =============================================================================

class HistoricalInvestigationMatch(BaseModel):
    """
    Retrieved historical investigation matched by multi-attribute similarity.
    Represents supporting context for AI reasoning, NOT proven current causation.
    """
    investigation_id: str = Field(description="Unique ID of the past investigation")
    incident_id: str = Field(description="Incident ID of the past investigation")
    service_name: str = Field(description="Target service of the past investigation")
    title: str = Field(description="Historical incident title")
    similarity_score: float = Field(
        ge=0.0,
        le=1.0,
        description="Deterministic retrieval similarity score (0.0 to 1.0). NOT causal probability."
    )
    matched_attributes: List[str] = Field(
        default_factory=list,
        description="Attributes that matched between current and historical context (e.g. 'service', 'dependency')"
    )
    summary: str = Field(default="", description="Summary of the historical investigation")
    root_cause: str = Field(default="", description="Root cause identified in the historical investigation")
    resolution: Optional[str] = Field(default="", description="Resolution or remediation applied historically")
    recommendations: List[str] = Field(default_factory=list, description="Historical recommendations")
    is_historical_context: bool = Field(
        default=True,
        description="Always True. Identifies this record as historical context, not current root cause."
    )
    note: str = Field(
        default="Historical supporting context only; not verified as current root cause.",
        description="Safety disclaimer ensuring historical incident is not blindly treated as current fault."
    )

    def to_dict(self) -> Dict[str, Any]:
        return self.model_dump()


class InvestigationRecord(BaseModel):
    """
    Comprehensive record of a completed incident investigation stored in memory.
    """
    investigation_id: str
    incident_id: str
    service_name: str
    title: str
    description: Optional[str] = ""
    severity: str = "HIGH"
    status: str = "COMPLETED"
    confidence: int = Field(default=80, ge=0, le=100)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Knowledge components
    observed_evidence_summary: List[str] = Field(default_factory=list)
    correlation_summary: List[str] = Field(default_factory=list)
    hypotheses: List[Dict[str, Any]] = Field(default_factory=list)
    recommendations: List[Dict[str, Any]] = Field(default_factory=list)
    causal_chain: List[Dict[str, Any]] = Field(default_factory=list)
    uncertainties: List[str] = Field(default_factory=list)
    evidence_ids: List[str] = Field(default_factory=list)
    historical_incident_references: List[str] = Field(default_factory=list)

    # Retrieval index attributes
    dependencies: List[str] = Field(default_factory=list)
    error_patterns: List[str] = Field(default_factory=list)
    keywords: List[str] = Field(default_factory=list)

    # Review & Resolution outcomes (nullable for future human review)
    accepted_status: Optional[str] = None
    resolution: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return self.model_dump(mode="json")


# =============================================================================
# Investigation Memory Implementation
# =============================================================================

class InvestigationMemory:
    """
    Central investigation memory and historical retrieval engine.
    Maintains persistent storage in SQLite (tattvaai.db) and a fast in-memory cache.
    """

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._records: Dict[str, InvestigationRecord] = {}
        self.seed_default_history()

    # -------------------------------------------------------------------------
    # Default History Seeding
    # -------------------------------------------------------------------------

    def seed_default_history(self) -> None:
        """
        Pre-seed deterministic historical records including INC-HIST-082
        to ensure local development and payment scenario demonstrations work offline.
        """
        with self._lock:
            if "INC-HIST-082" not in self._records and "INV-HIST-082" not in self._records:
                record = InvestigationRecord(
                    investigation_id="INV-HIST-082",
                    incident_id="INC-HIST-082",
                    service_name="payment-service",
                    title="Upstream bank-gateway latency spike leading to payment timeouts in payment-service",
                    description="Upstream banking partner gateway experienced database lock contention, causing API timeouts.",
                    severity="HIGH",
                    status="RESOLVED",
                    confidence=92,
                    created_at=datetime(2026, 8, 15, 14, 30, tzinfo=timezone.utc),
                    observed_evidence_summary=[
                        "HTTP 504 Gateway Timeout on POST /api/v1/payments/process (2850ms latency)",
                        "GatewayTimeoutException upstream banking partner timed out after 2500ms",
                        "Elevated P95 payment latency exceeded 2000ms threshold",
                        "Active alert PaymentGatewayTimeoutHigh triggered",
                    ],
                    correlation_summary=[
                        "Trace HTTP 504 correlated with GatewayTimeoutException via trace_id mock-trace-pay-504-01",
                        "Dependency bank-gateway latency spike correlated with payment-service P95 latency",
                    ],
                    hypotheses=[
                        {
                            "hypothesis": "Downstream latency and error propagation in 'bank-gateway' is contributing to 'payment-service' timeouts.",
                            "confidence": 0.92,
                            "reasoning": "Upstream partner degraded response times caused client socket timeouts and connection pool exhaustion.",
                        }
                    ],
                    recommendations=[
                        {
                            "type": "IMMEDIATE",
                            "action": "Trip circuit breaker to fail fast and divert traffic to secondary payment provider.",
                            "priority": "P1",
                            "reasoning": "Prevents upstream pool exhaustion during external banking gateway outages.",
                        },
                        {
                            "type": "LONG_TERM",
                            "action": "Configure aggressive circuit breaker (trip at 10% errors) and increase socket timeout with exponential backoff.",
                            "priority": "P2",
                            "reasoning": "Hardens client resilience against recurring external degradation.",
                        }
                    ],
                    causal_chain=[
                        {
                            "from": "ev-dep-bank-gateway",
                            "relationship": "induces_latency",
                            "to": "ev-trace-mock-trace-pay-504-01",
                        }
                    ],
                    uncertainties=[
                        "External banking partner internal server metrics not observable from payment-service traces."
                    ],
                    evidence_ids=[
                        "ev-dep-bank-gateway",
                        "ev-trace-mock-trace-pay-504-01",
                        "ev-log-mock-log-01",
                    ],
                    historical_incident_references=["INC-HIST-082"],
                    dependencies=["bank-gateway"],
                    error_patterns=[
                        "GatewayTimeoutException",
                        "504",
                        "ConnectionPoolExhaustedException",
                        "timeout",
                    ],
                    keywords=[
                        "payment",
                        "bank-gateway",
                        "timeout",
                        "gateway",
                        "latency",
                        "circuit-breaker",
                    ],
                    accepted_status="ACCEPTED",
                    resolution="Diverted 80% traffic to secondary banking gateway; upstream provider recovered 45 minutes later.",
                    metadata={"source": "seed_history", "scenario": "elevated_failures"},
                )
                self._records[record.investigation_id] = record
                self._records[record.incident_id] = record
                logger.info("InvestigationMemory: Pre-seeded historical investigation '%s'", record.incident_id)

    # -------------------------------------------------------------------------
    # Save Investigation
    # -------------------------------------------------------------------------

    def save_investigation(
        self,
        investigation: Union[InvestigationRecord, InvestigationState, Dict[str, Any]],
    ) -> InvestigationRecord:
        """
        Persist a completed investigation into memory and local SQLite storage.
        Extracts structured hypotheses, recommendations, evidence IDs, causal links,
        dependencies, error patterns, and keywords.
        """
        record: InvestigationRecord

        if isinstance(investigation, InvestigationRecord):
            record = investigation
        elif isinstance(investigation, InvestigationState):
            record = self._extract_record_from_state(investigation)
        elif isinstance(investigation, dict):
            record = self._extract_record_from_dict(investigation)
        else:
            raise ValueError(f"Unsupported investigation object type: {type(investigation)}")

        with self._lock:
            self._records[record.investigation_id] = record
            self._records[record.incident_id] = record

            # Best-effort persistence to SQLite via existing SQLAlchemy models
            self._persist_to_sqlite(record)

            logger.info(
                "InvestigationMemory: Saved investigation '%s' for service '%s' (Confidence: %d%%)",
                record.investigation_id,
                record.service_name,
                record.confidence,
            )

        return record

    def _extract_record_from_state(self, state: InvestigationState) -> InvestigationRecord:
        """Convert an InvestigationState into a persistent InvestigationRecord."""
        inv_id = str(state.incident_id or "INV-UNKNOWN")
        service = state.service_name or "unknown"
        title = state.incident.get("title") or f"Investigation for {service}"

        evidence_list = state.evidence or []
        correlations = state.correlations or []
        root_causes = state.root_causes or []
        recommendations = state.recommendations or []
        reasoning_dict = state.reasoning or {}

        # 1. Summaries
        evidence_summaries = [e.summary for e in evidence_list if e.summary][:15]
        correlation_summaries = [c.summary for c in correlations if c.summary][:10]

        # 2. Hypotheses
        hypotheses_data = []
        for rc in root_causes:
            hypotheses_data.append({
                "hypothesis": rc.probable_cause or rc.title,
                "confidence": rc.confidence / 100.0 if rc.confidence > 1 else rc.confidence,
                "reasoning": " ".join(rc.reasoning) if rc.reasoning else rc.summary,
            })
        if not hypotheses_data and "hypotheses" in reasoning_dict:
            hypotheses_data = reasoning_dict.get("hypotheses", [])

        # 3. Recommendations
        recs_data = []
        for r in recommendations:
            recs_data.append({
                "type": r.category or "IMMEDIATE",
                "action": r.action,
                "priority": r.priority,
                "reasoning": r.description,
            })
        if not recs_data and "recommendations" in reasoning_dict:
            recs_data = reasoning_dict.get("recommendations", [])

        # 4. Causal Chain & Uncertainties
        causal_chain = reasoning_dict.get("causal_chain", [])
        uncertainties = reasoning_dict.get("uncertainties", [])

        # 5. Evidence IDs & Historical References
        evidence_ids = [e.evidence_id for e in evidence_list if e.evidence_id]
        historical_refs = [
            e.historical_incident_id
            for e in evidence_list
            if e.source == "history" and e.historical_incident_id
        ]
        if not historical_refs and state.historical_incidents:
            historical_refs = [h.incident_id for h in state.historical_incidents if h.incident_id]

        # 6. Extract Indexing Attributes (dependencies, errors, keywords)
        deps = list(self._extract_dependencies(state))
        errors = list(self._extract_error_patterns(state))
        keywords = list(self._extract_keywords(service, title, evidence_summaries, errors, deps))

        confidence_val = state.confidence
        if confidence_val <= 1 and confidence_val > 0:
            confidence_val = int(confidence_val * 100)

        severity_val = "CRITICAL" if any(e.critical for e in evidence_list) else "HIGH"

        return InvestigationRecord(
            investigation_id=inv_id,
            incident_id=inv_id,
            service_name=service,
            title=title,
            description=state.incident.get("description", ""),
            severity=severity_val,
            status="COMPLETED",
            confidence=int(confidence_val),
            created_at=datetime.now(timezone.utc),
            observed_evidence_summary=evidence_summaries,
            correlation_summary=correlation_summaries,
            hypotheses=hypotheses_data,
            recommendations=recs_data,
            causal_chain=causal_chain,
            uncertainties=uncertainties,
            evidence_ids=evidence_ids,
            historical_incident_references=historical_refs,
            dependencies=deps,
            error_patterns=errors,
            keywords=keywords,
            accepted_status=None,
            resolution=None,
            metadata={"source": "investigation_state"},
        )

    def _extract_record_from_dict(self, data: Dict[str, Any]) -> InvestigationRecord:
        """Convert a raw dictionary into an InvestigationRecord."""
        inv_id = str(data.get("investigation_id") or data.get("incident_id") or "INV-UNKNOWN")
        service = data.get("service_name") or "unknown"
        title = data.get("title") or f"Investigation for {service}"

        evidence_ids = data.get("evidence_ids") or []
        if not evidence_ids and "evidence" in data:
            evidence_ids = [
                e.get("evidence_id")
                for e in data["evidence"]
                if isinstance(e, dict) and e.get("evidence_id")
            ]

        confidence_val = data.get("confidence", 80)
        if isinstance(confidence_val, float) and confidence_val <= 1.0:
            confidence_val = int(confidence_val * 100)

        return InvestigationRecord(
            investigation_id=inv_id,
            incident_id=str(data.get("incident_id") or inv_id),
            service_name=service,
            title=title,
            description=data.get("description", ""),
            severity=data.get("severity", "HIGH"),
            status=data.get("status", "COMPLETED"),
            confidence=int(confidence_val),
            created_at=datetime.now(timezone.utc),
            observed_evidence_summary=data.get("observed_evidence_summary", []),
            correlation_summary=data.get("correlation_summary", []),
            hypotheses=data.get("hypotheses", []),
            recommendations=data.get("recommendations", []),
            causal_chain=data.get("causal_chain", []),
            uncertainties=data.get("uncertainties", []),
            evidence_ids=evidence_ids,
            historical_incident_references=data.get("historical_incident_references", []),
            dependencies=data.get("dependencies", []),
            error_patterns=data.get("error_patterns", []),
            keywords=data.get("keywords", []),
            accepted_status=data.get("accepted_status"),
            resolution=data.get("resolution"),
            metadata=data.get("metadata", {}),
        )

    def _persist_to_sqlite(self, record: InvestigationRecord) -> None:
        """Best-effort persistence to SQLite via SQLAlchemy Investigation table."""
        try:
            from app.database.database import create_tables
            from app.database.models import Investigation
            from app.database.session import SessionLocal

            create_tables()
            db = SessionLocal()
            try:
                # Check if existing record with incident_id exists
                existing = db.query(Investigation).filter(Investigation.incident_id == record.incident_id).first()
                report_payload = record.to_dict()

                if existing:
                    existing.title = record.title
                    existing.severity = record.severity
                    existing.status = record.status
                    existing.confidence = record.confidence
                    existing.report = report_payload
                else:
                    new_inv = Investigation(
                        incident_id=record.incident_id,
                        title=record.title,
                        severity=record.severity,
                        status=record.status,
                        confidence=record.confidence,
                        report=report_payload,
                    )
                    db.add(new_inv)
                db.commit()
            finally:
                db.close()
        except Exception as e:
            logger.debug("SQLite persistence skipped/warning (in-memory preserved): %s", e)

    # -------------------------------------------------------------------------
    # Get & List
    # -------------------------------------------------------------------------

    def get_investigation(self, investigation_id: str) -> Optional[InvestigationRecord]:
        """Retrieve an investigation by investigation_id or incident_id."""
        with self._lock:
            if investigation_id in self._records:
                return self._records[investigation_id]

            # Try reading from SQLite if not in memory
            try:
                from app.database.models import Investigation
                from app.database.session import SessionLocal

                db = SessionLocal()
                try:
                    row = db.query(Investigation).filter(
                        (Investigation.incident_id == investigation_id)
                        | (Investigation.id == (int(investigation_id) if investigation_id.isdigit() else -1))
                    ).first()
                    if row and isinstance(row.report, dict):
                        record = self._extract_record_from_dict(row.report)
                        self._records[record.investigation_id] = record
                        return record
                finally:
                    db.close()
            except Exception:
                pass

            return None

    def list_recent_investigations(self, limit: int = 20) -> List[InvestigationRecord]:
        """Return unique investigations sorted by created_at descending."""
        with self._lock:
            # Deduplicate by investigation_id
            unique_records = {r.investigation_id: r for r in self._records.values()}
            sorted_list = sorted(
                unique_records.values(),
                key=lambda r: r.created_at,
                reverse=True,
            )
            return sorted_list[:limit]

    def update_review_outcome(
        self,
        investigation_id: str,
        accepted_status: str,
        resolution: Optional[str] = None,
        selected_hypothesis: Optional[str] = None,
        reviewer_notes: Optional[str] = None,
    ) -> Optional[InvestigationRecord]:
        """
        Update memory record with human review outcome (status, resolution, selected hypothesis).
        Persists update to both memory cache and SQLite.
        """
        with self._lock:
            record = self.get_investigation(investigation_id)
            if not record:
                return None

            record.accepted_status = accepted_status
            if resolution:
                record.resolution = resolution
            if selected_hypothesis:
                record.metadata["selected_hypothesis"] = selected_hypothesis
            if reviewer_notes:
                record.metadata["reviewer_notes"] = reviewer_notes

            # Also ensure indexed in _records under both IDs
            self._records[record.investigation_id] = record
            if record.incident_id:
                self._records[record.incident_id] = record

            # Persist to SQLite
            self._persist_to_sqlite(record)
            logger.info(
                "InvestigationMemory: Updated review outcome for '%s' -> %s",
                investigation_id,
                accepted_status,
            )
            return record

    # -------------------------------------------------------------------------
    # Deterministic Historical Retrieval
    # -------------------------------------------------------------------------

    def find_similar_investigations(
        self,
        query: Union[InvestigationState, Dict[str, Any], str],
        limit: int = 5,
        min_score: float = 0.20,
    ) -> List[HistoricalInvestigationMatch]:
        """
        Deterministic historical retrieval based on multi-attribute scoring:
        1. Service match (weight: 0.35)
        2. Dependency match (weight: 0.25)
        3. Error pattern match (weight: 0.25)
        4. Keyword match (weight: 0.15)

        The resulting similarity_score is bounded between 0.0 and 1.0.
        It indicates historical context similarity, NOT probability of causation.
        """
        service_name, dependencies, error_patterns, keywords = self._parse_query_attributes(query)
        current_incident_id = getattr(query, "incident_id", None) or (
            query.get("incident_id") if isinstance(query, dict) else None
        )

        matches: List[HistoricalInvestigationMatch] = []

        with self._lock:
            unique_records = {r.investigation_id: r for r in self._records.values()}

            for record in unique_records.values():
                # Avoid matching the current running incident with itself
                if current_incident_id and (
                    record.incident_id == current_incident_id
                    or record.investigation_id == current_incident_id
                ):
                    continue

                score, matched_attrs = self._calculate_similarity(
                    service_name=service_name,
                    dependencies=dependencies,
                    error_patterns=error_patterns,
                    keywords=keywords,
                    record=record,
                )

                if score >= min_score:
                    # Summarize root cause and resolution
                    rc_text = ""
                    if record.hypotheses:
                        rc_text = record.hypotheses[0].get("hypothesis", "")
                    elif record.description:
                        rc_text = record.description

                    res_text = record.resolution or (
                        record.recommendations[0].get("action", "") if record.recommendations else ""
                    )

                    rec_actions = [
                        r.get("action", "") for r in record.recommendations if isinstance(r, dict) and r.get("action")
                    ]

                    matches.append(
                        HistoricalInvestigationMatch(
                            investigation_id=record.investigation_id,
                            incident_id=record.incident_id,
                            service_name=record.service_name,
                            title=record.title,
                            similarity_score=round(score, 3),
                            matched_attributes=matched_attrs,
                            summary=record.title,
                            root_cause=rc_text,
                            resolution=res_text,
                            recommendations=rec_actions,
                            is_historical_context=True,
                            note="Historical supporting context only; not verified as current root cause.",
                        )
                    )

        # Sort descending by similarity_score
        matches.sort(key=lambda m: m.similarity_score, reverse=True)
        return matches[:limit]

    def _calculate_similarity(
        self,
        service_name: str,
        dependencies: Set[str],
        error_patterns: Set[str],
        keywords: Set[str],
        record: InvestigationRecord,
    ) -> tuple[float, List[str]]:
        """
        Calculate deterministic similarity score and record matching attributes.
        Weights:
        • Service Match: 0.35
        • Dependency Match: 0.25
        • Error Pattern Match: 0.25
        • Keyword Match: 0.15
        """
        score = 0.0
        matched_attributes: List[str] = []

        # 1. Service Match (0.35)
        if service_name and record.service_name:
            if service_name.lower() == record.service_name.lower():
                score += 0.35
                matched_attributes.append(f"service: {record.service_name}")
            elif service_name.lower() in record.service_name.lower() or record.service_name.lower() in service_name.lower():
                score += 0.20
                matched_attributes.append(f"service_partial: {record.service_name}")

        # 2. Dependency Match (0.25)
        record_deps = {d.lower() for d in record.dependencies}
        common_deps = dependencies.intersection(record_deps)
        if common_deps:
            score += 0.25
            for cd in common_deps:
                matched_attributes.append(f"dependency: {cd}")

        # 3. Error Pattern Match (0.25)
        record_errors = {e.lower() for e in record.error_patterns}
        common_errors = error_patterns.intersection(record_errors)
        if common_errors:
            score += 0.25
            for ce in common_errors:
                matched_attributes.append(f"error_pattern: {ce}")

        # 4. Keyword Match (0.15)
        record_keywords = {k.lower() for k in record.keywords}
        common_keywords = keywords.intersection(record_keywords)
        if common_keywords:
            keyword_score = min(0.15, len(common_keywords) * 0.05)
            score += keyword_score
            matched_attributes.append(f"keywords: {', '.join(sorted(common_keywords)[:3])}")

        # Clamp bounded score between 0.0 and 1.0
        score = min(1.0, max(0.0, score))
        return score, matched_attributes

    def retrieve_historical_context(self, state: InvestigationState) -> List[Dict[str, Any]]:
        """
        High-level lifecycle method: finds similar investigations for the current state,
        formats them into structured context dictionaries, and stores them in state.historical_context.
        """
        matches = self.find_similar_investigations(state)
        context_dicts = [m.to_dict() for m in matches]
        state.historical_context = context_dicts
        logger.info(
            "InvestigationMemory: Retrieved %d historical context matches for '%s'",
            len(context_dicts),
            state.service_name,
        )
        return context_dicts

    def clear(self) -> None:
        """Clear memory cache (used in testing)."""
        with self._lock:
            self._records.clear()

    # -------------------------------------------------------------------------
    # Attribute Extraction Helpers
    # -------------------------------------------------------------------------

    def _parse_query_attributes(
        self,
        query: Union[InvestigationState, Dict[str, Any], str],
    ) -> tuple[str, Set[str], Set[str], Set[str]]:
        """Extract service, dependencies, error patterns, and keywords from query."""
        if isinstance(query, InvestigationState):
            service = query.service_name or ""
            deps = self._extract_dependencies(query)
            errors = self._extract_error_patterns(query)
            evidence_summaries = [e.summary for e in query.evidence or [] if e.summary]
            keywords = self._extract_keywords(service, query.incident.get("title", ""), evidence_summaries, errors, deps)
            return service, deps, errors, keywords

        if isinstance(query, dict):
            service = query.get("service_name") or query.get("service") or ""
            deps = {str(d).lower() for d in query.get("dependencies", [])}
            errors = {str(e).lower() for e in query.get("error_patterns", [])}
            raw_keywords = query.get("keywords") or []
            title = query.get("title", "")
            evidence_summaries = query.get("observed_evidence_summary", [])
            keywords = self._extract_keywords(service, title, evidence_summaries, errors, deps)
            keywords.update(str(k).lower() for k in raw_keywords)
            return service, deps, errors, keywords

        if isinstance(query, str):
            service = query
            keywords = {k.lower() for k in re.findall(r"\b\w{3,}\b", query)}
            return service, set(), set(), keywords

        return "", set(), set(), set()

    def _extract_dependencies(self, state: InvestigationState) -> Set[str]:
        """Extract downstream target dependencies from state evidence and dependencies."""
        deps: Set[str] = set()
        for d in state.dependencies or []:
            if d.target_service:
                deps.add(d.target_service.lower())
        for e in state.evidence or []:
            if e.source == "dependency" and e.raw.get("target_service"):
                deps.add(str(e.raw["target_service"]).lower())
            if "bank-gateway" in (e.summary or "").lower() or "bank-gateway" in (e.title or "").lower():
                deps.add("bank-gateway")
        return deps

    def _extract_error_patterns(self, state: InvestigationState) -> Set[str]:
        """Extract exception names, HTTP error codes, and failure keywords from evidence."""
        errors: Set[str] = set()
        for l in state.logs or []:
            if l.exception_type:
                errors.add(l.exception_type.lower())
            if "timeout" in (l.message or "").lower():
                errors.add("timeout")
            if "exhaust" in (l.message or "").lower():
                errors.add("connectionpoolexhaustedexception")
        for t in state.traces or []:
            if t.status_code >= 500:
                errors.add(str(t.status_code))
                if t.status_code == 504:
                    errors.add("gatewaytimeoutexception")
                    errors.add("timeout")
        for e in state.evidence or []:
            summary_lower = (e.summary or "").lower()
            if "gatewaytimeoutexception" in summary_lower or "504" in summary_lower:
                errors.add("gatewaytimeoutexception")
                errors.add("504")
                errors.add("timeout")
            if "connectionpool" in summary_lower or "exhaust" in summary_lower:
                errors.add("connectionpoolexhaustedexception")
        return errors

    def _extract_keywords(
        self,
        service: str,
        title: str,
        summaries: List[str],
        errors: Set[str],
        deps: Set[str],
    ) -> Set[str]:
        """Extract normalized domain keywords for retrieval."""
        text = f"{service} {title} " + " ".join(summaries)
        tokens = {k.lower() for k in re.findall(r"\b[a-zA-Z0-9_\-]{3,}\b", text)}
        # Filter out common stop words
        stop_words = {"the", "and", "for", "with", "this", "from", "that", "was", "are", "via", "has"}
        keywords = tokens - stop_words
        keywords.update(errors)
        keywords.update(deps)
        return keywords


# =============================================================================
# Singleton Memory Instance
# =============================================================================

investigation_memory = InvestigationMemory()