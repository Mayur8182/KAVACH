class AuthorizationError(Exception):
    """Base exception for authorization and agent identity failures."""
    def __init__(self, message: str, reason_code: str = "NOT_AUTHORIZED"):
        super().__init__(message)
        self.message = message
        self.reason_code = reason_code


class NotAuthenticatedError(AuthorizationError):
    def __init__(self, message: str = "Authentication required prior to authorization."):
        super().__init__(message, reason_code="NOT_AUTHENTICATED")


class AgentNotFoundError(AuthorizationError):
    def __init__(self, message: str = "Agent not found."):
        super().__init__(message, reason_code="AGENT_NOT_FOUND")


class AgentRevokedError(AuthorizationError):
    def __init__(self, message: str = "Agent status is REVOKED. All operations denied."):
        super().__init__(message, reason_code="AGENT_REVOKED")


class AgentSuspendedError(AuthorizationError):
    def __init__(self, message: str = "Agent status is SUSPENDED. Operations denied."):
        super().__init__(message, reason_code="AGENT_SUSPENDED")


class CredentialRevokedError(NotAuthenticatedError):
    def __init__(self, message: str = "Agent credential has been revoked."):
        super().__init__(message)
        self.reason_code = "CREDENTIAL_REVOKED"


class CredentialExpiredError(NotAuthenticatedError):
    def __init__(self, message: str = "Agent credential has expired."):
        super().__init__(message)
        self.reason_code = "CREDENTIAL_EXPIRED"


class ProjectScopeDeniedError(AuthorizationError):
    def __init__(self, message: str = "Agent is strictly isolated to its assigned project."):
        super().__init__(message, reason_code="PROJECT_SCOPE_DENIED")


class PermissionMissingError(AuthorizationError):
    def __init__(self, permission: str):
        super().__init__(
            f"Agent does not possess required permission '{permission}'.",
            reason_code="PERMISSION_MISSING",
        )
        self.permission = permission


class RoleExpiredError(AuthorizationError):
    def __init__(self, role_name: str):
        super().__init__(f"Assigned role '{role_name}' has expired.", reason_code="ROLE_EXPIRED")


class ResourceScopeDeniedError(AuthorizationError):
    def __init__(self, message: str = "Operation resource is outside authorized scope."):
        super().__init__(message, reason_code="RESOURCE_SCOPE_DENIED")


class EnvironmentRestrictedError(AuthorizationError):
    def __init__(self, message: str = "Operation denied in the target environment."):
        super().__init__(message, reason_code="ENVIRONMENT_RESTRICTED")


class TrustLevelInsufficientError(AuthorizationError):
    def __init__(self, required: str, current: str):
        super().__init__(
            f"Insufficient agent trust level: requires '{required}', agent has '{current}'.",
            reason_code="TRUST_LEVEL_INSUFFICIENT",
        )


class ExplicitDenyError(AuthorizationError):
    def __init__(self, message: str = "Explicit DENY override takes precedence."):
        super().__init__(message, reason_code="EXPLICIT_DENY")


class SelfEscalationForbiddenError(AuthorizationError):
    def __init__(self, message: str = "AI agents are forbidden from modifying their own roles, permissions, or trust levels."):
        super().__init__(message, reason_code="SELF_ESCALATION_FORBIDDEN")
