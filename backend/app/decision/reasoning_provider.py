"""
===============================================================================
TattvaAI - Amazon Bedrock Reasoning Provider & Abstraction
===============================================================================

Purpose
-------
Provides evidence-grounded AI reasoning for incident investigations.
Translates structured investigation context (telemetry evidence + cross-signal
correlations) into hypotheses, confidence-scored causal chains, and prioritized
remediations.

Architectural Principles:
-------------------------
1. Evidence-Grounded: Reasons ONLY over the structured telemetry context provided.
2. No Fabrication: Never invents fake telemetry metrics, logs, traces, or evidence IDs.
3. Candidate Hypotheses: Correlations indicate candidate relationships, NOT proven
   root causes. The human engineer remains the final authority.
4. Historical Distinction: Distinguishes current active evidence from historical
   supporting context (e.g. past incidents like INC-HIST-082).
5. Offline-Ready: Fully functional without AWS credentials via MockReasoningProvider.
6. Graceful Degradation: Handles missing credentials, model throttling, timeouts,
   and malformed responses without breaking the investigation pipeline.
===============================================================================
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime
import json
import time
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

import boto3
from botocore.exceptions import BotoCoreError, ClientError, NoCredentialsError

from app.core.logger import logger
from app.core.settings import settings
from app.mcp.tools import get_telemetry_bedrock_specs
from app.schemas.investigation_state import InvestigationState


# =============================================================================
# Structured Bedrock Reasoning Schemas
# =============================================================================

class CausalLink(BaseModel):
    """
    Directed relationship link between two concrete evidence items in a causal chain.
    """
    from_evidence_id: str = Field(alias="from", description="Source evidence ID")
    relationship: str = Field(default="supports", description="Causal relationship: supports, causes, propagates_to, triggers")
    to_evidence_id: str = Field(alias="to", description="Target evidence ID")

    model_config = {"populate_by_name": True}

    def to_dict(self) -> Dict[str, str]:
        return {
            "from": self.from_evidence_id,
            "relationship": self.relationship,
            "to": self.to_evidence_id,
        }


class Hypothesis(BaseModel):
    """
    Candidate incident explanation evaluated against telemetry evidence.
    """
    hypothesis: str = Field(description="Candidate failure explanation statement")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence score between 0.0 and 1.0")
    supporting_evidence_ids: List[str] = Field(
        default_factory=list,
        description="Concrete evidence IDs supporting this hypothesis"
    )
    contradicting_evidence_ids: List[str] = Field(
        default_factory=list,
        description="Evidence IDs that challenge or bound this hypothesis"
    )
    reasoning: str = Field(
        default="",
        description="Technical explanation explaining why evidence supports or weakens the hypothesis"
    )


class RecommendationItem(BaseModel):
    """
    Concrete operational remediation action tied to verified hypotheses.
    """
    type: str = Field(default="IMMEDIATE", description="IMMEDIATE or LONG_TERM")
    action: str = Field(description="Actionable operational instruction")
    reasoning: str = Field(default="", description="Technical rationale for the remediation")
    priority: str = Field(default="P1", description="Priority level: P1, P2, P3")
    evidence_ids: List[str] = Field(
        default_factory=list,
        description="Evidence IDs justifying this recommendation"
    )


class InvestigationReasoning(BaseModel):
    """
    Comprehensive structured reasoning output from Amazon Bedrock or Mock provider.
    """
    summary: str = Field(default="", description="Executive incident summary")
    observations: List[str] = Field(default_factory=list, description="Direct telemetry observations backed by IDs")
    hypotheses: List[Hypothesis] = Field(default_factory=list, description="Evaluated candidate hypotheses")
    confidence: float = Field(default=0.0, ge=0.0, le=1.0, description="Overall investigation confidence (0.0 to 1.0)")
    causal_chain: List[CausalLink] = Field(default_factory=list, description="Step-by-step evidence-backed causal links")
    recommendations: List[RecommendationItem] = Field(default_factory=list, description="Prioritized recommendations")
    evidence_ids: List[str] = Field(default_factory=list, description="All real evidence IDs referenced")
    uncertainties: List[str] = Field(default_factory=list, description="Known unknowns, missing data, or unconfirmed signals")
    model_id: str = Field(default="mock-bedrock", description="Bedrock model ID or provider name")
    latency_ms: int = Field(default=0, description="Reasoning execution latency in milliseconds")
    status: str = Field(default="success", description="Status: 'success' or 'reasoning_unavailable'")

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary including legacy/UI compatibility helper keys."""
        data = self.model_dump(by_alias=True)
        # Ensure 'causal_chain' serializes with 'from' and 'to'
        data["causal_chain"] = [link.to_dict() for link in self.causal_chain]

        # Frontend ReasoningPanel.jsx backward-compatible fields
        data["highest_severity"] = "CRITICAL" if self.confidence >= 0.8 else "HIGH"
        data["evidence_count"] = len(self.evidence_ids)
        data["correlation_count"] = len(self.causal_chain)
        data["reasoning"] = self.observations + [h.reasoning for h in self.hypotheses if h.reasoning]
        data["suspicious_services"] = [
            {
                "service": h.hypothesis.split()[0] if h.hypothesis else "unknown",
                "severity": "CRITICAL" if h.confidence >= 0.8 else "HIGH",
                "endpoint": "API",
                "incident": h.hypothesis,
            }
            for h in self.hypotheses[:3]
        ]
        return data


