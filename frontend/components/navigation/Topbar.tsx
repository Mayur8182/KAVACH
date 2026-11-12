'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { CommandPalette } from './CommandPalette';
import { TaskQueueDrawer } from '@/components/tasks/TaskQueueDrawer';
import { api } from '@/lib/api/client';
import { redirectToLogin, clearAuthToken, getAuthToken } from '@/lib/auth/token';
import { toast } from '@/lib/toast';
import type { UserProfile } from '@/types/api/auth';
import type { Project } from '@/types/api/projects';
import type { Organization } from '@/types/api/organizations';
import type { Environment } from '@/types/api/environments';
import { getBreadcrumbsForPath } from '@/types/navigation/routeRegistry';
import { useScope } from '@/context/ScopeContext';
import {
  Search,
  Bell,
  ChevronDown,
  Check,
  LogOut,
  Settings,
  Users,
  Key,
  Cloud,
  Plus,
  Code2,
  Crosshair,
  ShieldCheck,
  Bot,
  Activity,
  GitFork,
  Database,
  CheckSquare,
  User,
  Sliders,
  Shield,
  Laptop,
  Compass,
  Sparkles,
  FolderKanban,
  LayoutGrid,
  Network,
  Menu,
  ChevronRight,
  Boxes,
  Layers,
  Container,
  FileCheck2,
  FolderGit2,
  Link2,
} from 'lucide-react';
import { KavachMark, KavachLogo } from '@/components/common/KavachLogo';

interface TopbarProps {
  currentProject?: Project;
  onSelectProject?: (p: Project) => void;
  currentOrg?: Organization;
  onSelectOrg?: (o: Organization) => void;
  currentEnv?: Environment;
  onSelectEnv?: (e: Environment) => void;
  showBrandLogo?: boolean;
  onOpenMobile?: () => void;
}

export interface WorkspaceProduct {
  id: string;
  name: string;
  category: 'Quality Engineering' | 'Code & Build' | 'Cloud & Infrastructure' | 'Runtime & AI Governance' | 'Knowledge & Posture';
  desc: string;
  route: string;
  icon: any;
  color: string;
  bg: string;
  border: string;
  scopeLabel: string;
  defaultScope: string;
  scopes: string[];
}

