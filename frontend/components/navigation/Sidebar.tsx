'use client';

/**
 * THING Unified Enterprise Sidebar Navigation
 * Complies strictly with UI/UX Master Rules (Rule 6: Navigation Rules):
 * 
 * THING
 * 
 * Workspace
 * ├── Overview
 * ├── Projects
 * ├── Repositories
 * ├── Findings
 * ├── Scans
 * ├── Policies
 * ├── Integrations
 * └── Audit Logs
 * 
 * Security
 * ├── Security Overview
 * ├── Attack Surface
 * ├── Cloud
 * ├── Kubernetes
 * ├── CI/CD
 * └── Compliance
 * 
 * Administration
 * ├── Members
 * ├── Roles
 * ├── API Keys
 * ├── SSO
 * ├── Billing
 * └── Settings
 * 
 * Specialized Defense (Expandable / Non-disruptive):
 * ├── Protect / MCP Gateway
 * ├── Autonomous Agent Guard
 * ├── SOC & Threat Intel
 * └── Quality Engineering (QA)
 * 
 * Rules Enforced:
 * 1. Active route is visually obvious (3px left indicator, bold contrast, highlight).
 * 2. Sidebar NEVER randomly changes between pages — stays permanent across the whole app.
 * 3. Consistent enterprise spacing and typography.
 * 4. Zero dead links — every item routes to an authenticated production view.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { useEntitlements } from '@/lib/hooks/useEntitlements';
import {
  Code2,
  LayoutGrid,
  FolderGit2,
  FolderKanban,
  GitPullRequest,
  ShieldAlert,
  Target,
  Key,
  Box,
  Layers,
  Container,
  Link2,
  ExternalLink,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Cloud,
  PlayCircle,
  HelpCircle,
  Workflow,
  FileCode2,
  Users,
  Radio,
  CheckSquare,
  Archive,
  Boxes,
  Bot,
  Crosshair,
  Lock,
  Globe,
  Network,
  Cpu,
  CreditCard,
  FileCheck2,
  Sparkles,
  Flame,
  ShieldCheck,
  RefreshCw,
  FileText,
  Calendar,
  Send,
  Briefcase,
  HardDrive,
  Activity,
  Rocket,
  Home,
  X,
} from 'lucide-react';

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

import { KavachMark, KavachLogo } from '@/components/common/KavachLogo';

interface NavSubItem {
  id: string;
  label: string;
  href: string;
  badge?: number | string;
  children?: NavSubItem[];
}

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>;
  badge?: number | string;
  badgeBg?: string;
  external?: boolean;
  children?: NavSubItem[];
}

export const SecuLayerLogo: React.FC<{ size?: number; color?: string }> = ({ size = 26, color = '#09090B' }) => (
  <KavachMark size={size} color={color} />
);

export const ThingHexLogo: React.FC<{ size?: number; color?: string }> = ({ size = 26, color = '#09090B' }) => (
  <KavachMark size={size} color={color} />
);

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const pathname = usePathname() || '/code';
  const [workspacesExpanded, setWorkspacesExpanded] = useState(false);

  // Close mobile drawer on Escape key press (Phase 3 Accessibility)
  useEffect(() => {
    if (!isMobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseMobile?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, onCloseMobile]);

  // Workspace Context Detection
  const isKavachCoreRoute =
    pathname === '/home' ||
    pathname.startsWith('/runs') ||
    pathname.startsWith('/repositories') ||
    pathname.startsWith('/findings') ||
    pathname === '/agent' ||
    pathname === '/assistant' ||
    pathname === '/overview' ||
    pathname === '/dashboard' ||
    pathname === '/';

  const isApiSecurityWorkspace = pathname.startsWith('/api-security');
  const isDependenciesWorkspace =
    pathname.startsWith('/dependencies') ||
    pathname.startsWith('/code/dependencies');
  const isSastWorkspace =
    pathname.startsWith('/code/sast') ||
    pathname === '/sast' ||
    pathname.startsWith('/sast/');
  const isContainerSecurityWorkspace =
    pathname.startsWith('/container-security') ||
    pathname.startsWith('/code/container-security') ||
    pathname === '/cloud/docker';
  const isIacWorkspace =
    pathname.startsWith('/code/iac') ||
    pathname === '/code/iac-security' ||
    pathname === '/cloud/iac' ||
    pathname.startsWith('/iac');
  const isSalesWorkspace = pathname.startsWith('/sales');

  const isCodeWorkspace =
    !isApiSecurityWorkspace &&
    !isDependenciesWorkspace &&
    !isSastWorkspace &&
    !isContainerSecurityWorkspace &&
    !isIacWorkspace &&
    !isSalesWorkspace &&
    (pathname.startsWith('/code') ||
      pathname === '/overview' ||
      pathname === '/' ||
      pathname.startsWith('/runs') ||
      pathname.startsWith('/fixes') ||
      pathname.startsWith('/reports') ||
      pathname.startsWith('/assistant') ||
      pathname.startsWith('/home') ||
      pathname.startsWith('/projects') ||
      pathname.startsWith('/policies') ||
      pathname.startsWith('/integrations') ||
      pathname.startsWith('/audit-logs') ||
      pathname.startsWith('/states') ||
      pathname.startsWith('/repositories') ||
      pathname.startsWith('/findings') ||
      pathname.startsWith('/scans'));

  const isCloudWorkspace = pathname.startsWith('/cloud');

  const isAdminWorkspace = pathname.startsWith('/settings');

  const isDefenseWorkspace =
    !isApiSecurityWorkspace &&
    !isIacWorkspace &&
    (pathname.startsWith('/protect') ||
      pathname.startsWith('/agent') ||
      pathname.startsWith('/soc') ||
      pathname.startsWith('/qa'));

  const isSpecializedSuite =
    isApiSecurityWorkspace ||
    isDependenciesWorkspace ||
    isSastWorkspace ||
    isContainerSecurityWorkspace ||
    isIacWorkspace ||
    isCloudWorkspace ||
    isAdminWorkspace ||
    isDefenseWorkspace ||
    isSalesWorkspace;

  const isGlobalWorkspace = !isSpecializedSuite;

  const { currentProject } = useProject();

  // Dynamic badge metrics from real database findings summary for the current project
  const [badgeCounts, setBadgeCounts] = useState<{
    findings?: number;
    sast?: number;
    secrets?: number;
    dependencies?: number;
  }>({});

  const [cloudAgentState, setCloudAgentState] = useState<{
    isActive: boolean;
    issuesCount: number;
    attackPathsCount: number;
    coveragePct: number;
    statusText: string;
  }>({
    isActive: false,
    issuesCount: 0,
    attackPathsCount: 0,
    coveragePct: 0,
    statusText: 'No cloud connected',
  });

  useEffect(() => {
    let active = true;
    const fetchBadges = async () => {
      // Do not fetch or show global benchmark/demo findings when no project is scoped
      if (!currentProject?.id) {
        if (active) {
          setBadgeCounts({});
          setCloudAgentState({
            isActive: false,
            issuesCount: 0,
            attackPathsCount: 0,
            coveragePct: 0,
            statusText: 'Awaiting cloud connection',
          });
        }
        return;
      }
      try {
        const summary = await api.findings.summary({ project_id: currentProject.id });
        if (active && summary) {
          const cat = summary.category_counts || {};
          setBadgeCounts({
            findings: summary.total_findings || summary.status_counts?.open || 0,
            sast: cat.sast || cat.SAST || 0,
            secrets: cat.secret || cat.secrets || cat.SECRETS || 0,
            dependencies: cat.dependency || cat.dependencies || cat.SCA || 0,
          });
        }
      } catch {
        if (active) setBadgeCounts({});
      }

      if (isCloudWorkspace) {
        try {
          const [cc, ap] = await Promise.all([
            api.cloud.commandCenter(currentProject.id).catch(() => null),
            api.cloud.attackPaths(currentProject.id).catch(() => null),
          ]);
          if (active && cc) {
            setCloudAgentState({
              isActive: cc.master_agent?.is_active ?? false,
              issuesCount: cc.critical_issues || cc.total_issues || 0,
              attackPathsCount: ap?.items?.length || 0,
              coveragePct: cc.master_agent?.coverage_percentage ?? 0,
              statusText: cc.master_agent?.is_active
                ? `${cc.master_agent.coverage_percentage}% of areas assessed`
                : 'Awaiting cloud connection',
            });
          }
        } catch {
          if (active) {
            setCloudAgentState({
              isActive: false,
              issuesCount: 0,
              attackPathsCount: 0,
              coveragePct: 0,
              statusText: 'Awaiting cloud connection',
            });
          }
        }
      }
    };
    fetchBadges();
    return () => { active = false; };
  }, [currentProject?.id, isCloudWorkspace]);

  // ── 0. UNIFIED CORE WORKSPACE NAVIGATION (Daily DevSecOps Flow, Zero Duplicates) ──
  const coreWorkspaceItems: NavItem[] = [
    { id: 'ws-overview', label: 'Overview', href: '/overview', icon: LayoutGrid },
    { id: 'ws-assets', label: 'Assets', href: '/assets', icon: FolderGit2 },
    {
      id: 'ws-findings',
      label: 'Findings',
      href: '/findings',
      icon: ShieldAlert,
      badge: badgeCounts.findings && badgeCounts.findings > 0 ? badgeCounts.findings : undefined,
      badgeBg: '#EF4444',
    },
    { id: 'ws-fixes', label: 'Fixes & Patches', href: '/fixes', icon: Sparkles },
    { id: 'ws-runs', label: 'Security Runs', href: '/runs', icon: PlayCircle },
    { id: 'ws-reports', label: 'Reports', href: '/reports', icon: FileText },
  ];

  // ── 1. CORE CODE SECURITY SCANNERS (Unified, Clean, No Duplicates) ──
  const coreScannerItems: NavItem[] = [
    { id: 'sc-repositories', label: 'Repositories', href: '/repositories', icon: FolderGit2 },
    {
      id: 'sc-sast',
      label: 'SAST Analysis',
      href: '/code/sast',
      icon: Target,
      badge: badgeCounts.sast && badgeCounts.sast > 0 ? badgeCounts.sast : undefined,
      badgeBg: '#EF4444',
    },
    {
      id: 'sc-secrets',
      label: 'Secrets Detection',
      href: '/code/secrets',
      icon: Key,
      badge: badgeCounts.secrets && badgeCounts.secrets > 0 ? badgeCounts.secrets : undefined,
      badgeBg: '#EF4444',
    },
    {
      id: 'sc-deps',
      label: 'Dependencies & SCA',
      href: '/code/dependencies',
      icon: Box,
      badge: badgeCounts.dependencies && badgeCounts.dependencies > 0 ? badgeCounts.dependencies : undefined,
      badgeBg: '#EF4444',
    },
    { id: 'sc-iac', label: 'IaC Security', href: '/code/iac', icon: Layers },
    { id: 'sc-containers', label: 'Container Security', href: '/code/container-security', icon: Container },
    { id: 'sc-api-security', label: 'API Security', href: '/api-security/analysis', icon: Network, badge: 'New', badgeBg: '#18181B' },
  ];

  // ── 2. GOVERNANCE & POLICIES ──
  const coreGovernanceItems: NavItem[] = [
    { id: 'gov-policies', label: 'Policies (OPA)', href: '/code/policies', icon: FileCheck2 },
    { id: 'gov-audit', label: 'Audit Logs', href: '/audit-logs', icon: ShieldCheck },
  ];

  // ── 3. SPECIALIZED PRODUCT WORKSPACES (Quick Access Drawer) ──
  const specializedProductItems: NavItem[] = [
    { id: 'sp-cloud', label: 'Cloud Security', href: '/cloud', icon: Cloud },
    { id: 'sp-attack', label: 'Attack Surface', href: '/attack/surface', icon: Crosshair },
    { id: 'sp-protect', label: 'Protect & MCP Gateway', href: '/protect', icon: ShieldCheck },
    { id: 'sp-agent', label: 'Autonomous Agent Guard', href: '/agent', icon: Bot },
    { id: 'sp-soc', label: 'SOC & Triage', href: '/soc', icon: Activity },
    { id: 'sp-qa', label: 'Nexora QA', href: '/qa', icon: CheckSquare },
  ];

  // ── 4. ADMINISTRATION (De-duplicated & Clean) ──
  const coreAdminItems: NavItem[] = [
    { id: 'adm-integrations', label: 'Integrations', href: '/integrations', icon: Link2 },
    { id: 'adm-settings', label: 'Settings', href: '/settings', icon: Settings },
  ];

  // Legacy fallback lists retained for specialized sub-workspaces
  const workspaceItems: NavItem[] = coreWorkspaceItems;

  // ── 1. SECULAYER / THING CODE NAVIGATION (LOGICAL DEVSECOPS LIFECYCLE) ──
  const codeSourceItems: NavItem[] = [
    { id: 'code-overview', label: 'Overview', href: '/code', icon: LayoutGrid },
    { id: 'code-local-audit', label: 'Local Dev Guardrail', href: '/code/local-audit', icon: ShieldCheck, badge: 'Direct IDE', badgeBg: '#2563EB' },
    { id: 'code-repos', label: 'Repositories', href: '/code/repositories', icon: FolderGit2 },
  ];

  const codeScannerItems: NavItem[] = [
    {
      id: 'code-sast',
      label: 'SAST Analysis',
      href: '/code/sast',
      icon: Target,
      badge: badgeCounts.sast && badgeCounts.sast > 0 ? badgeCounts.sast : undefined,
      badgeBg: '#EF4444',
      children: [
        { id: 'sast-overview', label: 'Overview', href: '/code/sast' },
        { id: 'sast-agent', label: 'Autonomous Agent', href: '/code/sast/agent' },
        { id: 'sast-findings', label: 'Findings', href: '/code/sast/findings' },
        { id: 'sast-hotspots', label: 'Security Hotspots', href: '/code/sast/hotspots' },
        { id: 'sast-scans', label: 'Scans & Pipeline', href: '/code/sast/scans' },
        { id: 'sast-rules', label: 'Rules & Policies', href: '/code/sast/rules' },
        { id: 'sast-remediation', label: 'Remediation', href: '/code/sast/remediation' },
        { id: 'sast-reports', label: 'Reports & Evidence', href: '/code/evidence' },
        { id: 'sast-settings', label: 'Integrations & Settings', href: '/code/sast/integrations' },
      ],
    },
    {
      id: 'code-secrets',
      label: 'Secrets',
      href: '/code/secrets',
      icon: Key,
      badge: badgeCounts.secrets && badgeCounts.secrets > 0 ? badgeCounts.secrets : undefined,
      badgeBg: '#EF4444'
    },
    {
      id: 'code-deps',
      label: 'Dependencies',
      href: '/code/dependencies',
      icon: Box,
      badge: badgeCounts.dependencies && badgeCounts.dependencies > 0 ? badgeCounts.dependencies : undefined,
      badgeBg: '#EF4444',
      children: [
        { id: 'deps-overview', label: 'Overview', href: '/code/dependencies' },
        { id: 'deps-inventory', label: 'Inventory', href: '/code/dependencies/inventory' },
        { id: 'deps-vulnerabilities', label: 'Vulnerability Analysis', href: '/code/dependencies/vulnerabilities' },
        { id: 'deps-versions', label: 'Package Versions & Upgrades', href: '/code/dependencies/versions' },
        { id: 'deps-ecosystems', label: 'Package Ecosystems', href: '/code/dependencies/ecosystems' },
        { id: 'deps-graph', label: 'Dependency Graph', href: '/code/dependencies/graph' },
        { id: 'deps-licenses', label: 'License Compliance', href: '/code/dependencies/licenses' },
        { id: 'deps-health', label: 'Package Health & Maintenance', href: '/code/dependencies/health' },
        { id: 'deps-remediation', label: 'Dependency Remediation', href: '/code/dependencies/remediation' },
        { id: 'deps-sbom', label: 'SBOM & Component Mapping', href: '/code/dependencies/sbom' },
        { id: 'deps-policies', label: 'Dependency Policies', href: '/code/dependencies/policies' },
        { id: 'deps-cicd', label: 'Pull Request & CI/CD Checks', href: '/code/dependencies/ci-cd' },
        { id: 'deps-scans', label: 'Dependency Scans & Jobs', href: '/code/dependencies/scans' },
        { id: 'deps-reports', label: 'Reports & Analytics', href: '/code/dependencies/reports' },
        { id: 'deps-settings', label: 'Integrations & Settings', href: '/code/dependencies/settings' },
      ],
    },
    { id: 'code-sbom', label: 'SBOM', href: '/code/sbom', icon: FileCode2 },
    { id: 'code-supply-chain', label: 'Supply Chain', href: '/code/supply-chain', icon: Network },
    {
      id: 'code-iac',
      label: 'IaC Security',
      href: '/code/iac',
      icon: Layers,
    },
    {
      id: 'code-containers',
      label: 'Container Security',
      href: '/code/container-security',
      icon: Container,
    },
    {
      id: 'code-api-security',
      label: 'API Security',
      href: '/api-security',
      icon: Network,
      badge: 'New',
      badgeBg: '#18181B'
    },
  ];

  const codeTriageItems: NavItem[] = [
    {
      id: 'code-findings',
      label: 'Security Findings',
      href: '/code/findings',
      icon: ShieldAlert,
      badge: badgeCounts.findings && badgeCounts.findings > 0 ? badgeCounts.findings : undefined,
      badgeBg: '#EF4444'
    },
    { id: 'code-autofix', label: 'Autofix & Patches', href: '/code/autofix', icon: Sparkles },
    { id: 'code-evidence', label: 'Evidence Store', href: '/code/evidence', icon: ShieldCheck },
  ];

  const codeGatewayItems: NavItem[] = [
    { id: 'code-prs', label: 'Pull Requests', href: '/code/pull-requests', icon: GitPullRequest },
    { id: 'code-cicd', label: 'CI/CD Pipelines', href: '/code/ci-cd', icon: PlayCircle },
    { id: 'code-jobs', label: 'Security Jobs', href: '/code/jobs', icon: Workflow },
  ];

  const codeGovernanceItems: NavItem[] = [
    { id: 'code-policies', label: 'Policies (OPA)', href: '/code/policies', icon: FileCheck2 },
    { id: 'code-ai-sec', label: 'AI Security', href: '/code/ai-security', icon: Bot },
    { id: 'code-integrations', label: 'Integrations', href: '/code/integrations', icon: Link2 },
    { id: 'code-settings', label: 'Code Settings', href: '/code/settings', icon: Settings },
  ];

  // ── 2. KAVACH CLOUD (Autonomous AI Cloud Security) ──
  const cloudAutonomousItems: NavItem[] = [
    { id: 'cloud-overview', label: 'Overview', href: '/cloud?view=ov', icon: LayoutGrid },
    {
      id: 'cloud-command-center',
      label: 'Agent command center',
      href: '/cloud?view=cm',
      icon: Bot,
      badge: 'AI',
      badgeBg: '#2563EB',
    },
    {
      id: 'cloud-issues',
      label: 'Security issues',
      href: '/cloud?view=fi',
      icon: ShieldAlert,
      badge: cloudAgentState.issuesCount > 0 ? cloudAgentState.issuesCount : undefined,
      badgeBg: '#DC2626',
    },
    { id: 'cloud-assets', label: 'Assets', href: '/cloud?view=as', icon: Layers },
    {
      id: 'cloud-attack-paths',
      label: 'Attack paths',
      href: '/cloud?view=ag',
      icon: Target,
      badge: cloudAgentState.attackPathsCount > 0 ? cloudAgentState.attackPathsCount : undefined,
      badgeBg: '#EA580C',
    },
    { id: 'cloud-security-graph', label: 'Security graph', href: '/cloud?view=sg', icon: Network },
    { id: 'cloud-fixes', label: 'Fixes & remediations', href: '/cloud?view=fx', icon: Sparkles },
    { id: 'cloud-activity', label: 'Activity', href: '/cloud?view=ac', icon: Activity },
    { id: 'cloud-connect', label: 'Connect cloud', href: '/cloud?view=cn', icon: Link2 },
    { id: 'cloud-reports', label: 'Reports', href: '/cloud?view=rp', icon: FileText },
  ];

  // ── 3. ADMINISTRATION (Identity, Security & Organization) ──
  const adminAccessItems: NavItem[] = [
    { id: 'adm-members', label: 'Members', href: '/settings/members', icon: Users },
    { id: 'adm-roles', label: 'Roles', href: '/settings/roles', icon: Lock },
    { id: 'adm-api-keys', label: 'API Keys', href: '/settings/api-keys', icon: Key },
    { id: 'adm-sso', label: 'SSO', href: '/settings/sso', icon: Globe },
  ];

  const adminOrgItems: NavItem[] = [
    { id: 'adm-integrations', label: 'Integrations', href: '/settings/integrations', icon: Link2 },
    { id: 'adm-billing', label: 'Billing', href: '/settings/billing', icon: CreditCard },
    { id: 'adm-settings', label: 'Settings', href: '/settings', icon: Settings },
  ];

  // ── 4. BACK ITEMS FOR WORKSPACES ──
  const cloudBackItem: NavItem = {
    id: 'cloud-back-dashboard',
    label: '← Back to Dashboard',
    href: '/overview',
    icon: ArrowLeft,
  };

  const adminBackItem: NavItem = {
    id: 'admin-back-dashboard',
    label: '← Back to Dashboard',
    href: '/overview',
    icon: ArrowLeft,
  };

  const defenseBackItem: NavItem = {
    id: 'defense-back-dashboard',
    label: '← Back to Dashboard',
    href: '/overview',
    icon: ArrowLeft,
  };

  const salesBackItem: NavItem = {
    id: 'sales-back-dashboard',
    label: '← Back to Dashboard',
    href: '/overview',
    icon: ArrowLeft,
  };

  const apiSecurityBackItem: NavItem = {
    id: 'api-back-dashboard',
    label: '← Back to Dashboard',
    href: '/overview',
    icon: ArrowLeft,
  };

  const apiSecurityItems: NavItem[] = [
    { id: 'api-inventory', label: 'API Inventory', href: '/api-security/inventory', icon: Network },
    { id: 'api-analysis', label: 'Security Analysis', href: '/api-security/analysis', icon: Target },
    { id: 'api-findings', label: 'Findings', href: '/api-security/findings', icon: ShieldAlert },
    { id: 'api-attack-paths', label: 'Attack Paths', href: '/api-security/attack-paths', icon: Crosshair },
    { id: 'api-remediation', label: 'Remediation', href: '/api-security/remediation', icon: GitPullRequest },
    { id: 'api-reports', label: 'Reports & Compliance', href: '/api-security/reports', icon: FileCheck2 },
    { id: 'api-analyst', label: 'AI Security Analyst', href: '/api-security/analyst', icon: Bot },
  ];

  // ── 4A. DEPENDENCIES & SCA ENGINE EXCLUSIVE NAVIGATION ──
  const depsBackItem: NavItem = {
    id: 'deps-back-dashboard',
    label: '← Back to Dashboard',
    href: '/overview',
    icon: ArrowLeft,
  };

  const dependenciesItems: NavItem[] = [
    { id: 'deps-overview', label: 'Overview', href: '/code/dependencies', icon: LayoutGrid },
    { id: 'deps-inventory', label: 'Inventory', href: '/code/dependencies/inventory', icon: Box },
    { id: 'deps-vulnerabilities', label: 'Vulnerability Analysis', href: '/code/dependencies/vulnerabilities', icon: ShieldAlert },
    { id: 'deps-versions', label: 'Versions & Upgrades', href: '/code/dependencies/versions', icon: RefreshCw },
    { id: 'deps-ecosystems', label: 'Package Ecosystems', href: '/code/dependencies/ecosystems', icon: Layers },
    { id: 'deps-graph', label: 'Dependency Graph', href: '/code/dependencies/graph', icon: Network },
    { id: 'deps-licenses', label: 'License Compliance', href: '/code/dependencies/licenses', icon: FileCheck2 },
    { id: 'deps-health', label: 'Package Health', href: '/code/dependencies/health', icon: ShieldCheck },
    { id: 'deps-remediation', label: 'Remediation Queue', href: '/code/dependencies/remediation', icon: Sparkles },
    { id: 'deps-sbom', label: 'SBOM Mapping', href: '/code/dependencies/sbom', icon: FileCode2 },
    { id: 'deps-policies', label: 'Policies', href: '/code/dependencies/policies', icon: CheckSquare },
    { id: 'deps-cicd', label: 'CI/CD Checks', href: '/code/dependencies/ci-cd', icon: PlayCircle },
    { id: 'deps-scans', label: 'Scans & Jobs', href: '/code/dependencies/scans', icon: Workflow },
    { id: 'deps-reports', label: 'Reports', href: '/code/dependencies/reports', icon: FileText },
    { id: 'deps-settings', label: 'Settings', href: '/code/dependencies/settings', icon: Settings },
  ];

  // ── 4B. SAST ANALYSIS ENGINE EXCLUSIVE NAVIGATION ──
  const sastBackItem: NavItem = {
    id: 'sast-back-dashboard',
    label: '← Back to Dashboard',
    href: '/overview',
    icon: ArrowLeft,
  };

  const sastItems: NavItem[] = [
    { id: 'sast-overview', label: 'Overview', href: '/code/sast', icon: LayoutGrid },
    {
      id: 'sast-agent',
      label: 'Autonomous Agent',
      href: '/code/sast/agent',
      icon: Bot,
      badge: 'LIVE',
      badgeBg: '#10B981',
    },
    {
      id: 'sast-findings',
      label: 'Findings',
      href: '/code/sast/findings',
      icon: ShieldAlert,
      badge: badgeCounts.sast && badgeCounts.sast > 0 ? badgeCounts.sast : undefined,
      badgeBg: '#EF4444',
    },
    { id: 'sast-hotspots', label: 'Security Hotspots', href: '/code/sast/hotspots', icon: Flame },
    { id: 'sast-scans', label: 'Scans & Pipeline', href: '/code/sast/scans', icon: Workflow },
    { id: 'sast-rules', label: 'Rules & Policies', href: '/code/sast/rules', icon: CheckSquare },
    { id: 'sast-remediation', label: 'Remediation', href: '/code/sast/remediation', icon: Sparkles },
    { id: 'sast-reports', label: 'Reports & Evidence', href: '/code/evidence', icon: FileText },
    { id: 'sast-integrations', label: 'Integrations & Settings', href: '/code/sast/integrations', icon: Settings },
  ];

  // ── 4C. KAVACH / CONTAINER SECURITY EXCLUSIVE NAVIGATION ──
  const containerSecurityBackItem: NavItem = {
    id: 'container-back-dashboard',
    label: '← Back to Dashboard',
    href: '/overview',
    icon: ArrowLeft,
  };

  const containerPostureItems: NavItem[] = [
    { id: 'cs-overview', label: 'Overview', href: '/container-security', icon: LayoutGrid },
    { id: 'cs-inventory', label: 'Container Inventory', href: '/container-security/inventory', icon: Boxes },
    { id: 'cs-images', label: 'Image Security', href: '/container-security/images', icon: Container },
    { id: 'cs-dockerfiles', label: 'Dockerfile Security', href: '/container-security/dockerfiles', icon: FileCode2 },
  ];

  const containerVulnerabilityItems: NavItem[] = [
    { id: 'cs-findings', label: 'Findings & Vulnerabilities', href: '/container-security/findings', icon: ShieldAlert },
    { id: 'cs-secrets', label: 'Secrets Security', href: '/container-security/secrets', icon: Key },
    { id: 'cs-sbom', label: 'SBOM & Supply Chain', href: '/container-security/sbom', icon: Archive },
  ];

  const containerInfraItems: NavItem[] = [
    { id: 'cs-registries', label: 'Registry Management', href: '/container-security/registries', icon: HardDrive },
    { id: 'cs-workloads', label: 'Kubernetes Workloads', href: '/container-security/workloads', icon: Boxes },
    { id: 'cs-runtime', label: 'Runtime Security', href: '/container-security/runtime', icon: Activity },
  ];

  const containerPipelineItems: NavItem[] = [
    { id: 'cs-scans', label: 'Scans & Scan History', href: '/container-security/scans', icon: RefreshCw },
    { id: 'cs-cicd', label: 'CI/CD & Deployment Gates', href: '/container-security/ci-cd', icon: CheckSquare },
    { id: 'cs-ai', label: 'AI Security Assistant', href: '/container-security/ai', icon: Bot, badge: 'AI', badgeBg: '#2563EB' },
    { id: 'cs-remediation', label: 'AI Fixes & Remediation', href: '/container-security/remediation', icon: Sparkles },
  ];

  const containerGovernanceItems: NavItem[] = [
    { id: 'cs-policies', label: 'Security Policies', href: '/container-security/policies', icon: FileCheck2 },
    { id: 'cs-compliance', label: 'Compliance & Benchmarks', href: '/container-security/compliance', icon: ShieldCheck },
    { id: 'cs-integrations', label: 'Integrations', href: '/container-security/integrations', icon: Link2 },
    { id: 'cs-reports', label: 'Evidence & Reports', href: '/container-security/reports', icon: FileText },
    { id: 'cs-settings', label: 'Settings', href: '/container-security/settings', icon: Settings },
  ];

  // ── 4D. IAC SECURITY WORKSPACE EXCLUSIVE NAVIGATION (14 CORE ROUTES) ──
  const iacBackItem: NavItem = {
    id: 'iac-back-dashboard',
    label: '← Back to Dashboard',
    href: '/overview',
    icon: ArrowLeft,
  };

  const iacSecurityItems: NavItem[] = [
    { id: 'iac-overview', label: 'Overview', href: '/code/iac', icon: LayoutGrid },
    { id: 'iac-repositories', label: 'Repositories & Coverage', href: '/code/iac/repositories', icon: FolderGit2 },
    { id: 'iac-inventory', label: 'IaC Inventory', href: '/code/iac/inventory', icon: Boxes },
    { id: 'iac-findings', label: 'Security Findings', href: '/code/iac/findings', icon: ShieldAlert },
    { id: 'iac-graph', label: 'Infrastructure Graph', href: '/code/iac/graph', icon: Network },
    { id: 'iac-ai', label: 'AI Assistant', href: '/code/iac/ai', icon: Bot, badge: 'AI', badgeBg: '#2563EB' },
    { id: 'iac-remediation', label: 'AI Fixes & Remediation', href: '/code/iac/remediation', icon: Sparkles },
    { id: 'iac-plans', label: 'Plan & Change Analysis', href: '/code/iac/plans', icon: FileCode2 },
    { id: 'iac-scans', label: 'Scans & History', href: '/code/iac/scans', icon: RefreshCw },
    { id: 'iac-policies', label: 'Security Policies', href: '/code/iac/policies', icon: FileCheck2 },
    { id: 'iac-compliance', label: 'Compliance', href: '/code/iac/compliance', icon: ShieldCheck },
    { id: 'iac-integrations', label: 'Integrations', href: '/code/iac/integrations', icon: Link2 },
    { id: 'iac-reports', label: 'Evidence & Reports', href: '/code/iac/reports', icon: FileText },
    { id: 'iac-settings', label: 'Settings', href: '/code/iac/settings', icon: Settings },
  ];

  const defenseRuntimeItems: NavItem[] = [
    { id: 'adv-protect', label: 'Protect & MCP Gateway', href: '/protect', icon: Cpu },
    { id: 'adv-agent', label: 'Autonomous Agent Guard', href: '/agent', icon: Bot },
  ];

  const defenseOpsItems: NavItem[] = [
    { id: 'adv-soc', label: 'SOC & Triage', href: '/soc', icon: Radio },
    { id: 'adv-qa', label: 'Quality Engineering', href: '/qa', icon: CheckSquare },
  ];

  // ── 4B. SALES & ENTERPRISE WORKSPACE EXCLUSIVE NAVIGATION ──
  const salesCoreItems: NavItem[] = [
    { id: 'sales-overview', label: 'Sales Overview', href: '/sales', icon: LayoutGrid },
    { id: 'sales-pipeline', label: 'Deal Pipeline', href: '/sales/pipeline', icon: Workflow },
  ];

  const salesIntakeItems: NavItem[] = [
    { id: 'sales-book-demo', label: 'Book a Demo', href: '/sales/book-demo', icon: Calendar },
    { id: 'sales-request-demo', label: 'Request Demo Form', href: '/sales/request-demo', icon: Send },
    { id: 'sales-contact', label: 'Contact Sales', href: '/sales/contact', icon: Users },
    { id: 'sales-inquiry', label: 'Enterprise Inquiry', href: '/sales/enterprise-inquiry', icon: Briefcase },
    { id: 'sales-expert', label: 'Security Expert', href: '/sales/security-expert', icon: ShieldCheck },
  ];

  const salesEvaluationItems: NavItem[] = [
    { id: 'sales-qualification', label: 'Sales Qualification', href: '/sales/qualification', icon: Target },
    { id: 'sales-sandbox', label: 'Demo Sandbox', href: '/sales/demo-workspace', icon: Box },
    { id: 'sales-guided', label: 'Guided Product Tour', href: '/sales/guided-demo', icon: PlayCircle },
  ];

  const salesPocItems: NavItem[] = [
    { id: 'sales-poc-request', label: 'POC Request & Scope', href: '/sales/poc-request', icon: CheckSquare },
    { id: 'sales-poc-workspace', label: 'POC Workspace', href: '/sales/poc-workspace', icon: HardDrive },
    { id: 'sales-poc-progress', label: 'Milestone Progress', href: '/sales/poc-progress', icon: Activity },
    { id: 'sales-poc-results', label: 'Executive Results', href: '/sales/poc-results', icon: ShieldAlert },
  ];

  const salesCommercialItems: NavItem[] = [
    { id: 'sales-proposal', label: 'Proposal & Quote (CPQ)', href: '/sales/proposal', icon: FileCode2 },
    { id: 'sales-contract', label: 'Contract & Digital Sign', href: '/sales/contract', icon: Lock },
    { id: 'sales-onboarding', label: 'Enterprise Onboarding', href: '/sales/enterprise-onboarding', icon: Rocket },
  ];

  const { isProductEnabled } = useEntitlements();

  const isCodeEnabled = isProductEnabled('thing_code');
  const isCloudEnabled = isProductEnabled('thing_cloud');
  const isAttackEnabled = isProductEnabled('thing_attack');
  const isProtectEnabled = isProductEnabled('thing_protect');

  // Included products in active workspace subscription
  const productSuiteItems: NavItem[] = [];
  if (isCodeEnabled) productSuiteItems.push({ id: 'prod-code', label: 'Code Security', href: '/code', icon: Code2 });
  if (isCloudEnabled) productSuiteItems.push({ id: 'prod-cloud', label: 'Cloud Security', href: '/cloud', icon: Cloud });
  if (isAttackEnabled) productSuiteItems.push({ id: 'prod-attack', label: 'Attack Surface', href: '/attack', icon: Crosshair });
  if (isProtectEnabled) productSuiteItems.push({ id: 'prod-protect', label: 'Runtime Defense', href: '/protect', icon: Cpu });

  // Locked products discoverable in Explore Products / Add-ons area
  const lockedProductItems: NavItem[] = [];
  if (!isCodeEnabled) lockedProductItems.push({ id: 'locked-code', label: 'Code Security', href: '/code', icon: Code2, badge: 'Locked', badgeBg: '#475569' });
  if (!isCloudEnabled) lockedProductItems.push({ id: 'locked-cloud', label: 'Cloud Security', href: '/cloud', icon: Cloud, badge: 'Locked', badgeBg: '#475569' });
  if (!isAttackEnabled) lockedProductItems.push({ id: 'locked-attack', label: 'Attack Surface', href: '/attack', icon: Crosshair, badge: 'Locked', badgeBg: '#475569' });
  if (!isProtectEnabled) lockedProductItems.push({ id: 'locked-protect', label: 'Runtime Defense', href: '/protect', icon: Cpu, badge: 'Locked', badgeBg: '#475569' });

  const exploreCatalogItem: NavItem = { id: 'prod-catalog', label: 'Explore Products', href: '/catalog', icon: Boxes };

  // Deterministic active state matcher
  const checkIsActive = (href: string) => {
    // 1. Exact matches
    if (href === '/home') {
      return pathname === '/home';
    }
    if (href === '/code' || href === '/overview') {
      return (
        pathname === '/code' ||
        pathname === '/code/' ||
        pathname === '/overview' ||
        pathname === '/overview/' ||
        pathname === '/'
      );
    }
    if (href === '/catalog') {
      return pathname === '/catalog';
    }

    // 2. Pure Code submodules
    if (href === '/code/repositories') {
      return pathname.startsWith('/code/repositories');
    }
    if (href === '/code/sast' || href === '/sast') {
      return (
        pathname === '/code/sast' ||
        pathname === '/code/sast/' ||
        pathname === '/sast' ||
        pathname === '/sast/'
      );
    }
    if (href.startsWith('/code/sast/')) {
      return pathname === href || pathname.startsWith(href + '/');
    }
    if (href === '/code/secrets') {
      return pathname.startsWith('/code/secrets');
    }
    if (href === '/code/dependencies' || href === '/dependencies') {
      return (
        pathname === '/code/dependencies' ||
        pathname === '/code/dependencies/' ||
        pathname === '/dependencies' ||
        pathname === '/dependencies/'
      );
    }
    if (href.startsWith('/code/dependencies/')) {
      return pathname === href || pathname.startsWith(href + '/');
    }
    if (href === '/code/sbom') {
      return pathname.startsWith('/code/sbom');
    }
    if (href === '/code/ci-cd') {
      return pathname.startsWith('/code/ci-cd') || pathname === '/ci-cd';
    }
    if (href === '/code/pull-requests') {
      return (
        pathname.startsWith('/code/pull-requests') ||
        pathname.startsWith('/code/pr-reviews')
      );
    }
    if (href === '/code/jobs') {
      return (
        pathname.startsWith('/code/jobs') ||
        pathname === '/scans' ||
        pathname.startsWith('/scans/')
      );
    }
    if (href === '/code/findings') {
      return (
        pathname.startsWith('/code/findings') ||
        pathname === '/findings' ||
        pathname.startsWith('/findings/')
      );
    }
    if (href === '/code/autofix') {
      return pathname.startsWith('/code/autofix');
    }
    if (href === '/code/evidence') {
      return pathname.startsWith('/code/evidence');
    }
    if (href === '/code/policies') {
      return (
        pathname === '/policies' ||
        pathname.startsWith('/code/policies') ||
        pathname.startsWith('/code/settings/policies')
      );
    }

    // 3. Cloud & Infra submodules
    if (href === '/code/iac') {
      return pathname === '/code/iac' || pathname === '/code/iac/';
    }
    if (href.startsWith('/code/iac/')) {
      return pathname === href || pathname.startsWith(href + '/');
    }
    if (href === '/cloud/iac') {
      return pathname.startsWith('/cloud/iac');
    }
    if (
      href === '/container-security' ||
      href === '/code/container-security' ||
      href === '/cloud/docker'
    ) {
      return (
        pathname === '/container-security' ||
        pathname === '/container-security/' ||
        pathname === '/code/container-security' ||
        pathname === '/code/container-security/' ||
        pathname === '/cloud/docker'
      );
    }
    if (href.startsWith('/container-security/') || href.startsWith('/code/container-security/')) {
      const pureHref = href.split('?')[0];
      return pathname === pureHref || pathname.startsWith(pureHref + '/');
    }
    if (href === '/code/supply-chain') {
      return pathname.startsWith('/code/supply-chain');
    }
    if (href.startsWith('/cloud')) {
      if (href.includes('view=')) {
        const targetView = href.split('view=')[1];
        if (typeof window !== 'undefined') {
          const search = window.location.search || window.location.hash;
          if (search.includes(`view=${targetView}`) || search.includes(`#${targetView}`)) return true;
          if (targetView === 'ov' && (!search || search === '?view=ov' || search === '#ov')) return true;
        }
        return false;
      }
      return (
        pathname === '/cloud' ||
        pathname === '/cloud/'
      );
    }
    if (href === '/kubernetes') {
      return pathname === '/kubernetes' || pathname.startsWith('/cloud/kubernetes');
    }
    if (href === '/attack/surface') {
      return pathname.startsWith('/attack');
    }
    if (href === '/compliance') {
      return pathname === '/compliance' || pathname.startsWith('/cloud/compliance');
    }

    // 4. Permanent Core Items
    if (href === '/overview') {
      return pathname === '/overview' || pathname === '/home' || pathname === '/dashboard' || pathname === '/code' || pathname === '/';
    }
    if (href === '/assistant') {
      return pathname.startsWith('/assistant') || pathname.startsWith('/agent');
    }
    if (href === '/repositories') {
      return pathname.startsWith('/repositories') || pathname.startsWith('/code/repositories');
    }
    if (href === '/runs') {
      return pathname.startsWith('/runs') || pathname.startsWith('/scans') || pathname.startsWith('/code/sast/scans') || pathname.startsWith('/code/scans');
    }
    if (href === '/findings') {
      return pathname.startsWith('/findings') || pathname.startsWith('/code/findings');
    }
    if (href === '/fixes') {
      return pathname.startsWith('/fixes') || pathname.startsWith('/code/autofix');
    }
    if (href === '/reports') {
      return pathname.startsWith('/reports') || pathname.startsWith('/code/evidence');
    }
    if (href === '/policies') {
      return (
        pathname === '/policies' ||
        pathname.startsWith('/policies/') ||
        pathname.startsWith('/code/policies') ||
        pathname.startsWith('/code/settings/policies')
      );
    }
    if (href === '/settings') {
      return (
        pathname === '/settings' ||
        pathname.startsWith('/settings/') ||
        pathname === '/integrations' ||
        pathname.startsWith('/integrations/') ||
        pathname.startsWith('/code/settings')
      );
    }

    // 6. Specialized Defense & API Security
    if (href === '/api-security') {
      return pathname === '/api-security' || pathname === '/api-security/';
    }
    if (href.startsWith('/api-security/')) {
      return pathname === href || pathname.startsWith(href + '/');
    }
    if (href === '/protect') {
      return pathname.startsWith('/protect');
    }
    if (href === '/agent') {
      return pathname.startsWith('/agent');
    }
    if (href === '/soc') {
      return pathname.startsWith('/soc');
    }
    if (href === '/qa') {
      return pathname.startsWith('/qa');
    }

    return pathname.startsWith(href);
  };

  const width = isCollapsed ? '64px' : '240px';

  const renderItem = (item: NavItem, isDrawer: boolean = false) => {
    const isEffectiveCollapsed = isDrawer ? false : isCollapsed;
    const hasChildren = Boolean(item.children && item.children.length > 0);
    const isChildrenExpanded = Boolean(
      hasChildren && !isEffectiveCollapsed && (pathname.startsWith(item.href) || pathname === item.href)
    );
    const isActive = checkIsActive(item.href);
    const Icon = item.icon;
    const getTourAttr = (id: string, href: string) => {
      if (id === 'ws-overview' || id === 'code-overview' || href === '/code' || href === '/overview') return 'tour-code-overview';
      if (id === 'ws-projects' || href === '/projects') return 'tour-workspace-projects';
      if (id === 'ws-repositories' || id === 'code-repos' || href === '/repositories' || href === '/code/repositories') return 'tour-code-repos';
      if (id === 'ws-findings' || id === 'code-findings' || href === '/code/findings') return 'tour-code-findings';
      if (id === 'ws-scans' || href === '/code/sast/scans') return 'tour-code-scans';
      if (id === 'ws-policies' || id === 'code-policies' || href === '/code/policies' || href === '/policies') return 'tour-code-policies';
      if (id === 'ws-integrations' || href === '/integrations') return 'tour-workspace-integrations';
      if (id === 'ws-audit-logs' || href === '/audit-logs') return 'tour-workspace-audit';
      if (id === 'code-sast' || href === '/code/sast') return 'tour-code-sast';
      if (id === 'code-secrets' || href === '/code/secrets') return 'tour-code-secrets';
      if (id === 'code-deps' || href === '/code/dependencies') return 'tour-code-deps';
      if (id === 'code-containers' || href === '/code/container-security') return 'tour-code-containers';
      if (id === 'code-autofix' || href === '/code/autofix') return 'tour-code-autofix';
      if (id === 'code-prs' || href === '/code/pull-requests') return 'tour-code-prs';
      if (id === 'settings' || href === '/settings') return 'settings-action';
      return undefined;
    };
    const tourAttr = getTourAttr(item.id, item.href);

    return (
      <div key={item.id} style={{ display: 'flex', flexDirection: 'column' }}>
        <Link
          href={item.href}
          prefetch={true}
          data-tour={tourAttr}
          onClick={() => {
            if (isDrawer && onCloseMobile) onCloseMobile();
          }}
          title={isEffectiveCollapsed ? item.label : undefined}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isEffectiveCollapsed ? 'center' : 'space-between',
            padding: isEffectiveCollapsed ? '9px 0' : '7px 12px',
            borderRadius: '7px',
            backgroundColor: isActive && !hasChildren ? '#F0FDF4' : isChildrenExpanded ? '#F8FAFC' : 'transparent',
            border: isActive && !hasChildren ? '1px solid #BBF7D0' : '1px solid transparent',
            color: isActive ? '#0F172A' : isChildrenExpanded ? '#09090B' : '#475569',
            fontWeight: isActive || isChildrenExpanded ? 600 : 500,
            fontSize: '13px',
            textDecoration: 'none',
            transition: 'background-color 120ms ease, color 120ms ease, border-color 120ms ease',
            margin: '2px 0',
          }}
          onMouseEnter={(e) => {
            if (!isActive && !isChildrenExpanded) {
              e.currentTarget.style.backgroundColor = '#F8FAFC';
              e.currentTarget.style.color = '#0F172A';
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive && !isChildrenExpanded) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#475569';
            }
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <Icon
              size={16}
              color={isActive ? '#16A34A' : isChildrenExpanded ? '#09090B' : '#64748B'}
              style={{ flexShrink: 0 }}
            />
            {!isEffectiveCollapsed && (
              <span
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {item.label}
              </span>
            )}
          </div>

          {!isEffectiveCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {item.badge !== undefined && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    lineHeight: '16px',
                    color: '#FFFFFF',
                    backgroundColor: item.badgeBg || '#EF4444',
                    borderRadius: '9999px',
                    padding: '0 6px',
                    minWidth: '20px',
                    textAlign: 'center',
                    flexShrink: 0,
                  }}
                >
                  {item.badge}
                </span>
              )}
              {hasChildren && (
                <ChevronDown
                  size={14}
                  color={isChildrenExpanded ? '#09090B' : '#94A3B8'}
                  style={{
                    transform: isChildrenExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                    transition: 'transform 150ms ease',
                  }}
                />
              )}
            </div>
          )}
        </Link>

        {/* Sub-items accordion */}
        {isChildrenExpanded && item.children && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', margin: '2px 0 4px 0' }}>
            {item.children.map((subModule) => {
              const hasSubPages = Boolean(subModule.children && subModule.children.length > 0);

              // Check if this module is currently active
              let isModuleActive = false;
              if (subModule.id === 'deps-overview') {
                isModuleActive =
                  pathname === '/code/dependencies' ||
                  pathname.startsWith('/code/dependencies/trends') ||
                  pathname.startsWith('/code/dependencies/critical') ||
                  pathname.startsWith('/code/dependencies/outdated') ||
                  pathname.startsWith('/code/dependencies/coverage');
              } else if (subModule.id === 'deps-inventory') {
                isModuleActive =
                  (pathname.startsWith('/code/dependencies/inventory') && !pathname.startsWith('/code/dependencies/licenses')) ||
                  pathname.startsWith('/code/dependencies/direct') ||
                  pathname.startsWith('/code/dependencies/transitive') ||
                  pathname.startsWith('/code/dependencies/usage') ||
                  pathname.startsWith('/code/dependencies/duplicates');
              } else if (subModule.id === 'deps-vulnerabilities') {
                isModuleActive = pathname.startsWith('/code/dependencies/vulnerabilities');
              } else if (subModule.id === 'deps-versions') {
                isModuleActive = pathname.startsWith('/code/dependencies/versions');
              } else if (subModule.id === 'deps-ecosystems') {
                isModuleActive = pathname.startsWith('/code/dependencies/ecosystems');
              } else if (subModule.id === 'deps-graph') {
                isModuleActive = pathname.startsWith('/code/dependencies/graph');
              } else if (subModule.id === 'deps-licenses') {
                isModuleActive = pathname.startsWith('/code/dependencies/licenses');
              } else if (subModule.id === 'deps-health') {
                isModuleActive = pathname.startsWith('/code/dependencies/health');
              } else if (subModule.id === 'deps-remediation') {
                isModuleActive = pathname.startsWith('/code/dependencies/remediation');
              } else if (subModule.id === 'deps-sbom') {
                isModuleActive = pathname.startsWith('/code/dependencies/sbom');
              } else if (subModule.id === 'deps-policies') {
                isModuleActive = pathname.startsWith('/code/dependencies/policies');
              } else if (subModule.id === 'deps-cicd') {
                isModuleActive = pathname.startsWith('/code/dependencies/ci-cd');
              } else if (subModule.id === 'deps-scans') {
                isModuleActive = pathname.startsWith('/code/dependencies/scans');
              } else if (subModule.id === 'deps-reports') {
                isModuleActive = pathname.startsWith('/code/dependencies/reports');
              } else if (subModule.id === 'deps-settings') {
                isModuleActive = pathname.startsWith('/code/dependencies/settings');
              } else if (subModule.id.startsWith('cs-')) {
                const [subBase, subQuery] = subModule.href.split('?');
                const isBasePath = pathname === subBase;
                if (subQuery && typeof window !== 'undefined') {
                  isModuleActive = isBasePath && window.location.search.includes(subQuery);
                } else {
                  isModuleActive = isBasePath;
                }
              } else {
                isModuleActive = pathname === subModule.href || pathname.startsWith(subModule.href + '/');
              }

              return (
                <div key={subModule.id} style={{ display: 'flex', flexDirection: 'column' }}>
                  {/* Module header link */}
                  <Link
                    href={subModule.href}
                    prefetch={true}
                    onClick={() => {
                      if (isDrawer && onCloseMobile) onCloseMobile();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px 6px 34px',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                      fontWeight: isModuleActive ? 600 : 500,
                      color: isModuleActive ? '#FFFFFF' : '#334155',
                      backgroundColor: isModuleActive ? '#09090B' : 'transparent',
                      textDecoration: 'none',
                      transition: 'all 120ms ease',
                      margin: '1px 0',
                    }}
                    onMouseEnter={(e) => {
                      if (!isModuleActive) {
                        e.currentTarget.style.backgroundColor = '#F1F5F9';
                        e.currentTarget.style.color = '#0F172A';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isModuleActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#334155';
                      }
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {subModule.label}
                    </span>
                  </Link>

                  {/* Subpages indented — ONLY displayed if this module is ACTIVE */}
                  {isModuleActive && hasSubPages && subModule.children && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', margin: '2px 0 4px 0' }}>
                      {subModule.children.map((subPage) => {
                        let isSubPageActive = false;
                        if (subPage.href === '/code/dependencies') {
                          isSubPageActive = pathname === '/code/dependencies';
                        } else if (subPage.href === '/code/dependencies/inventory') {
                          isSubPageActive = pathname === '/code/dependencies/inventory';
                        } else if (subPage.href === '/code/dependencies/vulnerabilities') {
                          isSubPageActive = pathname === '/code/dependencies/vulnerabilities';
                        } else if (subPage.href === '/code/dependencies/versions') {
                          isSubPageActive = pathname === '/code/dependencies/versions';
                        } else if (subPage.href === '/code/dependencies/ecosystems') {
                          isSubPageActive = pathname === '/code/dependencies/ecosystems';
                        } else if (subPage.href === '/code/dependencies/graph') {
                          isSubPageActive = pathname === '/code/dependencies/graph';
                        } else if (subPage.href === '/code/dependencies/licenses') {
                          isSubPageActive = pathname === '/code/dependencies/licenses';
                        } else if (subPage.href === '/code/dependencies/health') {
                          isSubPageActive = pathname === '/code/dependencies/health';
                        } else if (subPage.id === 'deps-hlth-detail') {
                          isSubPageActive =
                            pathname.startsWith('/code/dependencies/health/') &&
                            !['/code/dependencies/health/maintenance', '/code/dependencies/health/abandoned', '/code/dependencies/health/releases'].includes(pathname);
                        } else if (subPage.href === '/code/dependencies/remediation') {
                          isSubPageActive = pathname === '/code/dependencies/remediation';
                        } else if (subPage.href === '/code/dependencies/sbom') {
                          isSubPageActive = pathname === '/code/dependencies/sbom';
                        } else if (subPage.href === '/code/dependencies/policies') {
                          isSubPageActive = pathname === '/code/dependencies/policies';
                        } else if (subPage.href === '/code/dependencies/ci-cd') {
                          isSubPageActive = pathname === '/code/dependencies/ci-cd';
                        } else if (subPage.id === 'deps-sbom-detail') {
                          isSubPageActive =
                            pathname.startsWith('/code/dependencies/sbom/') &&
                            !['/code/dependencies/sbom/repositories', '/code/dependencies/sbom/diff', '/code/dependencies/sbom/exports'].includes(pathname);
                        } else if (subPage.id === 'deps-rep-overview') {
                          isSubPageActive = pathname === '/code/dependencies/reports';
                        } else if (subPage.id === 'deps-rep-vulnerabilities') {
                          isSubPageActive = pathname.startsWith('/code/dependencies/reports/vulnerabilities');
                        } else if (subPage.id === 'deps-rep-remediation') {
                          isSubPageActive = pathname.startsWith('/code/dependencies/reports/remediation');
                        } else if (subPage.id === 'deps-rep-licenses') {
                          isSubPageActive = pathname.startsWith('/code/dependencies/reports/licenses');
                        } else if (subPage.id === 'deps-rep-repositories') {
                          isSubPageActive = pathname.startsWith('/code/dependencies/reports/repositories');
                        } else if (subPage.id === 'deps-set-general') {
                          isSubPageActive = pathname === '/code/dependencies/settings';
                        } else if (subPage.id === 'deps-set-registries') {
                          isSubPageActive = pathname.startsWith('/code/dependencies/settings/registries');
                        } else if (subPage.id === 'deps-set-scanners') {
                          isSubPageActive = pathname.startsWith('/code/dependencies/settings/scanners');
                        } else if (subPage.id === 'deps-set-access') {
                          isSubPageActive = pathname.startsWith('/code/dependencies/settings/access');
                        } else if (subPage.id === 'deps-set-audit') {
                          isSubPageActive = pathname.startsWith('/code/dependencies/settings/audit');
                        } else {
                          isSubPageActive = pathname === subPage.href || pathname.startsWith(subPage.href + '/');
                        }

                        return (
                          <Link
                            key={subPage.id}
                            href={subPage.href}
                            prefetch={true}
                            onClick={() => {
                              if (isDrawer && onCloseMobile) onCloseMobile();
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '5px 10px 5px 44px',
                              borderRadius: '6px',
                              fontSize: '11.5px',
                              fontWeight: isSubPageActive ? 600 : 400,
                              color: isSubPageActive ? '#09090B' : '#64748B',
                              backgroundColor: isSubPageActive ? '#F1F5F9' : 'transparent',
                              textDecoration: 'none',
                              transition: 'all 120ms ease',
                            }}
                            onMouseEnter={(e) => {
                              if (!isSubPageActive) {
                                e.currentTarget.style.backgroundColor = '#F8FAFC';
                                e.currentTarget.style.color = '#0F172A';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSubPageActive) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = '#64748B';
                              }
                            }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {subPage.label}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderSectionHeader = (title: string, isDrawer: boolean = false) => {
    if (isCollapsed && !isDrawer) {
      return (
        <div
          style={{
            height: '1px',
            backgroundColor: '#E2E8F0',
            margin: '8px 10px',
          }}
        />
      );
    }
    return (
      <div
        style={{
          fontSize: '10px',
          fontWeight: 700,
          color: '#475569',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginTop: '16px',
          padding: '4px 10px 4px',
        }}
      >
        {title}
      </div>
    );
  };

  const renderNavContent = (isDrawer: boolean = false) => {
    const itemRenderer = (item: NavItem) => renderItem(item, isDrawer);
    const headerRenderer = (title: string) => renderSectionHeader(title, isDrawer);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
        {/* ── 0. UNIFIED PLATFORM WORKSPACE (Ultra Clean, Essential Daily Flow) ── */}
        {!isSpecializedSuite && (
          <>
            {headerRenderer('Workspace')}
            {coreWorkspaceItems.map(itemRenderer)}

            {headerRenderer('Security Scanners')}
            {coreScannerItems.map(itemRenderer)}

            {headerRenderer('Governance & Settings')}
            {coreGovernanceItems.map(itemRenderer)}
            {coreAdminItems.map(itemRenderer)}
          </>
        )}

        {/* ── 2. THING CLOUD WORKSPACE EXCLUSIVE NAVIGATION ── */}
        {isCloudWorkspace && (
          <>
            <div style={{ marginBottom: '4px' }}>
              {itemRenderer(cloudBackItem)}
            </div>
            {headerRenderer('CLOUD WORKSPACE')}
            {cloudAutonomousItems.map(itemRenderer)}

            {/* AI Agent Status Card */}
            {!isCollapsed && (
              <Link
                href="/cloud?view=cm"
                style={{
                  display: 'block',
                  marginTop: '16px',
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  background: '#FFFFFF',
                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '13px', color: '#0F172A' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: cloudAgentState.isActive ? '#16A34A' : '#94A3B8', display: 'inline-block' }}></span>
                  {cloudAgentState.isActive ? 'Master Agent active' : 'Master Agent idle'}
                </div>
                <div style={{ color: '#64748B', fontSize: '11.5px', margin: '4px 0 10px' }}>
                  {cloudAgentState.isActive ? 'Autonomous security active' : 'Connect cloud to activate'}
                </div>
                <div style={{ height: '6px', borderRadius: '3px', background: '#E2E8F0', overflow: 'hidden' }}>
                  <div style={{ width: `${cloudAgentState.coveragePct}%`, height: '100%', background: cloudAgentState.isActive ? '#16A34A' : '#CBD5E1', borderRadius: '3px' }}></div>
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{cloudAgentState.statusText}</span>
                  <span style={{ color: '#2563EB', fontWeight: 600 }}>Command center →</span>
                </div>
              </Link>
            )}
          </>
        )}

        {/* ── 3. ADMINISTRATION EXCLUSIVE NAVIGATION ── */}
        {isAdminWorkspace && (
          <>
            <div style={{ marginBottom: '4px' }}>
              {itemRenderer(adminBackItem)}
            </div>
            {headerRenderer('Access & Identity')}
            {adminAccessItems.map(itemRenderer)}

            {headerRenderer('Organization & Billing')}
            {adminOrgItems.map(itemRenderer)}
          </>
        )}

        {/* ── 4. API SECURITY WORKSPACE EXCLUSIVE NAVIGATION ── */}
        {isApiSecurityWorkspace && (
          <>
            <div style={{ marginBottom: '4px' }}>
              {itemRenderer(apiSecurityBackItem)}
            </div>
            {headerRenderer('API Security Engine')}
            {apiSecurityItems.map(itemRenderer)}
          </>
        )}

        {/* ── 5. DEPENDENCIES & SCA WORKSPACE EXCLUSIVE NAVIGATION ── */}
        {isDependenciesWorkspace && (
          <>
            <div style={{ marginBottom: '4px' }}>
              {itemRenderer(depsBackItem)}
            </div>
            {headerRenderer('SCA & Supply Chain')}
            {dependenciesItems.map(itemRenderer)}
          </>
        )}

        {/* ── 5B. SAST WORKSPACE EXCLUSIVE NAVIGATION ── */}
        {isSastWorkspace && (
          <>
            <div style={{ marginBottom: '4px' }}>
              {itemRenderer(sastBackItem)}
            </div>
            {headerRenderer('SAST Analysis Engine')}
            {sastItems.map(itemRenderer)}

            {headerRenderer('AI & Multi-Agent Guard')}
            {itemRenderer({
              id: 'sast-nav-agent-guard',
              label: 'Autonomous Agent Guard',
              href: '/agent',
              icon: Bot,
            })}
            {itemRenderer({
              id: 'sast-nav-runs',
              label: 'Multi-Agent Runs',
              href: '/runs',
              icon: PlayCircle,
            })}
          </>
        )}

        {/* ── 5C. IAC SECURITY WORKSPACE EXCLUSIVE NAVIGATION ── */}
        {isIacWorkspace && (
          <>
            <div style={{ marginBottom: '4px' }}>
              {itemRenderer(iacBackItem)}
            </div>
            {headerRenderer('INFRASTRUCTURE SECURITY')}
            {iacSecurityItems.map(itemRenderer)}
          </>
        )}

        {/* ── 5D. CONTAINER SECURITY EXCLUSIVE NAVIGATION ── */}
        {isContainerSecurityWorkspace && (
          <>
            <div style={{ marginBottom: '4px' }}>
              {itemRenderer(containerSecurityBackItem)}
            </div>
            {headerRenderer('POSTURE & INVENTORY')}
            {containerPostureItems.map(itemRenderer)}

            {headerRenderer('VULNERABILITIES & SECRETS')}
            {containerVulnerabilityItems.map(itemRenderer)}

            {headerRenderer('INFRASTRUCTURE & RUNTIME')}
            {containerInfraItems.map(itemRenderer)}

            {headerRenderer('PIPELINES & AI REMEDIATION')}
            {containerPipelineItems.map(itemRenderer)}

            {headerRenderer('GOVERNANCE & PLATFORM')}
            {containerGovernanceItems.map(itemRenderer)}
          </>
        )}

        {/* ── 6. SPECIALIZED DEFENSE WORKSPACE NAVIGATION ── */}
        {isDefenseWorkspace && (
          <>
            <div style={{ marginBottom: '4px' }}>
              {itemRenderer(defenseBackItem)}
            </div>
            {headerRenderer('Runtime & Gateways')}
            {defenseRuntimeItems.map(itemRenderer)}

            {headerRenderer('Operations & QA')}
            {defenseOpsItems.map(itemRenderer)}
          </>
        )}

        {/* ── 7. SALES & ENTERPRISE WORKSPACE EXCLUSIVE NAVIGATION ── */}
        {isSalesWorkspace && (
          <>
            <div style={{ marginBottom: '4px' }}>
              {itemRenderer(salesBackItem)}
            </div>
            {headerRenderer('Sales Dashboard')}
            {salesCoreItems.map(itemRenderer)}

            {headerRenderer('Customer Intake')}
            {salesIntakeItems.map(itemRenderer)}

            {headerRenderer('Qualification & Sandbox')}
            {salesEvaluationItems.map(itemRenderer)}

            {headerRenderer('Technical POC Engine')}
            {salesPocItems.map(itemRenderer)}

            {headerRenderer('CPQ & Onboarding')}
            {salesCommercialItems.map(itemRenderer)}
          </>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sidebar (Permanent sticky desktop layout, hidden on mobile via .kavach-desktop-sidebar) */}
      <aside
        aria-label="THING Unified Platform Sidebar"
        className="kavach-desktop-sidebar"
        style={{
          width: 'var(--sidebar-width, ' + width + ')',
          minWidth: 'var(--sidebar-width, ' + width + ')',
          maxWidth: 'var(--sidebar-width, ' + width + ')',
          height: '100vh',
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          boxSizing: 'border-box',
          transition: 'width 200ms cubic-bezier(0.16, 1, 0.3, 1), min-width 200ms cubic-bezier(0.16, 1, 0.3, 1), max-width 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Brand Header */}
        <div
          data-tour="sidebar-workspace"
          style={{
            height: 'var(--topbar-height, 56px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            padding: isCollapsed ? '0' : '0 12px 0 16px',
            borderBottom: '1px solid #E2E8F0',
            boxSizing: 'border-box',
          }}
        >
          <Link
            href={isIacWorkspace ? "/code/iac" : isContainerSecurityWorkspace ? "/container-security" : "/code"}
            prefetch={false}
            title={isIacWorkspace ? "Kavach — IaC Security" : isContainerSecurityWorkspace ? "Kavach — Container Security" : "Kavach"}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              width: isCollapsed ? '100%' : 'auto',
              gap: '8px',
              textDecoration: 'none',
              minWidth: 0,
            }}
          >
            {isCollapsed ? (
              <KavachMark size={26} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KavachLogo size={26} textSize={18} />
                {isIacWorkspace && (
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      color: '#2563EB',
                      backgroundColor: '#EFF6FF',
                      border: '1px solid #DBEAFE',
                      borderRadius: '4px',
                      padding: '1px 5px',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    IaC
                  </span>
                )}
                {pathname.startsWith('/container-security') && (
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      color: '#0284C7',
                      backgroundColor: '#F0F9FF',
                      border: '1px solid #BAE6FD',
                      borderRadius: '4px',
                      padding: '1px 5px',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    CONTAINERS
                  </span>
                )}
              </div>
            )}
          </Link>

          {onToggleCollapse && !isCollapsed && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={onToggleCollapse}
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
                style={{
                  width: '28px',
                  height: '28px',
                  background: 'transparent',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  color: '#64748B',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                  boxSizing: 'border-box',
                  padding: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F1F5F9';
                  e.currentTarget.style.color = '#0F172A';
                  e.currentTarget.style.borderColor = '#CBD5E1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#64748B';
                  e.currentTarget.style.borderColor = '#E2E8F0';
                }}
              >
                <ChevronLeft size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Navigation List — Strictly consistent per Rule 6 */}
        <nav
          style={{
            flexGrow: 1,
            overflowY: 'auto',
            padding: isCollapsed ? '10px 6px' : '8px 10px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {renderNavContent(false)}
        </nav>

        {/* Security Docs Footer */}
        {!isCollapsed ? (
          <div style={{ padding: '8px 10px', borderTop: '1px solid #E2E8F0' }}>
            <Link
              href="/docs"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '7px 10px',
                borderRadius: '6px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                textDecoration: 'none',
                color: '#0F172A',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
            >
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <img
                  src="/kavach-cube.png"
                  alt="Kavach"
                  style={{ width: '16px', height: '16px', objectFit: 'contain' }}
                />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', lineHeight: 1.2 }}>
                  Security Docs
                </div>
                <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '1px', lineHeight: 1.2 }}>
                  Guides & OPA Rego
                </div>
              </div>
            </Link>
          </div>
        ) : (
          <div style={{ padding: '8px 0', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'center' }}>
            <Link
              href="/docs"
              title="Security Docs: Guides & OPA Rego"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563EB',
                textDecoration: 'none',
              }}
            >
              <img
                src="/kavach-cube.png"
                alt="Kavach"
                style={{ width: '16px', height: '16px', objectFit: 'contain' }}
              />
            </Link>
          </div>
        )}

        {/* Collapsed Toggle Button */}
        {isCollapsed && onToggleCollapse && (
          <div
            style={{
              borderTop: '1px solid #E2E8F0',
              padding: '8px 0',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <button
              onClick={onToggleCollapse}
              aria-label="Expand sidebar"
              style={{
                background: 'none',
                border: 'none',
                color: '#64748B',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </aside>

      {/* Mobile Drawer (visible on < 1024px when isMobileOpen is true) */}
      {isMobileOpen && (
        <div
          className="kavach-mobile-drawer-root"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
          }}
        >
          {/* Backdrop */}
          <div
            onClick={onCloseMobile}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(3px)',
              zIndex: 1001,
            }}
          />

          {/* Off-canvas panel */}
          <aside
            aria-label="Mobile Unified Platform Navigation"
            style={{
              position: 'relative',
              zIndex: 1002,
              width: '280px',
              maxWidth: '85vw',
              height: '100vh',
              backgroundColor: '#FFFFFF',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
              animation: 'slideInLeft 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          >
            <div
              style={{
                height: '56px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 16px',
                borderBottom: '1px solid #E2E8F0',
              }}
            >
              <Link
                href="/code"
                onClick={onCloseMobile}
                prefetch={false}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  textDecoration: 'none',
                }}
              >
                <KavachLogo size={26} textSize={18} />
              </Link>
              <button
                onClick={onCloseMobile}
                aria-label="Close navigation drawer"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <nav
              style={{
                flexGrow: 1,
                overflowY: 'auto',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {renderNavContent(true)}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
};
