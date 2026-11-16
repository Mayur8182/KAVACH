"""
Kavach Model Security — Model Configuration Security Analyzer (Advanced Deep Engine)
Inspects model configuration files (config.json, generation_config.json,
tokenizer_config.json, serving manifests, Dockerfiles, and runtime configs) for:
- Unsafe loading flags (trust_remote_code, auto_map, weights_only=False)
- Insecure model serving parameters (wildcard CORS, disabled authentication)
- Resource exhaustion configurations (unbounded max_new_tokens)
- Exposed credentials (AWS, OpenAI, Hugging Face, Bearer tokens)
- Insecure plugins and extensions (torchscript_extensions, custom_layers)
- Environment variable secret leakage
"""

import json
import logging
import os
import re
from typing import Any, Dict, List, Optional

logger = logging.getLogger("kavach.model_security.config_analyzer")

# Regex patterns for exposed credentials
SECRET_PATTERNS = [
    (r"hf_[a-zA-Z0-9]{34}", "Hugging Face Access Token", "CWE-798"),
    (r"sk-[a-zA-Z0-9]{32,}", "OpenAI API Secret Key", "CWE-798"),
    (r"sk-proj-[a-zA-Z0-9_\-]{40,}", "OpenAI Project API Key", "CWE-798"),
    (r"AKIA[0-9A-Z]{16}", "AWS Access Key ID", "CWE-798"),
    (r"(?i)bearer\s+[a-zA-Z0-9_\-\.]{25,}", "Exposed Bearer Token", "CWE-522"),
    (r"ghp_[a-zA-Z0-9]{36}", "GitHub Personal Access Token", "CWE-798"),
]


