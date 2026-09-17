"""
===============================================================================
TattvaAI - Model Context Protocol (MCP)

This package provides a generic abstraction over the official MCP SDK.

Responsibilities
----------------
• Manage MCP configuration
• Manage MCP sessions
• Execute MCP tools
• Define generic MCP models
• Handle MCP exceptions

The MCP package is provider-independent.

Supported Providers
-------------------
- SigNoz
- GitHub
- Kubernetes
- Slack
- Jira
- Future MCP Servers

===============================================================================
"""

from app.mcp.config import MCPConfig, mcp_config

from app.mcp.models import (
    MCPServerInfo,
    MCPTool,
    MCPToolCall,
    MCPToolResult,
    MCPResource,
    MCPResourceContent,
    MCPPrompt,
    MCPConnectionInfo,
    MCPHealthStatus,
    MCPExecutionStats,
)

from app.mcp.exceptions import (
    MCPException,
    MCPConnectionError,
    MCPReconnectError,
    MCPAuthenticationError,
    MCPAuthorizationError,
    MCPToolError,
    MCPToolNotFoundError,
    MCPToolTimeoutError,
    MCPResourceError,
    MCPProtocolError,
    MCPTransportError,
    MCPServerError,
    MCPValidationError,
    MCPConfigurationError,
)

from app.mcp.session import (
    MCPSession,
    mcp_session,
)

from app.mcp.client import MCPClient
from app.mcp.tools import (
    MCPToolExecutor,
    TelemetryMCPDispatcher,
    TELEMETRY_MCP_TOOLS,
    get_telemetry_mcp_tools,
    get_telemetry_bedrock_specs,
)

__all__ = [
    # Configuration
    "MCPConfig",
    "mcp_config",

    # Client
    "MCPClient",

    # Models
    "MCPServerInfo",
    "MCPTool",
    "MCPToolCall",
    "MCPToolResult",
    "MCPResource",
    "MCPResourceContent",
    "MCPPrompt",
    "MCPConnectionInfo",
    "MCPHealthStatus",
    "MCPExecutionStats",

    # Exceptions
    "MCPException",
    "MCPConnectionError",
    "MCPReconnectError",
    "MCPAuthenticationError",
    "MCPAuthorizationError",
    "MCPToolError",
    "MCPToolNotFoundError",
    "MCPToolTimeoutError",
    "MCPResourceError",
    "MCPProtocolError",
    "MCPTransportError",
    "MCPServerError",
    "MCPValidationError",
    "MCPConfigurationError",

    # Session
    "MCPSession",
    "mcp_session",

    # Tool Executor & Dispatcher
    "MCPToolExecutor",
    "TelemetryMCPDispatcher",
    "TELEMETRY_MCP_TOOLS",
    "get_telemetry_mcp_tools",
    "get_telemetry_bedrock_specs",
]