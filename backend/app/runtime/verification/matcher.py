"""
Contract Matching Engine.
Efficiently filters candidate active security contracts for an incoming runtime evidence record
based on project, environment, scope, subject, action, and required evidence types.
Ensures we do not evaluate every contract against every unrelated event.
"""

from typing import List, Optional
from app.contracts.models import SecurityContractVersion
from app.runtime.models import RuntimeEvidence


class ContractMatcher:
    """
    Determines which active SecurityContractVersions are applicable to a given RuntimeEvidence event.
    """

    @classmethod
    def matches_contract(
        cls,
        contract_version: SecurityContractVersion,
        evidence: RuntimeEvidence,
    ) -> bool:
        """
        Returns True if contract_version is applicable to the given evidence event.
        """
        # 1. Project boundary check - must match project or contract must be GLOBAL
        # (Security contracts are scoped to their project or system)
        if contract_version.contract and contract_version.contract.project_id:
            if contract_version.contract.project_id != evidence.project_id:
                return False

        # 2. Check scopes
        scopes = contract_version.scopes or []
        if scopes:
            scope_matched = False
            for s in scopes:
                stype = (s.scope_type or "").upper()
                sid = s.scope_id
                senv = s.environment

                # Check environment match if specified in scope
                if senv and evidence.environment and senv.lower() != evidence.environment.lower():
                    continue

                if stype in ("GLOBAL", "PROJECT"):
                    scope_matched = True
                    break

                if stype == "AGENT" and evidence.subject_type == "AGENT":
                    if not sid or sid == evidence.subject_id:
                        scope_matched = True
                        break

                if stype in ("SERVICE", "API") and evidence.subject_type in ("SERVICE", "APPLICATION", "API"):
                    if not sid or sid == evidence.subject_id:
                        scope_matched = True
                        break

                if stype == "ENVIRONMENT":
                    if not sid or (evidence.environment and sid.lower() == evidence.environment.lower()):
                        scope_matched = True
                        break

                if stype == "RESOURCE":
                    if not sid or sid == evidence.resource_id:
                        scope_matched = True
                        break

            if not scope_matched:
                return False

        # 3. Check Evidence Requirements if defined on contract
        reqs = contract_version.evidence_requirements or []
        if reqs:
            req_matched = False
            for req in reqs:
                # Compare evidence_type with evidence.event_type or source_type
                req_type = (req.evidence_type or "").upper()
                ev_type = (evidence.event_type or "").upper()
                ev_src = (evidence.source_type or "").upper()

                if req_type in (ev_type, ev_src):
                    req_matched = True
                    break
                # Partial/Prefix matches e.g. MCP matches MCP_TOOL_CALL
                if req_type in ev_type or ev_type in req_type:
                    req_matched = True
                    break
            if not req_matched:
                return False

        return True

    @classmethod
    def filter_candidates(
        cls,
        active_versions: List[SecurityContractVersion],
        evidence: RuntimeEvidence,
    ) -> List[SecurityContractVersion]:
        """
        Filters a list of active contract versions to only those applicable to this evidence.
        """
        return [cv for cv in active_versions if cls.matches_contract(cv, evidence)]
