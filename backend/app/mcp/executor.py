import asyncio
import time
from typing import Any, Callable, Dict
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.mcp.errors import (
    MCPExecutionFailedError,
    MCPExecutionTimeoutError,
    MCPResultTooLargeError,
)
from app.mcp.schemas import MCPContext, ToolDefinition, ToolExecutionResult

settings = get_settings()


class MCPToolExecutor:
    """
    Executes an approved tool with timeouts, error handling, and output size limits.
    Ensures safe, bounded execution.
    """

    @classmethod
    async def execute_tool(
        cls,
        context: MCPContext,
        tool: ToolDefinition,
        handler: Callable,
        arguments: Dict[str, Any],
        db: AsyncSession,
    ) -> ToolExecutionResult:
        """
        Executes the registered tool handler within configured timeout limits.
        """
        start_time = time.time()
        timeout = settings.mcp_tool_timeout_seconds

        try:
            # Execute with timeout protection
            result: ToolExecutionResult = await asyncio.wait_for(
                handler(context=context, arguments=arguments, db=db),
                timeout=float(timeout),
            )
            result.execution_time_ms = round((time.time() - start_time) * 1000, 2)
            return result

        except asyncio.TimeoutError:
            return ToolExecutionResult(
                status="TIMEOUT",
                message=f"Tool '{tool.name}' timed out after {timeout} seconds.",
                error_code="MCP_EXECUTION_TIMEOUT",
                execution_time_ms=round((time.time() - start_time) * 1000, 2),
            )
        except Exception as e:
            return ToolExecutionResult(
                status="FAILED",
                message=f"Tool execution failed with exception: {str(e)}",
                error_code="MCP_EXECUTION_FAILED",
                execution_time_ms=round((time.time() - start_time) * 1000, 2),
            )
