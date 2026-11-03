'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Network,
  Boxes,
  GitFork,
  Flame,
  GitBranch,
  Terminal,
  Compass,
  FileText,
  Settings,
  Search,
  ChevronDown,
  X,
  User,
  FolderGit2,
  Cpu,
  Box,
  Layers,
  Server,
  Database,
  ShieldAlert,
  AlertTriangle,
  Globe,
  Lock,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Play,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import {
  ProductPageShell,
  ProductSidebarItem,
  ProductTabItem,
} from '@/components/products/ProductPageShell';
import { TalkToExpertModal } from '@/components/common/TalkToExpertModal';
import { api } from '@/lib/api/client';
import { useScope } from '@/context/ScopeContext';

const GithubIcon = ({ size = 16, color = '#0F172A' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

interface GraphNode {
  id: string;
  label: string;
  sublabel?: string;
  type:
    | 'developer'
    | 'github'
    | 'repository'
    | 'pipeline'
    | 'image'
    | 'cluster'
    | 'service'
    | 'database'
    | 'sensitive-data'
    | 'vulnerability'
    | 'external-user'
    | 'public-ip';
  x: number;
  y: number;
  risk: 'critical' | 'high' | 'medium' | 'safe';
  details?: {
    cve?: string;
    description: string;
    exposure?: string;
    upstream?: string[];
    downstream?: string[];
    remediation?: string;
  };
}

interface GraphEdge {
  from: string;
  to: string;
  isAttackPath?: boolean;
  label?: string;
}

function getNodeCoordinates(nodeType: string, index: number, name: string): { x: number; y: number; type: any; risk: any } {
  const t = (nodeType || '').toUpperCase();
  const n = (name || '').toLowerCase();
  
  if (t === 'IDENTITY' && (n.includes('external') || n.includes('internet'))) {
    return { x: 770, y: 350, type: 'external-user', risk: 'high' };
  }
  if (t === 'IDENTITY') {
    return { x: 70, y: 190, type: 'developer', risk: 'safe' };
  }
  if (t === 'SCM_ORGANIZATION') {
    return { x: 165, y: 190, type: 'github', risk: 'safe' };
  }
  if (t === 'CODE_REPOSITORY') {
    return { x: 270, y: 190, type: 'repository', risk: 'safe' };
  }
  if (t === 'CI_PIPELINE') {
    return { x: 385, y: 190, type: 'pipeline', risk: 'safe' };
  }
  if (t === 'CONTAINER_IMAGE') {
    return { x: 495, y: 190, type: 'image', risk: 'medium' };
  }
  if (t === 'K8S_CLUSTER') {
    return { x: 605, y: 190, type: 'cluster', risk: 'medium' };
  }
  if (t === 'SERVICE') {
    return { x: 715, y: 190, type: 'service', risk: 'critical' };
  }
  if (t === 'VULNERABILITY') {
    return { x: 715, y: 70, type: 'vulnerability', risk: 'critical' };
  }
  if (t === 'DATABASE') {
    return { x: 825, y: 190, type: 'database', risk: 'critical' };
  }
  if (t === 'SENSITIVE_DATA') {
    return { x: 935, y: 190, type: 'sensitive-data', risk: 'critical' };
  }
  if (t === 'NETWORK_ENDPOINT') {
    return { x: 880, y: 350, type: 'public-ip', risk: 'high' };
  }
  return { x: 100 + (index % 6) * 140, y: 100 + Math.floor(index / 6) * 120, type: 'service', risk: 'medium' };
}

// Baseline nodes for initialization
const defaultNodes: GraphNode[] = [
  {
    id: 'n-dev',
    label: 'Developer',
    type: 'developer',
    x: 70,
    y: 190,
    risk: 'safe',
    details: {
      description: 'Verified committer with hardware MFA (alex@seculayer.com).',
      downstream: ['GitHub org: seculayer-corp'],
    },
  },
  {
    id: 'n-github',
    label: 'GitHub',
    type: 'github',
    x: 165,
    y: 190,
    risk: 'safe',
    details: {
      description: 'GitHub Enterprise Cloud tenant with branch protection rules enforced.',
      upstream: ['Developer alex@seculayer.com'],
      downstream: ['Repository frontend-app'],
    },
  },
  {
    id: 'n-repo',
    label: 'Repository',
    sublabel: 'frontend-app',
    type: 'repository',
    x: 275,
    y: 190,
    risk: 'safe',
    details: {
      description: 'Production React Next.js application codebase.',
      upstream: ['GitHub'],
      downstream: ['Build Pipeline GitHub Actions'],
    },
  },
  {
    id: 'n-pipeline',
    label: 'Build Pipeline',
    sublabel: 'GitHub Actions',
    type: 'pipeline',
    x: 395,
    y: 290,
    risk: 'safe',
    details: {
      description: 'Automated CI/CD workflow executing Semgrep SAST and Trivy container scan.',
      upstream: ['Repository frontend-app'],
      downstream: ['Container Image frontend:1.2.3'],
    },
  },
  {
    id: 'n-image',
    label: 'Container Image',
    sublabel: 'frontend:1.2.3',
    type: 'image',
    x: 520,
    y: 330,
    risk: 'medium',
    details: {
      description: 'OCI container image signed with Cosign in AWS ECR registry.',
      upstream: ['Build Pipeline GitHub Actions'],
      downstream: ['Kubernetes prod-cluster'],
    },
  },
  {
    id: 'n-cluster',
    label: 'Kubernetes',
    sublabel: 'prod-cluster',
    type: 'cluster',
    x: 520,
    y: 200,
    risk: 'safe',
    details: {
      description: 'Amazon EKS cluster in us-east-1 VPC with Istio service mesh enabled.',
      upstream: ['Container Image frontend:1.2.3'],
      downstream: ['Service web-app'],
    },
  },
  {
    id: 'n-service',
    label: 'Service',
    sublabel: 'web-app',
    type: 'service',
    x: 640,
    y: 250,
    risk: 'critical',
    details: {
      description: 'Internet-facing HTTP web tier exposing REST endpoints on port 443.',
      cve: 'CVE-2024-1234',
      exposure: 'Public via ALB',
      upstream: ['Kubernetes prod-cluster', 'Public IP 34.120.21.10', 'Vulnerability CVE-2024-1234'],
      downstream: ['Database user-db'],
      remediation: 'Apply hotfix patch #142 to sanitize input parameters and revoke DB superuser credentials.',
    },
  },
  {
    id: 'n-vuln',
    label: 'Vulnerability',
    sublabel: 'CVE-2024-1234',
    type: 'vulnerability',
    x: 670,
    y: 110,
    risk: 'critical',
    details: {
      cve: 'CVE-2024-1234',
      description: 'Remote Code Execution / SQL Injection vulnerability in public web tier parameter parser.',
      downstream: ['Service web-app'],
      remediation: 'Upgrade express-validator library to version >= 7.0.1 immediately.',
    },
  },
  {
    id: 'n-db',
    label: 'Database',
    sublabel: 'user-db',
    type: 'database',
    x: 770,
    y: 250,
    risk: 'high',
    details: {
      description: 'Amazon Aurora PostgreSQL multi-AZ cluster storing user accounts.',
      upstream: ['Service web-app'],
      downstream: ['Sensitive Data customer_data'],
      remediation: 'Enforce network subnet isolation and disable direct external connections.',
    },
  },
  {
    id: 'n-data',
    label: 'Sensitive Data',
    sublabel: 'customer_data',
    type: 'sensitive-data',
    x: 890,
    y: 250,
    risk: 'critical',
    details: {
      description: '1.2M Records containing Plaintext PII, email addresses, and phone numbers.',
      upstream: ['Database user-db'],
      remediation: 'Enable column-level KMS envelope encryption with DLP access monitoring.',
    },
  },
  {
    id: 'n-external',
    label: 'External User',
    type: 'external-user',
    x: 770,
    y: 350,
    risk: 'high',
    details: {
      description: 'Untrusted external actor originating from public internet IP range.',
      downstream: ['Public IP 34.120.21.10'],
    },
  },
  {
    id: 'n-ip',
    label: 'Public IP',
    sublabel: '34.120.21.10',
    type: 'public-ip',
    x: 880,
    y: 350,
    risk: 'high',
    details: {
      description: 'Ingress public IP address routing unauthenticated traffic into web-app service.',
      upstream: ['External User'],
      downstream: ['Service web-app'],
    },
  },
];

const defaultEdges: GraphEdge[] = [
  { from: 'n-dev', to: 'n-github' },
  { from: 'n-github', to: 'n-repo' },
  { from: 'n-repo', to: 'n-pipeline' },
  { from: 'n-pipeline', to: 'n-image' },
  { from: 'n-image', to: 'n-cluster' },
  { from: 'n-cluster', to: 'n-service' },
  { from: 'n-vuln', to: 'n-service', isAttackPath: true, label: 'Attacks' },
  { from: 'n-external', to: 'n-ip', isAttackPath: true, label: 'Inbound' },
  { from: 'n-ip', to: 'n-service', isAttackPath: true, label: 'Exploits' },
  { from: 'n-service', to: 'n-db', isAttackPath: true, label: 'Compromises' },
  { from: 'n-db', to: 'n-data', isAttackPath: true, label: 'Exfiltrates' },
];

export default function GraphProductPage() {
  const router = useRouter();
  const { currentProject } = useScope();
  const [activeSidebarId, setActiveSidebarId] = useState('overview');
  const [activeTabId, setActiveTabId] = useState('graph-view');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEnv, setSelectedEnv] = useState('Production');
  const [selectedTimeRange, setSelectedTimeRange] = useState('Last 30 days');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [attackPathOnly, setAttackPathOnly] = useState(false);
  const [expertModalOpen, setExpertModalOpen] = useState(false);

  // Dynamic graph state connected to PostgreSQL backend
  const [nodes, setNodes] = useState<GraphNode[]>(defaultNodes);
  const [edges, setEdges] = useState<GraphEdge[]>(defaultEdges);
  const [loadingGraph, setLoadingGraph] = useState(false);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const [attackPathsData, setAttackPathsData] = useState<any[]>([]);
  const [loadingAttackPaths, setLoadingAttackPaths] = useState(false);

  const loadGraphData = useCallback(async () => {
    if (!currentProject?.id) return;
    setLoadingGraph(true);
    setGraphError(null);
    try {
      const data = await api.graph.get(currentProject.id);
      if (data?.nodes && Array.isArray(data.nodes) && data.nodes.length > 0) {
        const mappedNodes: GraphNode[] = data.nodes.map((n: any, idx: number) => {
          const coords = getNodeCoordinates(n.node_type, idx, n.name);
          const nameParts = (n.name || '').split(' ');
          const label = nameParts[0] || n.name;
          const sublabel = nameParts.length > 1 ? nameParts.slice(1).join(' ') : n.external_id || undefined;
          return {
            id: n.id,
            label,
            sublabel,
            type: coords.type,
            x: coords.x,
            y: coords.y,
            risk: coords.risk,
            details: {
              cve: n.metadata?.cve,
              description: n.metadata?.title || n.metadata?.type || `Resource in ${n.environment || 'PRODUCTION'}`,
              exposure: n.metadata?.exposure,
              upstream: n.metadata?.upstream || [],
              downstream: n.metadata?.downstream || [],
              remediation: n.metadata?.remediation,
            },
          };
        });
        setNodes(mappedNodes);

        if (data.edges && Array.isArray(data.edges)) {
          const mappedEdges: GraphEdge[] = data.edges.map((e: any) => ({
            from: e.source_node_id,
            to: e.target_node_id,
            isAttackPath: e.edge_type === 'AFFECTED_BY' || e.edge_type === 'ACCESSES' || e.edge_type === 'ROUTES_TO' || e.edge_type === 'CONNECTS_TO' || e.edge_type === 'CONTAINS' || Boolean(e.metadata?.is_attack_path),
            label: e.metadata?.relationship || e.edge_type,
          }));
          setEdges(mappedEdges);
        }
      }
    } catch (err: any) {
      console.error('Failed to load security graph:', err);
      setGraphError(err.message || 'Failed to load security graph');
    } finally {
      setLoadingGraph(false);
    }
  }, [currentProject?.id]);

  const loadAttackPaths = useCallback(async () => {
    if (!currentProject?.id) return;
    setLoadingAttackPaths(true);
    try {
      const paths = await api.graph.attackPaths(currentProject.id, { max_depth: 6 });
      setAttackPathsData(Array.isArray(paths) ? paths : (paths?.paths || []));
    } catch {
      setAttackPathsData([]);
    } finally {
      setLoadingAttackPaths(false);
    }
  }, [currentProject?.id]);

  useEffect(() => {
    loadGraphData();
    loadAttackPaths();
  }, [loadGraphData, loadAttackPaths]);

  const handleReconcile = async () => {
    if (!currentProject?.id) return;
    setReconciling(true);
    try {
      await api.graph.reconcile(currentProject.id);
      await loadGraphData();
      await loadAttackPaths();
    } catch (err: any) {
      alert(`Reconciliation error: ${err.message}`);
    } finally {
      setReconciling(false);
    }
  };

  // Sidebar matching screenshot #10
  const sidebarItems: ProductSidebarItem[] = [
    { id: 'overview', label: 'Overview', icon: Network },
    { id: 'asset-graph', label: 'Asset Graph', icon: Boxes },
    { id: 'attack-paths', label: 'Attack Paths', icon: GitFork, badge: 'Critical' },
    { id: 'risk-graph', label: 'Risk Graph', icon: Flame },
    { id: 'relationships', label: 'Relationships', icon: GitBranch, badge: String(edges.length) },
    { id: 'query', label: 'Query', icon: Terminal },
    { id: 'explorations', label: 'Explorations', icon: Compass },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Tabs matching screenshot #10
  const tabs: ProductTabItem[] = [
    { id: 'graph-view', label: 'Graph View' },
    { id: 'attack-paths', label: 'Attack Paths', count: attackPathsData.length || 1 },
    { id: 'relationships', label: 'Relationships', count: edges.length },
    { id: 'query', label: 'Query' },
    { id: 'findings', label: 'Findings', count: nodes.filter(n => n.risk === 'critical').length },
  ];

  // Render node icon helper
  const getNodeIcon = (node: GraphNode) => {
    switch (node.type) {
      case 'developer':
        return <User size={16} color="#475569" />;
      case 'github':
        return <GithubIcon size={16} color="#0F172A" />;
      case 'repository':
        return <FolderGit2 size={16} color="#2563EB" />;
      case 'pipeline':
        return <Cpu size={16} color="#475569" />;
      case 'image':
        return <Box size={16} color="#0284C7" />;
      case 'cluster':
        return <Layers size={16} color="#2563EB" />;
      case 'service':
        return <Server size={18} color="#0F172A" />;
      case 'database':
        return <Database size={16} color="#475569" />;
      case 'sensitive-data':
        return <Lock size={16} color="#DC2626" />;
      case 'vulnerability':
        return <AlertTriangle size={18} color="#DC2626" />;
      case 'external-user':
        return <User size={16} color="#DC2626" />;
      case 'public-ip':
        return <Globe size={16} color="#DC2626" />;
      default:
        return <Network size={16} color="#475569" />;
    }
  };

  return (
    <ProductPageShell
      productKey="graph"
      productTitle="Graph"
      categoryBadge="SECURITY KNOWLEDGE GRAPH"
      heroTitle="Unify your security data with a connected graph"
      heroDescription="Connect assets, identities, vulnerabilities, configurations and policies into a unified security graph to visualize risk and attack paths across your environment."
      primaryButtonLabel="Explore Graph"
      onPrimaryAction={() => {
        setAttackPathOnly(!attackPathOnly);
      }}
      secondaryButtonLabel="View Documentation"
      sidebarItems={sidebarItems}
      activeSidebarId={activeSidebarId}
      onSelectSidebar={(id) => setActiveSidebarId(id)}
      tabs={tabs}
      activeTabId={activeTabId}
      onSelectTab={(id) => setActiveTabId(id)}
      filterBar={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          {/* Left filters & search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '320px', flexWrap: 'wrap' }}>
            {/* Environment */}
            <div style={{ position: 'relative' }}>
              <select
                value={selectedEnv}
                onChange={(e) => setSelectedEnv(e.target.value)}
                style={{
                  appearance: 'none',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  padding: '7px 28px 7px 12px',
                  fontSize: '13px',
                  color: '#334155',
                  fontWeight: 500,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="Production">Production</option>
                <option value="Staging">Staging</option>
                <option value="Development">Development</option>
              </select>
              <ChevronDown
                size={13}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#64748B',
                }}
              />
            </div>

            {/* Time range */}
            <div style={{ position: 'relative' }}>
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                style={{
                  appearance: 'none',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  padding: '7px 28px 7px 12px',
                  fontSize: '13px',
                  color: '#334155',
                  fontWeight: 500,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="Last 24 hours">Last 24 hours</option>
                <option value="Last 7 days">Last 7 days</option>
                <option value="Last 30 days">Last 30 days</option>
              </select>
              <ChevronDown
                size={13}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#64748B',
                }}
              />
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '280px', flex: '1 1 280px', maxWidth: '420px' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '11px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94A3B8',
                }}
              />
              <input
                type="text"
                placeholder="Search assets, identities, vulnerabilities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px 7px 32px',
                  fontSize: '13px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  outline: 'none',
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94A3B8',
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Right Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              disabled={reconciling}
              onClick={handleReconcile}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                padding: '7px 12px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#0F172A',
                cursor: reconciling ? 'not-allowed' : 'pointer',
                opacity: reconciling ? 0.7 : 1,
              }}
            >
              <RefreshCw size={13} style={{ animation: reconciling ? 'spin 1s linear infinite' : 'none' }} />
              <span>{reconciling ? 'Reconciling...' : 'Reconcile Graph'}</span>
            </button>

            <button
              type="button"
              onClick={() => setAttackPathOnly(!attackPathOnly)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: attackPathOnly ? '#FEF2F2' : '#FFFFFF',
                border: attackPathOnly ? '1px solid #FECACA' : '1px solid #CBD5E1',
                borderRadius: '6px',
                padding: '7px 12px',
                fontSize: '12px',
                fontWeight: 600,
                color: attackPathOnly ? '#DC2626' : '#475569',
                cursor: 'pointer',
              }}
            >
              <GitFork size={13} />
              <span>{attackPathOnly ? 'Showing Attack Path' : 'Highlight Attack Path'}</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #CBD5E1', borderRadius: '6px', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setZoomScale((z) => Math.min(z + 0.15, 1.6))}
                style={{ padding: '6px 8px', background: '#FFFFFF', border: 'none', borderRight: '1px solid #E2E8F0', cursor: 'pointer' }}
                title="Zoom In"
              >
                <ZoomIn size={14} color="#64748B" />
              </button>
              <button
                type="button"
                onClick={() => setZoomScale((z) => Math.max(z - 0.15, 0.7))}
                style={{ padding: '6px 8px', background: '#FFFFFF', border: 'none', borderRight: '1px solid #E2E8F0', cursor: 'pointer' }}
                title="Zoom Out"
              >
                <ZoomOut size={14} color="#64748B" />
              </button>
              <button
                type="button"
                onClick={() => setZoomScale(1)}
                style={{ padding: '6px 8px', background: '#FFFFFF', border: 'none', cursor: 'pointer' }}
                title="Reset View"
              >
                <RotateCcw size={14} color="#64748B" />
              </button>
            </div>
          </div>
        </div>
      }
    >
      {/* Tab 1: Interactive Security Knowledge Graph matching screenshot #10 */}
      {activeTabId === 'graph-view' && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            position: 'relative',
            overflow: 'hidden',
            minHeight: '520px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          {/* Subtle grid background */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'radial-gradient(#E2E8F0 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              opacity: 0.6,
            }}
          />

          {/* SVG Canvas for Edges & Nodes */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '520px',
              overflow: 'hidden',
              transform: `scale(${zoomScale})`,
              transformOrigin: 'center center',
              transition: 'transform 0.2s ease',
            }}
          >
            <svg
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
              }}
            >
              <defs>
                <marker
                  id="arrow-default"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#94A3B8" />
                </marker>

                <marker
                  id="arrow-attack"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#DC2626" />
                </marker>
              </defs>

              {/* Render connecting edges */}
              {edges.map((edge, idx) => {
                const source = nodes.find((n) => n.id === edge.from);
                const target = nodes.find((n) => n.id === edge.to);
                if (!source || !target) return null;

                const isCritAttack = edge.isAttackPath;
                const isFaded = attackPathOnly && !isCritAttack;

                return (
                  <g key={idx} opacity={isFaded ? 0.15 : 1}>
                    <line
                      x1={source.x + 28}
                      y1={source.y + 28}
                      x2={target.x + 28}
                      y2={target.y + 28}
                      stroke={isCritAttack ? '#DC2626' : '#CBD5E1'}
                      strokeWidth={isCritAttack ? 2.5 : 1.5}
                      strokeDasharray={isCritAttack ? '6 4' : 'none'}
                      markerEnd={isCritAttack ? 'url(#arrow-attack)' : 'url(#arrow-default)'}
                    />
                    {edge.label && (
                      <text
                        x={(source.x + target.x) / 2 + 10}
                        y={(source.y + target.y) / 2 - 6}
                        fill={isCritAttack ? '#DC2626' : '#64748B'}
                        fontSize="10"
                        fontWeight="600"
                        textAnchor="middle"
                      >
                        {edge.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Render Nodes as Interactive HTML Cards positioned via coordinates */}
            {nodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              const isCrit = node.risk === 'critical';
              const isFaded = attackPathOnly && node.risk === 'safe';

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  style={{
                    position: 'absolute',
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    transform: 'translate(-20px, -20px)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    opacity: isFaded ? 0.25 : 1,
                    transition: 'all 0.15s ease',
                    zIndex: isSelected ? 20 : isCrit ? 10 : 5,
                  }}
                  className="hover:scale-105"
                >
                  {/* Node Circle or Box */}
                  <div
                    style={{
                      width: node.type === 'vulnerability' ? '54px' : '50px',
                      height: node.type === 'vulnerability' ? '54px' : '50px',
                      borderRadius:
                        node.type === 'sensitive-data' || node.type === 'developer' || node.type === 'external-user'
                          ? '50%'
                          : '10px',
                      backgroundColor:
                        node.type === 'vulnerability'
                          ? '#FEF2F2'
                          : node.type === 'sensitive-data'
                          ? '#FFF1F2'
                          : '#FFFFFF',
                      border: isCrit
                        ? '2px solid #DC2626'
                        : isSelected
                        ? '2px solid #2563EB'
                        : '1.5px solid #CBD5E1',
                      boxShadow: isCrit
                        ? '0 0 0 4px rgba(220, 38, 38, 0.15)'
                        : isSelected
                        ? '0 0 0 4px rgba(37, 99, 235, 0.15)'
                        : '0 2px 4px rgba(0,0,0,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {getNodeIcon(node)}
                  </div>

                  {/* Labels underneath */}
                  <div style={{ textAlign: 'center', maxWidth: '110px' }}>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: isCrit ? '#DC2626' : '#0F172A',
                        lineHeight: 1.2,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {node.label}
                    </div>
                    {node.sublabel && (
                      <div
                        style={{
                          fontSize: '10px',
                          color: '#64748B',
                          fontFamily: 'monospace',
                          lineHeight: 1.2,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {node.sublabel}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom legend */}
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              left: '16px',
              backgroundColor: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(4px)',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              fontSize: '11px',
              color: '#64748B',
              zIndex: 30,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#DC2626' }} />
              <span style={{ fontWeight: 600, color: '#DC2626' }}>Critical Threat Path</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563EB' }} />
              <span>CI/CD Pipeline</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#64748B' }} />
              <span>Infrastructure</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Attack Paths */}
      {activeTabId === 'attack-paths' && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0F172A' }}>
              Multi-Hop Attack Path Analysis
            </h3>
            <button
              type="button"
              disabled={loadingAttackPaths}
              onClick={loadAttackPaths}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: '#F1F5F9',
                color: '#334155',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                cursor: loadingAttackPaths ? 'not-allowed' : 'pointer',
              }}
            >
              <RefreshCw size={12} style={{ animation: loadingAttackPaths ? 'spin 1s linear infinite' : 'none' }} />
              <span>{loadingAttackPaths ? 'Analyzing...' : 'Recalculate Attack Paths'}</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ padding: '16px', border: '1px solid #FECACA', borderRadius: '8px', backgroundColor: '#FEF2F2' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#DC2626' }}>CRITICAL KILL CHAIN &bull; PII EXFILTRATION</span>
                <span style={{ fontSize: '11px', color: '#991B1B', fontWeight: 600 }}>Confidence: 99.4% &bull; Bounded Max Depth: 6</span>
              </div>
              <div style={{ fontSize: '13px', color: '#1E293B', marginBottom: '12px', lineHeight: 1.6 }}>
                <strong>Kill Chain:</strong> External User &rarr; Public IP (34.120.21.10) &rarr; Web Application Service (CVE-2024-1234 SQLi) &rarr; Database user-db &rarr; Exfiltration of customer_data (1.2M Records).
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => router.push('/products/protect?tab=policy-violations')}
                  style={{
                    padding: '7px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    backgroundColor: '#DC2626',
                    color: '#FFFFFF',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  View Protective Policies
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAttackPathOnly(true);
                    setActiveTabId('graph-view');
                  }}
                  style={{
                    padding: '7px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    backgroundColor: '#FFFFFF',
                    color: '#DC2626',
                    border: '1px solid #FECACA',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Highlight on Topology
                </button>
              </div>
            </div>

            {attackPathsData.length > 0 && (
              <div style={{ fontSize: '13px', color: '#475569' }}>
                Found <strong>{attackPathsData.length}</strong> active traversal vectors calculated by OPA & deterministic graph engine.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Relationships */}
      {activeTabId === 'relationships' && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0F172A' }}>
              Entity Relationships & Blast Radius ({edges.length})
            </h3>
            <span style={{ fontSize: '12px', color: '#64748B' }}>
              Source: PostgreSQL <code>security_graph_edges</code>
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {edges.map((e, idx) => {
              const srcNode = nodes.find((n) => n.id === e.from);
              const tgtNode = nodes.find((n) => n.id === e.to);
              return (
                <div key={idx} style={{ padding: '12px', border: '1px solid #E2E8F0', borderRadius: '6px', backgroundColor: '#F8FAFC' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                    {srcNode?.label || e.from} &rarr; {tgtNode?.label || e.to}
                  </div>
                  <div style={{ fontSize: '11px', color: e.isAttackPath ? '#DC2626' : '#64748B', fontWeight: 500, marginTop: '2px' }}>
                    {e.isAttackPath ? 'Exploitable Route' : 'Operational Dependency'} &bull; {e.label || 'LINK'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 4: Query */}
      {activeTabId === 'query' && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 8px 0', color: '#0F172A' }}>
            Security Knowledge Graph Cypher / OpenCypher Query Console
          </h3>
          <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '14px' }}>
            Run bounded, deterministic graph queries across identity, code, cloud assets, and vulnerability nodes.
          </p>
          <div style={{ padding: '14px', backgroundColor: '#0F172A', borderRadius: '6px', color: '#38BDF8', fontFamily: 'monospace', fontSize: '13px', marginBottom: '12px' }}>
            MATCH p = (ext:ExternalUser)-[*1..4]-&gt;(target:SensitiveData)<br />
            WHERE ext.reputation = &apos;UNTRUSTED&apos;<br />
            RETURN p, nodes(p), relationships(p) LIMIT 20;
          </div>
          <button
            type="button"
            onClick={async () => {
              if (currentProject?.id) {
                await loadGraphData();
                setActiveTabId('graph-view');
              }
            }}
            style={{
              padding: '8px 14px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              borderRadius: '6px',
              border: 'none',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Execute Query
          </button>
        </div>
      )}

      {/* Tab 5: Findings */}
      {activeTabId === 'findings' && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 14px 0', color: '#0F172A' }}>
            Graph Findings & Critical Vulnerabilities ({nodes.filter(n => n.risk === 'critical').length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {nodes.filter(n => n.risk === 'critical').map((n, i) => (
              <div key={i} style={{ padding: '14px', border: '1px solid #FECACA', borderRadius: '6px', backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#DC2626', backgroundColor: '#FEE2E2', padding: '2px 6px', borderRadius: '4px' }}>
                      CRITICAL
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                      {n.label} {n.sublabel ? `(${n.sublabel})` : ''}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569' }}>
                    {n.details?.description || 'Critical node in security topology'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedNode(n);
                    setActiveTabId('graph-view');
                  }}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    backgroundColor: '#FFFFFF',
                    color: '#DC2626',
                    border: '1px solid #FECACA',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Locate on Graph
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Node Inspector Drawer */}
      {selectedNode && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '450px',
            maxWidth: '90vw',
            height: '100vh',
            backgroundColor: '#FFFFFF',
            boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            borderLeft: '1px solid #E2E8F0',
          }}
        >
          {/* Header */}
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {getNodeIcon(selectedNode)}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase' }}>
                  {selectedNode.type.replace('-', ' ')}
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '2px 0 0 0', color: '#0F172A' }}>
                  {selectedNode.label} {selectedNode.sublabel && `(${selectedNode.sublabel})`}
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedNode(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Description & Role</label>
              <div style={{ fontSize: '13px', color: '#0F172A', marginTop: '2px', lineHeight: 1.5 }}>
                {selectedNode.details?.description}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Risk Level & Severity</label>
              <div style={{ marginTop: '4px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: selectedNode.risk === 'critical' ? '#FEF2F2' : selectedNode.risk === 'high' ? '#FFF7ED' : selectedNode.risk === 'medium' ? '#FFFBEB' : '#ECFDF5',
                    color: selectedNode.risk === 'critical' ? '#DC2626' : selectedNode.risk === 'high' ? '#EA580C' : selectedNode.risk === 'medium' ? '#D97706' : '#059669',
                    textTransform: 'uppercase',
                  }}
                >
                  {selectedNode.risk}
                </span>
              </div>
            </div>

            {selectedNode.details?.cve && (
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Associated CVE Finding</label>
                <div style={{ padding: '10px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', marginTop: '4px', fontSize: '13px', color: '#991B1B', fontWeight: 600 }}>
                  {selectedNode.details.cve} &bull; Exploitable Remote Ingress
                </div>
              </div>
            )}

            {selectedNode.details?.upstream && (
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Upstream Inbound Nodes</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  {selectedNode.details.upstream.map((u, i) => (
                    <div key={i} style={{ padding: '6px 10px', backgroundColor: '#F8FAFC', borderRadius: '4px', fontSize: '12px', color: '#334155' }}>
                      &larr; {u}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedNode.details?.downstream && (
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Downstream Blast Radius</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  {selectedNode.details.downstream.map((d, i) => (
                    <div key={i} style={{ padding: '6px 10px', backgroundColor: '#F8FAFC', borderRadius: '4px', fontSize: '12px', color: '#334155' }}>
                      &rarr; {d}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedNode.details?.remediation && (
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Recommended Remediation</label>
                <div style={{ padding: '10px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '6px', marginTop: '4px', fontSize: '12px', color: '#1E40AF', lineHeight: 1.5 }}>
                  {selectedNode.details.remediation}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '14px 20px', borderTop: '1px solid #E2E8F0', display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => {
                setSelectedNode(null);
                setExpertModalOpen(true);
              }}
              style={{
                flex: 1,
                padding: '9px',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Sever Blast Radius Route
            </button>
            <button
              type="button"
              onClick={() => setSelectedNode(null)}
              style={{
                padding: '9px 14px',
                fontSize: '13px',
                fontWeight: 500,
                backgroundColor: '#FFFFFF',
                color: '#475569',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <TalkToExpertModal isOpen={expertModalOpen} onClose={() => setExpertModalOpen(false)} />
    </ProductPageShell>
  );
}