class ConfigurationSecurityAnalyzer:
    """
    Analyzes configuration files associated with machine learning models.
    """

    def analyze_config(self, file_path: str, content: Optional[str] = None) -> List[Dict[str, Any]]:
        findings: List[Dict[str, Any]] = []
        fname = os.path.basename(file_path).lower()

        text = ""
        if content:
            text = content
        elif os.path.exists(file_path):
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as fh:
                    text = fh.read()
            except Exception as exc:
                logger.error(f"Cannot read config file {file_path}: {exc}")
                return findings

        # 1. Secret Scanning across any config file
        secret_findings = self._scan_secrets(file_path, text)
        findings.extend(secret_findings)

        # 2. JSON Configuration inspection (config.json, generation_config.json, serving.json)
        if fname.endswith(".json"):
            try:
                cfg = json.loads(text)
                if isinstance(cfg, dict):
                    # Check for trust_remote_code & auto_map
                    if cfg.get("trust_remote_code") is True or cfg.get("auto_map") is not None:
                        findings.append({
                            "rule_id": "KAVACH-CFG-TRUST-REMOTE-CODE",
                            "title": "Unsafe Loading Configuration: trust_remote_code / auto_map Enabled",
                            "description": (
                                "The configuration enables 'trust_remote_code' or specifies 'auto_map' custom code. "
                                "Loading this model via Hugging Face Transformers will execute arbitrary Python code "
                                "from the model repository without warning."
                            ),
                            "severity": "HIGH",
                            "category": "CONFIGURATION",
                            "cwe_id": "CWE-94",
                            "owasp_category": "ML06:2023 - ML Supply Chain Vulnerabilities",
                            "affected_file": file_path,
                            "evidence": {
                                "trust_remote_code": cfg.get("trust_remote_code"),
                                "auto_map": cfg.get("auto_map"),
                            },
                            "remediation_guidance": "Disable trust_remote_code and use standard Hugging Face Transformers architectures.",
                            "fix_available": True,
                        })

                    # Check for torch loading parameters: weights_only=False
                    if cfg.get("weights_only") is False:
                        findings.append({
                            "rule_id": "KAVACH-CFG-WEIGHTS-ONLY-DISABLED",
                            "title": "Unsafe Loading Flag: weights_only=False",
                            "description": "Explicitly disables weights_only loading, permitting pickle execution during deserialization.",
                            "severity": "HIGH",
                            "category": "CONFIGURATION",
                            "cwe_id": "CWE-502",
                            "affected_file": file_path,
                            "evidence": {"weights_only": False},
                            "remediation_guidance": "Enforce weights_only=True in model loading configurations.",
                            "fix_available": True,
                        })

                    # Check for allow_pickle: true
                    if cfg.get("allow_pickle") is True:
                        findings.append({
                            "rule_id": "KAVACH-CFG-ALLOW-PICKLE-ENABLED",
                            "title": "Insecure Deserialization Flag: allow_pickle=True",
                            "description": "Configuration permits pickle deserialization of input tensors.",
                            "severity": "HIGH",
                            "category": "CONFIGURATION",
                            "cwe_id": "CWE-502",
                            "affected_file": file_path,
                            "evidence": {"allow_pickle": True},
                            "remediation_guidance": "Set allow_pickle=False and load tensors safely.",
                            "fix_available": True,
                        })

                    # Check for resource exhaustion in generation_config
                    if fname == "generation_config.json" or "max_new_tokens" in cfg:
                        max_tokens = cfg.get("max_new_tokens") or cfg.get("max_length")
                        if isinstance(max_tokens, int) and max_tokens > 64000:
                            findings.append({
                                "rule_id": "KAVACH-CFG-UNBOUNDED-GENERATION",
                                "title": "Resource Exhaustion Risk: Unbounded max_new_tokens",
                                "description": f"Configuration allows generation up to {max_tokens} tokens, risking memory exhaustion and DoS.",
                                "severity": "MEDIUM",
                                "category": "CONFIGURATION",
                                "cwe_id": "CWE-400",
                                "affected_file": file_path,
                                "evidence": {"max_tokens": max_tokens},
                                "remediation_guidance": "Limit max_new_tokens to reasonable bound (e.g. 4096 or 8192).",
                                "fix_available": True,
                            })

                    # Insecure serving parameters: Wildcard CORS
                    cors = cfg.get("cors_allowed_origins") or cfg.get("cors_origins")
                    if cors == "*" or (isinstance(cors, list) and "*" in cors):
                        findings.append({
                            "rule_id": "KAVACH-CFG-CORS-WILDCARD",
                            "title": "Insecure Model Serving: Wildcard CORS Allowed Origins",
                            "description": "Serving configuration sets cors_allowed_origins to '*', allowing cross-origin requests from any website.",
                            "severity": "MEDIUM",
                            "category": "CONFIGURATION",
                            "cwe_id": "CWE-942",
                            "affected_file": file_path,
                            "evidence": {"cors": cors},
                            "remediation_guidance": "Restrict CORS origins to specific trusted corporate domains.",
                            "fix_available": True,
                        })

                    # Insecure serving parameters: Authentication disabled
                    if cfg.get("disable_auth") is True or cfg.get("unauthenticated") is True:
                        findings.append({
                            "rule_id": "KAVACH-CFG-AUTH-DISABLED",
                            "title": "Insecure Serving Configuration: Authentication Explicitly Disabled",
                            "description": "Serving configuration explicitly disables authentication for model inference endpoints.",
                            "severity": "CRITICAL",
                            "category": "CONFIGURATION",
                            "cwe_id": "CWE-306",
                            "affected_file": file_path,
                            "evidence": {"disable_auth": True},
                            "remediation_guidance": "Enforce Bearer token or API key authentication.",
                            "fix_available": True,
                        })

                    # Insecure plugins & extensions
                    extensions = cfg.get("torchscript_extensions") or cfg.get("custom_layers") or cfg.get("plugins")
                    if extensions:
                        findings.append({
                            "rule_id": "KAVACH-CFG-CUSTOM-EXTENSIONS",
                            "title": "Untrusted Custom Extensions or Plugins Configured",
                            "description": f"Model configuration registers custom extensions/plugins: {extensions}",
                            "severity": "HIGH",
                            "category": "CONFIGURATION",
                            "cwe_id": "CWE-94",
                            "affected_file": file_path,
                            "evidence": {"extensions": extensions},
                            "remediation_guidance": "Review and approve custom extensions before deploying model.",
                            "fix_available": False,
                        })

                    # Environment variable secret leakage in config
                    env_dict = cfg.get("env") or cfg.get("environment")
                    if isinstance(env_dict, dict):
                        for env_k, env_v in env_dict.items():
                            if any(sec in env_k.upper() for sec in ("SECRET", "TOKEN", "KEY", "PASSWORD")):
                                findings.append({
                                    "rule_id": "KAVACH-CFG-ENV-SECRET-LEAK",
                                    "title": f"Secret Exposed in Configuration Environment: {env_k}",
                                    "description": f"Configuration contains plain-text secret in environment variable '{env_k}'.",
                                    "severity": "HIGH",
                                    "category": "CONFIGURATION",
                                    "cwe_id": "CWE-798",
                                    "affected_file": file_path,
                                    "evidence": {"env_var": env_k},
                                    "remediation_guidance": "Use a secrets manager (e.g. AWS Secrets Manager or Vault) instead of hardcoding.",
                                    "fix_available": True,
                                })

            except Exception as exc:
                logger.warning(f"Error parsing JSON in {file_path}: {exc}")

        return findings

    def _scan_secrets(self, file_path: str, text: str) -> List[Dict[str, Any]]:
        findings = []
        for pattern, secret_type, cwe in SECRET_PATTERNS:
            matches = re.findall(pattern, text)
            if matches:
                # Mask secret value in evidence
                masked = [m[:6] + "..." + m[-4:] if len(m) > 10 else "***" for m in matches]
                findings.append({
                    "rule_id": f"KAVACH-SECRET-{secret_type.replace(' ', '-').upper()}",
                    "title": f"Hardcoded Secret Detected in Model Configuration: {secret_type}",
                    "description": (
                        f"Found {len(matches)} instance(s) of {secret_type} hardcoded in {os.path.basename(file_path)}. "
                        "Hardcoded secrets allow unauthorized access to AI infrastructure and third-party APIs."
                    ),
                    "severity": "CRITICAL",
                    "category": "CONFIGURATION",
                    "cwe_id": cwe,
                    "owasp_category": "ML06:2023 - ML Supply Chain Vulnerabilities",
                    "affected_file": file_path,
                    "evidence": {
                        "secret_type": secret_type,
                        "matches_found": len(matches),
                        "masked_samples": masked[:3],
                    },
                    "remediation_guidance": "Revoke the exposed credential immediately and replace with environment secret references.",
                    "fix_available": True,
                })
        return findings
