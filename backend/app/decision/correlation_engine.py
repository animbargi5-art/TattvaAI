"""
===============================================================================
TattvaAI - Evidence Correlation Engine
===============================================================================

Purpose
-------
Discovers explicit, traceable cross-signal relationships across collected telemetry
evidence (traces, logs, metrics, dependencies, alerts, and historical incidents).
Prepares structured correlation chains for consumption by reasoning engines (such as
Amazon Bedrock).

Core Architectural Directives
-----------------------------
1. Evidence-Backed: Every correlation references concrete evidence and signal IDs
   (e.g. trace_id -> log_id, metric_id -> trace_id, dependency_id -> trace_id).
2. Correlation != Root Cause: The engine discovers candidate relationships and causal
   links; it does NOT assert proven root cause (which is the responsibility of AI reasoning).
3. No Fabrication: Does not invent fake telemetry evidence; operates strictly on the
   evidence provided in InvestigationState.
4. Controlled Vocabulary: Uses standardized correlation types:
   - TRACE_LOG
   - TRACE_METRIC
   - TRACE_DEPENDENCY
   - TRACE_ALERT
   - TEMPORAL
   - HISTORICAL_SIMILARITY
   - SERVICE_GROUP
===============================================================================
"""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Set

from app.core.logger import logger
from app.models.correlation import Correlation
from app.models.evidence import Evidence
from app.schemas.investigation_state import InvestigationState


class CorrelationType(str, Enum):
    TRACE_LOG = "TRACE_LOG"
    TRACE_METRIC = "TRACE_METRIC"
    TRACE_DEPENDENCY = "TRACE_DEPENDENCY"
    TRACE_ALERT = "TRACE_ALERT"
    TEMPORAL = "TEMPORAL"
    HISTORICAL_SIMILARITY = "HISTORICAL_SIMILARITY"
    SERVICE_GROUP = "SERVICE_GROUP"


