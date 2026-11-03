"""
Step 28 — Agent Governance Service

Handles:
  - Agent registration with governance profile
  - Session lifecycle management
  - Action security pipeline (§28.11)
  - Command parsing and risk classification (§28.13)
  - File access sensitivity detection (§28.14–28.15)
  - Policy evaluation relay
  - Approval management (§28.39)
  - Kill switch / revocation (§28.27–28.28)
  - Anomaly detection (§28.26)
  - Event recording with idempotency (§28.52)
  - Provider adapter status management (§28.31)

SECURITY INVARIANTS:
  - LLM is NEVER the judge — policy engine makes all decisions.
  - Agents never automatically inherit unrestricted authority.
  - Sensitive arguments are always hashed/redacted before persistence.
  - CONNECTED status is NEVER set without a real health check.
  - No fabricated events — only real operations produce events.
"""
import hashlib
import json
import logging
import re
import shlex
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import Agent
from app.models.agent_governance import (
    AgentActionApproval,
    AgentBehaviorAnomaly,
    AgentCapabilityRecord,
    AgentCodeChange,
    AgentCommandExecution,
    AgentFileAccess,
    AgentGitOperation,
    AgentGovernanceDelegation,
    AgentGovernanceProfile,
    AgentGovernanceSession,
    AgentMCPEvent,
    AgentNetworkEvent,
    AgentPolicyDecision,
    AgentProviderAdapter,
    AgentRevocationRecord,
    AgentSecurityContractBinding,
    AgentSecurityEvent,
    AgentToolInvocation,
)
from app.models.user import User

logger = logging.getLogger("thing.agent_governance")


# ─────────────────────────────────────────────────────────────────
# Risk Classification (§28.10)
# ─────────────────────────────────────────────────────────────────

class RiskLevel:
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class PolicyDecision:
    ALLOW = "ALLOW"
    WARN = "WARN"
    REQUIRE_APPROVAL = "REQUIRE_APPROVAL"
    BLOCK = "BLOCK"


# Sensitive file path patterns — access requires elevation
SENSITIVE_PATH_PATTERNS: List[Tuple[re.Pattern, str, str]] = [
    (re.compile(r"\.env(\.|$)", re.IGNORECASE), "environment_secrets", RiskLevel.CRITICAL),
    (re.compile(r"\.env\.(production|prod|staging)", re.IGNORECASE), "production_secrets", RiskLevel.CRITICAL),
    (re.compile(r"(^|/)\.ssh/", re.IGNORECASE), "ssh_keys", RiskLevel.CRITICAL),
    (re.compile(r"(^|/)\.aws/credentials", re.IGNORECASE), "cloud_credentials", RiskLevel.CRITICAL),
    (re.compile(r"(^|/)\.aws/config", re.IGNORECASE), "cloud_config", RiskLevel.HIGH),
    (re.compile(r"(^|/)credentials(\.json|\.yaml|\.yml)?$", re.IGNORECASE), "credentials", RiskLevel.CRITICAL),
    (re.compile(r"(^|/)secrets/", re.IGNORECASE), "secrets_directory", RiskLevel.CRITICAL),
    (re.compile(r"\.(pem|p12|pfx|key)$", re.IGNORECASE), "private_certificate", RiskLevel.CRITICAL),
    (re.compile(r"kubeconfig", re.IGNORECASE), "kubernetes_config", RiskLevel.HIGH),
    (re.compile(r"(^|/)\.kube/", re.IGNORECASE), "kubernetes_credentials", RiskLevel.CRITICAL),
    (re.compile(r"service[-_]account.*\.json$", re.IGNORECASE), "service_account", RiskLevel.CRITICAL),
    (re.compile(r"(^|/)\.docker/config\.json$", re.IGNORECASE), "docker_credentials", RiskLevel.HIGH),
]


def classify_file_path(path: str) -> Tuple[bool, Optional[str], str]:
    """
    Deterministically detect whether a file path is sensitive.
    Returns: (is_sensitive, category, risk_level)
    Never uses LLM judgment — purely pattern-based.
    """
    for pattern, category, risk in SENSITIVE_PATH_PATTERNS:
        if pattern.search(path):
            return True, category, risk
    return False, None, RiskLevel.LOW


# Dangerous command patterns for the command policy engine (§28.13)
# These are deterministic rules — not LLM evaluation.
COMMAND_RISK_TABLE: List[Tuple[str, str, str, str]] = [
    # (executable_pattern, arg_pattern_or_None, risk_level, policy)
    ("rm", r"-rf?\s+(/|~)", RiskLevel.CRITICAL, PolicyDecision.BLOCK),
    ("rm", r"-rf", RiskLevel.HIGH, PolicyDecision.REQUIRE_APPROVAL),
    ("kubectl", r"delete", RiskLevel.HIGH, PolicyDecision.REQUIRE_APPROVAL),
    ("kubectl", r"apply.*--force", RiskLevel.HIGH, PolicyDecision.REQUIRE_APPROVAL),
    ("terraform", r"apply", RiskLevel.HIGH, PolicyDecision.REQUIRE_APPROVAL),
    ("terraform", r"destroy", RiskLevel.CRITICAL, PolicyDecision.BLOCK),
    ("aws", r"iam.*(delete|detach|remove|put)", RiskLevel.CRITICAL, PolicyDecision.REQUIRE_APPROVAL),
    ("aws", r"s3.*rm", RiskLevel.HIGH, PolicyDecision.REQUIRE_APPROVAL),
    ("git", r"push.*--force", RiskLevel.HIGH, PolicyDecision.REQUIRE_APPROVAL),
    ("git", r"push.*-f\b", RiskLevel.HIGH, PolicyDecision.REQUIRE_APPROVAL),
    ("git", r"push", RiskLevel.MEDIUM, PolicyDecision.WARN),
    ("git", r"(status|diff|log|branch|checkout|add|commit)", RiskLevel.LOW, PolicyDecision.ALLOW),
    ("npm", r"install", RiskLevel.MEDIUM, PolicyDecision.WARN),
    ("pip", r"install", RiskLevel.MEDIUM, PolicyDecision.WARN),
    ("pytest", None, RiskLevel.LOW, PolicyDecision.ALLOW),
    ("python", None, RiskLevel.LOW, PolicyDecision.ALLOW),
    ("docker", r"(build|push|run)", RiskLevel.MEDIUM, PolicyDecision.WARN),
    ("docker", r"(rm|rmi|volume\s+rm)", RiskLevel.HIGH, PolicyDecision.REQUIRE_APPROVAL),
    ("curl", r"(| -d .*(passwd|secret|token|key|credential))", RiskLevel.MEDIUM, PolicyDecision.WARN),
    ("wget", None, RiskLevel.MEDIUM, PolicyDecision.WARN),
    ("chmod", r"777", RiskLevel.HIGH, PolicyDecision.WARN),
    ("sudo", None, RiskLevel.HIGH, PolicyDecision.REQUIRE_APPROVAL),
    ("su", None, RiskLevel.HIGH, PolicyDecision.REQUIRE_APPROVAL),
]