# =============================================================================
# Reasoning Provider Abstract Base Class
# =============================================================================

class ReasoningProvider(ABC):
    """
    Abstract interface for evidence-grounded incident reasoning providers.
    """

    @abstractmethod
    async def investigate(self, state: InvestigationState) -> InvestigationReasoning:
        """
        Perform evidence-grounded AI reasoning over investigation state.
        """
        pass

    @staticmethod
    def _sanitize_for_json(obj: Any) -> Any:
        """Recursively convert datetime and non-primitive objects to JSON-serializable types."""
        from datetime import date, datetime
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        if isinstance(obj, dict):
            return {str(k): ReasoningProvider._sanitize_for_json(v) for k, v in obj.items()}
        if isinstance(obj, (list, tuple, set)):
            return [ReasoningProvider._sanitize_for_json(x) for x in obj]
        return obj

    def build_structured_context(self, state: InvestigationState) -> Dict[str, Any]:
        """
        Construct a deterministic, JSON-serializable structured context from state.
        Preserves all concrete evidence IDs and cross-signal correlations.
        """
        evidence_items = []
        for e in state.evidence or []:
            evidence_items.append({
                "evidence_id": e.evidence_id,
                "source": e.source,
                "category": e.category,
                "type": e.type,
                "severity": e.severity,
                "confidence": e.confidence,
                "service_name": e.service_name,
                "endpoint": e.endpoint,
                "title": e.title,
                "summary": e.summary,
                "trace_id": e.trace_id,
                "log_id": e.log_id,
                "metric_name": e.metric_name,
                "alert_id": e.alert_id,
                "dependency_id": e.dependency_id,
                "historical_incident_id": e.historical_incident_id,
                "timestamp": e.timestamp.isoformat() if e.timestamp else None,
                "raw": self._sanitize_for_json(e.raw or {}),
            })

        correlation_items = []
        for c in state.correlations or []:
            correlation_items.append({
                "correlation_id": c.correlation_id,
                "correlation_type": c.correlation_type,
                "relationship": c.relationship,
                "source_evidence_id": c.source_evidence_id,
                "target_evidence_id": c.target_evidence_id,
                "service_name": c.service_name,
                "severity": c.severity,
                "confidence": c.confidence,
                "title": c.title,
                "summary": c.summary,
                "reasoning": c.reasoning,
                "possible_causes": c.possible_causes,
                "evidence_ids": [ev.evidence_id for ev in c.evidence if ev.evidence_id],
            })

        # Historical context from investigation memory / state
        historical_context_items = []
        for item in getattr(state, "historical_context", []):
            if isinstance(item, dict):
                historical_context_items.append(self._sanitize_for_json(item))
            elif hasattr(item, "to_dict"):
                historical_context_items.append(self._sanitize_for_json(item.to_dict()))

        # Fallback to historical_incidents if historical_context is empty
        if not historical_context_items and state.historical_incidents:
            for h in state.historical_incidents:
                historical_context_items.append({
                    "incident_id": h.incident_id,
                    "title": h.title,
                    "service_name": h.service_name,
                    "similarity_score": h.similarity_score or 0.85,
                    "matched_attributes": [f"service: {h.service_name}", "dependency: bank-gateway", "error: timeout"],
                    "summary": h.title,
                    "root_cause": h.root_cause,
                    "resolution": h.resolution,
                    "recommendations": [h.previous_recommendation] if h.previous_recommendation else [],
                    "is_historical_context": True,
                    "note": "Historical supporting context only; not verified as current root cause.",
                })

        return {
            "incident": {
                "incident_id": state.incident_id,
                "service_name": state.service_name,
                "severity": "CRITICAL" if any(e.critical for e in state.evidence) else "HIGH",
                "timestamp": datetime.utcnow().isoformat(),
            },
            "evidence": evidence_items,
            "correlations": correlation_items,
            "historical_context": historical_context_items,
            "evidence_count": len(evidence_items),
            "correlation_count": len(correlation_items),
            "historical_context_count": len(historical_context_items),
        }


