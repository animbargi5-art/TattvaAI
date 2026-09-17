"""
===============================================================================
TattvaAI - Model Context Protocol (MCP) Client
===============================================================================

Purpose
-------
Generic, vendor-neutral client for the Model Context Protocol (MCP) Python SDK.
Provides transport lifecycle management, protocol initialization, tool execution,
robust URL validation, and controlled error handling.

Responsibilities
----------------
• Validate MCP server URL and transport protocol before connection
• Connect to MCP servers via Streamable HTTP transport
• Execute remote MCP tools with configurable timeout
• Normalize connection, protocol, and timeout failures into controlled MCP exceptions
• Maintain session state and lifecycle in MCPSession
===============================================================================
"""

from __future__ import annotations

import asyncio
from contextlib import AsyncExitStack
from typing import Any, Optional
from urllib.parse import urlparse

from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

from app.core.logger import logger
from app.core.settings import settings
from app.mcp.config import mcp_config
from app.mcp.exceptions import (
    MCPConfigurationError,
    MCPConnectionError,
    MCPProtocolError,
    MCPToolError,
    MCPToolTimeoutError,
)
from app.mcp.session import mcp_session

SUPPORTED_SCHEMES = ("http", "https")


class MCPClient:
    """
    Official MCP SDK client.
    Provider-independent implementation for communicating with MCP servers.
    """

    def __init__(
        self,
        server_url: Optional[str] = None,
        api_key: Optional[str] = None,
        timeout: Optional[float] = None,
    ) -> None:
        # Configuration resolution: explicit argument -> generic MCP setting -> signoz legacy fallback
        self.server_url = (
            server_url
            if server_url is not None
            else (getattr(settings, "MCP_SERVER_URL", "") or getattr(settings, "SIGNOZ_MCP_SERVER", ""))
        )
        self.api_key = api_key if api_key is not None else getattr(settings, "SIGNOZ_API_KEY", "")
        self.timeout = (
            timeout
            if timeout is not None
            else getattr(settings, "MCP_TIMEOUT_SECONDS", 10.0)
        )

        self.exit_stack = AsyncExitStack()
        self.transport = None
        self.read_stream = None
        self.write_stream = None
        self.session: ClientSession | None = None

    # -------------------------------------------------------------------------
    # URL & Protocol Validation
    # -------------------------------------------------------------------------

    @staticmethod
    def validate_url(url: Optional[str]) -> str:
        """
        Validate MCP server URL syntax and protocol scheme.

        Raises:
            MCPConfigurationError: If the URL is missing, empty, malformed,
                                   or uses an unsupported protocol scheme.
        """
        if not url or not str(url).strip():
            raise MCPConfigurationError(
                "MCP server URL is missing or empty. A valid HTTP or HTTPS endpoint is required."
            )

        trimmed = str(url).strip()
        try:
            parsed = urlparse(trimmed)
        except Exception as ex:
            raise MCPConfigurationError(
                f"Malformed MCP server URL '{trimmed}': {str(ex)}"
            ) from ex

        if not parsed.scheme:
            raise MCPConfigurationError(
                f"Malformed MCP server URL '{trimmed}': missing protocol scheme."
            )

        scheme_lower = parsed.scheme.lower()
        if scheme_lower not in SUPPORTED_SCHEMES:
            raise MCPConfigurationError(
                f"Unsupported MCP protocol scheme '{parsed.scheme}'. "
                f"Supported schemes are: {list(SUPPORTED_SCHEMES)}."
            )

        if not parsed.netloc and not parsed.hostname:
            raise MCPConfigurationError(
                f"Malformed MCP server URL '{trimmed}': host or network location is missing."
            )

        return trimmed

    # -------------------------------------------------------------------------
    # Connection Lifecycle
    # -------------------------------------------------------------------------

    async def connect(self) -> None:
        """
        Validate endpoint and establish an MCP session using streamable HTTP transport.
        """
        if self.session is not None:
            return

        validated_url = self.validate_url(self.server_url)

        logger.info(
            "Connecting to MCP server: %s (timeout: %.1fs)",
            validated_url,
            self.timeout,
        )

        try:
            headers: dict[str, str] = {}
            if self.api_key:
                headers["SIGNOZ-API-KEY"] = self.api_key

            self.transport = streamablehttp_client(
                validated_url,
                headers=headers,
            )

            async def _init_session() -> None:
                (
                    self.read_stream,
                    self.write_stream,
                    _,
                ) = await self.exit_stack.enter_async_context(self.transport)

                self.session = ClientSession(
                    self.read_stream,
                    self.write_stream,
                )

                await self.exit_stack.enter_async_context(self.session)
                await self.session.initialize()

            await asyncio.wait_for(_init_session(), timeout=self.timeout)

            await mcp_session.connect(
                self,
                validated_url,
            )
            await mcp_session.mark_initialized()

            logger.info("MCP session established successfully with %s", validated_url)

        except MCPConfigurationError:
            raise

        except asyncio.TimeoutError as ex:
            await self.disconnect()
            raise MCPConnectionError(
                f"Connection to MCP server '{validated_url}' timed out after {self.timeout}s."
            ) from ex

        except Exception as ex:
            await self.disconnect()
            raise MCPConnectionError(
                f"Failed to connect to MCP server '{validated_url}': {str(ex)}"
            ) from ex

    async def disconnect(self) -> None:
        """
        Safely terminate the MCP session and release underlying resources.
        """
        if self.session is None and self.transport is None:
            return

        logger.info("Closing MCP connection...")

        try:
            await self.exit_stack.aclose()
        except Exception as ex:
            logger.debug("Error while closing MCP exit stack: %s", ex)
        finally:
            self.session = None
            self.transport = None
            self.read_stream = None
            self.write_stream = None
            await mcp_session.disconnect()
            logger.info("MCP connection closed.")

    # -------------------------------------------------------------------------
    # Execute Tool
    # -------------------------------------------------------------------------

    async def call_tool(
        self,
        tool_name: str,
        arguments: Optional[dict[str, Any]] = None,
        timeout: Optional[float] = None,
    ) -> Any:
        """
        Execute an MCP tool via the active session with timeout protection.
        """
        if self.session is None:
            raise MCPConnectionError("MCP client is not connected.")

        effective_timeout = timeout if timeout is not None else self.timeout
        call_args = arguments or {}

        logger.info(
            "Calling MCP Tool '%s' (timeout: %.1fs)",
            tool_name,
            effective_timeout,
        )

        try:
            result = await asyncio.wait_for(
                self.session.call_tool(tool_name, call_args),
                timeout=effective_timeout,
            )

            await mcp_session.heartbeat()
            return result

        except asyncio.TimeoutError as ex:
            raise MCPToolTimeoutError(tool_name) from ex

        except MCPToolTimeoutError:
            raise

        except MCPConnectionError:
            raise

        except Exception as ex:
            raise MCPToolError(
                tool_name=tool_name,
                message=str(ex),
            ) from ex

    # -------------------------------------------------------------------------
    # List Tools
    # -------------------------------------------------------------------------

    async def list_tools(self, timeout: Optional[float] = None) -> Any:
        """
        Retrieve available tool definitions from the remote MCP server.
        """
        if self.session is None:
            raise MCPConnectionError("MCP client is not connected.")

        effective_timeout = timeout if timeout is not None else self.timeout

        try:
            tools = await asyncio.wait_for(
                self.session.list_tools(),
                timeout=effective_timeout,
            )
            await mcp_session.heartbeat()
            return tools

        except asyncio.TimeoutError as ex:
            raise MCPToolTimeoutError("list_tools") from ex

        except Exception as ex:
            raise MCPToolError(
                tool_name="list_tools",
                message=str(ex),
            ) from ex

    # -------------------------------------------------------------------------
    # Status & Health
    # -------------------------------------------------------------------------

    @property
    def connected(self) -> bool:
        return self.session is not None

    async def health_check(self) -> bool:
        return self.connected