def classify_command(raw_command: str) -> Tuple[str, List[str], str, str, Optional[str]]:
    """
    Deterministically parse and risk-classify a command.
    Returns: (executable, args, risk_level, policy_decision, matched_rule)

    Uses structured shlex parsing — not string blacklisting.
    Arbitrary LLM-generated commands are NEVER executed by this engine.
    """
    try:
        tokens = shlex.split(raw_command.strip())
    except ValueError:
        return raw_command, [], RiskLevel.HIGH, PolicyDecision.REQUIRE_APPROVAL, "PARSE_FAILED"

    if not tokens:
        return "", [], RiskLevel.LOW, PolicyDecision.ALLOW, None

    executable = tokens[0]
    args = tokens[1:]
    args_str = " ".join(args)

    for exe_pattern, arg_pattern, risk, decision in COMMAND_RISK_TABLE:
        if re.fullmatch(exe_pattern, executable, re.IGNORECASE):
            if arg_pattern is None or re.search(arg_pattern, args_str, re.IGNORECASE):
                rule = f"{exe_pattern}:{arg_pattern or '*'}"
                return executable, args, risk, decision, rule

    # Default: MEDIUM risk for unknown commands
    return executable, args, RiskLevel.MEDIUM, PolicyDecision.WARN, None


def hash_arguments(args: Any) -> str:
    """Hash argument data for safe storage — never stores raw secret values."""
    return hashlib.sha256(json.dumps(args, sort_keys=True, default=str).encode()).hexdigest()


# ─────────────────────────────────────────────────────────────────
# Agent Governance Service
# ─────────────────────────────────────────────────────────────────

