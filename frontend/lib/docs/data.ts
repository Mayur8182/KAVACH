/**
 * Kavach Documentation Architecture & Content Store
 *
 * Implements independent, modular documentation for:
 * 1. Getting Started
 * 2. Security Scanners & Engines (Each scanner has its own technical workflow)
 * 3. AI & MCP Security (Gateway, Clients, Workflow, 22 Registered Tools, OPA, Audit)
 * 4. REST API V1 Reference (Independent endpoint specifications, Curl examples, JSON schemas)
 * 5. Platform & Integrations (GitHub, GitLab, CI/CD, RBAC, Org, Troubleshooting)
 */

export interface DocSubsection {
  id: string;
  heading: string;
  content: string;
  alert?: {
    type: 'note' | 'security' | 'warning' | 'tip';
    text: string;
  };
  codeBlocks?: Array<{
    title: string;
    lang: string;
    code: string;
  }>;
}

export interface ApiEndpointSpec {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  summary: string;
  permission: string;
  authRequired: boolean;
  parameters?: Array<{
    name: string;
    in: 'path' | 'query' | 'header';
    type: string;
    required: boolean;
    description: string;
  }>;
  requestBody?: {
    contentType: string;
    schema: string;
    example: string;
  };
  responses: Array<{
    status: number;
    description: string;
    example: string;
  }>;
  curlExample: string;
}

export interface DocPage {
  id: string;
  path: string; // e.g. '/docs/scanners/sast' or '/docs'
  title: string;
  category: string;
  categoryId: string;
  badge?: string;
  readTime: string;
  description: string;
  subsections: DocSubsection[];
  apiEndpoints?: ApiEndpointSpec[];
  mcpTools?: Array<{
    name: string;
    category: string;
    description: string;
    requiredPermission: string;
    riskTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    inputSchema: string;
  }>;
}

export interface DocCategory {
  id: string;
  title: string;
  items: Array<{
    id: string;
    title: string;
    path: string;
    badge?: string;
  }>;
}

// =============================================================================
// NAVIGATION HIERARCHY
// =============================================================================

export const DOC_NAVIGATION: DocCategory[] = [
  {
    id: 'getting-started',
    title: 'GETTING STARTED',
    items: [
      { id: 'overview', title: 'Platform Overview', path: '/docs' },
      { id: 'quickstart', title: '5-Minute Quickstart', path: '/docs/quickstart', badge: 'Fast Track' },
      { id: 'architecture', title: 'Architecture Overview', path: '/docs/architecture' },
      { id: 'installation', title: 'Installation & Setup', path: '/docs/installation' },
      { id: 'authentication', title: 'Authentication & API Keys', path: '/docs/authentication' },
    ],
  },
  {
    id: 'security-scanners',
    title: 'SECURITY SCANNERS & ENGINES',
    items: [
      { id: 'scanners', title: 'Scanner Overview', path: '/docs/scanners' },
      { id: 'scanners-sast', title: 'SAST & Secret Detection', path: '/docs/scanners/sast', badge: 'Semgrep + Gitleaks' },
      { id: 'scanners-api', title: 'API Security & OWASP API Top 10', path: '/docs/scanners/api-security', badge: 'OWASP 2023' },
      { id: 'scanners-dependencies', title: 'Dependency Security & SBOM', path: '/docs/scanners/dependencies', badge: 'CycloneDX 1.5' },
      { id: 'scanners-iac', title: 'Infrastructure as Code Security', path: '/docs/scanners/iac', badge: 'Checkov + OPA' },
      { id: 'scanners-container', title: 'Container Image Security', path: '/docs/scanners/container', badge: 'Trivy Core' },
      { id: 'scanners-ebpf', title: 'eBPF Runtime Security', path: '/docs/scanners/ebpf', badge: 'Kernel Telemetry' },
    ],
  },
  {
    id: 'ai-mcp-security',
    title: 'AI & MCP SECURITY',
    items: [
      { id: 'mcp-overview', title: 'MCP Gateway Overview', path: '/docs/mcp', badge: 'Core Standard' },
      { id: 'mcp-clients', title: 'Connecting AI Clients', path: '/docs/mcp/clients', badge: 'Claude, Cursor, VS Code' },
      { id: 'mcp-workflow', title: 'End-to-End Agent Workflow', path: '/docs/mcp/workflow' },
      { id: 'mcp-tools', title: 'MCP Tool Reference', path: '/docs/mcp/tools', badge: '22 Tools' },
      { id: 'mcp-policy', title: 'OPA Policy & Guardrails', path: '/docs/mcp/policy' },
      { id: 'mcp-audit', title: 'Cryptographic Audit & Evidence', path: '/docs/mcp/audit', badge: 'SLSA L3' },
    ],
  },
  {
    id: 'rest-api',
    title: 'REST API V1 REFERENCE',
    items: [
      { id: 'api-overview', title: 'API Overview', path: '/docs/api' },
      { id: 'api-authentication', title: 'Authentication & Headers', path: '/docs/api/authentication' },
      { id: 'api-projects', title: 'Projects & Workspaces', path: '/docs/api/projects' },
      { id: 'api-repositories', title: 'Repositories', path: '/docs/api/repositories' },
      { id: 'api-scans', title: 'Scans & Vulnerability Findings', path: '/docs/api/scans' },
      { id: 'api-findings', title: 'Finding Details', path: '/docs/api/findings' },
      { id: 'api-remediation', title: 'Autonomous Remediation & PRs', path: '/docs/api/remediation' },
      { id: 'api-webhooks', title: 'Webhooks', path: '/docs/api/webhooks' },
      { id: 'api-errors', title: 'Errors & Rate Limits', path: '/docs/api/errors' },
    ],
  },
  {
    id: 'platform-integrations',
    title: 'PLATFORM & INTEGRATIONS',
    items: [
      { id: 'integrations-github', title: 'GitHub Integration', path: '/docs/integrations/github', badge: 'GitHub App' },
      { id: 'integrations-gitlab', title: 'GitLab Integration', path: '/docs/integrations/gitlab' },
      { id: 'integrations-cicd', title: 'CI/CD Integration', path: '/docs/integrations/cicd', badge: 'Merge Gates' },
      { id: 'platform-rbac', title: 'User Management & RBAC', path: '/docs/platform/rbac' },
      { id: 'platform-organization', title: 'Organization Settings', path: '/docs/platform/organization' },
      { id: 'troubleshooting', title: 'Troubleshooting', path: '/docs/troubleshooting' },
    ],
  },
];

