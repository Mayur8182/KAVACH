import { DocPage } from '../data';

export const API_DOCS: Record<string, DocPage> = {
  'api-overview': {
    id: 'api-overview',
    path: '/docs/api',
    title: 'REST API v1 Overview',
    category: 'REST API V1 REFERENCE',
    categoryId: 'rest-api',
    badge: 'v1.0.0 Stable',
    readTime: '6 min read',
    description:
      'Programmatic REST API for managing projects, triggering security scans, querying findings, and orchestrating automated pull requests.',
    subsections: [
      {
        id: 'base-url',
        heading: '1. Base URL & Endpoints',
        content:
          'All API requests must be issued over HTTPS. In local development, the API server runs on port 8000 by default.',
        codeBlocks: [
          {
            title: 'Base API URLs',
            lang: 'text',
            code: `Production: https://api.kavachsecurity.me/api/v1
Local Development: http://localhost:8000/api/v1`,
          },
        ],
      },
      {
        id: 'response-format',
        heading: '2. Standard Response Format',
        content:
          'Responses are returned as standard JSON. Timestamps follow ISO 8601 UTC format. IDs are 128-bit RFC 4122 UUID v4 strings.',
        codeBlocks: [
          {
            title: 'Standard Success Response Envelope',
            lang: 'json',
            code: `{
  "success": true,
  "data": { ... },
  "metadata": {
    "request_id": "req_01h8a912b7cd8e9f",
    "timestamp": "2026-11-17T00:15:30.124Z"
  }
}`,
          },
        ],
      },
      {
        id: 'status-codes',
        heading: '3. HTTP Status Codes',
        content:
          '- 200 OK: Request succeeded.\n- 201 Created: Resource created.\n- 400 Bad Request: Invalid payload or validation error.\n- 401 Unauthorized: Missing or invalid Bearer token.\n- 403 Forbidden: Insufficient role permissions.\n- 404 Not Found: Target resource does not exist.\n- 429 Too Many Requests: Rate limit exceeded.\n- 500 Internal Error: Server execution failure.',
      },
    ],
  },

  'api-authentication': {
    id: 'api-authentication',
    path: '/docs/api/authentication',
    title: 'Authentication & Headers',
    category: 'REST API V1 REFERENCE',
    categoryId: 'rest-api',
    readTime: '5 min read',
    description:
      'Required HTTP headers, Bearer token authorization, and request tracing conventions for REST API clients.',
    subsections: [
      {
        id: 'auth-header',
        heading: '1. The Authorization Header',
        content:
          'Every request to private endpoints must include an Authorization header with a valid JWT or personal API token:',
        codeBlocks: [
          {
            title: 'Required Request Headers',
            lang: 'http',
            code: `GET /api/v1/projects HTTP/1.1
Host: localhost:8000
Authorization: Bearer YOUR_API_TOKEN
Content-Type: application/json
Accept: application/json
X-Request-ID: custom-trace-id-optional`,
          },
        ],
      },
      {
        id: 'rate-limiting-headers',
        heading: '2. Rate Limiting Headers',
        content:
          'API responses contain standard headers communicating current throttling thresholds:\n- `X-RateLimit-Limit`: Maximum permitted requests in current window.\n- `X-RateLimit-Remaining`: Available remaining requests.\n- `X-RateLimit-Reset`: Unix timestamp when the current window resets.',
      },
    ],
  },

  'api-projects': {
    id: 'api-projects',
    path: '/docs/api/projects',
    title: 'Projects & Workspaces API',
    category: 'REST API V1 REFERENCE',
    categoryId: 'rest-api',
    badge: 'Core Endpoints',
    readTime: '8 min read',
    description:
      'Create, retrieve, update, and manage engineering application projects and workspaces using Kavach REST APIs.',
    subsections: [
      {
        id: 'projects-overview',
        heading: 'Projects Endpoints Summary',
        content:
          'The Projects API allows security and DevOps engineers to manage workspaces, configure repository bindings, and set compliance blueprints programmatically.',
      },
    ],
    apiEndpoints: [
      {
        method: 'GET',
        path: '/api/v1/projects',
        summary: 'List all projects in your organization',
        permission: 'PROJECT_READ',
        authRequired: true,
        parameters: [
          { name: 'limit', in: 'query', type: 'integer', required: false, description: 'Number of records to return (1-500, default: 100)' },
          { name: 'offset', in: 'query', type: 'integer', required: false, description: 'Offset for pagination (default: 0)' },
        ],
        curlExample: `curl -X GET "http://localhost:8000/api/v1/projects?limit=10" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -H "Accept: application/json"`,
        responses: [
          {
            status: 200,
            description: 'List of projects successfully retrieved',
            example: `[
  {
    "id": "7f8b91a2-3c4d-5e6f-a7b8-c9d0e1f2a3b4",
    "name": "Payments Service",
    "description": "Core PCI-DSS compliant credit card processing API",
    "repository_url": "https://github.com/org/payments-service",
    "default_branch": "main",
    "created_at": "2026-10-15T09:20:00Z",
    "finding_count": 3
  }
]`,
          },
        ],
      },
      {
        method: 'POST',
        path: '/api/v1/projects',
        summary: 'Create and persist a new project',
        permission: 'PROJECT_WRITE',
        authRequired: true,
        requestBody: {
          contentType: 'application/json',
          schema: '{"name": "string", "description": "string", "repository_url": "string", "default_branch": "string"}',
          example: `{\n  "name": "Auth Microservice",\n  "description": "User authentication and JWT token issuance",\n  "repository_url": "https://github.com/org/auth-service",\n  "default_branch": "main"\n}`,
        },
        curlExample: `curl -X POST "http://localhost:8000/api/v1/projects" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Auth Microservice", "repository_url": "https://github.com/org/auth-service"}'`,
        responses: [
          {
            status: 201,
            description: 'Project created successfully in PostgreSQL',
            example: `{\n  "id": "b3f18a22-98e1-45bc-8a9d-123456789abc",\n  "name": "Auth Microservice",\n  "status": "ACTIVE",\n  "created_at": "2026-11-17T00:20:00Z"\n}`,
          },
        ],
      },
      {
        method: 'GET',
        path: '/api/v1/projects/{project_id}',
        summary: 'Retrieve project details by ID',
        permission: 'PROJECT_READ',
        authRequired: true,
        parameters: [
          { name: 'project_id', in: 'path', type: 'UUID', required: true, description: 'Unique identifier of the project' },
        ],
        curlExample: `curl -X GET "http://localhost:8000/api/v1/projects/7f8b91a2-3c4d-5e6f-a7b8-c9d0e1f2a3b4" \\
  -H "Authorization: Bearer YOUR_API_TOKEN"`,
        responses: [
          {
            status: 200,
            description: 'Project details retrieved',
            example: `{\n  "id": "7f8b91a2-3c4d-5e6f-a7b8-c9d0e1f2a3b4",\n  "name": "Payments Service",\n  "status": "ACTIVE",\n  "finding_count": 3\n}`,
          },
        ],
      },
      {
        method: 'PATCH',
        path: '/api/v1/projects/{project_id}',
        summary: 'Update project configuration',
        permission: 'PROJECT_WRITE',
        authRequired: true,
        curlExample: `curl -X PATCH "http://localhost:8000/api/v1/projects/7f8b91a2-3c4d-5e6f-a7b8-c9d0e1f2a3b4" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"description": "Updated project description"}'`,
        responses: [
          {
            status: 200,
            description: 'Project updated',
            example: `{\n  "id": "7f8b91a2-3c4d-5e6f-a7b8-c9d0e1f2a3b4",\n  "updated_at": "2026-11-17T00:25:00Z"\n}`,
          },
        ],
      },
      {
        method: 'DELETE',
        path: '/api/v1/projects/{project_id}',
        summary: 'Delete project and related data',
        permission: 'PROJECT_DELETE',
        authRequired: true,
        curlExample: `curl -X DELETE "http://localhost:8000/api/v1/projects/7f8b91a2-3c4d-5e6f-a7b8-c9d0e1f2a3b4" \\
  -H "Authorization: Bearer YOUR_API_TOKEN"`,
        responses: [
          {
            status: 204,
            description: 'Project deleted successfully',
            example: ``,
          },
        ],
      },
    ],
  },

  'api-repositories': {
    id: 'api-repositories',
    path: '/docs/api/repositories',
    title: 'Repositories API',
    category: 'REST API V1 REFERENCE',
    categoryId: 'rest-api',
    readTime: '6 min read',
    description:
      'Manage GitHub and GitLab repository connections, branch configurations, and webhook bindings.',
    subsections: [
      {
        id: 'repositories-overview',
        heading: 'Repository Management Endpoints',
        content:
          'Connect private and public repositories to trigger automated scans upon push and pull request events.',
      },
    ],
    apiEndpoints: [
      {
        method: 'GET',
        path: '/api/v1/github/repositories',
        summary: 'List accessible GitHub repositories',
        permission: 'GITHUB_READ',
        authRequired: true,
        curlExample: `curl -X GET "http://localhost:8000/api/v1/github/repositories" \\
  -H "Authorization: Bearer YOUR_API_TOKEN"`,
        responses: [
          {
            status: 200,
            description: 'Accessible GitHub repositories listed',
            example: `[\n  {\n    "id": 12849102,\n    "full_name": "kavach/security-core",\n    "private": true,\n    "default_branch": "main"\n  }\n]`,
          },
        ],
      },
    ],
  },

  'api-scans': {
    id: 'api-scans',
    path: '/docs/api/scans',
    title: 'Scans & Vulnerability Findings API',
    category: 'REST API V1 REFERENCE',
    categoryId: 'rest-api',
    readTime: '8 min read',
    description:
      'Trigger multi-engine scans, query running scan progress, and inspect verified vulnerability findings.',
    subsections: [
      {
        id: 'scans-overview',
        heading: 'Scan Trigger & Status Lifecycle',
        content:
          'Scans transition through states: QUEUED → RUNNING → COMPLETED (or FAILED). Never fake scan completion; poll the status endpoint or subscribe to webhooks.',
      },
    ],
    apiEndpoints: [
      {
        method: 'POST',
        path: '/api/v1/scans/trigger',
        summary: 'Trigger a new multi-engine scan',
        permission: 'SCAN_TRIGGER',
        authRequired: true,
        requestBody: {
          contentType: 'application/json',
          schema: '{"project_id": "UUID", "target_path": "string", "branch": "string"}',
          example: `{\n  "project_id": "7f8b91a2-3c4d-5e6f-a7b8-c9d0e1f2a3b4",\n  "target_path": "./src",\n  "branch": "main"\n}`,
        },
        curlExample: `curl -X POST "http://localhost:8000/api/v1/scans/trigger" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"project_id": "7f8b91a2-3c4d-5e6f-a7b8-c9d0e1f2a3b4"}'`,
        responses: [
          {
            status: 201,
            description: 'Scan queued successfully',
            example: `{\n  "scan_id": "3e9b1102-fa42-491a-912a-0012948123ab",\n  "status": "QUEUED",\n  "created_at": "2026-11-17T00:30:00Z"\n}`,
          },
        ],
      },
      {
        method: 'GET',
        path: '/api/v1/scans/{scan_id}',
        summary: 'Retrieve scan progress & executions',
        permission: 'SCAN_READ',
        authRequired: true,
        parameters: [
          { name: 'scan_id', in: 'path', type: 'UUID', required: true, description: 'Unique identifier of scan run' },
        ],
        curlExample: `curl -X GET "http://localhost:8000/api/v1/scans/3e9b1102-fa42-491a-912a-0012948123ab" \\
  -H "Authorization: Bearer YOUR_API_TOKEN"`,
        responses: [
          {
            status: 200,
            description: 'Scan details and findings summary',
            example: `{\n  "id": "3e9b1102-fa42-491a-912a-0012948123ab",\n  "status": "COMPLETED",\n  "scanner_count": 3,\n  "finding_count": 2,\n  "findings": [\n    {\n      "id": "fnd_01",\n      "title": "SQL Injection in auth handler",\n      "severity": "CRITICAL"\n    }\n  ]\n}`,
          },
        ],
      },
    ],
  },

  'api-findings': {
    id: 'api-findings',
    path: '/docs/api/findings',
    title: 'Finding Details API',
    category: 'REST API V1 REFERENCE',
    categoryId: 'rest-api',
    readTime: '6 min read',
    description:
      'Inspect detailed vulnerability evidence, AST code snippets, reachability traces, and remediation status.',
    subsections: [
      {
        id: 'findings-overview',
        heading: 'Findings Querying & Triage',
        content:
          'Query detected findings with filters for severity (CRITICAL, HIGH, MEDIUM, LOW), status (OPEN, FIXED, SUPPRESSED), and scanner origin.',
      },
    ],
    apiEndpoints: [
      {
        method: 'GET',
        path: '/api/v1/findings',
        summary: 'Query security findings across projects',
        permission: 'FINDINGS_READ',
        authRequired: true,
        curlExample: `curl -X GET "http://localhost:8000/api/v1/findings?severity=CRITICAL&status=OPEN" \\
  -H "Authorization: Bearer YOUR_API_TOKEN"`,
        responses: [
          {
            status: 200,
            description: 'Filtered findings returned',
            example: `[\n  {\n    "id": "fnd_99812",\n    "rule_id": "semgrep.sql-injection-concat",\n    "severity": "CRITICAL",\n    "file_path": "backend/app/api/auth.py",\n    "line_start": 42\n  }\n]`,
          },
        ],
      },
    ],
  },

  'api-remediation': {
    id: 'api-remediation',
    path: '/docs/api/remediation',
    title: 'Autonomous Remediation & PRs API',
    category: 'REST API V1 REFERENCE',
    categoryId: 'rest-api',
    readTime: '7 min read',
    description:
      'Generate synthesized patches, verify them in ephemeral micro-sandboxes, and open automated GitHub pull requests.',
    subsections: [
      {
        id: 'remediation-pipeline',
        heading: 'Three-Stage Remediation Pipeline',
        content:
          '1. Propose Diff: Synthesize minimal idiomatic code modification.\n2. Sandbox Verify: Run compiler and unit tests inside isolated micro-enclave.\n3. Pull Request Creation: Submit digitally signed GitHub PR.',
      },
    ],
    apiEndpoints: [
      {
        method: 'POST',
        path: '/api/v1/remediation/propose',
        summary: 'Synthesize code fix for a finding',
        permission: 'REMEDIATION_WRITE',
        authRequired: true,
        curlExample: `curl -X POST "http://localhost:8000/api/v1/remediation/propose" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"finding_id": "fnd_99812"}'`,
        responses: [
          {
            status: 200,
            description: 'Patch diff generated',
            example: `{\n  "patch_id": "pch_01a",\n  "diff": "--- a/auth.py\\n+++ b/auth.py\\n@@ -42,1 +42,1 @@\\n-db.execute(\\"SELECT * FROM users WHERE email = '%s'\\" % email)\\n+db.execute(\\"SELECT * FROM users WHERE email = :email\\", {\\"email\\": email})",\n  "status": "PROPOSED"\n}`,
          },
        ],
      },
    ],
  },

  'api-webhooks': {
    id: 'api-webhooks',
    path: '/docs/api/webhooks',
    title: 'Webhooks API',
    category: 'REST API V1 REFERENCE',
    categoryId: 'rest-api',
    readTime: '6 min read',
    description:
      'Configure real-time webhook event subscriptions and verify HMAC SHA-256 event signatures.',
    subsections: [
      {
        id: 'webhook-events',
        heading: '1. Available Webhook Events',
        content:
          'Subscribe to real-time events:\n- `scan.completed`: Triggered when all scanners finish.\n- `finding.critical_detected`: Fired immediately when a CRITICAL vulnerability is confirmed.\n- `remediation.pr_created`: Dispatched when an AutoFix PR is opened.\n- `mcp.policy_violation`: Alert emitted when an agent violates OPA invariants.',
      },
      {
        id: 'signature-verification',
        heading: '2. Verifying HMAC SHA-256 Signatures',
        content:
          'Every webhook delivery includes the `X-Kavach-Signature` header computed as `HMAC-SHA256(secret, payload)`. Always verify this signature before processing events.',
      },
    ],
  },

  'api-errors': {
    id: 'api-errors',
    path: '/docs/api/errors',
    title: 'Errors & Rate Limits',
    category: 'REST API V1 REFERENCE',
    categoryId: 'rest-api',
    readTime: '5 min read',
    description:
      'RFC 7807 Problem Details error schemas, HTTP status codes, and rate limiting thresholds.',
    subsections: [
      {
        id: 'rfc-7807',
        heading: '1. RFC 7807 Error Response Schema',
        content:
          'When an error occurs, the response body conforms to RFC 7807 Problem Details for HTTP APIs:',
        codeBlocks: [
          {
            title: 'Sample 403 Forbidden Error Response',
            lang: 'json',
            code: `{
  "type": "https://errors.kavachsecurity.me/authorization/insufficient-permissions",
  "title": "Forbidden",
  "status": 403,
  "detail": "User lacks REQUIRED permission: PROJECT_WRITE to mutate project settings.",
  "instance": "/api/v1/projects/7f8b91a2-3c4d-5e6f-a7b8-c9d0e1f2a3b4",
  "timestamp": "2026-11-17T00:35:00Z"
}`,
          },
        ],
      },
    ],
  },
};