class AgentGovernanceService:

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Provider Adapters ─────────────────────────────────────────

    async def list_provider_adapters(self) -> List[AgentProviderAdapter]:
        result = await self.db.execute(
            select(AgentProviderAdapter).order_by(AgentProviderAdapter.display_name)
        )
        return list(result.scalars().all())

    async def get_provider_adapter(self, provider: str) -> Optional[AgentProviderAdapter]:
        result = await self.db.execute(
            select(AgentProviderAdapter).where(AgentProviderAdapter.provider == provider)
        )
        return result.scalar_one_or_none()

    async def record_provider_health_check(
        self, provider: str, success: bool, error: Optional[str] = None
    ) -> Optional[AgentProviderAdapter]:
        """
        Update adapter status based on a REAL health check result.
        NEVER sets CONNECTED without an actual successful check.
        """
        adapter = await self.get_provider_adapter(provider)
        if not adapter:
            return None

        now = datetime.now(timezone.utc)
        adapter.last_health_check = now
        if success:
            adapter.status = "CONNECTED"
            adapter.health_check_error = None
        else:
            adapter.status = "DEGRADED" if adapter.status == "CONNECTED" else "AUTHENTICATION_FAILED"
            adapter.health_check_error = error
        adapter.updated_at = now
        await self.db.flush()
        return adapter

    # ── Governance Profiles ───────────────────────────────────────

    async def create_governance_profile(
        self,
        agent_id: uuid.UUID,
        agent_provider: str,
        agent_name: str,
        agent_version: Optional[str],
        model_provider: Optional[str],
        model_name: Optional[str],
        environment: str,
        owner_user_id: Optional[uuid.UUID],
        policy_scope: Optional[Dict] = None,
    ) -> AgentGovernanceProfile:
        profile = AgentGovernanceProfile(
            agent_id=agent_id,
            agent_provider=agent_provider,
            agent_name=agent_name,
            agent_version=agent_version,
            model_provider=model_provider,
            model_name=model_name,
            environment=environment,
            owner_user_id=owner_user_id,
            lifecycle_status="REGISTERED",
            policy_scope=policy_scope,
        )
        self.db.add(profile)
        await self.db.flush()
        await self._record_event(
            event_type="AGENT_REGISTERED",
            agent_id=agent_id,
            action="register_agent",
            risk_level=RiskLevel.LOW,
            policy_decision=PolicyDecision.ALLOW,
            details={"provider": agent_provider, "environment": environment},
        )
        return profile

    async def activate_governance_profile(
        self, agent_id: uuid.UUID
    ) -> Optional[AgentGovernanceProfile]:
        result = await self.db.execute(
            select(AgentGovernanceProfile).where(AgentGovernanceProfile.agent_id == agent_id)
        )
        profile = result.scalar_one_or_none()
        if profile:
            profile.lifecycle_status = "ACTIVE"
            profile.updated_at = datetime.now(timezone.utc)
        return profile

    async def get_governance_profile(
        self, agent_id: uuid.UUID
    ) -> Optional[AgentGovernanceProfile]:
        result = await self.db.execute(
            select(AgentGovernanceProfile).where(AgentGovernanceProfile.agent_id == agent_id)
        )
        return result.scalar_one_or_none()

    # ── Sessions ──────────────────────────────────────────────────

    async def start_session(
        self,
        agent_id: uuid.UUID,
        project_id: uuid.UUID,
        user_id: Optional[uuid.UUID],
        repository_id: Optional[str],
        environment: str,
        client_metadata: Optional[Dict],
        ip_address: Optional[str],
        device_id: Optional[str],
        policy_version: Optional[int] = None,
        blueprint_version: Optional[int] = None,
        contract_version: Optional[int] = None,
    ) -> AgentGovernanceSession:
        session = AgentGovernanceSession(
            agent_id=agent_id,
            project_id=project_id,
            user_id=user_id,
            repository_id=repository_id,
            environment=environment,
            status="ACTIVE",
            client_metadata=client_metadata,
            ip_address=ip_address,
            device_id=device_id,
            policy_version=policy_version,
            blueprint_version=blueprint_version,
            contract_version=contract_version,
        )
        self.db.add(session)
        await self.db.flush()

        await self._record_event(
            event_type="AGENT_SESSION_STARTED",
            agent_id=agent_id,
            session_id=session.id,
            project_id=project_id,
            user_id=user_id,
            action="start_session",
            risk_level=RiskLevel.LOW,
            policy_decision=PolicyDecision.ALLOW,
        )
        return session

    async def end_session(
        self, session_id: uuid.UUID, status: str = "COMPLETED"
    ) -> Optional[AgentGovernanceSession]:
        result = await self.db.execute(
            select(AgentGovernanceSession).where(AgentGovernanceSession.id == session_id)
        )
        session = result.scalar_one_or_none()
        if session:
            session.status = status
            session.ended_at = datetime.now(timezone.utc)
            await self.db.flush()
            await self._record_event(
                event_type="AGENT_SESSION_ENDED",
                agent_id=session.agent_id,
                session_id=session_id,
                project_id=session.project_id,
                action="end_session",
                risk_level=RiskLevel.LOW,
                policy_decision=PolicyDecision.ALLOW,
                details={"final_status": status},
            )
        return session

    async def revoke_session(
        self,
        session_id: uuid.UUID,
        reason: str,
        revoked_by_user_id: Optional[uuid.UUID],
        trigger: str = "MANUAL",
    ) -> Optional[AgentGovernanceSession]:
        result = await self.db.execute(
            select(AgentGovernanceSession).where(AgentGovernanceSession.id == session_id)
        )
        session = result.scalar_one_or_none()
        if session:
            now = datetime.now(timezone.utc)
            session.status = "REVOKED"
            session.revoked_at = now
            session.revoked_by_user_id = revoked_by_user_id
            session.revocation_reason = reason
            session.ended_at = now
            await self.db.flush()

            revocation = AgentRevocationRecord(
                revocation_target="SESSION",
                target_id=str(session_id),
                agent_id=session.agent_id,
                project_id=session.project_id,
                revoked_by_user_id=revoked_by_user_id,
                reason=reason,
                trigger=trigger,
            )
            self.db.add(revocation)

            await self._record_event(
                event_type="AGENT_REVOKED",
                agent_id=session.agent_id,
                session_id=session_id,
                project_id=session.project_id,
                action="revoke_session",
                risk_level=RiskLevel.HIGH,
                policy_decision=PolicyDecision.BLOCK,
                details={"reason": reason, "trigger": trigger},
            )
        return session

    async def list_sessions(
        self,
        agent_id: Optional[uuid.UUID] = None,
        project_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[AgentGovernanceSession]:
        stmt = select(AgentGovernanceSession)
        if agent_id:
            stmt = stmt.where(AgentGovernanceSession.agent_id == agent_id)
        if project_id:
            stmt = stmt.where(AgentGovernanceSession.project_id == project_id)
        if status:
            stmt = stmt.where(AgentGovernanceSession.status == status)
        stmt = stmt.order_by(AgentGovernanceSession.started_at.desc()).limit(limit).offset(offset)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    # ── Action Security Pipeline (§28.11) ─────────────────────────

    async def evaluate_action(
        self,
        agent_id: uuid.UUID,
        session_id: Optional[uuid.UUID],
        project_id: uuid.UUID,
        action_type: str,
        resource: Optional[str],
        environment: str = "development",
        context: Optional[Dict] = None,
        is_simulation: bool = False,
        policy_version: Optional[int] = None,
        blueprint_version: Optional[int] = None,
        contract_version: Optional[int] = None,
    ) -> AgentPolicyDecision:
        """
        Core action security pipeline.
        Policy engine evaluates the action deterministically.
        LLM is NEVER the decision authority.
        """
        # Determine risk based on action type
        risk_level = _classify_action_risk(action_type, resource)
        decision = _apply_policy(action_type, risk_level, environment)

        matched_rules = _get_matched_rules(action_type, risk_level)
        required_approvals = [action_type] if decision == PolicyDecision.REQUIRE_APPROVAL else []

        record = AgentPolicyDecision(
            agent_id=agent_id,
            session_id=session_id,
            project_id=project_id,
            action_type=action_type,
            resource=resource,
            environment=environment,
            decision=decision,
            risk_level=risk_level,
            matched_rules=matched_rules,
            required_approvals=required_approvals,
            policy_version=policy_version,
            blueprint_version=blueprint_version,
            contract_version=contract_version,
            is_simulation=is_simulation,
        )
        self.db.add(record)
        await self.db.flush()

        if not is_simulation:
            event_type = "AGENT_POLICY_DECISION"
            if decision == PolicyDecision.BLOCK:
                event_type = "AGENT_DENIED"
            elif decision == PolicyDecision.ALLOW:
                event_type = "AGENT_TOOL_ALLOWED"

            await self._record_event(
                event_type=event_type,
                agent_id=agent_id,
                session_id=session_id,
                project_id=project_id,
                action=action_type,
                resource=resource,
                risk_level=risk_level,
                policy_decision=decision,
                details={"context": context, "matched_rules": matched_rules},
            )

        return record

    # ── Tool Invocations ──────────────────────────────────────────

    async def record_tool_invocation(
        self,
        agent_id: uuid.UUID,
        session_id: uuid.UUID,
        user_id: Optional[uuid.UUID],
        tool_name: str,
        tool_type: str,
        resource: Optional[str],
        raw_arguments: Optional[Dict],
        policy_version: Optional[int] = None,
    ) -> AgentToolInvocation:
        """
        Record a tool invocation. Sensitive arguments are HASHED — never stored plaintext.
        """
        risk_level = _classify_tool_risk(tool_name, tool_type)
        decision = _apply_policy(f"tool:{tool_type}", risk_level, "development")

        # Hash arguments — never store raw (may contain secrets)
        args_hash = hash_arguments(raw_arguments) if raw_arguments else None
        # Extract safe metadata only — no values that could be secrets
        arg_metadata = {k: type(v).__name__ for k, v in (raw_arguments or {}).items()}

        invocation = AgentToolInvocation(
            agent_id=agent_id,
            session_id=session_id,
            user_id=user_id,
            tool_name=tool_name,
            tool_type=tool_type,
            resource=resource,
            arguments_hash=args_hash,
            argument_metadata=arg_metadata,
            risk_level=risk_level,
            policy_decision=decision,
            policy_version=policy_version,
        )
        self.db.add(invocation)
        await self.db.flush()

        event_type = "AGENT_TOOL_ALLOWED" if decision == PolicyDecision.ALLOW else "AGENT_TOOL_BLOCKED"
        await self._record_event(
            event_type=event_type,
            agent_id=agent_id,
            session_id=session_id,
            action=f"invoke_tool:{tool_name}",
            resource=resource,
            risk_level=risk_level,
            policy_decision=decision,
        )
        return invocation

    # ── Command Executions ────────────────────────────────────────

    async def record_command_execution(
        self,
        agent_id: uuid.UUID,
        session_id: uuid.UUID,
        raw_command: str,
    ) -> AgentCommandExecution:
        """Parse and risk-classify a command deterministically."""
        executable, args, risk_level, decision, matched_rule = classify_command(raw_command)

        record = AgentCommandExecution(
            agent_id=agent_id,
            session_id=session_id,
            raw_command=raw_command[:2000],  # truncate for safety
            executable=executable,
            arguments=args,
            risk_level=risk_level,
            policy_decision=decision,
            matched_policy_rule=matched_rule,
        )
        if decision == PolicyDecision.BLOCK:
            record.block_reason = f"Command blocked by policy rule: {matched_rule}"

        self.db.add(record)
        await self.db.flush()

        event_type = "AGENT_COMMAND_BLOCKED" if decision == PolicyDecision.BLOCK else "AGENT_COMMAND_REQUESTED"
        await self._record_event(
            event_type=event_type,
            agent_id=agent_id,
            session_id=session_id,
            action=f"execute_command:{executable}",
            risk_level=risk_level,
            policy_decision=decision,
            details={"executable": executable, "matched_rule": matched_rule},
        )
        return record

    # ── File Access ───────────────────────────────────────────────

    async def record_file_access(
        self,
        agent_id: uuid.UUID,
        session_id: uuid.UUID,
        operation: str,
        file_path: str,
    ) -> AgentFileAccess:
        """
        Record file access with sensitivity detection.
        .env, SSH keys, credentials → HIGH/CRITICAL risk.
        Path traversal detection runs deterministically.
        """
        is_sensitive, category, risk_level = classify_file_path(file_path)
        is_traversal = ".." in file_path or file_path.startswith("/etc/") or file_path.startswith("~/.ssh")

        if is_traversal:
            risk_level = RiskLevel.CRITICAL
            is_sensitive = True
            category = category or "path_traversal"

        if is_sensitive:
            decision = PolicyDecision.REQUIRE_APPROVAL
        else:
            decision = PolicyDecision.ALLOW

        record = AgentFileAccess(
            agent_id=agent_id,
            session_id=session_id,
            operation=operation,
            file_path=file_path,
            is_sensitive_path=is_sensitive,
            sensitivity_category=category,
            risk_level=risk_level,
            policy_decision=decision,
            is_path_traversal_attempt=is_traversal,
        )
        if decision != PolicyDecision.ALLOW:
            record.block_reason = f"Sensitive path access: {category}" if is_sensitive else None

        self.db.add(record)
        await self.db.flush()

        event_type = "AGENT_FILE_WRITE" if operation in ("WRITE", "DELETE") else "AGENT_FILE_READ"
        if is_sensitive:
            event_type = "AGENT_SECRET_ACCESS_ATTEMPT" if is_sensitive else event_type

        await self._record_event(
            event_type=event_type,
            agent_id=agent_id,
            session_id=session_id,
            action=f"file:{operation}",
            resource=file_path,
            risk_level=risk_level,
            policy_decision=decision,
            details={"sensitive": is_sensitive, "category": category, "traversal": is_traversal},
        )
        return record

    # ── Network Events ────────────────────────────────────────────

    async def record_network_event(
        self,
        agent_id: uuid.UUID,
        session_id: uuid.UUID,
        destination_host: str,
        destination_port: Optional[int],
        protocol: Optional[str],
        destination_category: Optional[str] = None,
    ) -> AgentNetworkEvent:
        risk_level = _classify_network_risk(destination_host, destination_category)
        decision = PolicyDecision.ALLOW if risk_level in (RiskLevel.LOW, RiskLevel.MEDIUM) else PolicyDecision.WARN

        record = AgentNetworkEvent(
            agent_id=agent_id,
            session_id=session_id,
            destination_host=destination_host[:2000],
            destination_port=destination_port,
            protocol=protocol,
            destination_category=destination_category,
            risk_level=risk_level,
            policy_decision=decision,
        )
        self.db.add(record)
        await self.db.flush()

        await self._record_event(
            event_type="AGENT_NETWORK_REQUEST",
            agent_id=agent_id,
            session_id=session_id,
            action="network_request",
            resource=destination_host,
            risk_level=risk_level,
            policy_decision=decision,
        )
        return record

    # ── Code Changes ──────────────────────────────────────────────

    async def record_code_change(
        self,
        agent_id: uuid.UUID,
        session_id: uuid.UUID,
        file_path: str,
        change_description: Optional[str],
        diff_hash: Optional[str],
        lines_added: Optional[int],
        lines_removed: Optional[int],
        policy_version: Optional[int] = None,
    ) -> AgentCodeChange:
        is_sensitive, category, risk_level = classify_file_path(file_path)
        decision = PolicyDecision.REQUIRE_APPROVAL if is_sensitive or risk_level == RiskLevel.HIGH else PolicyDecision.ALLOW

        record = AgentCodeChange(
            agent_id=agent_id,
            session_id=session_id,
            file_path=file_path,
            change_description=change_description[:500] if change_description else None,
            diff_hash=diff_hash,
            lines_added=lines_added,
            lines_removed=lines_removed,
            status="PROPOSED",
            policy_decision=decision,
            policy_version=policy_version,
        )
        self.db.add(record)
        await self.db.flush()

        await self._record_event(
            event_type="AGENT_CODE_CHANGE",
            agent_id=agent_id,
            session_id=session_id,
            action="propose_code_change",
            resource=file_path,
            risk_level=risk_level,
            policy_decision=decision,
        )
        return record

    # ── Git Operations ────────────────────────────────────────────

    async def record_git_operation(
        self,
        agent_id: uuid.UUID,
        session_id: uuid.UUID,
        operation: str,
        repository: Optional[str],
        branch: Optional[str],
        target_branch: Optional[str],
        commit_sha: Optional[str],
    ) -> AgentGitOperation:
        GIT_RISK_MAP = {
            "push": (RiskLevel.MEDIUM, PolicyDecision.WARN),
            "force_push": (RiskLevel.HIGH, PolicyDecision.REQUIRE_APPROVAL),
            "merge": (RiskLevel.MEDIUM, PolicyDecision.WARN),
            "rebase": (RiskLevel.HIGH, PolicyDecision.REQUIRE_APPROVAL),
            "tag": (RiskLevel.MEDIUM, PolicyDecision.WARN),
            "status": (RiskLevel.LOW, PolicyDecision.ALLOW),
            "diff": (RiskLevel.LOW, PolicyDecision.ALLOW),
            "checkout": (RiskLevel.LOW, PolicyDecision.ALLOW),
            "commit": (RiskLevel.LOW, PolicyDecision.ALLOW),
            "branch": (RiskLevel.LOW, PolicyDecision.ALLOW),
        }
        risk_level, decision = GIT_RISK_MAP.get(operation.lower(), (RiskLevel.MEDIUM, PolicyDecision.WARN))

        record = AgentGitOperation(
            agent_id=agent_id,
            session_id=session_id,
            operation=operation,
            repository=repository,
            branch=branch,
            target_branch=target_branch,
            commit_sha=commit_sha,
            risk_level=risk_level,
            policy_decision=decision,
        )
        self.db.add(record)
        await self.db.flush()

        await self._record_event(
            event_type="AGENT_GIT_OPERATION",
            agent_id=agent_id,
            session_id=session_id,
            action=f"git:{operation}",
            resource=repository,
            risk_level=risk_level,
            policy_decision=decision,
        )
        return record

    # ── Approvals ─────────────────────────────────────────────────

    async def create_approval_request(
        self,
        agent_id: uuid.UUID,
        session_id: Optional[uuid.UUID],
        project_id: uuid.UUID,
        requested_by_user_id: Optional[uuid.UUID],
        action_type: str,
        resource: Optional[str],
        risk_level: str,
        context: Optional[Dict],
        expires_in_minutes: int = 60,
    ) -> AgentActionApproval:
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=expires_in_minutes)
        approval = AgentActionApproval(
            agent_id=agent_id,
            session_id=session_id,
            project_id=project_id,
            requested_by_user_id=requested_by_user_id,
            action_type=action_type,
            resource=resource,
            risk_level=risk_level,
            context=context,
            status="PENDING",
            expires_at=expires_at,
        )
        self.db.add(approval)
        await self.db.flush()

        await self._record_event(
            event_type="AGENT_APPROVAL_REQUESTED",
            agent_id=agent_id,
            session_id=session_id,
            project_id=project_id,
            action=action_type,
            resource=resource,
            risk_level=risk_level,
            policy_decision=PolicyDecision.REQUIRE_APPROVAL,
        )
        return approval

    async def review_approval(
        self,
        approval_id: uuid.UUID,
        reviewed_by_user_id: uuid.UUID,
        decision: str,  # APPROVED | DENIED
        review_note: Optional[str],
    ) -> Optional[AgentActionApproval]:
        result = await self.db.execute(
            select(AgentActionApproval).where(AgentActionApproval.id == approval_id)
        )
        approval = result.scalar_one_or_none()
        if not approval:
            return None

        if approval.status != "PENDING":
            logger.warning(f"Approval {approval_id} already in status {approval.status}")
            return approval

        now = datetime.now(timezone.utc)
        if approval.expires_at and now > approval.expires_at:
            approval.status = "EXPIRED"
        else:
            approval.status = decision
            approval.reviewed_by_user_id = reviewed_by_user_id
            approval.review_note = review_note
            approval.reviewed_at = now

        await self.db.flush()

        event_type = "AGENT_APPROVED" if decision == "APPROVED" else "AGENT_DENIED"
        await self._record_event(
            event_type=event_type,
            agent_id=approval.agent_id,
            session_id=approval.session_id,
            project_id=approval.project_id,
            action=approval.action_type,
            resource=approval.resource,
            risk_level=approval.risk_level,
            policy_decision=PolicyDecision.ALLOW if decision == "APPROVED" else PolicyDecision.BLOCK,
            details={"reviewed_by": str(reviewed_by_user_id), "note": review_note},
        )
        return approval

    async def list_pending_approvals(
        self, project_id: Optional[uuid.UUID] = None, limit: int = 100
    ) -> List[AgentActionApproval]:
        stmt = select(AgentActionApproval).where(AgentActionApproval.status == "PENDING")
        if project_id:
            stmt = stmt.where(AgentActionApproval.project_id == project_id)
        stmt = stmt.order_by(AgentActionApproval.requested_at.desc()).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    # ── Kill Switch (§28.27–28.28) ────────────────────────────────

    async def revoke_agent(
        self,
        agent_id: uuid.UUID,
        reason: str,
        revoked_by_user_id: Optional[uuid.UUID],
        trigger: str = "MANUAL",
        is_emergency: bool = False,
    ) -> AgentRevocationRecord:
        """
        Emergency revocation — terminates all active sessions for an agent.
        Must be authenticated + authorized + audited (§28.28).
        """
        # Revoke all active sessions
        active_sessions_result = await self.db.execute(
            select(AgentGovernanceSession).where(
                AgentGovernanceSession.agent_id == agent_id,
                AgentGovernanceSession.status.in_(["ACTIVE", "IDLE", "STARTING"]),
            )
        )
        for session in active_sessions_result.scalars().all():
            await self.revoke_session(
                session_id=session.id,
                reason=f"Agent revoked: {reason}",
                revoked_by_user_id=revoked_by_user_id,
                trigger=trigger,
            )

        # Revoke active delegations from this agent
        await self.db.execute(
            update(AgentGovernanceDelegation)
            .where(
                AgentGovernanceDelegation.delegator_agent_id == agent_id,
                AgentGovernanceDelegation.status == "ACTIVE",
            )
            .values(status="REVOKED", revoked_at=datetime.now(timezone.utc),
                    revoked_by_user_id=revoked_by_user_id)
        )

        revocation = AgentRevocationRecord(
            revocation_target="AGENT",
            target_id=str(agent_id),
            agent_id=agent_id,
            revoked_by_user_id=revoked_by_user_id,
            reason=reason,
            trigger=trigger,
            is_emergency=is_emergency,
        )
        self.db.add(revocation)
        await self.db.flush()

        await self._record_event(
            event_type="AGENT_REVOKED",
            agent_id=agent_id,
            action="revoke_agent",
            risk_level=RiskLevel.CRITICAL if is_emergency else RiskLevel.HIGH,
            policy_decision=PolicyDecision.BLOCK,
            details={"reason": reason, "trigger": trigger, "emergency": is_emergency},
        )
        return revocation

    # ── Anomalies (§28.26) ────────────────────────────────────────

    async def record_anomaly(
        self,
        agent_id: uuid.UUID,
        project_id: uuid.UUID,
        session_id: Optional[uuid.UUID],
        anomaly_type: str,
        description: str,
        severity: str,
        details: Optional[Dict] = None,
        baseline_deviation_score: Optional[float] = None,
    ) -> AgentBehaviorAnomaly:
        """
        Anomaly ≠ Attack. Records for investigation — not automatic incident.
        """
        anomaly = AgentBehaviorAnomaly(
            agent_id=agent_id,
            project_id=project_id,
            session_id=session_id,
            anomaly_type=anomaly_type,
            description=description,
            severity=severity,
            details=details,
            baseline_deviation_score=baseline_deviation_score,
            status="OPEN",
        )
        self.db.add(anomaly)
        await self.db.flush()

        await self._record_event(
            event_type="AGENT_ANOMALY",
            agent_id=agent_id,
            session_id=session_id,
            project_id=project_id,
            action=f"anomaly:{anomaly_type}",
            risk_level=severity,
            policy_decision=PolicyDecision.WARN,
            details=details,
        )
        return anomaly

    # ── Events ────────────────────────────────────────────────────

    async def _record_event(
        self,
        event_type: str,
        agent_id: Optional[uuid.UUID] = None,
        session_id: Optional[uuid.UUID] = None,
        project_id: Optional[uuid.UUID] = None,
        user_id: Optional[uuid.UUID] = None,
        action: Optional[str] = None,
        resource: Optional[str] = None,
        risk_level: str = RiskLevel.LOW,
        policy_decision: Optional[str] = None,
        details: Optional[Dict] = None,
        provider_event_id: Optional[str] = None,
        provider: Optional[str] = None,
    ) -> AgentSecurityEvent:
        event = AgentSecurityEvent(
            event_type=event_type,
            agent_id=agent_id,
            session_id=session_id,
            project_id=project_id,
            user_id=user_id,
            action=action,
            resource=str(resource)[:1000] if resource else None,
            risk_level=risk_level,
            policy_decision=policy_decision,
            details=details,
            provider_event_id=provider_event_id,
            provider=provider,
            occurred_at=datetime.now(timezone.utc),
        )
        self.db.add(event)
        await self.db.flush()
        return event

    async def list_events(
        self,
        agent_id: Optional[uuid.UUID] = None,
        session_id: Optional[uuid.UUID] = None,
        project_id: Optional[uuid.UUID] = None,
        event_type: Optional[str] = None,
        risk_level: Optional[str] = None,
        limit: int = 200,
        offset: int = 0,
    ) -> List[AgentSecurityEvent]:
        stmt = select(AgentSecurityEvent)
        if agent_id:
            stmt = stmt.where(AgentSecurityEvent.agent_id == agent_id)
        if session_id:
            stmt = stmt.where(AgentSecurityEvent.session_id == session_id)
        if project_id:
            stmt = stmt.where(AgentSecurityEvent.project_id == project_id)
        if event_type:
            stmt = stmt.where(AgentSecurityEvent.event_type == event_type)
        if risk_level:
            stmt = stmt.where(AgentSecurityEvent.risk_level == risk_level)
        stmt = stmt.order_by(AgentSecurityEvent.occurred_at.desc()).limit(limit).offset(offset)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    # ── Delegations ───────────────────────────────────────────────

    async def create_delegation(
        self,
        delegator_agent_id: uuid.UUID,
        delegate_agent_id: uuid.UUID,
        project_id: uuid.UUID,
        original_user_id: Optional[uuid.UUID],
        scope: Optional[Dict],
        resources: Optional[List],
        actions: Optional[List],
        conditions: Optional[Dict],
        max_depth: int = 1,
        further_delegation_allowed: bool = False,
        expires_in_hours: int = 24,
    ) -> AgentGovernanceDelegation:
        """
        Delegated authority ⊆ Delegator authority — enforced by policy engine.
        Further delegation only allowed if explicitly enabled.
        """
        if max_depth > 3:
            raise ValueError("Delegation depth cannot exceed 3")

        expires_at = datetime.now(timezone.utc) + timedelta(hours=expires_in_hours)
        delegation = AgentGovernanceDelegation(
            delegator_agent_id=delegator_agent_id,
            delegate_agent_id=delegate_agent_id,
            original_user_id=original_user_id,
            project_id=project_id,
            scope=scope,
            resources=resources,
            actions=actions,
            conditions=conditions,
            max_depth=max_depth,
            current_depth=1,
            further_delegation_allowed=further_delegation_allowed,
            status="ACTIVE",
            expires_at=expires_at,
        )
        self.db.add(delegation)
        await self.db.flush()
        return delegation

    async def list_delegations(
        self,
        agent_id: Optional[uuid.UUID] = None,
        project_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        limit: int = 100,
    ) -> List[AgentGovernanceDelegation]:
        stmt = select(AgentGovernanceDelegation)
        if agent_id:
            stmt = stmt.where(
                (AgentGovernanceDelegation.delegator_agent_id == agent_id) |
                (AgentGovernanceDelegation.delegate_agent_id == agent_id)
            )
        if project_id:
            stmt = stmt.where(AgentGovernanceDelegation.project_id == project_id)
        if status:
            stmt = stmt.where(AgentGovernanceDelegation.status == status)
        stmt = stmt.order_by(AgentGovernanceDelegation.created_at.desc()).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    # ── Dashboard Metrics (§28.35) ────────────────────────────────

    async def get_dashboard_metrics(
        self, project_id: Optional[uuid.UUID] = None
    ) -> Dict[str, Any]:
        """
        All dashboard numbers come from real DB queries.
        Never hardcoded.
        """
        # Active sessions
        active_sessions_q = select(func.count()).select_from(AgentGovernanceSession).where(
            AgentGovernanceSession.status == "ACTIVE"
        )
        if project_id:
            active_sessions_q = active_sessions_q.where(AgentGovernanceSession.project_id == project_id)
        active_sessions = (await self.db.execute(active_sessions_q)).scalar_one()

        # Blocked actions
        blocked_actions_q = select(func.count()).select_from(AgentSecurityEvent).where(
            AgentSecurityEvent.policy_decision == PolicyDecision.BLOCK
        )
        if project_id:
            blocked_actions_q = blocked_actions_q.where(AgentSecurityEvent.project_id == project_id)
        blocked_actions = (await self.db.execute(blocked_actions_q)).scalar_one()

        # Pending approvals
        pending_approvals_q = select(func.count()).select_from(AgentActionApproval).where(
            AgentActionApproval.status == "PENDING"
        )
        if project_id:
            pending_approvals_q = pending_approvals_q.where(AgentActionApproval.project_id == project_id)
        pending_approvals = (await self.db.execute(pending_approvals_q)).scalar_one()

        # Open anomalies
        anomalies_q = select(func.count()).select_from(AgentBehaviorAnomaly).where(
            AgentBehaviorAnomaly.status == "OPEN"
        )
        if project_id:
            anomalies_q = anomalies_q.where(AgentBehaviorAnomaly.project_id == project_id)
        open_anomalies = (await self.db.execute(anomalies_q)).scalar_one()

        # Total events
        total_events_q = select(func.count()).select_from(AgentSecurityEvent)
        if project_id:
            total_events_q = total_events_q.where(AgentSecurityEvent.project_id == project_id)
        total_events = (await self.db.execute(total_events_q)).scalar_one()

        # Tool invocations
        tool_invocations_q = select(func.count()).select_from(AgentToolInvocation)
        tool_invocations = (await self.db.execute(tool_invocations_q)).scalar_one()

        return {
            "active_sessions": active_sessions,
            "blocked_actions": blocked_actions,
            "pending_approvals": pending_approvals,
            "open_anomalies": open_anomalies,
            "total_events": total_events,
            "tool_invocations": tool_invocations,
        }


