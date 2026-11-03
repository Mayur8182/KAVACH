"""
Deterministic Detection Engine (Step 23).

Evaluates versioned detection rules against canonical SecurityEvents using a controlled,
safe AST/JSON evaluation system (NO arbitrary Python eval/exec).

Rules:
- Rule 8: Deterministic rules decide; LLM does NOT decide.
- Section 20 & 21: Severity and Confidence are strictly separate.
- Records all detection executions in detection_executions table.
"""

import time
import uuid
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.soc_models import DetectionRule, DetectionExecution, SecurityEvent


class DetectionEngine:
    """Safe, deterministic AST rule evaluation engine for canonical security events."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def evaluate_event(
        self,
        event: SecurityEvent,
        enrichments: Optional[List[Dict[str, Any]]] = None,
    ) -> List[Tuple[DetectionRule, Dict[str, Any]]]:
        """Evaluates all active detection rules matching event_type against the event."""
        # Query active rules that target this event type or wildcard
        stmt = select(DetectionRule).where(
            DetectionRule.lifecycle_status == "ACTIVE"
        )
        res = await self.db.execute(stmt)
        rules = res.scalars().all()

        matched_rules: List[Tuple[DetectionRule, Dict[str, Any]]] = []
        event_dict = self._flatten_event(event, enrichments)

        for rule in rules:
            start_time = time.perf_counter()
            status = "SUCCESS"
            error_msg = None
            is_match = False

            # Check event_type filter
            target_types = rule.event_types or []
            if target_types and ("*" not in target_types) and (event.event_type not in target_types):
                continue

            try:
                is_match = self._evaluate_condition(rule.conditions, event_dict)
            except Exception as e:
                status = "FAILED"
                error_msg = f"Rule evaluation error: {str(e)}"
                is_match = False

            duration_ms = int((time.perf_counter() - start_time) * 1000)

            # Record execution audit
            exec_record = DetectionExecution(
                rule_id=rule.id,
                executed_at=datetime.now(timezone.utc),
                events_evaluated_count=1,
                matches_found_count=1 if is_match else 0,
                execution_duration_ms=duration_ms,
                status=status,
                error_message=error_msg,
            )
            self.db.add(exec_record)

            if is_match:
                matched_rules.append((rule, {
                    "rule_id": rule.rule_id,
                    "rule_name": rule.name,
                    "severity": rule.severity,
                    "confidence": rule.confidence,
                    "matched_at": datetime.now(timezone.utc).isoformat(),
                }))

        return matched_rules

    def evaluate_condition(
        self,
        condition: Dict[str, Any],
        event: SecurityEvent,
        enrichments: Optional[Any] = None,
    ) -> bool:
        """Public helper to evaluate AST condition against a SecurityEvent."""
        enrich_list = enrichments if isinstance(enrichments, list) else []
        event_dict = self._flatten_event(event, enrich_list)
        if isinstance(enrichments, dict):
            for k, v in enrichments.items():
                event_dict[f"enrichment.{k}"] = v
        return self._evaluate_condition(condition, event_dict)

    def _flatten_event(self, event: SecurityEvent, enrichments: Optional[List[Dict[str, Any]]]) -> Dict[str, Any]:
        """Flattens event into dot-notated accessible dictionary for AST rules."""
        flat: Dict[str, Any] = {
            "event_type": event.event_type,
            "action": event.action,
            "result": event.result,
            "severity": event.severity,
            "environment": event.environment,
            "source_type": event.source_type,
        }

        # Actor
        actor = event.actor or {}
        for k, v in actor.items():
            flat[f"actor.{k}"] = v
        flat["actor.id"] = actor.get("id")
        flat["actor.type"] = actor.get("type")
        flat["actor.role"] = actor.get("role")

        # Resource
        res = event.resource or {}
        for k, v in res.items():
            flat[f"resource.{k}"] = v
        flat["resource.id"] = res.get("id")
        flat["resource.type"] = res.get("type")
        flat["resource.data_classification"] = res.get("data_classification")

        # Attributes
        attrs = event.attributes or {}
        for k, v in attrs.items():
            flat[f"attributes.{k}"] = v

        # Enrichments
        if enrichments:
            for enrich in enrichments:
                e_type = enrich.get("type")
                if e_type == "WATCHLIST_MATCH":
                    flat["enrichment.is_watchlist_match"] = True
                elif e_type == "AGENT_IDENTITY":
                    data = enrich.get("data", {})
                    flat["enrichment.agent_delegation_count"] = data.get("delegation_count", 0)

        return flat

    def _evaluate_condition(self, condition: Dict[str, Any], event_dict: Dict[str, Any]) -> bool:
        """Recursively evaluates safe boolean expressions."""
        if not condition:
            return False

        # Support direct 'and'/'or'/'not' syntax
        if "and" in condition or "AND" in condition:
            sub = condition.get("and") or condition.get("AND", [])
            return all(self._evaluate_condition(r, event_dict) for r in sub) if sub else False

        if "or" in condition or "OR" in condition:
            sub = condition.get("or") or condition.get("OR", [])
            return any(self._evaluate_condition(r, event_dict) for r in sub) if sub else False

        if "not" in condition or "NOT" in condition:
            sub = condition.get("not") or condition.get("NOT")
            return not self._evaluate_condition(sub, event_dict) if sub else False

        # Support standard operator / rules syntax
        operator = condition.get("operator", "").upper()
        if operator == "AND":
            rules = condition.get("rules", [])
            return all(self._evaluate_condition(r, event_dict) for r in rules) if rules else False

        if operator == "OR":
            rules = condition.get("rules", [])
            return any(self._evaluate_condition(r, event_dict) for r in rules) if rules else False

        if operator == "NOT":
            sub_rule = condition.get("rule")
            return not self._evaluate_condition(sub_rule, event_dict) if sub_rule else False

        # Leaf predicate: field, op (or operator), value
        field = condition.get("field")
        op = (condition.get("op") or condition.get("operator") or "eq").lower()
        target_val = condition.get("value")

        actual_val = event_dict.get(field)

        return self._evaluate_predicate(actual_val, op, target_val)

    @staticmethod
    def _evaluate_predicate(actual: Any, op: str, target: Any) -> bool:
        """Evaluates field-level predicate."""
        if op == "eq":
            return str(actual).lower() == str(target).lower() if actual is not None else target is None
        if op == "neq":
            return str(actual).lower() != str(target).lower() if actual is not None else target is not None
        if op == "contains":
            return str(target).lower() in str(actual).lower() if actual is not None else False
        if op == "in":
            if isinstance(target, list):
                return actual in target or str(actual).lower() in [str(x).lower() for x in target]
            return False
        if op == "not_in":
            if isinstance(target, list):
                return actual not in target and str(actual).lower() not in [str(x).lower() for x in target]
            return True
        if op == "startswith":
            return str(actual).lower().startswith(str(target).lower()) if actual is not None else False
        if op == "endswith":
            return str(actual).lower().endswith(str(target).lower()) if actual is not None else False
        if op == "is_null":
            return actual is None
        if op == "not_null":
            return actual is not None

        return False

    async def seed_default_rules(self) -> None:
        """Installs default deterministic detection rules if not already present."""
        default_rules = [
            {
                "rule_id": "DET-AGENT-RESTRICTED-ACCESS",
                "name": "Agent Restricted Data Access Violation",
                "description": "Triggered when an AI agent attempts to access restricted data and authorization is blocked or violated.",
                "severity": "CRITICAL",
                "confidence": "HIGH",
                "event_types": ["AUTHORIZATION", "TOOL_EXECUTION", "DATA_ACCESS"],
                "conditions": {
                    "operator": "AND",
                    "rules": [
                        {"field": "actor.type", "op": "eq", "value": "AI_AGENT"},
                        {"field": "resource.data_classification", "op": "eq", "value": "RESTRICTED"},
                        {"field": "result", "op": "in", "value": ["DENIED", "BLOCKED", "VIOLATION"]},
                    ],
                },
            },
            {
                "rule_id": "DET-AUTH-BRUTE-FORCE",
                "name": "Multiple Authentication Failures",
                "description": "Triggered on access failures and denied authentication attempts.",
                "severity": "MEDIUM",
                "confidence": "HIGH",
                "event_types": ["AUTHENTICATION"],
                "conditions": {
                    "operator": "AND",
                    "rules": [
                        {"field": "result", "op": "in", "value": ["FAILED", "DENIED", "ERROR"]},
                    ],
                },
            },
            {
                "rule_id": "DET-WATCHLIST-ANOMALY",
                "name": "Watchlisted Entity Security Violation",
                "description": "Triggered when a watchlisted entity encounters a security failure or policy violation.",
                "severity": "HIGH",
                "confidence": "HIGH",
                "event_types": ["*"],
                "conditions": {
                    "operator": "AND",
                    "rules": [
                        {"field": "enrichment.is_watchlist_match", "op": "eq", "value": True},
                        {"field": "result", "op": "in", "value": ["DENIED", "BLOCKED", "VIOLATION", "FAILED"]},
                    ],
                },
            },
            {
                "rule_id": "DET-CRITICAL-SECRET-FINDING",
                "name": "Security Scanner Critical Secret Leak",
                "description": "Triggered when security scanners detect exposed plaintext secrets or keys.",
                "severity": "CRITICAL",
                "confidence": "HIGH",
                "event_types": ["SCAN_FINDING"],
                "conditions": {
                    "operator": "AND",
                    "rules": [
                        {"field": "severity", "op": "eq", "value": "CRITICAL"},
                        {"field": "result", "op": "eq", "value": "VIOLATION"},
                    ],
                },
            },
            {
                "rule_id": "DET-PROD-POLICY-VIOLATION",
                "name": "Production Policy Enactment Denied",
                "description": "Triggered when an OPA policy evaluation blocks an unauthorized production operation.",
                "severity": "HIGH",
                "confidence": "HIGH",
                "event_types": ["POLICY_EVALUATION"],
                "conditions": {
                    "operator": "AND",
                    "rules": [
                        {"field": "environment", "op": "eq", "value": "PRODUCTION"},
                        {"field": "result", "op": "eq", "value": "DENIED"},
                    ],
                },
            },
        ]

        for r_def in default_rules:
            stmt = select(DetectionRule).where(DetectionRule.rule_id == r_def["rule_id"])
            existing = (await self.db.execute(stmt)).scalar_one_or_none()
            if not existing:
                new_rule = DetectionRule(
                    rule_id=r_def["rule_id"],
                    name=r_def["name"],
                    version="1.0.0",
                    description=r_def["description"],
                    lifecycle_status="ACTIVE",
                    event_types=r_def["event_types"],
                    conditions=r_def["conditions"],
                    severity=r_def["severity"],
                    confidence=r_def["confidence"],
                    created_by="SYSTEM",
                    created_at=datetime.now(timezone.utc),
                )
                self.db.add(new_rule)
        await self.db.commit()
