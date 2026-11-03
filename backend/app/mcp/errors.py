from typing import Any, Dict, Optional


class MCPError(Exception):
    """Base exception for all MCP Gateway errors."""

    def __init__(
        self,
        code: str,
        message: str,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "error_code": self.code,
            "message": self.message,
            "details": self.details,
        }


class MCPAuthenticationError(MCPError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(code="MCP_AUTHENTICATION_FAILED", message=message, details=details)


class MCPAuthorizationError(MCPError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(code="MCP_AUTHORIZATION_DENIED", message=message, details=details)


class MCPPolicyBlockedError(MCPError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(code="MCP_POLICY_BLOCKED", message=message, details=details)


class MCPApprovalRequiredError(MCPError):
    def __init__(self, message: str, approval_id: str, details: Optional[Dict[str, Any]] = None):
        d = details or {}
        d["approval_id"] = approval_id
        super().__init__(code="MCP_APPROVAL_REQUIRED", message=message, details=d)
        self.approval_id = approval_id


class MCPToolNotFoundError(MCPError):
    def __init__(self, tool_name: str):
        super().__init__(
            code="MCP_TOOL_NOT_FOUND",
            message=f"MCP tool '{tool_name}' is not registered on this gateway.",
            details={"tool_name": tool_name},
        )


class MCPToolNotAvailableError(MCPError):
    def __init__(self, tool_name: str, reason: str):
        super().__init__(
            code="MCP_TOOL_NOT_AVAILABLE",
            message=f"MCP tool '{tool_name}' is currently unavailable: {reason}",
            details={"tool_name": tool_name, "reason": reason},
        )


class MCPInvalidInputError(MCPError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(code="MCP_INVALID_INPUT", message=message, details=details)


class MCPProjectAccessDeniedError(MCPError):
    def __init__(self, project_id: str, agent_id: str):
        super().__init__(
            code="MCP_PROJECT_ACCESS_DENIED",
            message=f"Agent '{agent_id}' is not authorized to access project '{project_id}'.",
            details={"project_id": project_id, "agent_id": agent_id},
        )


class MCPResourceNotFoundError(MCPError):
    def __init__(self, uri: str):
        super().__init__(
            code="MCP_RESOURCE_NOT_FOUND",
            message=f"Resource '{uri}' not found.",
            details={"uri": uri},
        )


class MCPExecutionFailedError(MCPError):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(code="MCP_EXECUTION_FAILED", message=message, details=details)


class MCPExecutionTimeoutError(MCPError):
    def __init__(self, timeout_seconds: int):
        super().__init__(
            code="MCP_EXECUTION_TIMEOUT",
            message=f"Tool execution timed out after {timeout_seconds} seconds.",
            details={"timeout_seconds": timeout_seconds},
        )


class MCPResultTooLargeError(MCPError):
    def __init__(self, size_bytes: int, max_bytes: int):
        super().__init__(
            code="MCP_RESULT_TOO_LARGE",
            message=f"Result size ({size_bytes} bytes) exceeds maximum limit of {max_bytes} bytes.",
            details={"size_bytes": size_bytes, "max_bytes": max_bytes},
        )


class MCPSessionExpiredError(MCPAuthenticationError):
    def __init__(self, session_id: str):
        super().__init__(
            message=f"MCP session '{session_id}' has expired or is no longer active.",
            details={"session_id": session_id},
        )
        self.code = "MCP_SESSION_EXPIRED"


class MCPNotConfiguredError(MCPError):
    def __init__(self, component: str, reason: str):
        super().__init__(
            code="MCP_NOT_CONFIGURED",
            message=f"MCP component '{component}' is not configured: {reason}",
            details={"component": component, "reason": reason},
        )
