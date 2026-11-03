from app.authorization.principal import AuthenticatedPrincipal
from app.authorization.errors import (
    AuthorizationError,
    NotAuthenticatedError,
    AgentNotFoundError,
    AgentRevokedError,
    AgentSuspendedError,
    CredentialRevokedError,
    CredentialExpiredError,
    ProjectScopeDeniedError,
    PermissionMissingError,
    RoleExpiredError,
    ResourceScopeDeniedError,
    EnvironmentRestrictedError,
    TrustLevelInsufficientError,
    ExplicitDenyError,
    SelfEscalationForbiddenError,
)
from app.authorization.permissions import (
    CANONICAL_PERMISSIONS,
    DANGEROUS_PERMISSIONS,
    get_all_permission_definitions,
)
from app.authorization.roles import (
    CANONICAL_ROLES,
    get_canonical_roles,
)
from app.authorization.scopes import ScopeContext, ScopeEvaluator
from app.authorization.evaluator import (
    AuthorizationResult,
    DeterministicAuthorizationEvaluator,
)
from app.authorization.service import AuthorizationService

__all__ = [
    "AuthenticatedPrincipal",
    "AuthorizationError",
    "NotAuthenticatedError",
    "AgentNotFoundError",
    "AgentRevokedError",
    "AgentSuspendedError",
    "CredentialRevokedError",
    "CredentialExpiredError",
    "ProjectScopeDeniedError",
    "PermissionMissingError",
    "RoleExpiredError",
    "ResourceScopeDeniedError",
    "EnvironmentRestrictedError",
    "TrustLevelInsufficientError",
    "ExplicitDenyError",
    "SelfEscalationForbiddenError",
    "CANONICAL_PERMISSIONS",
    "DANGEROUS_PERMISSIONS",
    "get_all_permission_definitions",
    "CANONICAL_ROLES",
    "get_canonical_roles",
    "ScopeContext",
    "ScopeEvaluator",
    "AuthorizationResult",
    "DeterministicAuthorizationEvaluator",
    "AuthorizationService",
]
