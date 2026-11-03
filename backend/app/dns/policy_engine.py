"""
DNS Policy Enforcement Engine.

Evaluates DNS queries against:
1. Explicit Allowlists (Exact & Wildcard)
2. Explicit Blocklists (Exact & Wildcard)
3. Monitored Watchlists
4. Scoped DNSPolicies (AST Condition Engine)

Enforces:
- Rule 2: No fake block (execution_status: REQUESTED, EXECUTING, BLOCKED, FAILED, UNKNOWN).
- Rule 5: Policy remains authoritative over threat intelligence.
- Rule 8: Multi-tenant & project scope isolation.
"""

import fnmatch
import uuid
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_

from app.models.dns_models import DNSPolicy, DNSListEntry, DNSDecision


class DNSPolicyEngine:
    """Authoritative evaluator for DNS security policies and lists."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def evaluate_dns_request(
        self,
        domain_fqdn: str,
        registered_domain: str,
        client_identity: str,
        environment: str = "PRODUCTION",
        project_id: Optional[uuid.UUID] = None,
        threat_match: Optional[Dict[str, Any]] = None,
        detection_signals: Optional[List[str]] = None,
        query_type: str = "A",
    ) -> Dict[str, Any]:
        """
        Evaluates full DNS resolution request:
        Returns:
            {
                "action": "ALLOW" | "WARN" | "BLOCK" | "LOG" | "SINKHOLE" | "REQUIRE_APPROVAL",
                "reason": str,
                "policy_id": Optional[uuid.UUID],
                "list_entry_id": Optional[uuid.UUID],
                "execution_status": "REQUESTED" | "BLOCKED" | "UNKNOWN",
                "evidence": Dict[str, Any],
                "sinkhole_ip": Optional[str],
            }
        """
        fqdn_clean = domain_fqdn.lower().strip()
        reg_clean = registered_domain.lower().strip()

        # Step 1: Check Allowlists (Priority 1)
        allow_entry = await self._check_list(
            list_type="ALLOWLIST",
            fqdn=fqdn_clean,
            reg_domain=reg_clean,
            project_id=project_id,
        )
        if allow_entry:
            return {
                "action": "ALLOW",
                "reason": f"Domain explicitly allowed by allowlist entry '{allow_entry.domain_pattern}': {allow_entry.reason}",
                "policy_id": None,
                "list_entry_id": allow_entry.id,
                "execution_status": "BLOCKED" if allow_entry.list_type == "BLOCKLIST" else "EXECUTED",
                "evidence": {"allowlist_pattern": allow_entry.domain_pattern, "allowlist_id": str(allow_entry.id)},
                "sinkhole_ip": None,
            }

        # Step 2: Check Blocklists (Priority 2)
        block_entry = await self._check_list(
            list_type="BLOCKLIST",
            fqdn=fqdn_clean,
            reg_domain=reg_clean,
            project_id=project_id,
        )
        if block_entry:
            return {
                "action": "BLOCK",
                "reason": f"Domain blocked by blocklist rule '{block_entry.domain_pattern}': {block_entry.reason}",
                "policy_id": None,
                "list_entry_id": block_entry.id,
                "execution_status": "REQUESTED",
                "evidence": {"blocklist_pattern": block_entry.domain_pattern, "blocklist_id": str(block_entry.id)},
                "sinkhole_ip": None,
            }

        # Step 3: Check Watchlists (Monitor without blocking)
        watch_entry = await self._check_list(
            list_type="WATCHLIST",
            fqdn=fqdn_clean,
            reg_domain=reg_clean,
            project_id=project_id,
        )

        # Step 4: Evaluate Scoped DNSPolicies (ordered by priority ascending)
        stmt = (
            select(DNSPolicy)
            .where(
                and_(
                    DNSPolicy.enabled == True,
                    or_(
                        DNSPolicy.scope == "GLOBAL",
                        and_(DNSPolicy.project_id == project_id, DNSPolicy.scope == "PROJECT"),
                    ),
                )
            )
            .order_by(DNSPolicy.priority.asc())
        )
        policies = (await self.db.execute(stmt)).scalars().all()

        context = {
            "fqdn": fqdn_clean,
            "registered_domain": reg_clean,
            "client_identity": client_identity,
            "environment": environment.upper(),
            "query_type": query_type.upper(),
            "has_threat_match": threat_match is not None,
            "threat_confidence": threat_match.get("confidence") if threat_match else "NONE",
            "threat_severity": threat_match.get("severity") if threat_match else "NONE",
            "signals": detection_signals or [],
            "on_watchlist": watch_entry is not None,
        }

        for policy in policies:
            if self._matches_conditions(policy.conditions, context):
                evidence = {
                    "matched_policy_name": policy.name,
                    "matched_policy_version": policy.version,
                    "context_snapshot": context,
                }
                return {
                    "action": policy.action,
                    "reason": f"DNS Policy '{policy.name}' evaluated action {policy.action}",
                    "policy_id": policy.id,
                    "list_entry_id": watch_entry.id if watch_entry else None,
                    "execution_status": "REQUESTED",
                    "evidence": evidence,
                    "sinkhole_ip": policy.sinkhole_ip if policy.action == "SINKHOLE" else None,
                }

        # Default fallback: If high-severity threat match and no override -> Default to WARN
        if threat_match and threat_match.get("severity") in ["CRITICAL", "HIGH"]:
            return {
                "action": "WARN",
                "reason": f"Identified active threat intelligence match: {threat_match.get('matched_value')}",
                "policy_id": None,
                "list_entry_id": None,
                "execution_status": "REQUESTED",
                "evidence": {"threat_intel": threat_match},
                "sinkhole_ip": None,
            }

        return {
            "action": "ALLOW",
            "reason": "Default resolution permitted; no blocking rules matched.",
            "policy_id": None,
            "list_entry_id": watch_entry.id if watch_entry else None,
            "execution_status": "EXECUTED",
            "evidence": {"watchlist_active": watch_entry is not None},
            "sinkhole_ip": None,
        }

    async def _check_list(
        self,
        list_type: str,
        fqdn: str,
        reg_domain: str,
        project_id: Optional[uuid.UUID],
    ) -> Optional[DNSListEntry]:
        """Checks active allowlist/blocklist/watchlist entries with exact or wildcard matching."""
        now = datetime.now(timezone.utc)
        stmt = select(DNSListEntry).where(
            and_(
                DNSListEntry.list_type == list_type,
                DNSListEntry.is_active == True,
                or_(DNSListEntry.expires_at == None, DNSListEntry.expires_at > now),
                or_(
                    DNSListEntry.scope == "GLOBAL",
                    and_(DNSListEntry.project_id == project_id, DNSListEntry.scope == "PROJECT"),
                ),
            )
        )
        entries = (await self.db.execute(stmt)).scalars().all()

        for entry in entries:
            pat = entry.domain_pattern.lower().strip()
            # 1. Exact match against FQDN or registered domain
            if pat in [fqdn, reg_domain]:
                return entry
            # 2. Wildcard match (e.g. *.evil-c2.com)
            if pat.startswith("*.") and fnmatch.fnmatch(fqdn, pat):
                return entry
            elif "*" in pat and fnmatch.fnmatch(fqdn, pat):
                return entry

        return None

    @staticmethod
    def _matches_conditions(conditions: Dict[str, Any], ctx: Dict[str, Any]) -> bool:
        """Evaluates AST conditions against query context."""
        if not conditions:
            return True

        # AND condition list
        if "and" in conditions:
            return all(DNSPolicyEngine._eval_clause(c, ctx) for c in conditions["and"])

        # OR condition list
        if "or" in conditions:
            return any(DNSPolicyEngine._eval_clause(c, ctx) for c in conditions["or"])

        return DNSPolicyEngine._eval_clause(conditions, ctx)

    @staticmethod
    def _eval_clause(clause: Dict[str, Any], ctx: Dict[str, Any]) -> bool:
        """Evaluates individual condition clause."""
        field = clause.get("field")
        op = clause.get("operator", "eq").lower()
        target = clause.get("value")

        actual = ctx.get(field)
        if actual is None:
            return False

        if op == "eq":
            return str(actual).lower() == str(target).lower()
        elif op == "neq":
            return str(actual).lower() != str(target).lower()
        elif op == "in":
            return actual in target if isinstance(target, list) else False
        elif op == "contains":
            return str(target).lower() in str(actual).lower()
        elif op == "has_signal":
            signals = ctx.get("signals", [])
            return target in signals
        return False
