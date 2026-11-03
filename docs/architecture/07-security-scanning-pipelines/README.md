# 07 — Security Scanning Pipelines & Engines

## Overview

In strict compliance with **Production Engineering Rule #8 ("Real security tools must actually run")**, SecuLayer does not mock or synthesize scan outputs. Scans execute real CLI engines inside ephemeral scratch workspaces, capturing structured JSON diagnostics, raw tool outputs, and execution metrics.

---

## 1. Multi-Engine Orchestration Suite

```
                   [ REPOSITORY SOURCE CODE ]
                               │
       ┌───────────────────────┼───────────────────────┐
       ▼                       ▼                       ▼
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│ SEMGREP      │        │ GITLEAKS     │        │ TRIVY / OSV  │
│ Static Code  │        │ High-Entropy │        │ Open-Source  │
│ AST & SAST   │        │ Secret & Key │        │ Dependency & │
│ (OWASP/CWE)  │        │ Detector     │        │ SBOM (SPDX)  │
└──────┬───────┘        └──────┬───────┘        └──────┬───────┘
       │                       │                       │
       └───────────────────────┼───────────────────────┘
                               │
       ┌───────────────────────┴───────────────────────┐
       ▼                                               ▼
┌──────────────┐                                ┌──────────────┐
│ CHECKOV      │                                │ HOTSPOT REGEX│
│ IaC Security │                                │ Rule Review  │
│ (TF/K8s/ARM) │                                │ Human Triage │
└──────┬───────┘                                └──────┬───────┘
       │                                               │
       └───────────────────────┬───────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ NORMALIZATION & DEDUPLICATION PIPELINE                       │
│ - Hash Key: SHA256(repository_id, rule_id, file, line_start) │
│ - Ingest into `security_findings` and `hotspots` tables      │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ OPA REGULATORY POLICY EVALUATION & QUALITY GATES             │
│ - Pass/Fail PR Gate via GitHub Check Runs API                │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Findings Lifecycle State Machine

```
      [ SCAN RUN ]
           │
           ▼
        [ OPEN ] ──────────────────────┐
           │                           │
           ▼                           ▼
     [ IN REVIEW ]              [ FALSE POSITIVE ]
           │
     ┌─────┴─────────────────────┐
     ▼                           ▼
[ AUTOFIXED (AI) ]       [ MANUALLY RESOLVED ]
     │                           │
     ▼                           ▼
[ RESCAN VERIFY ]        [ RESCAN VERIFY ]
     │                           │
     └─────────────┬─────────────┘
                   ▼
              [ CLOSED ]
```

---

## Interactive Diagram
Open [`security-scanning-pipelines.html`](./security-scanning-pipelines.html) in your browser for the full interactive diagram with inline SVG and editable Mermaid code.