export const ALL_WORKSPACES: WorkspaceProduct[] = [
  // AI Security Assistant Experience
  {
    id: 'assistant',
    name: 'AI Security Assistant',
    category: 'Runtime & AI Governance',
    desc: 'Default AI-first Security Assistant, Natural Language Actions & Real-Time RAG',
    route: '/assistant',
    icon: Bot,
    color: '#2563EB',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    scopeLabel: 'Assistant',
    defaultScope: 'Personal Workspace',
    scopes: ['Personal Workspace'],
  },
  // 0. Workspace & Control Plane
  {
    id: 'workspace',
    name: 'Workspace HQ',
    category: 'Knowledge & Posture',
    desc: 'Platform Overview, Projects, Integrations & Governance',
    route: '/overview',
    icon: LayoutGrid,
    color: '#0F172A',
    bg: '#F8FAFC',
    border: '#E2E8F0',
    scopeLabel: 'Repository',
    defaultScope: 'All Repositories',
    scopes: ['All Repositories'],
  },

  // 1. Quality Engineering
  {
    id: 'qa',
    name: 'Nexora QA',
    category: 'Quality Engineering',
    desc: 'Automated & Manual QA, API, Perf & Visual Testing',
    route: '/qa',
    icon: CheckSquare,
    color: '#0F172A',
    bg: '#F8FAFC',
    border: '#E2E8F0',
    scopeLabel: 'Test Suite',
    defaultScope: 'All Test Suites',
    scopes: ['All Test Suites'],
  },

  // 2. Code & Build
  {
    id: 'code',
    name: 'Code Security',
    category: 'Code & Build',
    desc: 'SAST, AST Static Analysis, Secrets & Supply Chain',
    route: '/code/sast',
    icon: Code2,
    color: '#0F172A',
    bg: '#F8FAFC',
    border: '#E2E8F0',
    scopeLabel: 'Repository',
    defaultScope: 'All Repositories',
    scopes: ['All Repositories'],
  },
  {
    id: 'dependencies',
    name: 'Dependencies & SCA',
    category: 'Code & Build',
    desc: 'Software Composition Analysis, Vulnerabilities, SBOM & Licenses',
    route: '/code/dependencies',
    icon: Boxes,
    color: '#0F172A',
    bg: '#F8FAFC',
    border: '#E2E8F0',
    scopeLabel: 'Repository',
    defaultScope: 'All Repositories',
    scopes: ['All Repositories'],
  },
  {
    id: 'iac',
    name: 'IaC Security',
    category: 'Code & Build',
    desc: 'Terraform, CloudFormation, Helm & Kubernetes Manifests',
    route: '/code/iac',
    icon: Layers,
    color: '#0F172A',
    bg: '#F8FAFC',
    border: '#E2E8F0',
    scopeLabel: 'Repository',
    defaultScope: 'All Repositories',
    scopes: ['All Repositories'],
  },
  {
    id: 'containers',
    name: 'Container Security',
    category: 'Code & Build',
    desc: 'Container Image Vulnerabilities, Base Image Upgrades & Dockerfiles',
    route: '/code/container-security',
    icon: Container,
    color: '#0F172A',
    bg: '#F8FAFC',
    border: '#E2E8F0',
    scopeLabel: 'Repository',
    defaultScope: 'All Repositories',
    scopes: ['All Repositories'],
  },

  // 2. Cloud & Infrastructure
  {
    id: 'cloud',
    name: 'Cloud Security',
    category: 'Cloud & Infrastructure',
    desc: 'Multi-Cloud CSPM, AWS, GCP, Azure & K8s',
    route: '/cloud',
    icon: Cloud,
    color: '#0F172A',
    bg: '#F8FAFC',
    border: '#E2E8F0',
    scopeLabel: 'Cloud Account',
    defaultScope: 'All Cloud Accounts',
    scopes: ['All Cloud Accounts'],
  },
  {
    id: 'attack',
    name: 'Attack Surface',
    category: 'Cloud & Infrastructure',
    desc: 'Attack Surface Management, DAST & Pentesting',
    route: '/attack',
    icon: Crosshair,
    color: '#0F172A',
    bg: '#F8FAFC',
    border: '#E2E8F0',
    scopeLabel: 'Target Domain',
    defaultScope: 'All Targets',
    scopes: ['All Targets'],
  },

  // 3. Runtime & AI Governance
  {
    id: 'api-security',
    name: 'API Security',
    category: 'Runtime & AI Governance',
    desc: 'Dynamic API Discovery, OWASP Top 10, AST & DAST Testing',
    route: '/api-security',
    icon: Network,
    color: '#0F172A',
    bg: '#F8FAFC',
    border: '#E2E8F0',
    scopeLabel: 'API Target',
    defaultScope: 'All Endpoints',
    scopes: ['All Endpoints', 'Production APIs', 'Internal Services'],
  },
  {
    id: 'protect',
    name: 'Runtime Defense',
    category: 'Runtime & AI Governance',
    desc: 'eBPF Runtime Defense & MCP Security Gateway',
    route: '/protect',
    icon: ShieldCheck,
    color: '#0F172A',
    bg: '#F8FAFC',
    border: '#E2E8F0',
    scopeLabel: 'Protected Cluster',
    defaultScope: 'All Workloads',
    scopes: ['All Workloads'],
  },
  {
    id: 'agent',
    name: 'AI Agent Security',
    category: 'Runtime & AI Governance',
    desc: 'Autonomous AI Agent Identity & Tool Policy',
    route: '/agent',
    icon: Bot,
    color: '#0F172A',
    bg: '#F8FAFC',
    border: '#E2E8F0',
    scopeLabel: 'AI Agent',
    defaultScope: 'All Agents',
    scopes: ['All Agents'],
  },
  {
    id: 'soc',
    name: 'Security Operations',
    category: 'Runtime & AI Governance',
    desc: 'Security Operations, Incident Triage & Alerts',
    route: '/soc',
    icon: Activity,
    color: '#0F172A',
    bg: '#F8FAFC',
    border: '#E2E8F0',
    scopeLabel: 'Alert Queue',
    defaultScope: 'All Incidents',
    scopes: ['All Incidents'],
  },

  // 4. Knowledge & Posture
  {
    id: 'graph',
    name: 'Security Graph',
    category: 'Knowledge & Posture',
    desc: 'Security Knowledge Graph & Blast Radius',
    route: '/graph',
    icon: GitFork,
    color: '#0F172A',
    bg: '#F8FAFC',
    border: '#E2E8F0',
    scopeLabel: 'Graph Topology',
    defaultScope: 'Full Graph',
    scopes: ['Full Graph'],
  },
  {
    id: 'data',
    name: 'Data Security',
    category: 'Knowledge & Posture',
    desc: 'Sensitive Data Discovery & DSPM Invariants',
    route: '/data',
    icon: Database,
    color: '#0F172A',
    bg: '#F8FAFC',
    border: '#E2E8F0',
    scopeLabel: 'Data Store',
    defaultScope: 'All Data Stores',
    scopes: ['All Data Stores'],
  },
  {
    id: 'governance',
    name: 'Governance & Compliance',
    category: 'Knowledge & Posture',
    desc: 'Declarative OPA Rego & Audit Compliance',
    route: '/governance',
    icon: CheckSquare,
    color: '#0F172A',
    bg: '#F8FAFC',
    border: '#E2E8F0',
    scopeLabel: 'Compliance Framework',
    defaultScope: 'All Frameworks',
    scopes: ['All Frameworks'],
  },
  {
    id: 'sales',
    name: 'Sales & Enterprise',
    category: 'Knowledge & Posture',
    desc: 'Demo, Qualification, POC Engine, Quotes & Onboarding',
    route: '/sales',
    icon: ShieldCheck,
    color: '#0F172A',
    bg: '#F8FAFC',
    border: '#E2E8F0',
    scopeLabel: 'Deal Pipeline',
    defaultScope: 'All Deals',
    scopes: ['All Deals', 'Active POCs', 'Signed Agreements'],
  },
];

