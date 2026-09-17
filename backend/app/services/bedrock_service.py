"""
===============================================================================
TattvaAI - Amazon Bedrock AI Service Abstraction
===============================================================================

Purpose
-------
Service abstraction for evidence-grounded incident reasoning using Amazon Bedrock.

Features
--------
• Uses boto3 Bedrock Runtime client
• Implements Bedrock Converse API for structured multi-model reasoning
• Configured via application settings (AWS_REGION, BEDROCK_MODEL_ID, AWS_ENABLED)
• Standard AWS credential chain resolution (zero hardcoded secrets)
• Graceful, controlled behavior when AWS is disabled for local development
• Pydantic validation for hypotheses, root causes, and recommendations

===============================================================================
"""

from __future__ import annotations

import json
import time
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.core.logger import logger
from app.core.settings import settings


class BedrockServiceError(Exception):
    """Base exception for Bedrock service operations."""
    pass


class BedrockConfigurationError(BedrockServiceError):
    """Raised when Bedrock is requested but not properly configured or disabled."""
    pass


# -----------------------------------------------------------------------------
# Domain Output Schemas for Bedrock Reasoning
# -----------------------------------------------------------------------------

class BedrockHypothesis(BaseModel):
    title: str = Field(description="Hypothesis title grounded in telemetry evidence")
    description: str = Field(description="Detailed technical reasoning")
    supporting_evidence: List[str] = Field(
        default_factory=list,
        description="IDs or summaries of evidence backing this hypothesis"
    )
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    impact: str = Field(default="HIGH", description="Severity impact: CRITICAL, HIGH, MEDIUM, LOW")


class BedrockRootCause(BaseModel):
    service_name: str = Field(description="Service identified as root cause source")
    cause: str = Field(description="Root cause explanation backed by telemetry")
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    evidence_ids: List[str] = Field(
        default_factory=list,
        description="Evidence identifiers supporting this diagnosis"
    )


class BedrockRecommendation(BaseModel):
    type: str = Field(description="IMMEDIATE or LONG_TERM")
    action: str = Field(description="Concrete remediation action")
    reasoning: str = Field(description="Why this remediation resolves the incident")
    priority: str = Field(default="HIGH", description="Priority level: CRITICAL, HIGH, MEDIUM, LOW")


class BedrockAnalysisResult(BaseModel):
    summary: str = Field(default="", description="Executive incident summary")
    causal_chain: str = Field(default="", description="Step-by-step failure propagation chain")
    hypotheses: List[BedrockHypothesis] = Field(default_factory=list)
    root_causes: List[BedrockRootCause] = Field(default_factory=list)
    recommendations: List[BedrockRecommendation] = Field(default_factory=list)
    overall_confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    model_id: str = Field(default="", description="Bedrock model identifier used for analysis")
    latency_ms: int = Field(default=0, description="Inference latency in milliseconds")


# -----------------------------------------------------------------------------
# Bedrock Service Class
# -----------------------------------------------------------------------------

