"""
===============================================================================
TattvaAI - MCP Tool Definitions and Execution Layer
===============================================================================

Purpose
-------
Provides generic MCP tool definitions and execution abstractions for incident
evidence gathering. Operates as an evidence/tool access layer above TelemetryService.

Architecture
------------
Bedrock / Agent Tool Invocation
             ↓
     MCPToolExecutor / TelemetryMCPDispatcher
             ↓
     TelemetryService
             ↓
     TelemetrySource (Mock / OTLP / SigNoz)
             ↓
     Canonical Evidence Models
             ↓
     Structured MCPToolResult

Responsibilities
----------------
• Define canonical MCP evidence tools with Bedrock-compatible schemas
• Expose tools for get_traces, get_logs, get_metrics, get_dependencies,
  get_alerts, and get_historical_incidents
• Delegate tool execution through the vendor-neutral TelemetryService
• Return consistent, structured MCPToolResult objects
• Provide retry and timeout protections without leaking unhandled exceptions
===============================================================================
"""

from __future__ import annotations

import asyncio
from time import perf_counter
from typing import Any, Callable, Dict, List, Optional

from app.core.logger import logger
from app.mcp.config import mcp_config
from app.mcp.exceptions import (
    MCPConnectionError,
    MCPToolError,
    MCPToolNotFoundError,
    MCPToolTimeoutError,
)
from app.mcp.models import MCPTool, MCPToolCall, MCPToolResult

from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app.services.telemetry_service import TelemetryService


# =============================================================================
# Canonical Telemetry MCP Tool Definitions (Bedrock-ready)
# =============================================================================

TELEMETRY_MCP_TOOLS: Dict[str, MCPTool] = {
    "get_traces": MCPTool(
        name="get_traces",
        description=(
            "Retrieve distributed trace spans and HTTP transaction execution details "
            "for a target microservice, including duration, status codes, and error messages."
        ),
        input_schema={
            "type": "object",
            "properties": {
                "service_name": {
                    "type": "string",
                    "description": "The target microservice name (e.g. 'payment-service').",
                },
            },
            "required": ["service_name"],
        },
        annotations={"read_only": True, "category": "telemetry"},
    ),
    "get_logs": MCPTool(
        name="get_logs",
        description=(
            "Retrieve structured log entries and error stack traces for a target microservice, "
            "correlated with distributed traces."
        ),
        input_schema={
            "type": "object",
            "properties": {
                "service_name": {
                    "type": "string",
                    "description": "The target microservice name (e.g. 'payment-service').",
                },
                "severity": {
                    "type": "string",
                    "description": "Optional log severity filter (e.g. 'ERROR', 'WARN', 'INFO').",
                },
            },
            "required": ["service_name"],
        },
        annotations={"read_only": True, "category": "telemetry"},
    ),
    "get_metrics": MCPTool(
        name="get_metrics",
        description=(
            "Retrieve operational metric data points (latency, error rate, request count, CPU) "
            "for a target microservice."
        ),
        input_schema={
            "type": "object",
            "properties": {
                "service_name": {
                    "type": "string",
                    "description": "The target microservice name (e.g. 'payment-service').",
                },
                "metric_name": {
                    "type": "string",
                    "description": "The specific metric identifier (e.g. 'response_time', 'error_rate').",
                },
            },
            "required": ["service_name"],
        },
        annotations={"read_only": True, "category": "telemetry"},
    ),
    "get_dependencies": MCPTool(
        name="get_dependencies",
        description=(
            "Retrieve service topology, upstream/downstream dependency relationships, "
            "error rates, and average latency stats."
        ),
        input_schema={
            "type": "object",
            "properties": {
                "service_name": {
                    "type": "string",
                    "description": "The target microservice name (e.g. 'payment-service').",
                },
            },
            "required": ["service_name"],
        },
        annotations={"read_only": True, "category": "telemetry"},
    ),
    "get_alerts": MCPTool(
        name="get_alerts",
        description=(
            "Retrieve active or triggered alerts across services or filtered by target service."
        ),
        input_schema={
            "type": "object",
            "properties": {
                "service_name": {
                    "type": "string",
                    "description": "Optional microservice name to filter alerts.",
                },
            },
            "required": [],
        },
        annotations={"read_only": True, "category": "telemetry"},
    ),
    "get_historical_incidents": MCPTool(
        name="get_historical_incidents",
        description=(
            "Retrieve past resolved incidents with similar failure patterns, root causes, "
            "and proven remediation steps."
        ),
        input_schema={
            "type": "object",
            "properties": {
                "service_name": {
                    "type": "string",
                    "description": "The target microservice name (e.g. 'payment-service').",
                },
            },
            "required": ["service_name"],
        },
        annotations={"read_only": True, "category": "telemetry"},
    ),
}