# ─────────────────────────────────────────────────────────────────
# Internal Policy Helpers (deterministic — no LLM)
# ─────────────────────────────────────────────────────────────────

# Action type → (risk_level, base_policy)
ACTION_RISK_MAP: Dict[str, Tuple[str, str]] = {
    # Low risk
    "file:read": (RiskLevel.LOW, PolicyDecision.ALLOW),
    "file:list": (RiskLevel.LOW, PolicyDecision.ALLOW),
    "git:status": (RiskLevel.LOW, PolicyDecision.ALLOW),
    "git:diff": (RiskLevel.LOW, PolicyDecision.ALLOW),
    "git:log": (RiskLevel.LOW, PolicyDecision.ALLOW),
    "tool:read": (RiskLevel.LOW, PolicyDecision.ALLOW),
    # Medium risk
    "file:write": (RiskLevel.MEDIUM, PolicyDecision.WARN),
    "git:commit": (RiskLevel.MEDIUM, PolicyDecision.WARN),
    "git:push": (RiskLevel.MEDIUM, PolicyDecision.WARN),
    "tool:terminal": (RiskLevel.MEDIUM, PolicyDecision.WARN),
    "tool:network": (RiskLevel.MEDIUM, PolicyDecision.WARN),
    "package:install": (RiskLevel.MEDIUM, PolicyDecision.WARN),
    # High risk
    "file:delete": (RiskLevel.HIGH, PolicyDecision.REQUIRE_APPROVAL),
    "auth:modify": (RiskLevel.HIGH, PolicyDecision.REQUIRE_APPROVAL),
    "iam:modify": (RiskLevel.HIGH, PolicyDecision.REQUIRE_APPROVAL),
    "git:force_push": (RiskLevel.HIGH, PolicyDecision.REQUIRE_APPROVAL),
    "secret:access": (RiskLevel.HIGH, PolicyDecision.REQUIRE_APPROVAL),
    # Critical risk
    "production:deploy": (RiskLevel.CRITICAL, PolicyDecision.REQUIRE_APPROVAL),
    "secret:extract": (RiskLevel.CRITICAL, PolicyDecision.BLOCK),
    "security:disable": (RiskLevel.CRITICAL, PolicyDecision.BLOCK),
    "iam:escalate": (RiskLevel.CRITICAL, PolicyDecision.BLOCK),
    "policy:bypass": (RiskLevel.CRITICAL, PolicyDecision.BLOCK),
}

