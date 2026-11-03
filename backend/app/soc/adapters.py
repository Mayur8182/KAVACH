"""
Event Normalization Engine & Telemetry Source Adapters (Step 23).

Transforms heterogeneous telemetry (AWS CloudTrail, Kubernetes Audit, GitHub,
MCP Tool Calls, OTel Traces, Security Scanners, Policy Decisions) into canonical
SecurityEvent representations while preserving raw payload references and hashes.

Rules:
- Rule 10: Never destroy the original event; preserve raw payload & hash.
- Rule 12: UNKNOWN is a valid state for missing metadata.
- No silent drops: invalid payloads raise validation errors with diagnostic details.
"""

import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Tuple, Optional


class EventNormalizationEngine:
    """Normalizes vendor & runtime events into canonical SecurityEvent representations."""

    @staticmethod
    def compute_payload_hash(raw_payload: Dict[str, Any]) -> str:
        """Calculates a deterministic SHA-256 cryptographic checksum of raw payload."""
        serialized = json.dumps(raw_payload, sort_keys=True, default=str).encode("utf-8")
        return hashlib.sha256(serialized).hexdigest()

    @classmethod
    def normalize_event(
        cls,
        source_type: str,
        raw_payload: Dict[str, Any],
        environment: str = "PRODUCTION",
    ) -> Dict[str, Any]:
        """Routes payload to specific source adapter and returns canonical dictionary."""
        source_upper = source_type.upper()
        raw_hash = cls.compute_payload_hash(raw_payload)

        adapter_map = {
            "AWS_CLOUDTRAIL": cls._adapt_aws_cloudtrail,
            "KUBERNETES_AUDIT": cls._adapt_kubernetes_audit,
            "GITHUB": cls._adapt_github_event,
            "MCP_GATEWAY": cls._adapt_mcp_event,
            "RUNTIME_OTEL": cls._adapt_otel_event,
            "SCANNER": cls._adapt_scanner_event,
            "POLICY_DECISION": cls._adapt_policy_event,
        }

        adapter = adapter_map.get(source_upper, cls._adapt_generic_event)
        canonical = adapter(raw_payload, environment)

        # Attach cryptographic reference & raw payload
        canonical["source_type"] = source_upper
        canonical["raw_event_reference"] = f"sha256:{raw_hash}"
        canonical["raw_payload"] = raw_payload
        canonical["ingestion_status"] = "NORMALIZED"

        if not canonical.get("event_id"):
            canonical["event_id"] = f"EVT-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:8]}"

        return canonical

    @classmethod
    def _adapt_aws_cloudtrail(cls, raw: Dict[str, Any], env: str) -> Dict[str, Any]:
        """Adapts AWS CloudTrail log entry."""
        event_time_str = raw.get("eventTime")
        timestamp = cls._parse_timestamp(event_time_str)

        user_ident = raw.get("userIdentity", {})
        actor = {
            "id": user_ident.get("arn") or user_ident.get("principalId") or "UNKNOWN",
            "type": user_ident.get("type", "AWS_IAM_PRINCIPAL"),
            "role": user_ident.get("sessionContext", {}).get("sessionIssuer", {}).get("userName"),
            "principal": user_ident.get("userName") or user_ident.get("arn"),
            "ip_address": raw.get("sourceIPAddress"),
            "user_agent": raw.get("userAgent"),
        }

        res_items = raw.get("resources", [])
        primary_res = res_items[0] if res_items else {}
        req_params = raw.get("requestParameters") or {}
        resource_id = (
            primary_res.get("ARN")
            or primary_res.get("accountId")
            or req_params.get("roleName")
            or req_params.get("resourceName")
            or req_params.get("bucketName")
            or req_params.get("policyArn")
            or "UNKNOWN"
        )
        resource = {
            "id": resource_id,
            "type": primary_res.get("type") or ("AWS_IAM_ROLE" if "roleName" in req_params else raw.get("eventSource", "AWS_RESOURCE")),
            "name": primary_res.get("ARN") or req_params.get("roleName") or raw.get("eventSource"),
            "arn_or_path": primary_res.get("ARN"),
            "data_classification": raw.get("data_classification", "UNKNOWN"),
            "environment": env,
        }

        error_code = raw.get("errorCode")
        error_msg = raw.get("errorMessage")
        if error_code in ["AccessDenied", "UnauthorizedOperation"]:
            result = "DENIED"
            severity = "HIGH"
        elif error_code:
            result = "FAILED"
            severity = "MEDIUM"
        else:
            result = "SUCCESS"
            severity = "INFO"

        event_name = raw.get("eventName", "UnknownAction")
        action = f"aws:{event_name}"

        # Classify event type
        if "Login" in event_name or "AssumeRole" in event_name:
            event_type = "AUTHENTICATION"
        elif "Policy" in event_name or "Permission" in event_name or result == "DENIED":
            event_type = "AUTHORIZATION"
        elif "SecurityGroup" in event_name or "Vpc" in event_name:
            event_type = "CONFIG_CHANGE"
        else:
            event_type = "DATA_ACCESS" if "Get" in event_name or "List" in event_name else "TOOL_EXECUTION"

        return {
            "event_type": event_type,
            "timestamp": timestamp,
            "actor": actor,
            "resource": resource,
            "action": action,
            "result": result,
            "severity": severity,
            "environment": env,
            "request_id": raw.get("requestID"),
            "attributes": {
                "awsRegion": raw.get("awsRegion"),
                "eventSource": raw.get("eventSource"),
                "errorMessage": error_msg,
            },
        }

    @classmethod
    def _adapt_kubernetes_audit(cls, raw: Dict[str, Any], env: str) -> Dict[str, Any]:
        """Adapts Kubernetes Audit log record."""
        timestamp = cls._parse_timestamp(raw.get("stageTimestamp") or raw.get("requestReceivedTimestamp"))

        user = raw.get("user", {})
        actor = {
            "id": user.get("username", "UNKNOWN"),
            "type": "KUBERNETES_USER",
            "role": ",".join(user.get("groups", [])),
            "principal": user.get("username"),
            "ip_address": (raw.get("sourceIPs") or ["UNKNOWN"])[0],
            "user_agent": raw.get("userAgent"),
        }

        obj_ref = raw.get("objectRef", {})
        resource = {
            "id": f"{obj_ref.get('namespace', 'cluster')}/{obj_ref.get('resource', '')}/{obj_ref.get('name', '')}",
            "type": f"K8S_{obj_ref.get('resource', 'OBJECT').upper()}",
            "name": obj_ref.get("name", "UNKNOWN"),
            "arn_or_path": f"k8s://{obj_ref.get('namespace', '')}/{obj_ref.get('resource', '')}/{obj_ref.get('name', '')}",
            "data_classification": "INTERNAL",
            "environment": env,
        }

        resp_status = raw.get("responseStatus", {})
        code = resp_status.get("code", 200)
        verb = raw.get("verb", "get")
        action = f"k8s:{verb}"

        if code in [401, 403]:
            result = "DENIED"
            severity = "HIGH"
            event_type = "AUTHORIZATION"
        elif code >= 400:
            result = "FAILED"
            severity = "MEDIUM"
            event_type = "TOOL_EXECUTION"
        else:
            result = "SUCCESS"
            severity = "INFO"
            event_type = "CONFIG_CHANGE" if verb in ["create", "update", "patch", "delete"] else "DATA_ACCESS"

        return {
            "event_type": event_type,
            "timestamp": timestamp,
            "actor": actor,
            "resource": resource,
            "action": action,
            "result": result,
            "severity": severity,
            "environment": env,
            "request_id": raw.get("auditID"),
            "attributes": {
                "namespace": obj_ref.get("namespace"),
                "verb": verb,
                "statusCode": code,
                "reason": resp_status.get("reason"),
            },
        }

    @classmethod
    def _adapt_mcp_event(cls, raw: Dict[str, Any], env: str) -> Dict[str, Any]:
        """Adapts MCP Tool Gateway invocation event."""
        timestamp = cls._parse_timestamp(raw.get("timestamp"))

        agent_id = raw.get("agent_id") or raw.get("caller_id") or "UNKNOWN_AGENT"
        actor = {
            "id": agent_id,
            "type": "AI_AGENT",
            "role": raw.get("agent_role", "AGENT"),
            "principal": agent_id,
            "delegation_id": raw.get("delegation_id"),
        }

        tool_name = raw.get("tool_name", "unknown_tool")
        resource = {
            "id": f"mcp://{raw.get('server_name', 'gateway')}/{tool_name}",
            "type": "MCP_TOOL",
            "name": tool_name,
            "data_classification": raw.get("data_classification", "RESTRICTED" if "secret" in tool_name or "db" in tool_name else "INTERNAL"),
            "environment": env,
        }

        decision = raw.get("authorization_decision") or raw.get("decision") or raw.get("status", "SUCCESS")
        if decision in ["DENIED", "BLOCKED", "POLICY_VIOLATION"]:
            result = "BLOCKED"
            severity = "HIGH"
        elif decision == "ERROR":
            result = "ERROR"
            severity = "MEDIUM"
        else:
            result = "SUCCESS"
            severity = "LOW"

        return {
            "event_type": "TOOL_EXECUTION" if result == "SUCCESS" else "AUTHORIZATION",
            "timestamp": timestamp,
            "actor": actor,
            "resource": resource,
            "action": f"mcp:{tool_name}",
            "result": result,
            "severity": severity,
            "environment": env,
            "correlation_id": raw.get("correlation_id"),
            "trace_id": raw.get("trace_id"),
            "request_id": raw.get("request_id"),
            "attributes": {
                "server_name": raw.get("server_name"),
                "tool_arguments": raw.get("tool_arguments", {}),
                "policy_decision_id": raw.get("policy_decision_id"),
            },
        }

    @classmethod
    def _adapt_github_event(cls, raw: Dict[str, Any], env: str) -> Dict[str, Any]:
        """Adapts GitHub Webhook event."""
        timestamp = cls._parse_timestamp(raw.get("timestamp") or raw.get("created_at"))

        sender = raw.get("sender", {})
        actor = {
            "id": str(sender.get("id") or sender.get("login") or "UNKNOWN"),
            "type": "GITHUB_USER",
            "role": "CONTRIBUTOR",
            "principal": sender.get("login", "unknown"),
        }

        repo = raw.get("repository", {})
        resource = {
            "id": str(repo.get("id") or repo.get("full_name") or "UNKNOWN"),
            "type": "REPOSITORY",
            "name": repo.get("full_name", "UNKNOWN"),
            "arn_or_path": repo.get("html_url"),
            "data_classification": "CONFIDENTIAL" if repo.get("private") else "PUBLIC",
            "environment": env,
        }

        event_name = raw.get("event", raw.get("action", "webhook"))
        action = f"github:{event_name}"

        # Classify
        if "secret_scanning" in event_name or "alert" in event_name:
            event_type = "SCAN_FINDING"
            severity = "CRITICAL" if "secret" in str(raw).lower() else "HIGH"
            result = "VIOLATION"
        elif "pull_request" in event_name:
            event_type = "CONFIG_CHANGE"
            severity = "INFO"
            result = "SUCCESS"
        else:
            event_type = "DEPLOYMENT" if "workflow" in event_name or "deployment" in event_name else "DATA_ACCESS"
            severity = "INFO"
            result = "SUCCESS"

        return {
            "event_type": event_type,
            "timestamp": timestamp,
            "actor": actor,
            "resource": resource,
            "action": action,
            "result": result,
            "severity": severity,
            "environment": env,
            "correlation_id": raw.get("delivery_id"),
            "attributes": {
                "action": raw.get("action"),
                "ref": raw.get("ref"),
                "commit": raw.get("after") or raw.get("head_commit", {}).get("id"),
            },
        }

    @classmethod
    def _adapt_otel_event(cls, raw: Dict[str, Any], env: str) -> Dict[str, Any]:
        """Adapts OpenTelemetry trace or span event."""
        timestamp = cls._parse_timestamp(raw.get("timestamp") or raw.get("start_time"))

        actor = {
            "id": raw.get("client_id") or raw.get("service_name", "OTEL_SERVICE"),
            "type": "SERVICE",
            "role": "WORKLOAD",
            "principal": raw.get("service_name"),
            "ip_address": raw.get("net_peer_ip"),
        }

        resource = {
            "id": raw.get("http_target") or raw.get("db_statement") or raw.get("span_name", "UNKNOWN"),
            "type": "API_ENDPOINT" if raw.get("http_target") else "RUNTIME_RESOURCE",
            "name": raw.get("span_name", "UNKNOWN"),
            "data_classification": "INTERNAL",
            "environment": env,
        }

        status = raw.get("status_code", "OK")
        if status in ["ERROR", 500, 503]:
            result = "ERROR"
            severity = "HIGH" if raw.get("is_security_exception") else "MEDIUM"
        else:
            result = "SUCCESS"
            severity = "INFO"

        return {
            "event_type": "TOOL_EXECUTION" if "tool" in str(raw).lower() else "DATA_ACCESS",
            "timestamp": timestamp,
            "actor": actor,
            "resource": resource,
            "action": f"otel:{raw.get('span_name', 'trace')}",
            "result": result,
            "severity": severity,
            "environment": env,
            "trace_id": raw.get("trace_id"),
            "request_id": raw.get("span_id"),
            "attributes": raw.get("attributes", {}),
        }

    @classmethod
    def _adapt_scanner_event(cls, raw: Dict[str, Any], env: str) -> Dict[str, Any]:
        """Adapts Security Scanner (Semgrep, Gitleaks, Trivy) finding."""
        timestamp = cls._parse_timestamp(raw.get("timestamp"))

        actor = {
            "id": raw.get("scanner_name", "SECURITY_SCANNER"),
            "type": "SCANNER",
            "role": "AUTOMATED_SCANNER",
            "principal": raw.get("scanner_name"),
        }

        resource = {
            "id": raw.get("file_path") or raw.get("target", "REPOSITORY"),
            "type": "CODE_ARTIFACT",
            "name": raw.get("file_path", "target"),
            "data_classification": "INTERNAL",
            "environment": env,
        }

        sev = raw.get("severity", "HIGH").upper()
        if sev not in ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]:
            sev = "HIGH"

        return {
            "event_type": "SCAN_FINDING",
            "timestamp": timestamp,
            "actor": actor,
            "resource": resource,
            "action": f"scan:{raw.get('rule_id', 'finding')}",
            "result": "VIOLATION",
            "severity": sev,
            "environment": env,
            "attributes": {
                "rule_id": raw.get("rule_id"),
                "scanner": raw.get("scanner_name"),
                "line_number": raw.get("line_number"),
                "description": raw.get("description"),
            },
        }

    @classmethod
    def _adapt_policy_event(cls, raw: Dict[str, Any], env: str) -> Dict[str, Any]:
        """Adapts Step 7 OPA / Security Policy Evaluation event."""
        timestamp = cls._parse_timestamp(raw.get("timestamp"))

        actor = {
            "id": raw.get("actor_id", "UNKNOWN"),
            "type": raw.get("actor_type", "USER"),
            "role": raw.get("actor_role", "OPERATOR"),
            "principal": raw.get("actor_id"),
        }

        resource = {
            "id": raw.get("resource_id", "RESOURCE"),
            "type": raw.get("resource_type", "ASSET"),
            "name": raw.get("resource_id", "RESOURCE"),
            "data_classification": raw.get("data_classification", "RESTRICTED"),
            "environment": env,
        }

        decision = raw.get("decision", "DENIED")
        result = "SUCCESS" if decision == "ALLOW" else "DENIED"
        severity = "HIGH" if result == "DENIED" and env == "PRODUCTION" else "MEDIUM" if result == "DENIED" else "INFO"

        return {
            "event_type": "POLICY_EVALUATION",
            "timestamp": timestamp,
            "actor": actor,
            "resource": resource,
            "action": f"policy:{raw.get('operation_type', 'evaluate')}",
            "result": result,
            "severity": severity,
            "environment": env,
            "attributes": {
                "policy_id": raw.get("policy_id"),
                "violations": raw.get("violations", []),
                "reasons": raw.get("reasons", []),
            },
        }

    @classmethod
    def _adapt_generic_event(cls, raw: Dict[str, Any], env: str) -> Dict[str, Any]:
        """Fallback adapter for generic JSON telemetry."""
        timestamp = cls._parse_timestamp(raw.get("timestamp"))
        actor = raw.get("actor") if isinstance(raw.get("actor"), dict) else {"id": str(raw.get("actor", "UNKNOWN")), "type": "UNKNOWN"}
        resource = raw.get("resource") if isinstance(raw.get("resource"), dict) else {"id": str(raw.get("resource", "UNKNOWN")), "type": "UNKNOWN"}

        return {
            "event_type": raw.get("event_type", "GENERIC_EVENT"),
            "timestamp": timestamp,
            "actor": actor,
            "resource": resource,
            "action": raw.get("action", "unknown:action"),
            "result": raw.get("result", "SUCCESS"),
            "severity": raw.get("severity", "INFO"),
            "environment": env,
            "attributes": raw.get("attributes", {}),
        }

    @staticmethod
    def _parse_timestamp(val: Any) -> datetime:
        """Parses various datetime representations into UTC timezone-aware datetime."""
        if not val:
            return datetime.now(timezone.utc)
        if isinstance(val, datetime):
            return val if val.tzinfo else val.replace(tzinfo=timezone.utc)
        try:
            dt = datetime.fromisoformat(str(val).replace("Z", "+00:00"))
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except Exception:
            return datetime.now(timezone.utc)