const GithubIcon = ({ size = 16, color = '#0f172a' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

export const Topbar: React.FC<TopbarProps> = ({
  currentProject,
  onSelectProject,
  currentOrg,
  onSelectOrg,
  currentEnv,
  onSelectEnv,
  showBrandLogo = false,
  onOpenMobile,
}) => {
  const router = useRouter();
  const pathname = usePathname() || '';

  // Resolve current active workspace from URL route
  const activeWorkspace: WorkspaceProduct = React.useMemo(() => {
    if (
      pathname === '/home' ||
      pathname === '/overview' ||
      pathname === '/projects' ||
      pathname.startsWith('/projects/') ||
      pathname === '/integrations' ||
      pathname.startsWith('/integrations/') ||
      pathname === '/policies' ||
      pathname === '/audit-logs'
    ) {
      return ALL_WORKSPACES.find(w => w.id === 'workspace') || ALL_WORKSPACES[0];
    }
    if (pathname.startsWith('/dependencies') || pathname.startsWith('/code/dependencies')) {
      return ALL_WORKSPACES.find(w => w.id === 'dependencies') || ALL_WORKSPACES[2];
    }
    if (pathname.startsWith('/api-security')) return ALL_WORKSPACES.find(w => w.id === 'api-security') || ALL_WORKSPACES[1];
    if (pathname.startsWith('/qa')) return ALL_WORKSPACES.find(w => w.id === 'qa') || ALL_WORKSPACES[1];
    if (pathname.startsWith('/cloud')) return ALL_WORKSPACES.find(w => w.id === 'cloud') || ALL_WORKSPACES[3];
    if (pathname.startsWith('/attack')) return ALL_WORKSPACES.find(w => w.id === 'attack') || ALL_WORKSPACES[4];
    if (pathname.startsWith('/protect')) return ALL_WORKSPACES.find(w => w.id === 'protect') || ALL_WORKSPACES[5];
    if (pathname.startsWith('/agent')) return ALL_WORKSPACES.find(w => w.id === 'agent') || ALL_WORKSPACES[6];
    if (pathname.startsWith('/soc')) return ALL_WORKSPACES.find(w => w.id === 'soc') || ALL_WORKSPACES[7];
    if (pathname.startsWith('/graph')) return ALL_WORKSPACES.find(w => w.id === 'graph') || ALL_WORKSPACES[8];
    if (pathname.startsWith('/data')) return ALL_WORKSPACES.find(w => w.id === 'data') || ALL_WORKSPACES[9];
    if (pathname.startsWith('/governance')) return ALL_WORKSPACES.find(w => w.id === 'governance') || ALL_WORKSPACES[10];
    if (pathname.startsWith('/sales')) return ALL_WORKSPACES.find(w => w.id === 'sales') || ALL_WORKSPACES[11];
    return ALL_WORKSPACES.find(w => w.id === 'code') || ALL_WORKSPACES[2]; // default: code
  }, [pathname]);

  // Compute canonical breadcrumbs for authoritative wayfinding (omits redundant active workspace root label)
  const breadcrumbs = React.useMemo(() => {
    const raw = getBreadcrumbsForPath(pathname);
    const wsNorm = activeWorkspace.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const wsIdNorm = activeWorkspace.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    return raw.filter((b) => {
      const bNorm = b.label.toLowerCase().replace(/[^a-z0-9]/g, '');
      return (
        bNorm !== wsNorm &&
        bNorm !== wsIdNorm &&
        bNorm !== 'platform' &&
        bNorm !== 'secusecure' &&
        bNorm !== 'apisecurity' &&
        bNorm !== 'codesecurity'
      );
    });
  }, [pathname, activeWorkspace]);

  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Dropdown states
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isRepoDropdownOpen, setIsRepoDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState(false);
  const [workspaceSearch, setWorkspaceSearch] = useState('');
  const [projectSearch, setProjectSearch] = useState('');

  const { currentProject: scopeProject, setCurrentProject, projects, currentRepository, setCurrentRepository, repositories } = useScope();
  const effectiveProject = currentProject || scopeProject;

  // Selected scope mapped per workspace ID
  const [selectedScopes, setSelectedScopes] = useState<Record<string, string>>({
    qa: 'All Test Suites',
    code: 'All Repositories',
    cloud: 'All Cloud Accounts',
    attack: 'All Targets',
    protect: 'All Workloads',
    agent: 'All Agents',
    soc: 'All Incidents',
    graph: 'Full Graph',
    data: 'All Data Stores',
    governance: 'All Frameworks',
  });

  const isCodeOrWorkspace = activeWorkspace.id === 'code' || activeWorkspace.id === 'workspace';

  const currentScope = isCodeOrWorkspace
    ? (currentRepository ? currentRepository.name : 'All Repositories')
    : (selectedScopes[activeWorkspace.id] || activeWorkspace.defaultScope);

  const availableScopes = isCodeOrWorkspace
    ? Array.from(new Set(['All Repositories', ...repositories.map((r) => r.name)]))
    : activeWorkspace.scopes;

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
    (p.environment && p.environment.toLowerCase().includes(projectSearch.toLowerCase()))
  );

  const workspaceRef = useRef<HTMLDivElement>(null);
  const projectRef = useRef<HTMLDivElement>(null);
  const repoRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setCurrentUser(null);
      return;
    }

    // Fetch authenticated profile
    api.auth
      .me()
      .then((user) => setCurrentUser(user))
      .catch((err: any) => {
        setCurrentUser(null);
        if (err?.status === 401 && typeof window !== 'undefined') {
          const path = window.location.pathname;
          if (!path.startsWith('/login') && !path.startsWith('/signup') && !path.startsWith('/register')) {
            redirectToLogin();
          }
        }
      });

    // Also fetch repositories if available to populate dropdown
    if (typeof api?.code?.repositoryHealth === 'function') {
      api.code.repositoryHealth({ limit: 20 })
        .then((res: any) => {
          if (res?.items?.length) {
            const names = res.items.map((r: any) => r.name);
            const codeWs = ALL_WORKSPACES.find(w => w.id === 'code');
            if (codeWs) {
              codeWs.scopes = Array.from(new Set([...codeWs.scopes, ...names]));
            }
          }
        })
        .catch(() => {});
    }

    // Global keyboard listener for ⌘K / Ctrl+K
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (workspaceRef.current && !workspaceRef.current.contains(e.target as Node)) {
        setIsWorkspaceOpen(false);
      }
      if (projectRef.current && !projectRef.current.contains(e.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
      if (repoRef.current && !repoRef.current.contains(e.target as Node)) {
        setIsRepoDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    toast.success('Signed out successfully', {
      description: 'Your Kavach session has been securely ended.',
    });
    try {
      await api.auth.logout();
    } catch {
      // Backend notification optional on client logout
    }
    clearAuthToken();
    localStorage.removeItem('token');
    router.push('/login?logged_out=1');
  };

  const handleSelectScope = (scope: string) => {
    setSelectedScopes((prev) => ({ ...prev, [activeWorkspace.id]: scope }));
    if (activeWorkspace.id === 'code' || activeWorkspace.id === 'workspace') {
      if (scope === 'All Repositories') {
        setCurrentRepository(null);
      } else {
        const found = repositories.find((r) => r.name === scope || r.id === scope);
        if (found) {
          setCurrentRepository(found);
        } else {
          setCurrentRepository({ id: scope, name: scope });
        }
      }
    }
    setIsRepoDropdownOpen(false);
  };

  const ActiveIcon = activeWorkspace.icon;

  const categories = ['Quality Engineering', 'Code & Build', 'Cloud & Infrastructure', 'Runtime & AI Governance', 'Knowledge & Posture'] as const;

  const filteredWorkspaces = ALL_WORKSPACES.filter(w =>
    w.name.toLowerCase().includes(workspaceSearch.toLowerCase()) ||
    w.desc.toLowerCase().includes(workspaceSearch.toLowerCase()) ||
    w.category.toLowerCase().includes(workspaceSearch.toLowerCase())
  );

  return (
    <>
      <header
        aria-label="Global Topbar"
        style={{
          height: 'var(--topbar-height, 56px)',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          gap: '12px',
          flexWrap: 'nowrap',
          overflowX: 'clip',
          boxSizing: 'border-box',
          fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif)",
        }}
      >
        {/* Left Side: Logo (if standalone) & Workspace/Repo Scope Selectors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, minWidth: 0, flexWrap: 'nowrap' }}>
          {/* Mobile menu trigger */}
          {onOpenMobile && (
            <button
              type="button"
              onClick={onOpenMobile}
              aria-label="Open navigation menu"
              className="kavach-mobile-menu-btn"
              style={{
                background: 'none',
                border: '1px solid #E2E8F0',
                borderRadius: '7px',
                color: '#334155',
                cursor: 'pointer',
                padding: '6px 8px',
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                height: '34px',
              }}
            >
              <Menu size={18} />
            </button>
          )}

          {/* Brand Logo: only rendered when explicitly requested in standalone mode without a sidebar */}
          {showBrandLogo && (
            <Link
              href={activeWorkspace.route}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textDecoration: 'none',
                marginRight: '6px',
              }}
            >
              <KavachLogo size={24} textSize={16} />
            </Link>
          )}

          {/* Unified Workspace Switcher Dropdown */}
          <div ref={workspaceRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 10px',
                borderRadius: '7px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                height: '34px',
                boxSizing: 'border-box',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#CBD5E1';
                e.currentTarget.style.backgroundColor = '#F8FAFC';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#E2E8F0';
                e.currentTarget.style.backgroundColor = '#ffffff';
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '5px',
                  backgroundColor: activeWorkspace.bg,
                  border: `1px solid ${activeWorkspace.border}`,
                  color: activeWorkspace.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <ActiveIcon size={12} />
              </div>
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap' }}>
                {activeWorkspace.name}
              </span>
              <ChevronDown size={13} color="#94A3B8" style={{ marginLeft: '2px', flexShrink: 0 }} />
            </button>

            {isWorkspaceOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  width: '340px',
                  maxWidth: 'calc(100vw - 20px)',
                  maxHeight: '520px',
                  overflowY: 'auto',
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 12px 30px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
                  zIndex: 50,
                  padding: '8px',
                }}
              >
                {/* Search Bar */}
                <div style={{ padding: '4px 6px 8px' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '9px' }} />
                    <input
                      type="text"
                      placeholder="Switch to product workspace..."
                      value={workspaceSearch}
                      onChange={(e) => setWorkspaceSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px 6px 30px',
                        fontSize: '12px',
                        borderRadius: '6px',
                        border: '1px solid #E2E8F0',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* Categorized Products List */}
                {categories.map((cat) => {
                  const itemsInCat = filteredWorkspaces.filter(w => w.category === cat);
                  if (itemsInCat.length === 0) return null;

                  return (
                    <div key={cat} style={{ marginBottom: '8px' }}>
                      <div
                        style={{
                          padding: '6px 8px 3px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          color: '#94A3B8',
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {cat}
                      </div>

                      {itemsInCat.map((ws) => {
                        const Icon = ws.icon;
                        const isCurrent = activeWorkspace.id === ws.id;

                        return (
                          <button
                            key={ws.id}
                            onClick={() => {
                              setIsWorkspaceOpen(false);
                              router.push(ws.route);
                            }}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px',
                              borderRadius: '8px',
                              border: 'none',
                              backgroundColor: isCurrent ? '#F1F5F9' : 'transparent',
                              cursor: 'pointer',
                              textAlign: 'left',
                              marginBottom: '2px',
                              transition: 'background-color 0.12s ease',
                            }}
                            onMouseEnter={(e) => {
                              if (!isCurrent) e.currentTarget.style.backgroundColor = '#F8FAFC';
                            }}
                            onMouseLeave={(e) => {
                              if (!isCurrent) e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '6px',
                                  backgroundColor: ws.bg,
                                  border: `1px solid ${ws.border}`,
                                  color: ws.color,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                <Icon size={15} />
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                                  {ws.name}
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '230px' }}>
                                  {ws.desc}
                                </div>
                              </div>
                            </div>
                            {isCurrent && <Check size={15} color="#0F172A" style={{ flexShrink: 0 }} />}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}

                <div style={{ height: '1px', backgroundColor: '#E2E8F0', margin: '6px 0' }} />

                {/* Onboard Actions */}
                <button
                  onClick={() => {
                    setIsWorkspaceOpen(false);
                    router.push('/onboarding?product=cloud&workspace=cloud');
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#0F172A',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Plus size={14} />
                  <span>+ Onboard Cloud Organization</span>
                </button>

                <button
                  onClick={() => {
                    setIsWorkspaceOpen(false);
                    router.push('/projects?create=true');
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#475569',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Plus size={14} />
                  <span>+ Create New Product Workspace</span>
                </button>
              </div>
            )}
          </div>

          {/* Project Selector Dropdown */}
          <div ref={projectRef} className="kavach-hide-tablet-mobile" style={{ position: 'relative' }}>
            <button
              onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '5px 10px',
                borderRadius: '7px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                height: '34px',
                boxSizing: 'border-box',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#CBD5E1';
                e.currentTarget.style.backgroundColor = '#F8FAFC';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#E2E8F0';
                e.currentTarget.style.backgroundColor = '#ffffff';
              }}
              title={effectiveProject ? `Current Project: ${effectiveProject.name}` : 'Select an authorized project'}
            >
              <FolderKanban size={13} color="#4F46E5" style={{ flexShrink: 0 }} />
              <span
                style={{
                  fontSize: '12.5px',
                  fontWeight: 500,
                  color: '#0F172A',
                  maxWidth: '260px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {effectiveProject ? effectiveProject.name : 'All Projects'}
              </span>
              {effectiveProject?.environment && (
                <span
                  style={{
                    fontSize: '9px',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    backgroundColor: '#F1F5F9',
                    color: '#475569',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                  }}
                >
                  {effectiveProject.environment}
                </span>
              )}
              <ChevronDown size={13} color="#94A3B8" style={{ marginLeft: '2px', flexShrink: 0 }} />
            </button>

            {isProjectDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  width: '320px',
                  maxWidth: 'calc(100vw - 20px)',
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  zIndex: 50,
                  padding: '8px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 8px 8px 8px',
                    borderBottom: '1px solid #F1F5F9',
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
                    Authorized Projects ({projects.length})
                  </span>
                  <Link
                    href="/projects"
                    onClick={() => setIsProjectDropdownOpen(false)}
                    style={{ fontSize: '11px', color: '#0F172A', fontWeight: 500, textDecoration: 'none' }}
                  >
                    Manage
                  </Link>
                </div>

                {/* Search */}
                <div style={{ padding: '8px 4px 4px 4px' }}>
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid #E2E8F0',
                      outline: 'none',
                    }}
                    autoFocus
                  />
                </div>

                {/* Project List */}
                <div style={{ maxHeight: '240px', overflowY: 'auto', margin: '4px 0' }}>
                  {/* Option for All Projects / Global Scope */}
                  <button
                    onClick={() => {
                      setCurrentProject(null);
                      if (onSelectProject) onSelectProject(null as any);
                      setIsProjectDropdownOpen(false);
                      if (pathname.startsWith('/code')) {
                        router.push('/code');
                      }
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: !effectiveProject ? '#F1F5F9' : 'transparent',
                      color: !effectiveProject ? '#09090B' : '#334155',
                      fontSize: '13px',
                      fontWeight: !effectiveProject ? 600 : 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseOver={(e) => {
                      if (effectiveProject) e.currentTarget.style.backgroundColor = '#F8FAFC';
                    }}
                    onMouseOut={(e) => {
                      if (effectiveProject) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FolderKanban size={14} color={!effectiveProject ? '#09090B' : '#94A3B8'} />
                      <span>All Projects (Global Scope)</span>
                    </div>
                    {!effectiveProject && <Check size={14} color="#09090B" />}
                  </button>

                  {filteredProjects.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#94A3B8', fontSize: '12px' }}>
                      {projects.length === 0 ? 'No authorized projects found' : 'No matching projects'}
                    </div>
                  ) : (
                    filteredProjects.map((p) => {
                      const isSelected = effectiveProject?.id === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            setCurrentProject(p);
                            if (onSelectProject) onSelectProject(p);
                            setIsProjectDropdownOpen(false);
                            if (pathname.startsWith('/code')) {
                              router.push(`/code?project_id=${p.id}`);
                            }
                          }}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: isSelected ? '#F1F5F9' : 'transparent',
                            color: '#0F172A',
                            fontSize: '13px',
                            fontWeight: isSelected ? 600 : 500,
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                          onMouseOver={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = '#F8FAFC';
                          }}
                          onMouseOut={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <FolderKanban size={14} color={isSelected ? '#0F172A' : '#64748B'} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '190px' }}>
                                {p.name}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <span>{p.environment || 'Production'}</span>
                                {p.application_type && (
                                  <>
                                    <span>•</span>
                                    <span>{p.application_type}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          {isSelected && <Check size={14} color="#0F172A" />}
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Footer Action */}
                <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '6px', marginTop: '4px' }}>
                  <button
                    onClick={() => {
                      setIsProjectDropdownOpen(false);
                      router.push('/projects?create=true');
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#0F172A',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <Plus size={14} />
                    <span>+ Create New Project</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Scope Dropdown (matches active workspace product) */}
          <div ref={repoRef} className="kavach-hide-tablet-mobile" style={{ position: 'relative' }}>
            <button
              onClick={() => setIsRepoDropdownOpen(!isRepoDropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '5px 10px',
                borderRadius: '7px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                height: '34px',
                boxSizing: 'border-box',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#CBD5E1';
                e.currentTarget.style.backgroundColor = '#F8FAFC';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#E2E8F0';
                e.currentTarget.style.backgroundColor = '#ffffff';
              }}
            >
              {isCodeOrWorkspace ? (
                <GithubIcon size={14} color="#0F172A" />
              ) : (
                <ActiveIcon size={13} color={activeWorkspace.color} />
              )}
              <span
                style={{
                  fontSize: '12.5px',
                  fontWeight: 500,
                  color: '#0F172A',
                  maxWidth: '140px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {currentScope}
              </span>
              <ChevronDown size={13} color="#94A3B8" style={{ marginLeft: '2px', flexShrink: 0 }} />
            </button>

            {isRepoDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  width: '290px',
                  maxWidth: 'calc(100vw - 20px)',
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                  zIndex: 50,
                  padding: '6px',
                }}
              >
                <div style={{ padding: '6px 10px', fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>
                  {activeWorkspace.scopeLabel} Scope
                </div>
                {availableScopes.map((scope) => {
                  const isSelected = currentScope === scope;
                  const isAll = scope === 'All Repositories';
                  return (
                    <button
                      key={scope}
                      onClick={() => handleSelectScope(scope)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: isSelected ? '#F1F5F9' : 'transparent',
                        color: '#0F172A',
                        fontSize: '13px',
                        fontWeight: isSelected ? 600 : 400,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                        {isCodeOrWorkspace && !isAll ? (
                          <FolderGit2 size={13} color={isSelected ? '#0F172A' : '#64748B'} style={{ flexShrink: 0 }} />
                        ) : null}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{scope}</span>
                      </div>
                      {isSelected && <Check size={14} color="#0F172A" style={{ flexShrink: 0 }} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Center: Search Bar (Flexible, Responsive) */}
        <div style={{ flex: '0 1 210px', maxWidth: '220px', minWidth: '60px', position: 'relative' }}>
          <div
            onClick={() => setIsCommandOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              height: '34px',
              padding: '0 8px',
              borderRadius: '6px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxSizing: 'border-box',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = '#CBD5E1';
              e.currentTarget.style.backgroundColor = '#FFFFFF';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = '#E2E8F0';
              e.currentTarget.style.backgroundColor = '#F8FAFC';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
              <img
                src="/kavach-cube.png"
                alt="Kavach"
                style={{ width: '14px', height: '14px', objectFit: 'contain', flexShrink: 0 }}
              />
              <span style={{ fontSize: '13px', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Search code, findings...
              </span>
            </div>
            <kbd
              className="kavach-hide-small-mobile"
              style={{
                fontSize: '9.5px',
                fontWeight: 600,
                color: '#64748B',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                padding: '0 4px',
                borderRadius: '3px',
                fontFamily: 'inherit',
                flexShrink: 0,
              }}
            >
              Ctrl K
            </kbd>
          </div>
        </div>

        {/* Right Side: Task Queue, Bell & User Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {/* Asynchronous Task Queue Trigger */}
          <button
            onClick={() => setIsTaskDrawerOpen(true)}
            aria-label="View background task worker queue"
            title="Asynchronous Task Queue & Workers"
            style={{
              width: '32px',
              height: '32px',
              background: 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: '#64748B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = '#0F172A';
              e.currentTarget.style.backgroundColor = '#F1F5F9';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = '#64748B';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Activity size={16} />
          </button>

          {/* Notifications Trigger with Count Badge */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              aria-label="View notifications"
              style={{
                width: '32px',
                height: '32px',
                background: isNotificationsOpen ? '#F1F5F9' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: isNotificationsOpen ? '#0F172A' : '#64748B',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
              onMouseOver={(e) => {
                if (!isNotificationsOpen) {
                  e.currentTarget.style.color = '#0F172A';
                  e.currentTarget.style.backgroundColor = '#F1F5F9';
                }
              }}
              onMouseOut={(e) => {
                if (!isNotificationsOpen) {
                  e.currentTarget.style.color = '#64748B';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <Bell size={16} />
            </button>

            {isNotificationsOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '320px',
                  maxWidth: 'calc(100vw - 20px)',
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                  zIndex: 50,
                  padding: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>Notifications</span>
                </div>
                <div style={{ padding: '16px 8px', textAlign: 'center', color: '#64748B', fontSize: '12px' }}>
                  No unread notifications
                </div>
              </div>
            )}
          </div>



          {/* User Profile */}
          <div ref={userMenuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'transparent',
                border: '1px solid transparent',
                borderRadius: '7px',
                cursor: 'pointer',
                padding: '3px 6px',
                height: '34px',
                transition: 'all 0.15s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#F8FAFC';
                e.currentTarget.style.borderColor = '#E2E8F0';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = 'transparent';
              }}
            >
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  backgroundColor: '#0F172A',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {currentUser?.name
                  ? currentUser.name
                      .split(' ')
                      .map((n) => n[0])
                      .filter(Boolean)
                      .join('')
                      .substring(0, 2)
                      .toUpperCase()
                  : currentUser?.email
                  ? currentUser.email.substring(0, 2).toUpperCase()
                  : 'G'}
              </div>
              <div className="kavach-hide-small-mobile" style={{ textAlign: 'left', lineHeight: '1.2' }}>
                <div
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: '#0F172A',
                    maxWidth: '110px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {currentUser?.name || currentUser?.email?.split('@')[0] || 'Account'}
                </div>
                <div style={{ fontSize: '10.5px', color: '#64748B' }}>
                  {currentUser ? (currentUser.role || 'Member') : 'Signed Out'}
                </div>
              </div>
              <ChevronDown size={13} color="#94A3B8" className="kavach-hide-small-mobile" style={{ flexShrink: 0 }} />
            </button>

            {isUserMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '200px',
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                  zIndex: 50,
                  padding: '6px',
                }}
              >
                <div style={{ padding: '8px 10px', borderBottom: '1px solid #F1F5F9', marginBottom: '4px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                    {currentUser?.name || currentUser?.email || 'Guest User'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                    {currentUser?.email || 'Not signed in'}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    router.push('/settings?tab=profile');
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#0F172A',
                    fontSize: '13px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <User size={14} color="#64748B" />
                  User Profile
                </button>
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    router.push('/settings?tab=account');
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#0F172A',
                    fontSize: '13px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Sliders size={14} color="#64748B" />
                  Account Settings
                </button>
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    router.push('/settings?tab=security');
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#0F172A',
                    fontSize: '13px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Shield size={14} color="#64748B" />
                  Security &amp; MFA
                </button>
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    router.push('/settings?tab=tokens');
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#0F172A',
                    fontSize: '13px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Key size={14} color="#64748B" />
                  API Keys &amp; Tokens
                </button>
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    router.push('/settings?tab=sessions');
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#0F172A',
                    fontSize: '13px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Laptop size={14} color="#64748B" />
                  Active Sessions
                </button>
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    router.push('/settings/members');
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#0F172A',
                    fontSize: '13px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Users size={14} color="#64748B" />
                  Team &amp; Members
                </button>
                <div style={{ height: '1px', backgroundColor: '#F1F5F9', margin: '4px 0' }} />
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#EF4444',
                    fontSize: '13px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <LogOut size={14} color="#EF4444" />
                  Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Command Palette Modal */}
      <CommandPalette isOpen={isCommandOpen} onClose={() => setIsCommandOpen(false)} />

      {/* Global Asynchronous Background Task Queue Drawer */}
      <TaskQueueDrawer
        isOpen={isTaskDrawerOpen}
        onClose={() => setIsTaskDrawerOpen(false)}
        projectId={currentProject?.id}
      />
    </>
  );
};