// Import modular documentation content
import { GETTING_STARTED_DOCS } from './content/getting-started';
import { SCANNER_DOCS } from './content/scanners';
import { MCP_DOCS } from './content/mcp';
import { API_DOCS } from './content/api';
import { INTEGRATIONS_DOCS } from './content/integrations';

// Unified Dictionary of all 33 documentation pages
export const ALL_DOCS: Record<string, DocPage> = {
  ...GETTING_STARTED_DOCS,
  ...SCANNER_DOCS,
  ...MCP_DOCS,
  ...API_DOCS,
  ...INTEGRATIONS_DOCS,
};

/**
 * Resolves a URL path (or slug array) to its corresponding DocPage.
 * Defaults to the Getting Started Overview ('/docs').
 */
export function getDocByPath(pathname: string): DocPage {
  // Normalize path
  let clean = pathname.replace(/\/$/, '');
  if (!clean || clean === '/docs') {
    clean = '/docs';
  }

  // Exact match by path
  const foundByPath = Object.values(ALL_DOCS).find((doc) => doc.path === clean);
  if (foundByPath) return foundByPath;

  // Match by id
  const slugKey = clean.replace(/^\/docs\/?/, '').replace(/\//g, '-');
  if (ALL_DOCS[slugKey]) return ALL_DOCS[slugKey];

  // Try direct key
  const directKey = clean.replace(/^\/docs\/?/, '');
  if (ALL_DOCS[directKey]) return ALL_DOCS[directKey];

  // Fallback to overview
  return ALL_DOCS['overview'];
}

/**
 * Returns previous and next document pointers for bottom navigation.
 */
export function getAdjacentDocs(currentPath: string): {
  prev: { title: string; path: string } | null;
  next: { title: string; path: string } | null;
} {
  const flattened = DOC_NAVIGATION.flatMap((cat) => cat.items);
  const normalized = currentPath.replace(/\/$/, '') || '/docs';
  const index = flattened.findIndex((item) => item.path === normalized);

  if (index === -1) {
    return { prev: null, next: null };
  }

  return {
    prev: index > 0 ? { title: flattened[index - 1].title, path: flattened[index - 1].path } : null,
    next: index < flattened.length - 1 ? { title: flattened[index + 1].title, path: flattened[index + 1].path } : null,
  };
}

/**
 * Quick search over all documentation titles, categories, and subsections.
 */
export function searchDocs(query: string): Array<{
  pageId: string;
  path: string;
  title: string;
  category: string;
  matchedText: string;
}> {
  if (!query || query.trim().length < 2) return [];
  const q = query.toLowerCase().trim();
  const results: Array<{
    pageId: string;
    path: string;
    title: string;
    category: string;
    matchedText: string;
  }> = [];

  for (const doc of Object.values(ALL_DOCS)) {
    // Check title or description
    if (doc.title.toLowerCase().includes(q)) {
      results.push({
        pageId: doc.id,
        path: doc.path,
        title: doc.title,
        category: doc.category,
        matchedText: doc.description,
      });
      continue;
    }

    // Check subsections
    for (const sub of doc.subsections) {
      if (sub.heading.toLowerCase().includes(q) || sub.content.toLowerCase().includes(q)) {
        results.push({
          pageId: doc.id,
          path: `${doc.path}#${sub.id}`,
          title: `${doc.title} › ${sub.heading}`,
          category: doc.category,
          matchedText: sub.content.slice(0, 140) + '...',
        });
        break;
      }
    }

    // Check API endpoints
    if (doc.apiEndpoints) {
      for (const ep of doc.apiEndpoints) {
        if (ep.path.toLowerCase().includes(q) || ep.summary.toLowerCase().includes(q)) {
          results.push({
            pageId: doc.id,
            path: doc.path,
            title: `${ep.method} ${ep.path}`,
            category: doc.category,
            matchedText: ep.summary,
          });
          break;
        }
      }
    }

    // Check MCP tools
    if (doc.mcpTools) {
      for (const tool of doc.mcpTools) {
        if (tool.name.toLowerCase().includes(q) || tool.description.toLowerCase().includes(q)) {
          results.push({
            pageId: doc.id,
            path: doc.path,
            title: `Tool: ${tool.name}`,
            category: doc.category,
            matchedText: tool.description,
          });
          break;
        }
      }
    }

    if (results.length >= 10) break;
  }

  return results;
}