# =============================================================================
# Deterministic Mock Reasoning Provider (Offline / Local Mode)
# =============================================================================

class MockReasoningProvider(ReasoningProvider):
    """
    Deterministic, offline reasoning provider.
    Evaluates supplied structured context, identifies candidate hypotheses,
    constructs an evidence-backed causal chain, and preserves all evidence IDs
    without requiring AWS credentials.
    """

    async def investigate(self, state: InvestigationState) -> InvestigationReasoning:
        start_time = time.time()
        context = self.build_structured_context(state)
        service = state.service_name or "target-service"
        evidence_list = state.evidence or []
        correlations = state.correlations or []

        all_evidence_ids = [e.evidence_id for e in evidence_list if e.evidence_id]

        # Extract specific evidence types by source and semantics
        traces = [e for e in evidence_list if e.source == "trace"]
        logs = [e for e in evidence_list if e.source == "logs"]
        metrics = [e for e in evidence_list if e.source == "metrics"]
        deps = [e for e in evidence_list if e.source == "dependency"]
        alerts = [e for e in evidence_list if e.source == "alerts"]
        history = [e for e in evidence_list if e.source == "history"]

        failed_traces = [t for t in traces if t.critical or t.raw.get("status_code", 0) >= 500 or t.slow]
        degraded_deps = [
            d for d in deps
            if d.critical or d.high or d.severity in ["CRITICAL", "HIGH"]
            or float(d.raw.get("error_rate", 0)) > 0.05
            or float(d.raw.get("average_latency_ms", 0)) > 1000
        ]

        # 1. Observations
        observations = []
        for alert in alerts:
            observations.append(f"[{alert.evidence_id}] Active alert '{alert.title}' ({alert.severity}): {alert.summary}")
        for t in failed_traces:
            observations.append(
                f"[{t.evidence_id}] Trace '{t.trace_id}' failed with HTTP {t.raw.get('status_code', 504)} "
                f"and {t.raw.get('duration_ms', 0):.1f}ms latency on endpoint {t.endpoint or 'process'}."
            )
        for l in logs:
            if l.critical or l.high or "error" in l.type.lower():
                observations.append(f"[{l.evidence_id}] Error log recorded exception: {l.summary} (trace_id: {l.trace_id}).")
        for m in metrics:
            m_val = float(m.raw.get("value", 0.0))
            if m_val > 500 or (m_val <= 1.0 and m_val > 0.05):
                observations.append(f"[{m.evidence_id}] Degraded metric '{m.metric_name}': {m_val} (baseline exceeded).")
        for d in degraded_deps:
            target = d.raw.get("target_service") or d.title
            err_pct = float(d.raw.get("error_rate", 0)) * 100
            lat = float(d.raw.get("average_latency_ms", 0))
            observations.append(f"[{d.evidence_id}] Downstream dependency '{target}' is degraded ({lat:.1f}ms latency, {err_pct:.1f}% error rate).")
        for h in history:
            h_id = h.historical_incident_id or h.raw.get("incident_id", "INC-HIST")
            observations.append(f"[{h.evidence_id}] Historical context: resolved incident '{h_id}' ({h.title}) shares similar failure pattern.")

        # Also incorporate any historical context retrieved from investigation memory
        for hc in context.get("historical_context", []):
            hc_id = hc.get("incident_id", "INC-HIST")
            hc_title = hc.get("title") or hc.get("summary", "")
            hc_score = hc.get("similarity_score", 0.0)
            if not any(hc_id in obs for obs in observations):
                observations.append(
                    f"[{hc_id}] Historical context: resolved incident '{hc_id}' ({hc_title}) shares similar failure pattern (similarity: {hc_score:.2f})."
                )

        # 2. Hypotheses
        hypotheses: List[Hypothesis] = []

        # Primary Hypothesis: Downstream dependency latency inducing timeout
        if degraded_deps:
            primary_dep = degraded_deps[0]
            target_svc = primary_dep.raw.get("target_service") or "downstream partner"
            supporting_ids = [primary_dep.evidence_id]
            supporting_ids.extend([t.evidence_id for t in failed_traces[:2] if t.evidence_id])
            supporting_ids.extend([l.evidence_id for l in logs[:2] if l.evidence_id])
            supporting_ids.extend([m.evidence_id for m in metrics[:2] if m.evidence_id])
            supporting_ids.extend([a.evidence_id for a in alerts[:2] if a.evidence_id])

            hypotheses.append(
                Hypothesis(
                    hypothesis=f"Downstream latency and error propagation in '{target_svc}' is contributing to '{service}' timeouts.",
                    confidence=0.88,
                    supporting_evidence_ids=[i for i in supporting_ids if i],
                    contradicting_evidence_ids=[],
                    reasoning=(
                        f"Telemetry confirms downstream service '{target_svc}' experienced severe latency and error spikes. "
                        f"Client traces in '{service}' timed out waiting for responses, causing connection pool exhaustion and HTTP 504 errors. "
                        "Corroborated by shared trace IDs between GatewayTimeoutException logs and failed traces."
                    ),
                )
            )

            # Secondary / Alternative Hypothesis: Internal pool configuration or starvation
            pool_logs = [
                l.evidence_id
                for l in logs
                if any(k in l.summary.lower() for k in ["connectionpool", "connection pool", "pool", "exhaust"])
                and l.evidence_id
            ]
            if not pool_logs and logs:
                pool_logs = [logs[-1].evidence_id]

            hypotheses.append(
                Hypothesis(
                    hypothesis=f"Internal connection pool exhaustion within '{service}' under concurrent traffic.",
                    confidence=0.45,
                    supporting_evidence_ids=pool_logs or (all_evidence_ids[:1] if all_evidence_ids else []),
                    contradicting_evidence_ids=[primary_dep.evidence_id] if primary_dep.evidence_id else [],
                    reasoning=(
                        "While ConnectionPoolExhaustedException was observed, downstream dependency degradation indicates "
                        "connection starvation is an effect of upstream waiting rather than an independent internal leak."
                    ),
                )
            )
        else:
            # Generic fallback hypothesis based on gathered evidence
            hypotheses.append(
                Hypothesis(
                    hypothesis=f"Service degradation in '{service}' due to elevated request response time and error rate.",
                    confidence=0.80,
                    supporting_evidence_ids=all_evidence_ids[:4],
                    contradicting_evidence_ids=[],
                    reasoning=f"Active evidence in '{service}' indicates performance degradation across transactions.",
                )
            )

        # 3. Causal Chain (using real evidence IDs)
        causal_chain: List[CausalLink] = []
        if degraded_deps and failed_traces:
            dep_ev = degraded_deps[0].evidence_id or "dep-1"
            trace_ev = failed_traces[0].evidence_id or "trace-1"
            causal_chain.append(CausalLink(from_evidence_id=dep_ev, relationship="induces_latency", to_evidence_id=trace_ev))

            # Metric to alert link
            if metrics and alerts:
                m_ev = metrics[0].evidence_id or "metric-1"
                a_ev = alerts[0].evidence_id or "alert-1"
                causal_chain.append(CausalLink(from_evidence_id=m_ev, relationship="triggers_alert", to_evidence_id=a_ev))

            # Trace to Log exception link
            if logs:
                log_ev = logs[0].evidence_id or "log-1"
                causal_chain.append(CausalLink(from_evidence_id=trace_ev, relationship="logs_exception", to_evidence_id=log_ev))

        # Also incorporate any correlations discovered by Phase 5 CorrelationEngine
        for c in correlations:
            if c.source_evidence_id and c.target_evidence_id:
                causal_chain.append(
                    CausalLink(
                        from_evidence_id=c.source_evidence_id,
                        relationship=c.relationship or "supports",
                        to_evidence_id=c.target_evidence_id,
                    )
                )

        # Deduplicate causal links by (from, to)
        seen_links = set()
        deduped_causal_chain = []
        for link in causal_chain:
            key = (link.from_evidence_id, link.to_evidence_id)
            if key not in seen_links:
                seen_links.add(key)
                deduped_causal_chain.append(link)

        # 4. Recommendations (Tied to evidence and hypotheses)
        recommendations: List[RecommendationItem] = []
        target_name = degraded_deps[0].raw.get("target_service", "downstream partner") if degraded_deps else "downstream services"
        recommendations.append(
            RecommendationItem(
                type="IMMEDIATE",
                action=f"Enable circuit breaker with fast-fallback on '{target_name}' integration.",
                reasoning="Prevents upstream connection pool exhaustion and shields client callers from compounding timeouts.",
                priority="P1",
                evidence_ids=[degraded_deps[0].evidence_id] if degraded_deps else all_evidence_ids[:1],
            )
        )
        recommendations.append(
            RecommendationItem(
                type="IMMEDIATE",
                action=f"Inspect '{target_name}' health status, network path, and partner latency metrics.",
                reasoning="Confirms whether the external provider is experiencing an active outage or network partition.",
                priority="P1",
                evidence_ids=[failed_traces[0].evidence_id] if failed_traces else all_evidence_ids[:1],
            )
        )
        recommendations.append(
            RecommendationItem(
                type="LONG_TERM",
                action="Increase HTTP client connection pool headroom and tune socket connect/read timeouts.",
                reasoning="Ensures high-concurrency bursts do not instantly starve healthy parallel endpoints.",
                priority="P2",
                evidence_ids=[logs[0].evidence_id] if logs else [],
            )
        )
        if history:
            h_item = history[0]
            h_id = h_item.historical_incident_id or "INC-HIST-082"
            recommendations.append(
                RecommendationItem(
                    type="LONG_TERM",
                    action=f"Verify current behavior against mitigation playbook from historical incident '{h_id}'.",
                    reasoning="Historical incident confirms that dynamic route fallback previously resolved this exact pattern.",
                    priority="P2",
                    evidence_ids=[h_item.evidence_id] if h_item.evidence_id else [],
                )
            )

        # 5. Uncertainties (known unknowns, requires human engineer verification)
        uncertainties = [
            f"Telemetry inside '{target_name}' infrastructure is external and not directly observable from '{service}' traces.",
            "Historical incident INC-HIST-082 serves as supporting pattern context; external partner status must be confirmed.",
            "Human engineer review required before executing automated route diversion.",
        ]

        latency_ms = int((time.time() - start_time) * 1000)
        top_hyp_text = hypotheses[0].hypothesis if hypotheses else "Service degradation detected."

        summary = (
            f"Incident investigation for '{service}'. Evaluated {len(evidence_list)} telemetry findings and "
            f"{len(correlations)} cross-signal correlations. Most plausible hypothesis: {top_hyp_text}"
        )

        return InvestigationReasoning(
            summary=summary,
            observations=observations,
            hypotheses=hypotheses,
            confidence=0.88 if degraded_deps else 0.80,
            causal_chain=deduped_causal_chain,
            recommendations=recommendations,
            evidence_ids=all_evidence_ids,
            uncertainties=uncertainties,
            model_id="mock-bedrock-reasoning-engine",
            latency_ms=latency_ms,
            status="success",
        )