def get_telemetry_mcp_tools() -> List[MCPTool]:
    """Return all canonical MCP telemetry tool definitions."""
    return list(TELEMETRY_MCP_TOOLS.values())


def get_telemetry_bedrock_specs() -> List[Dict[str, Any]]:
    """Return all tool definitions formatted for Amazon Bedrock Converse API toolConfig."""
    return [tool.to_bedrock_spec() for tool in TELEMETRY_MCP_TOOLS.values()]


# =============================================================================
# Telemetry MCP Dispatcher (Vendor-Neutral Local Tool Handler)
# =============================================================================

class TelemetryMCPDispatcher:
    """
    Dispatches MCP tool executions to the vendor-neutral TelemetryService abstraction.
    Normalizes domain models into structured, JSON-serializable dictionaries for callers.
    """

    def __init__(self, telemetry_service: Optional[Any] = None) -> None:
        if telemetry_service is not None:
            self.telemetry = telemetry_service
        else:
            from app.services.telemetry_service import TelemetryService
            self.telemetry = TelemetryService()
        logger.info(
            "Initialized TelemetryMCPDispatcher with TelemetryService (provider: %s)",
            self.telemetry.source.__class__.__name__,
        )

    def _serialize_model(self, obj: Any) -> Any:
        if hasattr(obj, "model_dump"):
            return obj.model_dump(mode="json")
        if hasattr(obj, "dict"):
            return obj.dict()
        return obj

    async def execute_tool(
        self,
        tool_name: str,
        arguments: Optional[Dict[str, Any]] = None,
    ) -> MCPToolResult:
        """
        Execute an evidence gathering tool and return a structured MCPToolResult.
        """
        args = arguments or {}
        started = perf_counter()

        if tool_name not in TELEMETRY_MCP_TOOLS:
            elapsed = (perf_counter() - started) * 1000
            return MCPToolResult.error_result(
                tool_name=tool_name,
                error=f"Tool '{tool_name}' not found. Available tools: {sorted(list(TELEMETRY_MCP_TOOLS.keys()))}",
                error_type="MCPToolNotFoundError",
                execution_time_ms=elapsed,
            )

        try:
            service_name = args.get("service_name", "payment-service")
            extra_args = {k: v for k, v in args.items() if k not in ("service_name", "metric_name")}

            if tool_name == "get_traces":
                raw_result = await self.telemetry.get_traces(service_name=service_name, **extra_args)
            elif tool_name == "get_logs":
                raw_result = await self.telemetry.get_logs(service_name=service_name, **extra_args)
            elif tool_name == "get_metrics":
                metric_name = args.get("metric_name", "response_time")
                raw_result = await self.telemetry.get_metrics(
                    service_name=service_name, metric_name=metric_name, **extra_args
                )
            elif tool_name == "get_dependencies":
                raw_result = await self.telemetry.get_dependencies(service_name=service_name, **extra_args)
            elif tool_name == "get_alerts":
                alert_service = args.get("service_name")
                raw_result = await self.telemetry.get_alerts(service_name=alert_service, **extra_args)
            elif tool_name == "get_historical_incidents":
                raw_result = await self.telemetry.get_historical_incidents(service_name=service_name, **extra_args)
            else:
                raise MCPToolNotFoundError(tool_name)

            serialized = [self._serialize_model(item) for item in raw_result] if isinstance(raw_result, list) else self._serialize_model(raw_result)
            elapsed = (perf_counter() - started) * 1000

            return MCPToolResult.success_result(
                tool_name=tool_name,
                structured_content=serialized,
                execution_time_ms=elapsed,
                metadata={"item_count": len(serialized) if isinstance(serialized, list) else 1},
            )

        except Exception as ex:
            elapsed = (perf_counter() - started) * 1000
            logger.warning("TelemetryMCPDispatcher: tool execution error in '%s': %s", tool_name, ex)
            return MCPToolResult.error_result(
                tool_name=tool_name,
                error=str(ex),
                error_type=type(ex).__name__,
                execution_time_ms=elapsed,
            )


