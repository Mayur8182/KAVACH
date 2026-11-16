"""
Kavach Model Security — Model Provenance & Supply Chain Identity Analyzer
Validates publisher authenticity, artifact hash verification, model cards,
license declarations, and cryptographic attestations.
"""

import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger("kavach.model_security.provenance_analyzer")


class ModelProvenanceAnalyzer:
    """
    Evaluates provenance, integrity, publisher identity, and model metadata completeness.
    """

    def analyze_provenance(self, model_metadata: Dict[str, Any], artifacts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        findings: List[Dict[str, Any]] = []

        model_id = model_metadata.get("model_id_str", "")
        author = model_metadata.get("author_name") or ""
        tags = model_metadata.get("tags", [])
        raw = model_metadata.get("raw_metadata", {})

        # 1. Check Missing Model Card (README.md)
        artifact_paths = [a.get("path", "").lower() for a in artifacts]
        has_readme = any("readme.md" in p or "model_card" in p for p in artifact_paths)

        if not has_readme and "bedrock/" not in model_id:
            findings.append({
                "rule_id": "KAVACH-PROV-MISSING-MODEL-CARD",
                "title": "Missing Model Card & Provenance Documentation",
                "description": (
                    "The model repository lacks a standard Model Card (README.md). Model cards are required by "
                    "NIST AI RMF and ISO/IEC 42001 to document intended use, training dataset provenance, and safety limitations."
                ),
                "severity": "LOW",
                "category": "PROVENANCE",
                "cwe_id": "CWE-1059",
                "owasp_category": "ML10:2023 - Shadow Models and Untrusted Deployments",
                "affected_file": "README.md",
                "evidence": {"model_id": model_id, "discovered_files": [a.get("path") for a in artifacts[:5]]},
                "remediation_guidance": "Add a comprehensive Model Card documenting training data, architecture, and intended usage.",
                "fix_available": True,
            })

        # 2. Check Missing License
        has_license = any("license" in p for p in artifact_paths) or any(t.startswith("license:") for t in tags)
        if not has_license and "bedrock/" not in model_id:
            findings.append({
                "rule_id": "KAVACH-PROV-MISSING-LICENSE",
                "title": "Unspecified Model License & Intellectual Property Ambiguity",
                "description": "No license file or metadata tag found. Using models with unverified licenses introduces legal liability.",
                "severity": "LOW",
                "category": "PROVENANCE",
                "cwe_id": "CWE-1188",
                "affected_file": "LICENSE",
                "evidence": {"tags": tags},
                "remediation_guidance": "Specify an open source or commercial license (e.g. Apache-2.0, MIT, Llama 2 Community).",
                "fix_available": True,
            })

        # 3. Check for Untrusted Publisher / Shadow Model
        untrusted_names = ["anon", "anonymous", "test", "demo", "temp", "tmp", "unverified"]
        if any(un in author.lower() for un in untrusted_names) or author == "unknown":
            findings.append({
                "rule_id": "KAVACH-PROV-UNTRUSTED-PUBLISHER",
                "title": "Untrusted or Anonymous Model Publisher",
                "description": f"Model author '{author}' is unverified or marked as anonymous. Untrusted models have high risk of backdoors.",
                "severity": "MEDIUM",
                "category": "PROVENANCE",
                "cwe_id": "CWE-345",
                "owasp_category": "ML05:2023 - Model Backdoor",
                "affected_file": "metadata",
                "evidence": {"author": author, "model_id": model_id},
                "remediation_guidance": "Verify publisher cryptographic signatures and corporate domain ownership before deployment.",
                "fix_available": False,
            })

        # 4. Check Artifact Integrity Mismatches
        for art in artifacts:
            if art.get("integrity_status") == "MISMATCHED":
                findings.append({
                    "rule_id": "KAVACH-INTEGRITY-HASH-MISMATCH",
                    "title": "Cryptographic Hash Mismatch on Model Weights",
                    "description": f"The SHA-256 hash of artifact '{art.get('path')}' does not match the publisher's signed commit digest.",
                    "severity": "CRITICAL",
                    "category": "PROVENANCE",
                    "cwe_id": "CWE-353",
                    "owasp_category": "ML02:2023 - Data & Model Poisoning",
                    "affected_file": art.get("path"),
                    "evidence": {
                        "artifact": art.get("path"),
                        "calculated_hash": art.get("sha256"),
                    },
                    "remediation_guidance": "Quarantine artifact immediately. Re-download from authoritative source over verified TLS.",
                    "fix_available": False,
                })

        return findings

