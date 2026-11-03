# 12. Security and Trust Boundaries

This section defines the security perimeter, isolation models, credential protections, and trust boundaries enforced across SecuLayer / Thing.

## Architectural Golden Rule & Enforcement Boundaries

> **"LLM proposes. Deterministic security systems decide. Runtime evidence proves."**

```
+----------------------------------------------------------------------------------------------------+
|                                    TRUST BOUNDARY ARCHITECTURE                                     |
+--------------------------+----------------------------+--------------------------------------------+
| BOUNDARY LEVEL           | ENFORCING MECHANISM        | EVIDENCE & FAILURE BEHAVIOR                |
+--------------------------+----------------------------+--------------------------------------------+
| 1. Client & Browser      | HTTPS / TLS 1.3, HttpOnly  | Session tokens strictly non-accessible to  |
|    Boundary              | Secure Cookies, CSRF Guard | frontend JavaScript (Rule 7)               |
|                          |                            |                                            |
| 2. API Gateway           | Starlette Middleware, CORS,| 401 Unauthorized on invalid/expired JWT,   |
|    Perimeter             | Rate Limiter, JWT Decoders | 403 Forbidden on missing tenant membership |
|                          |                            |                                            |
| 3. Multi-Tenant          | Organization ID & Project  | SQL queries automatically scoped by        |
|    Isolation             | ID scoping on all queries  | tenant context; cross-tenant query = 404   |
|                          |                            |                                            |
| 4. Policy Authority      | Open Policy Agent (OPA) &  | Non-bypassable: LLM proposals are rejected |
|    (Deterministic)       | Hardcoded Security Rules   | if OPA produces DENY or BLOCK (Rule 14)    |
|                          |                            |                                            |
| 5. Scanner Execution     | Subprocess Sandbox with    | Process killed on timeout/out-of-memory;   |
|    Sandbox               | timeout, unprivileged user | host filesystem write-protected            |
|                          |                            |                                            |
| 6. External AI Egress    | Schema Sanitizer & Secret  | API keys & passwords redacted via regex;   |
|    Boundary              | Masking Filter             | zero plaintext credentials sent to LLMs    |
|                          |                            |                                            |
| 7. Cloud Provider        | AWS STS / Azure Managed    | Zero raw access keys stored in DB; only    |
|    Credential Vault      | Identity / Workload Ident  | cloud resource ARNs and references stored  |
+--------------------------+----------------------------+--------------------------------------------+
```

## Secret & Credential Protections (Rule 35)
1. **Cloud Credentials:** Plaintext AWS secret access keys, Azure client secrets, and GCP service account keys are never stored in the database. Only external credential references, IAM Role ARNs, and KMS references are held in `cloud_connections`.
2. **Scanner API Keys:** Scanning CLI binaries run locally on host or within container without requiring customer tokens.
3. **Database Security:** PostgreSQL runs in a private Docker network or VPC subnet without public ingress exposure.

## Standalone Visual Diagram

Open [trust-boundaries.html](file:///c:/Users/USER/Desktop/YC%20THING/docs/architecture/12-security-trust-boundaries/trust-boundaries.html) in any browser to view the interactive SVG diagram.