class CorrelationEngine:
    """
    Evidence correlation engine discovering cross-signal relationships.
    """

    SEVERITY_PRIORITY = {
        "CRITICAL": 4,
        "HIGH": 3,
        "MEDIUM": 2,
        "LOW": 1,
    }

    DEFAULT_TIME_WINDOW_SECONDS = 300.0  # 5-minute temporal correlation window

    def __init__(self, time_window_seconds: float = DEFAULT_TIME_WINDOW_SECONDS) -> None:
        self.time_window_seconds = time_window_seconds

    # =========================================================================
    # Main Execution Flow
    # =========================================================================

    def execute(
        self,
        state: InvestigationState,
    ) -> InvestigationState:
        """
        Execute cross-signal correlation analysis across all gathered evidence.
        """
        evidence_list = state.evidence or []
        self.ensure_evidence_ids(evidence_list)

        correlations: List[Correlation] = []

        # 1. Trace <-> Log Correlation
        trace_log_corrs = self.correlate_trace_logs(evidence_list)
        correlations.extend(trace_log_corrs)

        # 2. Metric <-> Trace Correlation
        metric_trace_corrs = self.correlate_metrics_traces(evidence_list)
        correlations.extend(metric_trace_corrs)

        # 3. Dependency <-> Trace Correlation
        dep_trace_corrs = self.correlate_dependencies_traces(evidence_list)
        correlations.extend(dep_trace_corrs)

        # 4. Alert <-> Evidence Correlation
        alert_corrs = self.correlate_alerts(evidence_list)
        correlations.extend(alert_corrs)

        # 5. Historical Incident Correlation
        hist_corrs = self.correlate_historical(evidence_list)
        correlations.extend(hist_corrs)

        # 6. Temporal Correlation (for events lacking explicit trace_ids)
        temporal_corrs = self.correlate_temporal(evidence_list, window_seconds=self.time_window_seconds)
        correlations.extend(temporal_corrs)

        # 7. Fallback: If no cross-signal correlations exist, provide service summary
        if not correlations and evidence_list:
            grouped = self.group_by_service(evidence_list)
            for service, s_evidence in grouped.items():
                correlations.append(self.build_service_summary(service, s_evidence))

        state.correlations = correlations
        state.timeline.append(
            f"Correlation Engine created {len(correlations)} correlations."
        )

        logger.info(
            "CorrelationEngine created %d cross-signal correlations for %s",
            len(correlations),
            state.service_name,
        )

        return state

    # =========================================================================
    # Evidence ID Normalization
    # =========================================================================

    def ensure_evidence_ids(self, evidence_list: List[Evidence]) -> None:
        """
        Ensure every Evidence object has a traceable, non-null identifier.
        """
        for idx, item in enumerate(evidence_list):
            if not item.evidence_id:
                if item.trace_id and item.source == "trace":
                    item.evidence_id = f"ev-trace-{item.trace_id}"
                elif item.log_id:
                    item.evidence_id = f"ev-log-{item.log_id}"
                elif item.alert_id:
                    item.evidence_id = f"ev-alert-{item.alert_id}"
                elif item.dependency_id:
                    item.evidence_id = f"ev-dep-{item.dependency_id}"
                elif item.historical_incident_id:
                    item.evidence_id = f"ev-hist-{item.historical_incident_id}"
                elif item.metric_name:
                    item.evidence_id = f"ev-metric-{item.metric_name}-{idx}"
                else:
                    item.evidence_id = f"ev-{item.source}-{idx}"

    # =========================================================================
    # 1. Trace <-> Log Correlation
    # =========================================================================

    def correlate_trace_logs(self, evidence_list: List[Evidence]) -> List[Correlation]:
        """
        Correlate failed/slow traces with error/warning logs sharing the identical trace_id.
        """
        traces = [e for e in evidence_list if e.source == "trace" and e.trace_id]
        logs = [e for e in evidence_list if e.source == "logs" and e.trace_id]

        correlations: List[Correlation] = []

        for trace in traces:
            matching_logs = [l for l in logs if l.trace_id == trace.trace_id]
            for log in matching_logs:
                # Correlate if trace failed or had high latency, or log has error/warning severity
                is_significant = (
                    trace.critical
                    or trace.high
                    or trace.raw.get("status_code", 0) >= 400
                    or log.critical
                    or log.high
                    or "error" in log.type.lower()
                )
                if not is_significant:
                    continue

                exc_name = log.raw.get("exception_type") or log.type
                status_code = trace.raw.get("status_code", "UNKNOWN")
                duration_ms = trace.raw.get("duration_ms", 0.0)

                correlation = Correlation(
                    correlation_id=f"corr-trace-log-{trace.trace_id}",
                    correlation_type=CorrelationType.TRACE_LOG.value,
                    service_name=trace.service_name,
                    source_evidence_id=trace.evidence_id or trace.trace_id,
                    target_evidence_id=log.evidence_id or log.trace_id,
                    relationship="TRACE_ERROR ↔ LOG_EXCEPTION",
                    severity="CRITICAL" if trace.critical or log.critical else "HIGH",
                    confidence=96,
                    score=0.96,
                    title=f"Trace-Log Error Link: {trace.trace_id}",
                    summary=(
                        f"Failed trace '{trace.trace_id}' (HTTP {status_code}, {duration_ms}ms) "
                        f"correlates directly with log exception '{exc_name}' via shared trace ID."
                    ),
                    reasoning=[
                        f"Trace '{trace.trace_id}' failed with HTTP {status_code} ({duration_ms}ms duration).",
                        f"Log entry '{log.evidence_id}' recorded exception: {log.summary}.",
                        "Shared trace_id establishes direct causal telemetry continuity.",
                    ],
                    evidence=[trace, log],
                    possible_causes=[
                        f"Application exception in endpoint {trace.endpoint or trace.operation}: {log.summary}"
                    ],
                    impacted_services=sorted(list({trace.service_name, log.service_name})),
                    impacted_endpoints=[trace.endpoint] if trace.endpoint else [],
                    evidence_count=2,
                    average_confidence=(trace.confidence + log.confidence) / 2.0,
                    tags=["trace-log", trace.service_name, str(status_code)],
                    metadata={
                        "trace_id": trace.trace_id or "",
                        "log_id": log.log_id or log.evidence_id or "",
                        "status_code": str(status_code),
                        "exception": exc_name,
                    },
                )
                correlations.append(correlation)

        return correlations

    # =========================================================================
    # 2. Metric <-> Trace Correlation
    # =========================================================================

    def correlate_metrics_traces(self, evidence_list: List[Evidence]) -> List[Correlation]:
        """
        Correlate degraded metrics (high latency, elevated error rate) with corresponding traces.
        """
        metrics = [e for e in evidence_list if e.source == "metrics"]
        traces = [e for e in evidence_list if e.source == "trace"]

        correlations: List[Correlation] = []

        seen_types: Set[str] = set()
        sorted_metrics = sorted(metrics, key=lambda m: float(m.raw.get("value", 0.0)), reverse=True)

        for metric in sorted_metrics:
            metric_val = float(metric.raw.get("value", 0.0))
            metric_name = (metric.metric_name or metric.raw.get("metric_name", "")).lower()

            # A. Latency metric correlation
            if ("response_time" in metric_name or "latency" in metric_name) and "latency" not in seen_types:
                slow_traces = [t for t in traces if t.service_name == metric.service_name and (t.slow or t.critical)]
                if slow_traces and metric_val > 500.0:
                    seen_types.add("latency")
                    target_trace = slow_traces[0]
                    trace_ms = target_trace.raw.get("duration_ms", 0.0)


                    correlation = Correlation(
                        correlation_id=f"corr-metric-latency-{target_trace.trace_id or 'trace'}",
                        correlation_type=CorrelationType.TRACE_METRIC.value,
                        service_name=metric.service_name,
                        source_evidence_id=metric.evidence_id,
                        target_evidence_id=target_trace.evidence_id or target_trace.trace_id,
                        relationship="METRIC_LATENCY_SPIKE ↔ TRACE_SLOWDOWN",
                        severity="HIGH" if metric_val >= 1000.0 else "MEDIUM",
                        confidence=92,
                        score=0.92,
                        title=f"Metric Degradation Coincides with Trace Latency ({metric.metric_name or 'latency'})",
                        summary=(
                            f"Observed P95 latency of {metric_val:.1f}ms coincides with slow transaction "
                            f"'{target_trace.trace_id}' ({trace_ms:.1f}ms)."
                        ),
                        reasoning=[
                            f"Metric '{metric.metric_name}' spiked to {metric_val:.1f}ms (threshold: 500ms).",
                            f"Trace '{target_trace.trace_id}' experienced {trace_ms:.1f}ms duration on {target_trace.endpoint}.",
                            "Aggregated service metric degradation coincides with individual transaction slowdown.",
                        ],
                        evidence=[metric, target_trace],
                        possible_causes=[
                            f"Systemic service degradation causing elevated response times on {target_trace.endpoint or 'API'}"
                        ],
                        impacted_services=[metric.service_name],
                        evidence_count=2,
                        average_confidence=(metric.confidence + target_trace.confidence) / 2.0,
                        tags=["metric-trace", "latency", metric.service_name],
                        metadata={
                            "metric_name": metric.metric_name or "response_time",
                            "metric_value": str(metric_val),
                            "trace_id": target_trace.trace_id or "",
                        },
                    )
                    correlations.append(correlation)

            # B. Error rate metric correlation
            elif ("error" in metric_name or "fail" in metric_name) and "error" not in seen_types:
                failed_traces = [t for t in traces if t.service_name == metric.service_name and t.raw.get("status_code", 0) >= 500]
                if failed_traces and metric_val > 0.05:
                    seen_types.add("error")
                    target_trace = failed_traces[0]

                    correlation = Correlation(
                        correlation_id=f"corr-metric-error-{target_trace.trace_id or 'trace'}",
                        correlation_type=CorrelationType.TRACE_METRIC.value,
                        service_name=metric.service_name,
                        source_evidence_id=metric.evidence_id,
                        target_evidence_id=target_trace.evidence_id or target_trace.trace_id,
                        relationship="METRIC_ERROR_SPIKE ↔ TRACE_FAILURE",
                        severity="CRITICAL" if metric_val >= 0.20 else "HIGH",
                        confidence=94,
                        score=0.94,
                        title=f"Elevated Error Rate Correlates with Trace Failures ({metric_val * 100:.1f}%)",
                        summary=(
                            f"Service error rate metric ({metric_val * 100:.1f}%) directly correlates with "
                            f"HTTP {target_trace.raw.get('status_code')} failures observed in trace '{target_trace.trace_id}'."
                        ),
                        reasoning=[
                            f"Error rate metric '{metric.metric_name}' recorded {metric_val * 100:.1f}% errors.",
                            f"Trace '{target_trace.trace_id}' failed with HTTP {target_trace.raw.get('status_code')}.",
                            "Transaction failure rate confirms metric error threshold breach.",
                        ],
                        evidence=[metric, target_trace],
                        possible_causes=["Elevated failure rate due to downstream or backend service errors"],
                        impacted_services=[metric.service_name],
                        evidence_count=2,
                        average_confidence=(metric.confidence + target_trace.confidence) / 2.0,
                        tags=["metric-trace", "error-rate", metric.service_name],
                        metadata={
                            "metric_name": metric.metric_name or "error_rate",
                            "metric_value": str(metric_val),
                            "trace_id": target_trace.trace_id or "",
                        },
                    )
                    correlations.append(correlation)

        return correlations

    # =========================================================================
    # 3. Dependency <-> Trace Correlation
    # =========================================================================

    def correlate_dependencies_traces(self, evidence_list: List[Evidence]) -> List[Correlation]:
        """
        Correlate service failures with degraded downstream dependencies.
        NOTE: Identified as a candidate contributing factor, NOT asserted as proven root cause.
        """
        dependencies = [e for e in evidence_list if e.source == "dependency"]
        traces = [e for e in evidence_list if e.source == "trace"]

        correlations: List[Correlation] = []

        for dep in dependencies:
            target_service = dep.raw.get("target_service") or dep.title.replace(" Dependency", "")
            error_rate = float(dep.raw.get("error_rate", 0.0))
            avg_latency = float(dep.raw.get("average_latency_ms", 0.0))

            if error_rate <= 0.01 and avg_latency < 1000.0:
                continue  # Skip healthy dependencies

            # Find traces in the source service that failed or timed out
            related_traces = [
                t for t in traces
                if t.service_name == dep.service_name and (t.critical or t.slow or t.raw.get("status_code", 0) >= 500)
            ]

            if related_traces:
                primary_trace = related_traces[0]
                correlation = Correlation(
                    correlation_id=f"corr-dep-{dep.service_name}-{target_service}",
                    correlation_type=CorrelationType.TRACE_DEPENDENCY.value,
                    service_name=dep.service_name,
                    source_evidence_id=dep.evidence_id,
                    target_evidence_id=primary_trace.evidence_id or primary_trace.trace_id,
                    relationship="DEPENDENCY_DEGRADATION ↔ UPSTREAM_TRANSACTION_FAILURE",
                    severity="HIGH" if error_rate > 0.15 or avg_latency > 2000.0 else "MEDIUM",
                    confidence=90,
                    score=0.90,
                    title=f"Downstream Dependency Impairment Candidate: {target_service}",
                    summary=(
                        f"Downstream dependency '{target_service}' is degraded (latency: {avg_latency:.1f}ms, "
                        f"error rate: {error_rate * 100:.1f}%) and is a candidate contributing factor for "
                        f"failures in '{dep.service_name}'."
                    ),
                    reasoning=[
                        f"Dependency '{target_service}' has average latency of {avg_latency:.1f}ms and {error_rate * 100:.1f}% error rate.",
                        f"Trace '{primary_trace.trace_id}' experienced {primary_trace.raw.get('duration_ms', 0)}ms latency and HTTP {primary_trace.raw.get('status_code')}.",
                        "Downstream latency/errors correlate with upstream client timeouts and connection starvation.",
                        "Identified as a candidate contributing factor; awaiting AI hypothesis confirmation.",
                    ],
                    evidence=[dep, primary_trace],
                    possible_causes=[
                        f"Downstream service '{target_service}' experiencing degradation, database contention, or partner outage."
                    ],
                    impacted_services=sorted(list({dep.service_name, target_service})),
                    evidence_count=2,
                    average_confidence=(dep.confidence + primary_trace.confidence) / 2.0,
                    tags=["dependency", target_service, dep.service_name],
                    metadata={
                        "source_service": dep.service_name,
                        "target_service": target_service,
                        "dependency_latency": str(avg_latency),
                        "dependency_error_rate": str(error_rate),
                        "trace_id": primary_trace.trace_id or "",
                    },
                )
                correlations.append(correlation)

        return correlations

    # =========================================================================
    # 4. Alert <-> Evidence Correlation
    # =========================================================================

    def correlate_alerts(self, evidence_list: List[Evidence]) -> List[Correlation]:
        """
        Correlate active firing alerts with supporting evidence (traces, metrics, dependencies).
        """
        alerts = [e for e in evidence_list if e.source == "alerts"]
        traces = [e for e in evidence_list if e.source == "trace" and (e.critical or e.slow)]
        metrics = [e for e in evidence_list if e.source == "metrics"]

        correlations: List[Correlation] = []

        for alert in alerts:
            # Correlate alert with failed trace or metric in the same service
            matching_traces = [t for t in traces if t.service_name == alert.service_name]
            supporting_evidence: List[Evidence] = [alert]
            target_id = alert.evidence_id

            if matching_traces:
                supporting_evidence.append(matching_traces[0])
                target_id = matching_traces[0].evidence_id or matching_traces[0].trace_id

            matching_metrics = [m for m in metrics if m.service_name == alert.service_name]
            if matching_metrics:
                supporting_evidence.append(matching_metrics[0])

            correlation = Correlation(
                correlation_id=f"corr-alert-{alert.alert_id or alert.evidence_id}",
                correlation_type=CorrelationType.TRACE_ALERT.value,
                service_name=alert.service_name,
                source_evidence_id=alert.evidence_id or alert.alert_id,
                target_evidence_id=target_id,
                relationship="ALERT_FIRING ↔ SUPPORTING_TELEMETRY",
                severity=alert.severity,
                confidence=95,
                score=0.95,
                title=f"Firing Alert Grounded in Telemetry: {alert.title}",
                summary=(
                    f"Firing alert '{alert.title}' ({alert.severity}) is corroborated by "
                    f"{len(supporting_evidence) - 1} supporting telemetry findings in '{alert.service_name}'."
                ),
                reasoning=[
                    f"Alert '{alert.title}' status is FIRING with severity '{alert.severity}'.",
                    f"Alert condition description: {alert.summary}",
                    "Directly grounded by active traces and telemetry metrics.",
                ],
                evidence=supporting_evidence,
                possible_causes=[f"Trigger condition met for monitoring rule '{alert.title}'"],
                impacted_services=[alert.service_name],
                evidence_count=len(supporting_evidence),
                average_confidence=sum(e.confidence for e in supporting_evidence) / len(supporting_evidence),
                tags=["alert", alert.title, alert.service_name],
                metadata={
                    "alert_name": alert.title,
                    "alert_severity": alert.severity,
                    "target_evidence_id": target_id or "",
                },
            )
            correlations.append(correlation)

        return correlations

    # =========================================================================
    # 5. Historical Incident Correlation
    # =========================================================================

    def correlate_historical(self, evidence_list: List[Evidence]) -> List[Correlation]:
        """
        Correlate historical incidents with the current failure pattern.
        NOTE: Provides historical supporting context; does NOT assert past cause as current cause.
        """
        historical_items = [e for e in evidence_list if e.source == "history"]
        traces = [e for e in evidence_list if e.source == "trace" and (e.critical or e.high)]

        correlations: List[Correlation] = []

        for hist in historical_items:
            hist_id = hist.historical_incident_id or hist.raw.get("incident_id", "INC-HIST")
            target_trace = traces[0] if traces else None
            target_id = target_trace.evidence_id if target_trace else hist.evidence_id

            evidence_group = [hist]
            if target_trace:
                evidence_group.append(target_trace)

            correlation = Correlation(
                correlation_id=f"corr-hist-{hist_id}",
                correlation_type=CorrelationType.HISTORICAL_SIMILARITY.value,
                service_name=hist.service_name,
                source_evidence_id=hist.evidence_id or hist_id,
                target_evidence_id=target_id,
                relationship="HISTORICAL_FAILURE_PATTERN_MATCH",
                severity=hist.severity,
                confidence=hist.confidence,
                score=hist.confidence / 100.0,
                title=f"Historical Incident Similarity: {hist_id}",
                summary=(
                    f"Current incident in '{hist.service_name}' shares failure characteristics with "
                    f"past resolved incident '{hist_id}' ({hist.title})."
                ),
                reasoning=[
                    f"Historical incident '{hist_id}' matched with similarity score: {hist.raw.get('similarity_score', 0.9):.2f}.",
                    f"Previous root cause: {hist.raw.get('root_cause', 'Unknown')}.",
                    f"Proven resolution: {hist.raw.get('resolution', 'N/A')}.",
                    "Marked as historical supporting context; requires evaluation against current telemetry.",
                ],
                evidence=evidence_group,
                possible_causes=[
                    f"Historical recurrence candidate: {hist.raw.get('root_cause', 'Similar historical failure')}"
                ],
                impacted_services=[hist.service_name],
                evidence_count=len(evidence_group),
                average_confidence=sum(e.confidence for e in evidence_group) / len(evidence_group),
                tags=["historical", hist_id, hist.service_name],
                metadata={
                    "historical_incident_id": hist_id,
                    "previous_resolution": hist.raw.get("resolution", ""),
                    "similarity_score": str(hist.raw.get("similarity_score", 0.9)),
                },
            )
            correlations.append(correlation)

        return correlations

    # =========================================================================
    # 6. Temporal Correlation
    # =========================================================================

    def correlate_temporal(
        self,
        evidence_list: List[Evidence],
        window_seconds: float = DEFAULT_TIME_WINDOW_SECONDS,
    ) -> List[Correlation]:
        """
        Correlate events occurring within a tight time window when explicit trace_ids
        are unavailable, provided they share service context and failure semantics.
        """
        # Exclude events that already share an explicit trace_id, healthy events, and historical incidents
        unlinked_evidence = [
            e for e in evidence_list
            if not e.trace_id
            and e.source != "history"
            and e.timestamp is not None
            and (
                e.critical
                or e.high
                or "error" in (e.type or "").lower()
                or "fail" in (e.type or "").lower()
                or "slow" in (e.type or "").lower()
                or "degrad" in (e.type or "").lower()
            )
        ]

        correlations: List[Correlation] = []

        for i, ev_a in enumerate(unlinked_evidence):
            for ev_b in unlinked_evidence[i + 1:]:
                # Only temporally correlate if within same service and different sources
                if ev_a.service_name != ev_b.service_name:
                    continue
                if ev_a.source == ev_b.source:
                    continue  # Do not pair same source temporally

                # Avoid cross-pairing metrics with alerts and dependencies that already have dedicated analyzers
                dedicated_sources = {"metrics", "dependency", "alerts", "history"}
                if ev_a.source in dedicated_sources and ev_b.source in dedicated_sources:
                    continue



                if ev_a.timestamp and ev_b.timestamp:
                    diff_seconds = abs((ev_a.timestamp - ev_b.timestamp).total_seconds())
                    if diff_seconds <= window_seconds:
                        correlation = Correlation(
                            correlation_id=f"corr-temporal-{ev_a.evidence_id}-{ev_b.evidence_id}",
                            correlation_type=CorrelationType.TEMPORAL.value,
                            service_name=ev_a.service_name,
                            source_evidence_id=ev_a.evidence_id,
                            target_evidence_id=ev_b.evidence_id,
                            relationship="TEMPORAL_COINCIDENCE",
                            severity=self.highest_severity([ev_a, ev_b]),
                            confidence=75,
                            score=0.75,
                            title=f"Temporal Coincidence ({ev_a.source} ↔ {ev_b.source})",
                            summary=(
                                f"Signals from '{ev_a.source}' and '{ev_b.source}' occurred within "
                                f"{diff_seconds:.1f}s of each other during incident window."
                            ),
                            reasoning=[
                                f"Event A ({ev_a.title}) at {ev_a.timestamp.isoformat()}.",
                                f"Event B ({ev_b.title}) at {ev_b.timestamp.isoformat()}.",
                                f"Time delta of {diff_seconds:.1f}s is within the {window_seconds}s temporal correlation window.",
                            ],
                            evidence=[ev_a, ev_b],
                            possible_causes=[f"Coincident events in '{ev_a.service_name}' during active incident"],
                            impacted_services=[ev_a.service_name],
                            evidence_count=2,
                            average_confidence=(ev_a.confidence + ev_b.confidence) / 2.0,
                            tags=["temporal", ev_a.service_name],
                            metadata={
                                "source_evidence": ev_a.evidence_id or "",
                                "target_evidence": ev_b.evidence_id or "",
                                "time_delta_seconds": f"{diff_seconds:.2f}",
                            },
                        )
                        correlations.append(correlation)

        return correlations

    # =========================================================================
    # Legacy Service Grouping & Statistics (Preserved for compatibility)
    # =========================================================================

    def group_by_service(
        self,
        evidence: List[Evidence],
    ) -> Dict[str, List[Evidence]]:
        """Group evidence items by their service name."""
        grouped = defaultdict(list)
        for item in evidence:
            grouped[item.service_name].append(item)
        return grouped

    def build_service_summary(
        self,
        service: str,
        evidence: List[Evidence],
    ) -> Correlation:
        """Construct a high-level service summary correlation."""
        severity = self.highest_severity(evidence)
        confidence = self.average_confidence(evidence)
        causes = self.generate_causes(evidence)
        impacted = sorted({item.service_name for item in evidence})

        return Correlation(
            correlation_id=f"corr-service-{service}",
            correlation_type=CorrelationType.SERVICE_GROUP.value,
            service_name=service,
            severity=severity,
            confidence=confidence,
            title=f"{service} Telemetry Correlation",
            summary=f"{len(evidence)} correlated evidence findings evaluated for '{service}'.",
            evidence=evidence,
            possible_causes=causes,
            impacted_services=impacted,
            evidence_count=len(evidence),
            average_confidence=float(confidence),
        )

    def highest_severity(
        self,
        evidence: List[Evidence],
    ) -> str:
        """Find the maximum severity amongst a list of evidence items."""
        highest = "LOW"
        for item in evidence:
            sev = (item.severity or "LOW").upper()
            if self.SEVERITY_PRIORITY.get(sev, 1) > self.SEVERITY_PRIORITY.get(highest, 1):
                highest = sev
        return highest

    def average_confidence(
        self,
        evidence: List[Evidence],
    ) -> int:
        """Calculate the average confidence score across evidence items."""
        if not evidence:
            return 0
        return int(sum(item.confidence for item in evidence) / len(evidence))

    def generate_causes(
        self,
        evidence: List[Evidence],
    ) -> List[str]:
        """Generate candidate causes based on evidence classification."""
        causes = set()
        for item in evidence:
            item_type = getattr(item, "type", "")
            if item_type == "Critical Slow API":
                causes.add("High API latency detected.")
            elif item_type == "Slow API":
                causes.add("Application response time increased.")
            elif item_type == "Server Error":
                causes.add("Application exceptions detected.")
            elif item_type == "Application Error":
                causes.add("Application log errors detected.")
            elif item_type == "High Traffic":
                causes.add("Traffic surge may be affecting the service.")
            elif item_type == "Dependency Failure":
                causes.add("Downstream dependency failures detected.")
            elif item_type in ("Recurring Application Failure", "Recurring Incident"):
                causes.add("Historical incidents indicate a recurring failure pattern.")
            elif item_type == "Active Alert":
                causes.add("Monitoring alerts confirm the incident condition.")

        if not causes:
            causes.add("No obvious cause identified.")

        return sorted(causes)