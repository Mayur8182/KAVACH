from app.authorization.errors import AuthorizationError


class DelegationError(AuthorizationError):
    """Base exception for agent delegation and authority graph errors."""
    def __init__(self, message: str, reason_code: str = "DELEGATION_FAILED"):
        super().__init__(message, reason_code=reason_code)


class DelegatorNotAuthorizedError(DelegationError):
    def __init__(self, message: str = "Delegator does not possess the requested authority."):
        super().__init__(message, reason_code="DELEGATOR_NOT_AUTHORIZED")


class AuthorityEscalationForbiddenError(DelegationError):
    def __init__(self, message: str = "Authority cannot increase through delegation."):
        super().__init__(message, reason_code="AUTHORITY_ESCALATION_FORBIDDEN")


class ScopeEscalationForbiddenError(DelegationError):
    def __init__(self, message: str = "Delegated resource scope cannot exceed delegator scope."):
        super().__init__(message, reason_code="SCOPE_ESCALATION_FORBIDDEN")


class EnvironmentEscalationForbiddenError(DelegationError):
    def __init__(self, message: str = "Delegated environment cannot exceed delegator environment clearance."):
        super().__init__(message, reason_code="ENVIRONMENT_ESCALATION_FORBIDDEN")


class ExpirationEscalationForbiddenError(DelegationError):
    def __init__(self, message: str = "Delegated expiration cannot outlive delegator authority expiration."):
        super().__init__(message, reason_code="EXPIRATION_ESCALATION_FORBIDDEN")


class FurtherDelegationForbiddenError(DelegationError):
    def __init__(self, message: str = "This authority was delegated with allow_further_delegation=false."):
        super().__init__(message, reason_code="DELEGATION_NOT_PERMITTED")


class DelegationDepthExceededError(DelegationError):
    def __init__(self, depth: int, max_depth: int):
        super().__init__(
            f"Delegation chain depth {depth} exceeds maximum permitted depth {max_depth}.",
            reason_code="DELEGATION_DEPTH_EXCEEDED",
        )
        self.depth = depth
        self.max_depth = max_depth


class DelegationCycleDetectedError(DelegationError):
    def __init__(self, message: str = "Delegation graph must be acyclic. Cycle detected in authority chain."):
        super().__init__(message, reason_code="DELEGATION_CYCLE_DETECTED")


class SelfDelegationForbiddenError(DelegationError):
    def __init__(self, message: str = "Self-delegation (Agent A -> Agent A) is strictly prohibited."):
        super().__init__(message, reason_code="SELF_DELEGATION_FORBIDDEN")


class DelegationRevokedError(DelegationError):
    def __init__(self, message: str = "Delegation has been revoked."):
        super().__init__(message, reason_code="DELEGATION_REVOKED")


class DelegationExpiredError(DelegationError):
    def __init__(self, message: str = "Delegation has expired."):
        super().__init__(message, reason_code="DELEGATION_EXPIRED")


class DataFlowBlockedError(DelegationError):
    def __init__(self, message: str = "Data flow rejected by security policy.", reason_code: str = "DATA_FLOW_DENIED"):
        super().__init__(message, reason_code=reason_code)


class SecretDataFlowForbiddenError(DataFlowBlockedError):
    def __init__(self, message: str = "Secret data forwarding is strictly prohibited without explicit clearance."):
        super().__init__(message, reason_code="SECRET_DATA_FLOW_FORBIDDEN")