# =============================================================================
# Generic MCP Tool Executor
# =============================================================================

class MCPToolExecutor:
    """
    Unified MCP tool execution layer.
    Can execute tools either via a local TelemetryMCPDispatcher or a remote MCPClient.
    """

    def __init__(
        self,
        client: Optional[Any] = None,
        dispatcher: Optional[TelemetryMCPDispatcher] = None,
    ) -> None:
        self.client = client
        self.dispatcher = dispatcher or TelemetryMCPDispatcher()

    async def execute(
        self,
        tool_name: str,
        arguments: Optional[Dict[str, Any]] = None,
    ) -> MCPToolResult:
        """
        Execute one MCP tool with retry protections.
        Delegates to local dispatcher if no client or if client is inactive.
        """
        arguments = arguments or {}
        request = MCPToolCall(tool_name=tool_name, arguments=arguments)

        # If a connected remote client is provided, execute via the client
        if self.client is not None and getattr(self.client, "connected", False):
            return await self._execute_with_retry(request)

        # Otherwise execute via the local vendor-neutral TelemetryMCPDispatcher
        return await self.dispatcher.execute_tool(tool_name=tool_name, arguments=arguments)

    async def _execute_with_retry(self, request: MCPToolCall) -> MCPToolResult:
        started = perf_counter()
        last_error: Optional[Exception] = None

        for attempt in range(1, mcp_config.MAX_RETRIES + 1):
            try:
                response = await self.client.call_tool(
                    request.tool_name,
                    request.arguments,
                )
                elapsed = (perf_counter() - started) * 1000
                return MCPToolResult.success_result(
                    tool_name=request.tool_name,
                    structured_content=response,
                    execution_time_ms=elapsed,
                )
            except MCPToolTimeoutError as exc:
                last_error = exc
                logger.warning(
                    "Timeout executing '%s' (attempt %d/%d)",
                    request.tool_name,
                    attempt,
                    mcp_config.MAX_RETRIES,
                )
            except MCPConnectionError as exc:
                last_error = exc
                logger.warning(
                    "Connection failed while executing '%s' (attempt %d/%d)",
                    request.tool_name,
                    attempt,
                    mcp_config.MAX_RETRIES,
                )
            except Exception as exc:
                elapsed = (perf_counter() - started) * 1000
                return MCPToolResult.error_result(
                    tool_name=request.tool_name,
                    error=str(exc),
                    error_type=type(exc).__name__,
                    execution_time_ms=elapsed,
                )

            await asyncio.sleep(mcp_config.RETRY_BACKOFF_SECONDS)

        elapsed = (perf_counter() - started) * 1000
        return MCPToolResult.error_result(
            tool_name=request.tool_name,
            error=f"Maximum retry attempts ({mcp_config.MAX_RETRIES}) exceeded. Last error: {str(last_error)}",
            error_type="MCPMaxRetriesExceeded",
            execution_time_ms=elapsed,
        )