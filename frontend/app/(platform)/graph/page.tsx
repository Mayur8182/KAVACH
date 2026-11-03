'use client';

/**
 * Thing Graph — Security Knowledge Graph Workspace (/graph)
 * Route: /graph
 * Connects to real /api/v1/projects/{id}/graph/* endpoints.
 * No hardcoded nodes, edges, or attack paths — all data comes from the database.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  GitFork,
  Radio,
  Search,
  ShieldAlert,
  ShieldCheck,
  Target,
  RefreshCw,
  ChevronRight,
  Database,
  Cloud,
  Server,
  Users,
  Bot,
  Box,
  Lock,
  ArrowRight,
  AlertTriangle,
  Info,
  Layers,
  Zap,
  GitMerge,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';

type GraphTab = 'topology' | 'attack_paths' | 'blast_radius' | 'relationships';

// ── Node status badge ──────────────────────────────────────────────────
function NodeStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    ACTIVE:       { bg: 'rgba(34,197,94,0.12)', color: '#22c55e', label: 'Active' },
    VERIFIED:     { bg: 'rgba(34,197,94,0.12)', color: '#22c55e', label: 'Verified' },
    HIGH_EXPOSURE:{ bg: 'rgba(239,68,68,0.12)', color: '#ef4444', label: 'High Exposure' },
    RESTRICTED:   { bg: 'rgba(168,85,247,0.12)', color: '#a855f7', label: 'Restricted' },
    INACTIVE:     { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8', label: 'Inactive' },
    COMPROMISED:  { bg: 'rgba(239,68,68,0.2)', color: '#ef4444', label: 'Compromised' },
  };
  const c = cfg[status] || { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8', label: status };
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
      background: c.bg, color: c.color,
    }}>
      {c.label}
    </span>
  );
}

// ── Node type icon ──────────────────────────────────────────────────────
function NodeIcon({ type }: { type: string }) {
  const icons: Record<string, React.ReactNode> = {
    IAM_ROLE:      <Users size={14} color="#2563eb" />,
    AI_AGENT:      <Bot size={14} color="#7c3aed" />,
    S3_BUCKET:     <Database size={14} color="#ea580c" />,
    K8S_CLUSTER:   <Box size={14} color="#0284c7" />,
    DATABASE:      <Database size={14} color="#16a34a" />,
    CODE_REPO:     <GitFork size={14} color="#94a3b8" />,
    CLOUD_RESOURCE:<Cloud size={14} color="#f97316" />,
    SERVICE:       <Server size={14} color="#64748b" />,
    IDENTITY:      <Users size={14} color="#a855f7" />,
    NETWORK:       <Radio size={14} color="#3b82f6" />,
    SECRET:        <Lock size={14} color="#ef4444" />,
  };
  return <>{icons[type] || <Server size={14} color="#64748b" />}</>;
}

// ── Risk badge ─────────────────────────────────────────────────────────
function RiskBadge({ risk }: { risk: string }) {
  const cfg: Record<string, { bg: string; color: string }> = {
    CRITICAL: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
    HIGH:     { bg: 'rgba(249,115,22,0.12)', color: '#f97316' },
    MEDIUM:   { bg: 'rgba(234,179,8,0.12)', color: '#eab308' },
    LOW:      { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
  };
  const c = cfg[risk] || { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8' };
  return (
    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: c.bg, color: c.color }}>
      {risk}
    </span>
  );
}

// ── Metric card ────────────────────────────────────────────────────────
function MetricCard({ label, value, accent, icon }: {
  label: string; value: React.ReactNode; accent?: string; icon?: React.ReactNode;
}) {
  return (
    <div style={{
      background: 'var(--color-surface-elevated)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 500 }}>{label}</span>
        {icon && <span style={{ color: accent || 'var(--color-text-muted)', opacity: 0.7 }}>{icon}</span>}
      </div>
      <span style={{ fontSize: 22, fontWeight: 700, color: accent || 'var(--color-text-primary)' }}>{value}</span>
    </div>
  );
}

export default function GraphWorkspacePage() {
  const { currentProject } = useProject();
  const [activeTab, setActiveTab] = useState<GraphTab>('topology');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Graph state from real API
  const [graphData, setGraphData] = useState<any>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [attackPaths, setAttackPaths] = useState<any[]>([]);
  const [blastRadiusData, setBlastRadiusData] = useState<any>(null);
  const [blastLoading, setBlastLoading] = useState(false);

  const projectId = currentProject?.id || null;

  // ── No project selected ────────────────────────────────────────────
  const noProject = !projectId;

  const loadGraph = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [graphRes, nodesRes, edgesRes] = await Promise.all([
        api.graph.projectGraph(projectId, { maxNodes: 500, maxEdges: 1000 }),
        api.graph.nodes(projectId, { limit: 200 }),
        api.graph.edges(projectId, { limit: 500 }),
      ]);
      setGraphData(graphRes);
      setNodes(Array.isArray(nodesRes) ? nodesRes : []);
      setEdges(Array.isArray(edgesRes) ? edgesRes : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load security graph');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadAttackPaths = useCallback(async () => {
    if (!projectId) return;
    try {
      const paths = await api.graph.attackPaths(projectId, { max_depth: 6 });
      setAttackPaths(Array.isArray(paths) ? paths : []);
    } catch (_err) { /* non-critical */ }
  }, [projectId]);

  const loadBlastRadius = useCallback(async (nodeId: string) => {
    if (!projectId) return;
    setBlastLoading(true);
    try {
      const res = await api.graph.blastRadius(projectId, nodeId, 5);
      setBlastRadiusData(res);
    } catch (err: any) {
      setBlastRadiusData({ error: err?.message || 'Failed to calculate blast radius' });
    } finally {
      setBlastLoading(false);
    }
  }, [projectId]);

  const handleReconcile = useCallback(async () => {
    if (!projectId) return;
    try {
      await api.graph.reconcile(projectId);
      await loadGraph();
    } catch (err: any) {
      setError(err?.message || 'Reconciliation failed');
    }
  }, [projectId, loadGraph]);

  useEffect(() => { loadGraph(); }, [loadGraph]);
  useEffect(() => {
    if (activeTab === 'attack_paths') loadAttackPaths();
  }, [activeTab, loadAttackPaths]);

  // Real client-side filtering of already-fetched nodes
  const filteredNodes = nodes.filter(n => {
    const matchSearch = !searchQuery ||
      (n.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.external_id || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === 'ALL' || n.node_type === typeFilter;
    return matchSearch && matchType;
  });

  // Unique node types for filter dropdown
  const nodeTypes = ['ALL', ...Array.from(new Set(nodes.map(n => n.node_type).filter(Boolean)))];

  const tabs = [
    { id: 'topology' as GraphTab, label: 'Graph View' },
    { id: 'attack_paths' as GraphTab, label: 'Attack Paths' },
    { id: 'blast_radius' as GraphTab, label: 'Blast Radius' },
    { id: 'relationships' as GraphTab, label: 'Relationships' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
      {/* ── Breadcrumb ── */}
      <div style={{
        padding: '10px 24px', borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
        color: 'var(--color-text-secondary)',
      }}>
        <Link href="/" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}>Home</Link>
        <ChevronRight size={12} />
        <span>Products</span>
        <ChevronRight size={12} />
        <span style={{ color: 'var(--color-text-primary)' }}>Graph</span>
      </div>

      {/* ── Hero ── */}
      <div style={{
        padding: '24px 24px 20px', borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-accent)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            SECURITY KNOWLEDGE GRAPH
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, lineHeight: 1.25 }}>
            Unify your security data<br />with a connected graph
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 8, maxWidth: 420 }}>
            Connect assets, identities, vulnerabilities, configurations and policies into a unified security graph to visualize risk and attack paths across your environment.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={loadGraph}
            disabled={loading || noProject}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', fontSize: 12, fontWeight: 500,
              background: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)',
              cursor: loading || noProject ? 'not-allowed' : 'pointer',
              opacity: noProject ? 0.5 : 1,
            }}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleReconcile}
            disabled={noProject || loading}
            title={noProject ? 'Select a project first' : 'Reconcile graph from source records'}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', fontSize: 12, fontWeight: 600,
              background: noProject ? 'var(--color-surface-elevated)' : 'var(--color-accent)',
              border: noProject ? '1px solid var(--color-border)' : 'none',
              borderRadius: 'var(--radius-md)',
              color: noProject ? 'var(--color-text-secondary)' : '#fff',
              cursor: noProject ? 'not-allowed' : 'pointer',
            }}
          >
            <GitMerge size={12} />
            Reconcile Graph
          </button>
        </div>
      </div>

      {/* ── No Project Warning ── */}
      {noProject && (
        <div style={{
          margin: '16px 24px 0', padding: '14px 16px', borderRadius: 'var(--radius-md)',
          background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)',
          color: '#eab308', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Info size={14} />
          <span>Select a project to view the security knowledge graph. Graph data is scoped per project.</span>
        </div>
      )}

      {/* ── Error Banner ── */}
      {error && (
        <div style={{
          margin: '12px 24px 0', padding: '10px 14px', borderRadius: 'var(--radius-md)',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          color: '#ef4444', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <AlertTriangle size={14} />
          <span>{error}</span>
          <button onClick={loadGraph} style={{ marginLeft: 8, textDecoration: 'underline', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>
            Retry
          </button>
        </div>
      )}

      {/* ── Metrics ── */}
      {!loading && !noProject && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12,
          padding: '16px 24px 0',
        }}>
          <MetricCard label="Total Nodes" value={nodes.length} icon={<Layers size={14} />} accent="var(--color-accent)" />
          <MetricCard label="Total Edges" value={edges.length} icon={<ArrowRight size={14} />} />
          <MetricCard label="Attack Paths" value={attackPaths.length} icon={<Target size={14} />} accent="#ef4444" />
          <MetricCard
            label="High Exposure"
            value={nodes.filter(n => n.status === 'HIGH_EXPOSURE').length}
            icon={<ShieldAlert size={14} />}
            accent="#f97316"
          />
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{
        padding: '16px 24px 0',
        display: 'flex', gap: 2, borderBottom: '1px solid var(--color-border)', marginTop: 16,
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 14px', fontSize: 12, fontWeight: activeTab === tab.id ? 600 : 400,
              background: 'none', border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--color-accent)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              cursor: 'pointer', marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '16px 24px', flex: 1 }}>
        {/* Loading skeleton */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{
                height: 52, background: 'var(--color-surface-elevated)',
                borderRadius: 'var(--radius-sm)', animation: 'pulse 1.5s infinite',
              }} />
            ))}
          </div>
        )}

        {/* ── Topology Tab ── */}
        {!loading && activeTab === 'topology' && (
          <>
            {/* Search & Filter */}
            {!noProject && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                  <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                  <input
                    placeholder="Search assets, identities, vulnerabilities..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%', padding: '7px 10px 7px 30px', fontSize: 12,
                      background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)', color: 'var(--color-text-primary)', outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  style={{
                    padding: '7px 10px', fontSize: 12, background: 'var(--color-surface-elevated)',
                    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-text-primary)', cursor: 'pointer',
                  }}
                >
                  {nodeTypes.map(t => <option key={t} value={t}>{t === 'ALL' ? 'All Node Types' : t}</option>)}
                </select>
              </div>
            )}

            {noProject ? (
              <div style={{
                padding: '64px 24px', textAlign: 'center',
                color: 'var(--color-text-secondary)', fontSize: 13,
                border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)',
              }}>
                <GitFork size={40} style={{ marginBottom: 12, opacity: 0.2 }} />
                <p style={{ margin: 0, fontWeight: 500 }}>Select a project to explore the security graph</p>
                <p style={{ margin: '4px 0 0', fontSize: 12 }}>Graph data is scoped per project and requires at least one connected integration</p>
              </div>
            ) : filteredNodes.length === 0 ? (
              <div style={{
                padding: '64px 24px', textAlign: 'center',
                color: 'var(--color-text-secondary)', fontSize: 13,
                border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)',
              }}>
                <Layers size={40} style={{ marginBottom: 12, opacity: 0.2 }} />
                <p style={{ margin: 0, fontWeight: 500 }}>No graph nodes found</p>
                <p style={{ margin: '4px 0 0', fontSize: 12 }}>Connect cloud integrations or run a reconciliation to populate the security graph</p>
                <button
                  onClick={handleReconcile}
                  style={{
                    marginTop: 16, padding: '8px 18px', fontSize: 12, fontWeight: 600,
                    background: 'var(--color-accent)', border: 'none',
                    borderRadius: 'var(--radius-md)', color: '#fff', cursor: 'pointer',
                  }}
                >
                  Reconcile Graph Now
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 16 }}>
                {/* Node list */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {filteredNodes.map(node => (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      style={{
                        padding: '12px 14px', background: 'var(--color-surface-elevated)',
                        border: `1px solid ${selectedNode?.id === node.id ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        borderRadius: 'var(--radius-md)', cursor: 'pointer',
                        transition: 'border-color 0.15s',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <NodeIcon type={node.node_type} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{
                            fontWeight: 500, fontSize: 12, color: 'var(--color-text-primary)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {node.name || node.external_id || node.id}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                            {node.node_type} · {node.provider || '—'} · {node.environment || '—'}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                        <NodeStatusBadge status={node.status || 'ACTIVE'} />
                      </div>
                    </div>
                  ))}
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 8 }}>
                    Showing {filteredNodes.length} of {nodes.length} nodes
                  </div>
                </div>

                {/* Node detail panel */}
                {selectedNode && (
                  <div style={{
                    width: 300, flexShrink: 0,
                    background: 'var(--color-surface-elevated)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    height: 'fit-content',
                    position: 'sticky', top: 0,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <NodeIcon type={selectedNode.node_type} />
                      <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)' }}>
                        Node Detail
                      </span>
                      <button
                        onClick={() => setSelectedNode(null)}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 16 }}
                      >×</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
                      <div>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: 11, marginBottom: 3 }}>Name / ID</div>
                        <div style={{ fontWeight: 500, wordBreak: 'break-all', fontSize: 11 }}>
                          {selectedNode.name || selectedNode.external_id || selectedNode.id}
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div>
                          <div style={{ color: 'var(--color-text-secondary)', fontSize: 11, marginBottom: 3 }}>Type</div>
                          <div style={{ fontWeight: 500 }}>{selectedNode.node_type}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--color-text-secondary)', fontSize: 11, marginBottom: 3 }}>Provider</div>
                          <div style={{ fontWeight: 500 }}>{selectedNode.provider || '—'}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--color-text-secondary)', fontSize: 11, marginBottom: 3 }}>Environment</div>
                          <div style={{ fontWeight: 500 }}>{selectedNode.environment || '—'}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--color-text-secondary)', fontSize: 11, marginBottom: 3 }}>Status</div>
                          <NodeStatusBadge status={selectedNode.status || 'ACTIVE'} />
                        </div>
                      </div>
                      {selectedNode.valid_from && (
                        <div>
                          <div style={{ color: 'var(--color-text-secondary)', fontSize: 11, marginBottom: 3 }}>Valid From</div>
                          <div style={{ fontSize: 11 }}>{new Date(selectedNode.valid_from).toLocaleString()}</div>
                        </div>
                      )}
                      <button
                        onClick={() => {
                          setActiveTab('blast_radius');
                          loadBlastRadius(selectedNode.id);
                        }}
                        style={{
                          marginTop: 8, padding: '7px 14px', fontSize: 12, fontWeight: 500,
                          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                          borderRadius: 'var(--radius-sm)', color: '#ef4444', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}
                      >
                        <Target size={12} /> Calculate Blast Radius
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Attack Paths Tab ── */}
        {!loading && activeTab === 'attack_paths' && (
          <>
            {noProject ? (
              <div style={{
                padding: '48px 24px', textAlign: 'center',
                color: 'var(--color-text-secondary)', fontSize: 13,
                border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)',
              }}>
                <Target size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
                <p style={{ margin: 0, fontWeight: 500 }}>Select a project to analyze attack paths</p>
              </div>
            ) : attackPaths.length === 0 ? (
              <div style={{
                padding: '48px 24px', textAlign: 'center',
                color: 'var(--color-text-secondary)', fontSize: 13,
                border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)',
              }}>
                <ShieldCheck size={32} style={{ marginBottom: 12, opacity: 0.3, color: '#22c55e' }} />
                <p style={{ margin: 0, fontWeight: 500 }}>No attack paths found</p>
                <p style={{ margin: '4px 0 0', fontSize: 12 }}>
                  Attack paths are computed from real graph traversal. Add nodes to the graph and run a reconciliation.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {attackPaths.map((path: any, idx: number) => (
                  <div key={path.id || idx} style={{
                    padding: '16px', background: 'var(--color-surface-elevated)',
                    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{path.path_id || `Path #${idx + 1}`}</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {path.risk_level && <RiskBadge risk={path.risk_level} />}
                        {path.hop_count && <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{path.hop_count} hops</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 12 }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>{path.source_node?.name || path.source_id || 'Unknown source'}</span>
                      <ArrowRight size={12} style={{ color: 'var(--color-text-muted)' }} />
                      <span style={{ fontWeight: 500 }}>{path.target_node?.name || path.target_id || 'Unknown target'}</span>
                    </div>
                    {Array.isArray(path.steps) && path.steps.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {path.steps.map((step: string, i: number) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 11 }}>
                            <span style={{
                              width: 18, height: 18, borderRadius: '50%', background: 'var(--color-border)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 10, flexShrink: 0, color: 'var(--color-text-secondary)',
                            }}>{i + 1}</span>
                            <span style={{ color: 'var(--color-text-secondary)' }}>{step}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Blast Radius Tab ── */}
        {!loading && activeTab === 'blast_radius' && (
          <>
            {noProject ? (
              <div style={{
                padding: '48px 24px', textAlign: 'center',
                color: 'var(--color-text-secondary)', fontSize: 13,
                border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)',
              }}>
                <Zap size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
                <p style={{ margin: 0, fontWeight: 500 }}>Select a project to analyze blast radius</p>
              </div>
            ) : blastLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1, 2].map(i => (
                  <div key={i} style={{ height: 60, background: 'var(--color-surface-elevated)', borderRadius: 'var(--radius-sm)', animation: 'pulse 1.5s infinite' }} />
                ))}
              </div>
            ) : blastRadiusData ? (
              blastRadiusData.error ? (
                <div style={{ padding: '12px', color: '#ef4444', fontSize: 12 }}>
                  <AlertTriangle size={14} style={{ display: 'inline', marginRight: 6 }} />
                  {blastRadiusData.error}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{
                    padding: '16px', background: 'var(--color-surface-elevated)',
                    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                  }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Blast Radius Analysis</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                      {blastRadiusData.affected_node_count != null && (
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 3 }}>Affected Nodes</div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: '#ef4444' }}>{blastRadiusData.affected_node_count}</div>
                        </div>
                      )}
                      {blastRadiusData.max_depth_reached != null && (
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 3 }}>Max Depth</div>
                          <div style={{ fontSize: 20, fontWeight: 700 }}>{blastRadiusData.max_depth_reached}</div>
                        </div>
                      )}
                      {blastRadiusData.blast_radius_score != null && (
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 3 }}>Score</div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: '#f97316' }}>{blastRadiusData.blast_radius_score}</div>
                        </div>
                      )}
                    </div>
                    {Array.isArray(blastRadiusData.affected_nodes) && blastRadiusData.affected_nodes.length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Affected Nodes</div>
                        {blastRadiusData.affected_nodes.map((n: any, i: number) => (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '6px 0', borderBottom: '1px solid var(--color-border)', fontSize: 12,
                          }}>
                            <NodeIcon type={n.node_type || 'SERVICE'} />
                            <span>{n.name || n.external_id || n.id}</span>
                            {n.status && <NodeStatusBadge status={n.status} />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            ) : (
              <div style={{
                padding: '48px 24px', textAlign: 'center',
                color: 'var(--color-text-secondary)', fontSize: 13,
                border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)',
              }}>
                <Zap size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
                <p style={{ margin: 0, fontWeight: 500 }}>Select a node to calculate its blast radius</p>
                <p style={{ margin: '4px 0 0', fontSize: 12 }}>Click a node in the Graph View tab and select "Calculate Blast Radius"</p>
              </div>
            )}
          </>
        )}

        {/* ── Relationships Tab ── */}
        {!loading && activeTab === 'relationships' && (
          <>
            {noProject ? (
              <div style={{
                padding: '48px 24px', textAlign: 'center',
                color: 'var(--color-text-secondary)', fontSize: 13,
                border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)',
              }}>
                <Radio size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
                <p style={{ margin: 0, fontWeight: 500 }}>Select a project to view relationships</p>
              </div>
            ) : edges.length === 0 ? (
              <div style={{
                padding: '48px 24px', textAlign: 'center',
                color: 'var(--color-text-secondary)', fontSize: 13,
                border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)',
              }}>
                <Radio size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
                <p style={{ margin: 0, fontWeight: 500 }}>No relationships found</p>
                <p style={{ margin: '4px 0 0', fontSize: 12 }}>Relationships are derived from graph reconciliation and cloud integrations</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                      {['Source Node', 'Relationship', 'Target Node', 'State', 'Confidence', 'Valid From'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: 11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {edges.map((edge: any) => {
                      const sourceNode = nodes.find(n => n.id === edge.source_node_id);
                      const targetNode = nodes.find(n => n.id === edge.target_node_id);
                      return (
                        <tr key={edge.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--color-text-secondary)' }}>
                            {sourceNode?.name || edge.source_node_id?.slice(0, 8) + '…'}
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 500 }}>
                            <span style={{ padding: '2px 8px', background: 'rgba(148,163,184,0.1)', borderRadius: 4, fontSize: 11 }}>
                              {edge.edge_type}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--color-text-secondary)' }}>
                            {targetNode?.name || edge.target_node_id?.slice(0, 8) + '…'}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <NodeStatusBadge status={edge.state || 'ACTIVE'} />
                          </td>
                          <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>
                            {edge.confidence != null ? `${Math.round(edge.confidence * 100)}%` : '—'}
                          </td>
                          <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)', fontSize: 11 }}>
                            {edge.valid_from ? new Date(edge.valid_from).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div style={{ marginTop: 12, fontSize: 11, color: 'var(--color-text-muted)' }}>
                  {edges.length} relationships
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
