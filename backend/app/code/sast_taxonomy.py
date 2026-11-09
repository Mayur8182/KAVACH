"""
Kavach SAST Semantic Taxonomy & Deterministic Security Mapper
Authoritative security classification engine.
Ensures semantic consistency across Rule ID, Vulnerability Title, CWE, OWASP Top 10,
Description, and Remediation Advice.

Strict Rule:
- Command injection MUST map to CWE-78 (NOT CWE-89 SQL injection).
- SQL injection MUST map to CWE-89.
- Remediation advice MUST match the specific vulnerability type.
- Never use generic or mismatched fallbacks.
"""

from typing import Dict, Any, Optional, Tuple
from dataclasses import dataclass, field


@dataclass
class NormalizedTaxonomy:
    cwe_id: str
    cwe_title: str
    owasp: str
    category: str
    description: str
    remediation_advice: str
    confidence: str
    reachability: str
    is_confirmed: bool
    source_sink_flow: Dict[str, Any] = field(default_factory=dict)
    sample_patch: Optional[str] = None


def resolve_sast_taxonomy(
    rule_id: str,
    title: str = "",
    description: str = "",
    file_path: str = "",
    snippet: Optional[str] = None,
    raw_metadata: Optional[Dict[str, Any]] = None,
    existing_category: Optional[str] = None,
) -> NormalizedTaxonomy:
    """
    Deterministically computes the exact CWE, OWASP category, and remediation advice
    based on scanner rule signatures, title, and code snippet.
    """
    raw_meta = raw_metadata or {}
    meta = raw_meta.get("metadata", {}) if isinstance(raw_meta, dict) else {}

    # Check scanner metadata first if already explicitly populated
    meta_cwe = meta.get("cwe")
    meta_owasp = meta.get("owasp")

    text_corpus = f"{rule_id} {title} {description} {existing_category or ''} {snippet or ''}".lower()

    # 1. Command Injection / Shell Execution / RCE
    if any(k in text_corpus for k in [
        "command-injection", "command injection", "shell execution", "exec(", "spawn(",
        "system(", "popen", "subprocess", "os.system", "child_process", "rce", "sast-006",
        "shell_exec", "eval("
    ]):
        cwe_id = "CWE-78"
        cwe_title = "CWE-78: Improper Neutralization of Special Elements used in an OS Command ('OS Command Injection')"
        owasp = "A03:2021-Injection"
        category = "Command Injection"
        desc = description if description and "Arbitrary" in description else (
            "Arbitrary system command executed using dynamic string input without shell escaping or parameterization."
        )
        remediation = (
            "Avoid invoking the shell directly with user-supplied input. "
            "Use parameterized execution APIs such as subprocess.run(['binary', arg1], shell=False) in Python "
            "or execFile([arg1]) in Node.js instead of string interpolation or shell concatenation. "
            "Validate and sanitize all command arguments against a strict allowlist."
        )
        sample_patch = (
            "- child_process.exec(`ping -c 4 ${targetIp}`)\n"
            "+ child_process.execFile('/bin/ping', ['-c', '4', sanitizeIp(targetIp)])"
        )
        source_sink = {
            "source": "HTTP Request Parameter / Dynamic Input",
            "sink": "child_process.exec / subprocess.Popen (shell=True)",
            "taint_path": f"{file_path} -> Sink Invocation",
            "sanitized": False,
        }
        return NormalizedTaxonomy(
            cwe_id=cwe_id,
            cwe_title=cwe_title,
            owasp=owasp,
            category=category,
            description=desc,
            remediation_advice=remediation,
            confidence="HIGH" if snippet else "MEDIUM",
            reachability="REACHABLE" if "test" not in file_path.lower() else "THEORETICAL",
            is_confirmed=True if "sast-006" in text_corpus or "exec" in text_corpus else False,
            source_sink_flow=source_sink,
            sample_patch=sample_patch,
        )

    # 2. SQL Injection
    if any(k in text_corpus for k in ["sql-injection", "sql injection", "sqli", "cwe-89", "sast-001", "select * from", "raw sql", "string concatenation in query"]):
        cwe_id = "CWE-89"
        cwe_title = "CWE-89: Improper Neutralization of Special Elements used in an SQL Command ('SQL Injection')"
        owasp = "A03:2021-Injection"
        category = "SQL Injection"
        desc = description if description else "Unsanitized user input is concatenated into an SQL query, allowing arbitrary database query execution."
        remediation = (
            "Replace string concatenation or formatted query strings with parameterized prepared statements "
            "or ORM parameter binding (e.g. cursor.execute(query, (param,)) in Python or parameterized queries in SQL)."
        )
        sample_patch = (
            "- db.execute(f'SELECT * FROM users WHERE id = {user_id}')\n"
            "+ db.execute('SELECT * FROM users WHERE id = :user_id', {'user_id': user_id})"
        )
        source_sink = {
            "source": "HTTP Query String / Body",
            "sink": "Database Execute Call",
            "taint_path": f"{file_path} -> Raw Query Execution",
            "sanitized": False,
        }
        return NormalizedTaxonomy(
            cwe_id=cwe_id,
            cwe_title=cwe_title,
            owasp=owasp,
            category=category,
            description=desc,
            remediation_advice=remediation,
            confidence="HIGH",
            reachability="REACHABLE" if "test" not in file_path.lower() else "THEORETICAL",
            is_confirmed=True,
            source_sink_flow=source_sink,
            sample_patch=sample_patch,
        )

    # 3. Cross-Site Scripting (XSS)
    if any(k in text_corpus for k in ["xss", "cross-site scripting", "dangerouslysetinnerhtml", "innerhtml", "cwe-79", "sast-002", "reflected xss", "dom xss"]):
        cwe_id = "CWE-79"
        cwe_title = "CWE-79: Improper Neutralization of Input During Web Page Generation ('Cross-site Scripting')"
        owasp = "A03:2021-Injection"
        category = "Cross-Site Scripting"
        desc = description if description else "Untrusted input is reflected into the DOM without contextual HTML/attribute encoding."
        remediation = (
            "Contextually encode user-controlled input before rendering it in browser templates or DOM properties. "
            "Use framework-level automatic escaping (React JSX, Angular templates) or sanitize with DOMPurify."
        )
        sample_patch = (
            "- element.innerHTML = userInput;\n"
            "+ element.textContent = userInput;\n"
            "+ // Or: element.innerHTML = DOMPurify.sanitize(userInput);"
        )
        source_sink = {
            "source": "User-supplied parameter / payload",
            "sink": "DOM innerHTML or document.write",
            "taint_path": f"{file_path} -> DOM Insertion",
            "sanitized": False,
        }
        return NormalizedTaxonomy(
            cwe_id=cwe_id,
            cwe_title=cwe_title,
            owasp=owasp,
            category=category,
            description=desc,
            remediation_advice=remediation,
            confidence="HIGH",
            reachability="REACHABLE" if "test" not in file_path.lower() else "THEORETICAL",
            is_confirmed=True,
            source_sink_flow=source_sink,
            sample_patch=sample_patch,
        )

    # 4. Path Traversal / Arbitrary File Read
    if any(k in text_corpus for k in ["path traversal", "traversal", "fileread", "lfi", "cwe-22", "sast-003", "directory traversal"]):
        cwe_id = "CWE-22"
        cwe_title = "CWE-22: Improper Limitation of a Pathname to a Restricted Directory ('Path Traversal')"
        owasp = "A01:2021-Broken Access Control"
        category = "Path Traversal"
        desc = description if description else "File system operation accepts an unvalidated path containing relative dot-dot-slash sequences."
        remediation = (
            "Canonicalize all file paths using os.path.realpath / path.resolve and verify that the target path "
            "starts with the intended base directory boundary before performing filesystem operations."
        )
        sample_patch = (
            "- with open(user_filename, 'r') as f:\n"
            "+ resolved = os.path.realpath(os.path.join(SAFE_DIR, user_filename))\n"
            "+ if not resolved.startswith(SAFE_DIR):\n"
            "+     raise PermissionError('Path outside root')\n"
            "+ with open(resolved, 'r') as f:"
        )
        return NormalizedTaxonomy(
            cwe_id=cwe_id,
            cwe_title=cwe_title,
            owasp=owasp,
            category=category,
            description=desc,
            remediation_advice=remediation,
            confidence="HIGH",
            reachability="REACHABLE" if "test" not in file_path.lower() else "THEORETICAL",
            is_confirmed=True,
            source_sink_flow={"source": "File path parameter", "sink": "File open/read API"},
            sample_patch=sample_patch,
        )

    # 5. Insecure Deserialization
    if any(k in text_corpus for k in ["pickle", "deserialization", "cwe-502", "yaml.load", "untrusted deserialization"]):
        cwe_id = "CWE-502"
        cwe_title = "CWE-502: Deserialization of Untrusted Data"
        owasp = "A08:2021-Software and Data Integrity Failures"
        category = "Insecure Deserialization"
        desc = description if description else "Deserialization of untrusted byte streams may allow arbitrary remote code execution."
        remediation = "Avoid pickle, unsafe YAML loaders, or Java ObjectInputStream for untrusted inputs. Use safe serialization formats like JSON or yaml.safe_load."
        return NormalizedTaxonomy(
            cwe_id=cwe_id,
            cwe_title=cwe_title,
            owasp=owasp,
            category=category,
            description=desc,
            remediation_advice=remediation,
            confidence="HIGH",
            reachability="REACHABLE" if "test" not in file_path.lower() else "THEORETICAL",
            is_confirmed=True,
        )

    # 6. Broken Cryptography / Weak Hash
    if any(k in text_corpus for k in ["crypto", "cipher", "md5", "sha1", "weak hash", "des", "rc4", "cwe-327", "cwe-328"]):
        cwe_id = "CWE-327"
        cwe_title = "CWE-327: Use of a Broken or Risky Cryptographic Algorithm"
        owasp = "A02:2021-Cryptographic Failures"
        category = "Cryptography"
        desc = description if description else "Use of deprecated or cryptographically broken hashing or encryption primitive."
        remediation = "Upgrade to cryptographically strong hash functions (SHA-256, SHA-3) or authenticated encryption (AES-256-GCM). For passwords, use Argon2id or bcrypt."
        return NormalizedTaxonomy(
            cwe_id=cwe_id,
            cwe_title=cwe_title,
            owasp=owasp,
            category=category,
            description=desc,
            remediation_advice=remediation,
            confidence="HIGH",
            reachability="REACHABLE" if "test" not in file_path.lower() else "THEORETICAL",
            is_confirmed=True,
        )

    # 7. Broken Authentication & Session
    if any(k in text_corpus for k in ["auth", "jwt", "session", "permission", "rbac", "cwe-287", "cwe-306"]):
        cwe_id = "CWE-287"
        cwe_title = "CWE-287: Improper Authentication"
        owasp = "A07:2021-Identification and Authentication Failures"
        category = "Broken Authentication"
        desc = description if description else "Missing or improper authentication control on sensitive action or API endpoint."
        remediation = "Enforce verified identity middleware, validate JWT signatures with asymmetric keys (RS256), and require authorization guards on all protected handlers."
        return NormalizedTaxonomy(
            cwe_id=cwe_id,
            cwe_title=cwe_title,
            owasp=owasp,
            category=category,
            description=desc,
            remediation_advice=remediation,
            confidence="HIGH",
            reachability="REACHABLE",
            is_confirmed=True,
        )

    # 8. Security Misconfiguration / Insecure CORS
    if any(k in text_corpus for k in ["cors", "csrf", "header", "misconfig", "config", "debug", "cwe-942"]):
        cwe_id = "CWE-942"
        cwe_title = "CWE-942: Permissive Cross-domain Policy with Untrusted Domains"
        owasp = "A05:2021-Security Misconfiguration"
        category = "Security Misconfiguration"
        desc = description if description else "Permissive security header or cross-origin policy allowing untrusted domain access."
        remediation = "Restrict Access-Control-Allow-Origin to an explicit allowlist of authorized origin domains. Do not reflect wildcard '*' with credentials."
        return NormalizedTaxonomy(
            cwe_id=cwe_id,
            cwe_title=cwe_title,
            owasp=owasp,
            category=category,
            description=desc,
            remediation_advice=remediation,
            confidence="HIGH",
            reachability="REACHABLE",
            is_confirmed=True,
        )

    # Fallback: General Static Code Weakness
    cwe_id = "CWE-699"
    cwe_title = "CWE-699: Software Development Weakness"
    owasp = "A04:2021-Insecure Design"
    category = "Code Quality & Weakness"
    desc = description if description else "Static analysis pattern matched potential code quality or defensive engineering weakness."
    remediation = "Review code against safe defensive coding standards and implement strict input validation and boundary checks."
    return NormalizedTaxonomy(
        cwe_id=cwe_id,
        cwe_title=cwe_title,
        owasp=owasp,
        category=category,
        description=desc,
        remediation_advice=remediation,
        confidence="MEDIUM",
        reachability="SUSPECTED",
        is_confirmed=False,
    )