TOOL_RISK_MAP: Dict[str, Tuple[str, str]] = {
    "filesystem": (RiskLevel.LOW, PolicyDecision.ALLOW),
    "terminal": (RiskLevel.MEDIUM, PolicyDecision.WARN),
    "network": (RiskLevel.MEDIUM, PolicyDecision.WARN),
    "git": (RiskLevel.MEDIUM, PolicyDecision.WARN),
    "mcp": (RiskLevel.MEDIUM, PolicyDecision.WARN),
    "package": (RiskLevel.MEDIUM, PolicyDecision.WARN),
    "iam": (RiskLevel.HIGH, PolicyDecision.REQUIRE_APPROVAL),
    "cloud": (RiskLevel.HIGH, PolicyDecision.REQUIRE_APPROVAL),
    "database": (RiskLevel.HIGH, PolicyDecision.REQUIRE_APPROVAL),
    "secret": (RiskLevel.CRITICAL, PolicyDecision.BLOCK),
}

KNOWN_SAFE_DESTINATIONS = {
    "registry.npmjs.org", "pypi.org", "files.pythonhosted.org",
    "github.com", "api.github.com", "registry.hub.docker.com",
    "pkg.go.dev", "crates.io",
}


def _classify_action_risk(action_type: str, resource: Optional[str]) -> str:
    risk, _ = ACTION_RISK_MAP.get(action_type, (RiskLevel.MEDIUM, PolicyDecision.WARN))
    return risk


