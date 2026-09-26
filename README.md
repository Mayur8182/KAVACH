# SecureAI Control Plane

> **A deterministic security guard and runtime control plane for AI coding agents and engineering workflows.**

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.13%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-005571.svg)](https://fastapi.tiangolo.com)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://www.docker.com/)

---

## Architectural Golden Rule
> **"LLM proposes. Deterministic security systems decide. Runtime evidence proves."**

The platform sits directly between developers/AI agents and execution tools, serving as an authoritative security control plane:
- **Intent Engine:** Extracts structured technical architecture from user intent.
- **Security Blueprint Engine:** Derives required controls dynamically from stack/architecture.
- **Security Scanners:** Orchestrates Semgrep, Gitleaks, OSV, Trivy, and Checkov.
- **Policy Engine (OPA):** Makes deterministic `ALLOW` / `BLOCK` decisions via Rego policies.
- **AI Remediation:** Proposes verified patches with re-scanning and test execution.
- **MCP Security Gateway:** Wraps MCP tool calls with identity, risk, and policy validation.

---

## Repository Structure

```text
security-platform/
│
├── backend/                  # FastAPI async control plane service
│   ├── app/
│   │   ├── api/v1/           # Versioned API routes (health, projects, scans, policies)
│   │   ├── core/             # Centralized config, database, logging, exceptions
│   │   ├── engines/          # Security control engines (intent, blueprint, scanner, policy)
│   │   ├── models/           # SQLAlchemy 2.x persistence models
│   │   ├── schemas/          # Pydantic data validation schemas
│   │   ├── services/         # Business domain services
│   │   └── repositories/     # Data access layer
│   ├── alembic/              # Database migration versions
│   ├── Dockerfile            # Production-conscious backend container
│   └── requirements.txt      # Python dependencies
│
├── frontend/                 # React + TypeScript management console
│   ├── src/
│   │   ├── api/              # Centralized API client abstraction
│   │   ├── components/       # UI components with error, loading, and real empty states
│   │   └── styles/           # Modern design tokens and CSS
│
├── mcp/                      # Model Context Protocol architecture
│   ├── client/               # MCP client connecting to external tool servers
│   ├── gateway/              # Security gateway proxy with authorization gates
│   └── servers/              # Controlled internal security tool providers
│
├── scanners/                 # Scanners integration layer
│   ├── semgrep/              # SAST orchestration
│   ├── gitleaks/             # Secret detection orchestration
│   ├── osv/                  # Vulnerability database scanning
│   ├── trivy/                # Container vulnerability scanning
│   └── checkov/              # IaC security scanner
│
├── policies/                 # Policy-as-code
│   └── opa/                  # Open Policy Agent Rego policies & tests
│
├── runtime/                  # Runtime observability & evidence
│   ├── collector/            # OpenTelemetry ingestion
│   ├── evidence/             # Cryptographic audit logs & event traces
│   └── verifier/             # Contract invariant verifier
│
├── docker-compose.yml        # Multi-service development environment
└── .env.example              # Environment variables template
```

---

## Getting Started

### Prerequisites
- Python 3.13+
- Node.js 20+
- Docker & Docker Compose

### 1. Configure Environment
```bash
cp .env.example .env
```

### 2. Run with Docker Compose
```bash
docker compose up --build
```

The services will be accessible at:
- **Backend API:** `http://localhost:8000`
- **Swagger Documentation:** `http://localhost:8000/docs`
- **Frontend Dashboard:** `http://localhost:5173`
- **Health Check (Live):** `http://localhost:8000/api/v1/health/live`
- **Health Check (Ready):** `http://localhost:8000/api/v1/health/ready`