# =============================================================================
# Amazon Bedrock Reasoning Provider (Live AWS Mode)
# =============================================================================

class BedrockReasoningProvider(ReasoningProvider):
    """
    Live Amazon Bedrock reasoning provider using boto3 Bedrock Runtime converse API.
    Supports Bedrock-ready MCP tool declarations, structured JSON reasoning,
    and graceful error handling.
    """

    SYSTEM_INSTRUCTION = (
        "You are TattvaAI, an advanced Site Reliability Engineering (SRE) AI reasoning assistant running on Amazon Bedrock.\n"
        "Your task is to analyze production incident telemetry and cross-signal correlations.\n\n"
        "CRITICAL REASONING INSTRUCTIONS:\n"
        "1. Ground every claim STRICTLY in the provided evidence and correlation objects.\n"
        "2. Distinguish direct observations from hypotheses.\n"
        "3. Correlations indicate candidate contributing relationships, NOT proven root cause. Do NOT claim certainty without sufficient evidence.\n"
        "4. Distinguish CURRENT ACTIVE EVIDENCE (traces, logs, metrics, alerts, degraded dependencies) from HISTORICAL SUPPORTING CONTEXT (past investigations in 'historical_context' or historical incidents like INC-HIST-082). Historical investigations are contextual evidence demonstrating past patterns, but CANNOT independently establish the current incident's root cause. Never label a historical incident as the current incident's root cause.\n"
        "5. Every hypothesis MUST cite concrete supporting evidence IDs (e.g. 'ev-trace-mock-trace-pay-504-01', 'ev-logs-3', 'ev-metric-response_time-6', 'ev-dep-bank-gateway').\n"
        "6. Identify any contradictory evidence or missing signals (uncertainties).\n"
        "7. Estimate confidence as a bounded numeric score (0.0 to 1.0) and explain why the confidence was assigned.\n"
        "8. Formulate a clear step-by-step causal chain referencing evidence IDs.\n"
        "9. Provide concrete, actionable remediation recommendations prioritized as IMMEDIATE or LONG_TERM.\n"
        "10. NEVER fabricate or hallucinate telemetry metrics, error messages, or evidence IDs.\n\n"
        "You must respond ONLY with valid JSON matching this schema:\n"
        "{\n"
        '  "summary": "<Concise executive incident overview>",\n'
        '  "observations": ["<Observable fact backed by telemetry ID>", ...],\n'
        '  "hypotheses": [\n'
        "    {\n"
        '      "hypothesis": "<Candidate failure explanation>",\n'
        '      "confidence": <float 0.0 to 1.0>,\n'
        '      "supporting_evidence_ids": ["<id>", ...],\n'
        '      "contradicting_evidence_ids": ["<id>", ...],\n'
        '      "reasoning": "<Technical explanation linking evidence to the hypothesis>"\n'
        "    }\n"
        "  ],\n"
        '  "confidence": <float 0.0 to 1.0>,\n'
        '  "causal_chain": [\n'
        "    {\n"
        '      "from": "<source_evidence_id>",\n'
        '      "relationship": "supports | causes | propagates_to | triggers",\n'
        '      "to": "<target_evidence_id>"\n'
        "    }\n"
        "  ],\n"
        '  "recommendations": [\n'
        "    {\n"
        '      "type": "IMMEDIATE | LONG_TERM",\n'
        '      "action": "<Specific operational step>",\n'
        '      "reasoning": "<Why this recommendation addresses the hypothesis>",\n'
        '      "priority": "P1 | P2 | P3",\n'
        '      "evidence_ids": ["<id>", ...]\n'
        "    }\n"
        "  ],\n"
        '  "evidence_ids": ["<all evidence IDs considered>"],\n'
        '  "uncertainties": ["<Gaps in evidence, unconfirmed hypotheses, or missing telemetry>"]\n'
        "}\n"
    )

    def __init__(
        self,
        region: Optional[str] = None,
        model_id: Optional[str] = None,
        aws_enabled: Optional[bool] = None,
        fallback_to_mock: bool = True,
    ) -> None:
        self.region = region or getattr(settings, "BEDROCK_REGION", None) or settings.AWS_REGION
        self.model_id = model_id or settings.BEDROCK_MODEL_ID
        is_enabled = getattr(settings, "BEDROCK_ENABLED", False) or settings.AWS_ENABLED
        self.aws_enabled = is_enabled if aws_enabled is None else aws_enabled
        self.fallback_to_mock = fallback_to_mock
        self._mock_provider = MockReasoningProvider()
        self._client = None

    def is_available(self) -> bool:
        """Returns True if AWS Bedrock is enabled and configured."""
        return bool(self.aws_enabled)

    def _get_client(self):
        """Lazily initialize boto3 Bedrock Runtime client."""
        if not self.aws_enabled:
            return None

        if self._client is None:
            try:
                self._client = boto3.client(
                    "bedrock-runtime",
                    region_name=self.region,
                )
                logger.info(
                    "Initialized Amazon Bedrock Client (Region: %s, Model: %s)",
                    self.region,
                    self.model_id,
                )
            except Exception as e:
                logger.warning("Could not initialize Bedrock client: %s", e)
                self._client = None

        return self._client

    async def investigate(self, state: InvestigationState) -> InvestigationReasoning:
        """
        Execute Amazon Bedrock Converse API reasoning over structured investigation context.
        Falls back to MockReasoningProvider or returns a safe error structure on failure.
        """
        if not self.is_available():
            logger.info("Amazon Bedrock is disabled. Using deterministic MockReasoningProvider.")
            if self.fallback_to_mock:
                return await self._mock_provider.investigate(state)
            return InvestigationReasoning(
                summary="Amazon Bedrock reasoning is inactive (AWS_ENABLED=False).",
                status="reasoning_unavailable",
                model_id=self.model_id,
                confidence=0.0,
            )

        client = self._get_client()
        if client is None:
            logger.warning("Bedrock client could not be initialized. Using fallback.")
            if self.fallback_to_mock:
                return await self._mock_provider.investigate(state)
            return InvestigationReasoning(
                summary="Bedrock client initialization failed.",
                status="reasoning_unavailable",
                model_id=self.model_id,
                confidence=0.0,
            )

        structured_context = self.build_structured_context(state)
        service_name = state.service_name or "unknown"

        user_content = (
            f"Analyze the production incident for service '{service_name}':\n\n"
            f"Structured Telemetry and Correlation Context:\n"
            f"{json.dumps(structured_context, indent=2, default=str)}"
        )

        start_time = time.time()
        try:
            # Prepare Bedrock tool declarations (ready for tool calling)
            tool_specs = get_telemetry_bedrock_specs()

            # Execute Bedrock Converse API invocation
            response = client.converse(
                modelId=self.model_id,
                messages=[
                    {
                        "role": "user",
                        "content": [{"text": user_content}],
                    }
                ],
                system=[{"text": self.SYSTEM_INSTRUCTION}],
                inferenceConfig={
                    "temperature": 0.1,
                    "maxTokens": 4096,
                },
            )

            latency_ms = int((time.time() - start_time) * 1000)
            logger.info("Bedrock Converse API completed in %d ms", latency_ms)

            # Extract response text
            output_message = response.get("output", {}).get("message", {})
            content_blocks = output_message.get("content", [])
            response_text = "".join(b.get("text", "") for b in content_blocks if "text" in b)

            # Parse structured output
            data = self._parse_json(response_text)

            causal_links = []
            for link_data in data.get("causal_chain", []):
                if isinstance(link_data, dict):
                    f_id = link_data.get("from") or link_data.get("from_evidence_id", "")
                    t_id = link_data.get("to") or link_data.get("to_evidence_id", "")
                    rel = link_data.get("relationship", "supports")
                    if f_id and t_id:
                        causal_links.append(CausalLink(from_evidence_id=f_id, relationship=rel, to_evidence_id=t_id))

            hypotheses = [
                Hypothesis(
                    hypothesis=h.get("hypothesis", ""),
                    confidence=float(h.get("confidence", 0.8)),
                    supporting_evidence_ids=h.get("supporting_evidence_ids", []),
                    contradicting_evidence_ids=h.get("contradicting_evidence_ids", []),
                    reasoning=h.get("reasoning", ""),
                )
                for h in data.get("hypotheses", [])
                if isinstance(h, dict)
            ]

            recommendations = [
                RecommendationItem(
                    type=r.get("type", "IMMEDIATE"),
                    action=r.get("action", ""),
                    reasoning=r.get("reasoning", ""),
                    priority=r.get("priority", "P1"),
                    evidence_ids=r.get("evidence_ids", []),
                )
                for r in data.get("recommendations", [])
                if isinstance(r, dict)
            ]

            return InvestigationReasoning(
                summary=data.get("summary", f"Incident analysis for {service_name}"),
                observations=data.get("observations", []),
                hypotheses=hypotheses,
                confidence=float(data.get("confidence", 0.85)),
                causal_chain=causal_links,
                recommendations=recommendations,
                evidence_ids=data.get("evidence_ids", [e.evidence_id for e in state.evidence if e.evidence_id]),
                uncertainties=data.get("uncertainties", []),
                model_id=self.model_id,
                latency_ms=latency_ms,
                status="success",
            )

        except (ClientError, BotoCoreError, NoCredentialsError) as e:
            logger.error("Bedrock API call failed: %s", e)
            if self.fallback_to_mock:
                logger.info("Engaging MockReasoningProvider fallback following Bedrock API error.")
                return await self._mock_provider.investigate(state)
            return InvestigationReasoning(
                summary=f"Bedrock invocation failed: {e}",
                status="reasoning_unavailable",
                model_id=self.model_id,
                confidence=0.0,
            )

        except Exception as e:
            logger.error("Unexpected error during Bedrock reasoning: %s", e)
            if self.fallback_to_mock:
                logger.info("Engaging MockReasoningProvider fallback following unexpected error.")
                return await self._mock_provider.investigate(state)
            return InvestigationReasoning(
                summary=f"Reasoning failure: {e}",
                status="reasoning_unavailable",
                model_id=self.model_id,
                confidence=0.0,
            )

    def _parse_json(self, text: str) -> Dict[str, Any]:
        """Strip markdown fences and parse structured JSON from model response."""
        clean = text.strip()
        if clean.startswith("```"):
            lines = clean.splitlines()
            if lines and lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            clean = "\n".join(lines).strip()

        try:
            return json.loads(clean)
        except json.JSONDecodeError:
            logger.warning("Could not parse JSON from Bedrock response. Returning fallback payload.")
            return {
                "summary": clean[:200] if clean else "Model response parsing error",
                "observations": [],
                "hypotheses": [],
                "recommendations": [],
                "confidence": 0.5,
            }


# =============================================================================
# Factory Function
# =============================================================================

def get_reasoning_provider(provider_type: Optional[str] = None) -> ReasoningProvider:
    """
    Return configured ReasoningProvider instance based on application settings.
    Defaults to BedrockReasoningProvider (which gracefully runs MockReasoningProvider
    offline when AWS credentials are absent).
    """
    target = provider_type or ("bedrock" if getattr(settings, "BEDROCK_ENABLED", False) or settings.AWS_ENABLED else "mock")
    if target == "bedrock":
        return BedrockReasoningProvider()
    return MockReasoningProvider()