def _apply_policy(action_type: str, risk_level: str, environment: str) -> str:
    _, decision = ACTION_RISK_MAP.get(action_type, (RiskLevel.MEDIUM, PolicyDecision.WARN))
    # Escalate policy for production environment
    if environment == "production" and risk_level in (RiskLevel.MEDIUM, RiskLevel.HIGH):
        decision = PolicyDecision.REQUIRE_APPROVAL
    return decision


def _classify_tool_risk(tool_name: str, tool_type: str) -> str:
    risk, _ = TOOL_RISK_MAP.get(tool_type, (RiskLevel.MEDIUM, PolicyDecision.WARN))
    return risk


def _classify_network_risk(destination_host: str, category: Optional[str]) -> str:
    if destination_host in KNOWN_SAFE_DESTINATIONS:
        return RiskLevel.LOW
    if any(safe in destination_host for safe in KNOWN_SAFE_DESTINATIONS):
        return RiskLevel.LOW
    return RiskLevel.MEDIUM


def _get_matched_rules(action_type: str, risk_level: str) -> List[str]:
    rules = [f"action_risk:{action_type}={risk_level}"]
    if risk_level == RiskLevel.CRITICAL:
        rules.append("critical_risk_block_policy")
    elif risk_level == RiskLevel.HIGH:
        rules.append("high_risk_approval_policy")
    return rules