class BedrockService:
    """
    Service client for Amazon Bedrock AI reasoning.
    """

    def __init__(
        self,
        region: Optional[str] = None,
        model_id: Optional[str] = None,
        aws_enabled: Optional[bool] = None,
    ) -> None:
        self.region = region or settings.AWS_REGION
        self.model_id = model_id or settings.BEDROCK_MODEL_ID
        self.aws_enabled = settings.AWS_ENABLED if aws_enabled is None else aws_enabled
        self._client = None

    def is_available(self) -> bool:
        """Check if AWS Bedrock is enabled and configured."""
        return bool(self.aws_enabled)

    def _get_client(self):
        """Lazily initialize and return the Bedrock Runtime client."""
        if not self.aws_enabled:
            return None

        if self._client is None:
            try:
                self._client = boto3.client(
                    "bedrock-runtime",
                    region_name=self.region,
                )
                logger.info(
                    "Initialized Amazon Bedrock client (Region: %s, Model: %s)",
                    self.region,
                    self.model_id,
                )
            except Exception as e:
                logger.warning("Failed to initialize Bedrock client: %s", e)
                self._client = None

        return self._client

    async def analyze_incident(
        self,
        state: Any,
        raise_if_disabled: bool = False,
    ) -> BedrockAnalysisResult:
        """
        Execute evidence-grounded AI incident analysis using Amazon Bedrock.

        When AWS_ENABLED=false, safely returns a controlled inactive result
        or raises BedrockConfigurationError if raise_if_disabled is True.
        """
        if not self.is_available():
            msg = (
                f"Amazon Bedrock is disabled (AWS_ENABLED={self.aws_enabled}). "
                "Skipping live Bedrock invocation."
            )
            logger.info(msg)
            if raise_if_disabled:
                raise BedrockConfigurationError(msg)

            return BedrockAnalysisResult(
                summary="Amazon Bedrock reasoning is inactive (AWS_ENABLED=False).",
                causal_chain="No remote AI reasoning executed.",
                model_id=self.model_id,
                overall_confidence=0.0,
            )

        client = self._get_client()
        if client is None:
            msg = "Bedrock client could not be initialized."
            logger.error(msg)
            if raise_if_disabled:
                raise BedrockServiceError(msg)
            return BedrockAnalysisResult(
                summary=f"Bedrock initialization error in region {self.region}.",
                model_id=self.model_id,
            )

        telemetry_context = self._build_context(state)
        system_prompt = (
            "You are TattvaAI, an expert Site Reliability Engineer (SRE). "
            "Analyze the production incident telemetry provided. "
            "CRITICAL: Ground every hypothesis and root cause strictly in the telemetry evidence. "
            "Never hallucinate metrics or error messages. "
            "Output valid JSON conforming to the following structure:\n"
            "{\n"
            '  "summary": "string",\n'
            '  "causal_chain": "string",\n'
            '  "hypotheses": [{"title": "str", "description": "str", "supporting_evidence": ["id"], "confidence": 0.0-1.0, "impact": "HIGH"}],\n'
            '  "root_causes": [{"service_name": "str", "cause": "str", "confidence": 0.0-1.0, "evidence_ids": ["id"]}],\n'
            '  "recommendations": [{"type": "IMMEDIATE|LONG_TERM", "action": "str", "reasoning": "str", "priority": "HIGH"}],\n'
            '  "overall_confidence": 0.0-1.0\n'
            "}"
        )

        user_content = (
            f"Analyze incident for service '{getattr(state, 'service_name', 'unknown')}':\n\n"
            f"Telemetry Context:\n{json.dumps(telemetry_context, indent=2)}"
        )

        start_time = time.time()
        try:
            # Bedrock Converse API invocation
            response = client.converse(
                modelId=self.model_id,
                messages=[
                    {
                        "role": "user",
                        "content": [{"text": user_content}],
                    }
                ],
                system=[{"text": system_prompt}],
                inferenceConfig={
                    "temperature": 0.1,
                    "maxTokens": 2048,
                },
            )

            latency_ms = int((time.time() - start_time) * 1000)
            logger.info("Bedrock Converse API completed in %d ms", latency_ms)

            output_message = response.get("output", {}).get("message", {})
            content_blocks = output_message.get("content", [])
            response_text = ""
            for block in content_blocks:
                if "text" in block:
                    response_text += block["text"]

            data = self._parse_json_response(response_text)
            return BedrockAnalysisResult(
                summary=data.get("summary", ""),
                causal_chain=data.get("causal_chain", ""),
                hypotheses=[BedrockHypothesis(**h) for h in data.get("hypotheses", [])],
                root_causes=[BedrockRootCause(**rc) for rc in data.get("root_causes", [])],
                recommendations=[BedrockRecommendation(**rec) for rec in data.get("recommendations", [])],
                overall_confidence=float(data.get("overall_confidence", 0.8)),
                model_id=self.model_id,
                latency_ms=latency_ms,
            )

        except (ClientError, BotoCoreError) as e:
            logger.error("Bedrock API invocation failed: %s", e)
            if raise_if_disabled:
                raise BedrockServiceError(f"Bedrock invocation failed: {e}") from e
            return BedrockAnalysisResult(
                summary=f"Bedrock invocation error: {str(e)}",
                model_id=self.model_id,
            )
        except Exception as e:
            logger.error("Unexpected error during Bedrock reasoning: %s", e)
            if raise_if_disabled:
                raise BedrockServiceError(f"Unexpected Bedrock error: {e}") from e
            return BedrockAnalysisResult(
                summary=f"Unexpected error: {str(e)}",
                model_id=self.model_id,
            )

    def _build_context(self, state: Any) -> Dict[str, Any]:
        """Convert state or dictionary into structured JSON prompt context."""
        if isinstance(state, dict):
            return state

        return {
            "incident_id": getattr(state, "incident_id", "UNKNOWN"),
            "service_name": getattr(state, "service_name", "UNKNOWN"),
            "evidence": [
                {
                    "id": getattr(item, "id", f"ev-{i}"),
                    "type": getattr(item, "type", "evidence"),
                    "service": getattr(item, "service_name", ""),
                    "description": getattr(item, "description", str(item)),
                    "confidence": getattr(item, "confidence", 0.0),
                    "severity": getattr(item, "severity", "MEDIUM"),
                }
                for i, item in enumerate(getattr(state, "evidence", [])[:15])
            ],
            "correlations": [
                {
                    "service": getattr(c, "service_name", ""),
                    "severity": getattr(c, "severity", "MEDIUM"),
                    "confidence": getattr(c, "confidence", 0.0),
                }
                for c in getattr(state, "correlations", [])[:5]
            ],
        }

    def _parse_json_response(self, text: str) -> Dict[str, Any]:
        """Extract and parse JSON from Bedrock response text."""
        text = text.strip()
        if text.startswith("```"):
            lines = text.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            text = "\n".join(lines).strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            logger.warning("Could not parse raw Bedrock text as JSON: %s", text[:200])
            return {"summary": text}


# Global Bedrock Service instance
bedrock_service = BedrockService()
