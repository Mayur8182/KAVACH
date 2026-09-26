from typing import List
from app.engines.blueprint.rules.base import BaseBlueprintRule
from app.engines.blueprint.rules.auth import AuthenticationRule, AuthorizationRule, SessionSecurityRule
from app.engines.blueprint.rules.api import InputValidationRule, RateLimitingRule, TransportSecurityRule
from app.engines.blueprint.rules.database import SecureDatabaseAccessRule, TenantIsolationRule
from app.engines.blueprint.rules.payments import PaymentIdempotencyRule
from app.engines.blueprint.rules.webhooks import WebhookAuthenticityRule
from app.engines.blueprint.rules.secrets import SecretsProtectionRule
from app.engines.blueprint.rules.cloud import ContainerHardeningRule, KubernetesRbacRule
from app.engines.blueprint.rules.admin import AdminDashboardRule
from app.engines.blueprint.rules.ai import AiAgentSecurityRule


class RuleRegistry:
    """Central registry of deterministic security rules."""
    METHODOLOGY_VERSION = "2026.1.0"

    def __init__(self) -> None:
        self._rules: List[BaseBlueprintRule] = [
            AuthenticationRule(),
            AuthorizationRule(),
            SessionSecurityRule(),
            InputValidationRule(),
            RateLimitingRule(),
            TransportSecurityRule(),
            SecureDatabaseAccessRule(),
            TenantIsolationRule(),
            PaymentIdempotencyRule(),
            WebhookAuthenticityRule(),
            SecretsProtectionRule(),
            ContainerHardeningRule(),
            KubernetesRbacRule(),
            AdminDashboardRule(),
            AiAgentSecurityRule(),
        ]

    def get_all_rules(self) -> List[BaseBlueprintRule]:
        return list(self._rules)

    def get_rule_by_id(self, rule_id: str) -> BaseBlueprintRule:
        for r in self._rules:
            if r.rule_id == rule_id:
                return r
        raise KeyError(f"Rule with id '{rule_id}' not found in registry")


# Default global singleton registry
default_registry = RuleRegistry()
