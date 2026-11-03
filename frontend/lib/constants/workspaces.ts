import {
  Code2,
  Cloud,
  Crosshair,
  ShieldCheck,
  Bot,
  Activity,
  GitFork,
  Database,
  CheckSquare,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface ProductWorkspaceConfig {
  id: string;
  name: string;
  category: string;
  desc: string;
  icon: LucideIcon;
  href: string;
  onboardHref: string;
  color: string;
  bg: string;
  border: string;
  scopeLabel: string;
}

export const ALL_PRODUCT_WORKSPACES: ProductWorkspaceConfig[] = [
  {
    id: 'code',
    name: 'Code Security',
    category: 'Code & Build',
    desc: 'SAST, SCA, Secrets, SBOM & Supply Chain Security',
    icon: Code2,
    href: '/code/secrets',
    onboardHref: '/onboarding?product=code',
    color: '#09090B',
    bg: '#F4F4F5',
    border: '#E4E4E7',
    scopeLabel: 'Git Repositories',
  },
  {
    id: 'cloud',
    name: 'Cloud Security',
    category: 'Cloud & Infrastructure',
    desc: 'Multi-Cloud CSPM, AWS, GCP, Azure & K8s Posture',
    icon: Cloud,
    href: '/cloud',
    onboardHref: '/onboarding?product=cloud&workspace=cloud',
    color: '#09090B',
    bg: '#F4F4F5',
    border: '#E4E4E7',
    scopeLabel: 'Cloud Accounts',
  },
  {
    id: 'attack',
    name: 'Attack Surface',
    category: 'Cloud & Infrastructure',
    desc: 'Attack Surface Management, DAST & Pentest Campaigns',
    icon: Crosshair,
    href: '/attack',
    onboardHref: '/onboarding?product=attack',
    color: '#09090B',
    bg: '#F4F4F5',
    border: '#E4E4E7',
    scopeLabel: 'Target Domains',
  },
  {
    id: 'protect',
    name: 'Runtime Defense',
    category: 'Runtime & AI Governance',
    desc: 'eBPF Runtime Defense & MCP Security Gateway',
    icon: ShieldCheck,
    href: '/protect',
    onboardHref: '/onboarding?product=protect',
    color: '#09090B',
    bg: '#F4F4F5',
    border: '#E4E4E7',
    scopeLabel: 'Clusters & Runtimes',
  },
  {
    id: 'agent',
    name: 'AI Agent Security',
    category: 'Runtime & AI Governance',
    desc: 'Autonomous AI Agent Identity & Tool Policy Control',
    icon: Bot,
    href: '/agent',
    onboardHref: '/onboarding?product=agent',
    color: '#09090B',
    bg: '#F4F4F5',
    border: '#E4E4E7',
    scopeLabel: 'AI Agent Fleets',
  },
  {
    id: 'soc',
    name: 'Security Operations',
    category: 'Runtime & AI Governance',
    desc: 'Incident Triage Queue, Alert Correlation & Playbooks',
    icon: Activity,
    href: '/soc',
    onboardHref: '/onboarding?product=soc',
    color: '#09090B',
    bg: '#F4F4F5',
    border: '#E4E4E7',
    scopeLabel: 'Alert Queues',
  },
  {
    id: 'graph',
    name: 'Security Graph',
    category: 'Knowledge & Posture',
    desc: 'Authority Knowledge Graph, Edges & Blast Radius',
    icon: GitFork,
    href: '/graph',
    onboardHref: '/onboarding?product=graph',
    color: '#09090B',
    bg: '#F4F4F5',
    border: '#E4E4E7',
    scopeLabel: 'Graph Topology',
  },
  {
    id: 'data',
    name: 'Data Security',
    category: 'Knowledge & Posture',
    desc: 'DSPM, S3/RDS Invariant Verification & Real-Time DLP',
    icon: Database,
    href: '/data',
    onboardHref: '/onboarding?product=data',
    color: '#09090B',
    bg: '#F4F4F5',
    border: '#E4E4E7',
    scopeLabel: 'Data Stores',
  },
  {
    id: 'governance',
    name: 'Governance & Compliance',
    category: 'Knowledge & Posture',
    desc: 'Declarative OPA Rego Policies & SOC 2 Compliance',
    icon: CheckSquare,
    href: '/governance',
    onboardHref: '/onboarding?product=governance',
    color: '#09090B',
    bg: '#F4F4F5',
    border: '#E4E4E7',
    scopeLabel: 'Compliance Suites',
  },
];
