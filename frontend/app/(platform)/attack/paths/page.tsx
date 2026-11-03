'use client';

/**
 * Thing Attack — Attack Paths (/attack/paths)
 * Visual, interactive multi-hop attack path explorer.
 * Displays node & edge provenance (OBSERVED, CONFIGURED, INFERRED, VERIFIED) and MITRE tactics.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AttackWorkshell } from '@/components/attack/AttackWorkshell';
import {
  ProvenanceBadge,
  EmptyAttackState,
} from '@/components/attack/AttackComponents';
import { api } from '@/lib/api/client';
import type { AttackPathItem, AttackPathNode } from '@/types/api/attack';
import {
  GitFork,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Server,
  Database,
  Lock,
  Globe2,
  FileCode2,
  KeyRound,
  ExternalLink,
} from 'lucide-react';

export default function AttackPathsPage() {
  const router = useRouter();
  const [paths, setPaths] = useState<AttackPathItem[]>([]);
  const [selectedPath, setSelectedPath] = useState<AttackPathItem | null>(null);
  const [selectedNode, setSelectedNode] = useState<AttackPathNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.attack.paths();
      setPaths(res.items);
      if (res.items.length > 0) {
        setSelectedPath(res.items[0]);
        if (res.items[0].nodes.length > 0) {
          setSelectedNode(res.items[0].nodes[0]);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load attack paths');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'INTERNET':
        return <Globe2 size={15} color="#38bdf8" />;
      case 'PUBLIC_API':
        return <FileCode2 size={15} color="#f87171" />;
      case 'AUTH_WEAKNESS':
        return <KeyRound size={15} color="#eab308" />;
      case 'SERVICE':
        return <Server size={15} color="#10b981" />;
      case 'PRIVILEGED_IDENTITY':
        return <Lock size={15} color="#8b5cf6" />;
      case 'DATABASE':
        return <Database size={15} color="#06b6d4" />;
      default:
        return <AlertTriangle size={15} color="#ef4444" />;
    }
  };

  return (
    <AttackWorkshell
      actions={
        <button
          onClick={load}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            fontSize: '11px',
            fontWeight: 500,
            background: 'var(--color-surface-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-primary)',
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      }
    >
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Multi-Hop Attack Paths &amp; Exploit Chains
            </h2>
            <p style={{ margin: '3px 0 0 0', fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
              Deterministic graph paths connecting public entrypoints to sensitive data assets. Every edge carries explicit provenance.
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Evaluating attack graph relationships...
          </div>
        ) : paths.length === 0 ? (
          <EmptyAttackState
            title="No Active Attack Paths"
            description="No exploitable multi-hop chains detected across current tested assets."
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>
            {/* Sidebar Path List */}
            <div
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                height: 'fit-content',
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                Detected Attack Paths ({paths.length})
              </span>

              {paths.map((p) => {
                const isSelected = selectedPath?.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedPath(p);
                      setSelectedNode(p.nodes[0] || null);
                    }}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'rgba(239, 68, 68, 0.12)' : 'var(--color-surface-elevated)',
                      border: isSelected ? '1px solid #ef4444' : '1px solid var(--color-border)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '3px',
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#ef4444',
                        }}
                      >
                        SCORE {p.risk_score}
                      </span>
                      {p.verified && (
                        <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 600 }}>
                          ✓ Verified
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {p.title}
                    </span>
                    <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)' }}>
                      {p.nodes.length} Hops • Target: {p.target_asset}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Main Interactive Visual Graph Area */}
            {selectedPath && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Graph View Box */}
                <div
                  style={{
                    background: '#0d1117',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: '380px',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <GitFork size={16} color="#ef4444" />
                      <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#e6edf3' }}>
                        {selectedPath.title}
                      </h3>
                    </div>
                    <span style={{ fontSize: '11px', color: '#8b949e' }}>
                      Click any node to inspect provenance and evidence
                    </span>
                  </div>

                  {/* Horizontal Flow Chain */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      overflowX: 'auto',
                      padding: '20px 0',
                    }}
                  >
                    {selectedPath.nodes.map((node, idx) => {
                      const isSelected = selectedNode?.id === node.id;
                      const edge = selectedPath.edges[idx];

                      return (
                        <React.Fragment key={node.id}>
                          <div
                            onClick={() => setSelectedNode(node)}
                            style={{
                              flexShrink: 0,
                              width: '210px',
                              background: isSelected ? 'rgba(239, 68, 68, 0.2)' : '#161b22',
                              border: isSelected ? '2px solid #ef4444' : '1px solid #30363d',
                              borderRadius: '8px',
                              padding: '14px',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              transition: 'all 0.15s ease',
                              boxShadow: isSelected ? '0 0 16px rgba(239, 68, 68, 0.3)' : 'none',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {getNodeIcon(node.node_type)}
                                <span style={{ fontSize: '10px', fontWeight: 600, color: '#8b949e' }}>
                                  HOP {idx + 1}
                                </span>
                              </div>
                              <ProvenanceBadge provenance={node.provenance} />
                            </div>

                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#f0f6fc', lineHeight: 1.3 }}>
                              {node.label}
                            </span>
                          </div>

                          {idx < selectedPath.nodes.length - 1 && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                              <span style={{ fontSize: '9px', color: '#8b949e', marginBottom: '2px' }}>
                                {edge ? edge.label : 'links'}
                              </span>
                              <div style={{ color: '#ef4444', fontSize: '16px' }}>→</div>
                              {edge && <ProvenanceBadge provenance={edge.provenance} />}
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* Node Inspector Drawer */}
                {selectedNode && (
                  <div
                    style={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '20px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {getNodeIcon(selectedNode.node_type)}
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          Node Inspector: {selectedNode.label}
                        </h4>
                      </div>
                      <ProvenanceBadge provenance={selectedNode.provenance} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '12px' }}>
                      <div>
                        <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Classification</span>
                        <p style={{ margin: '2px 0 0 0', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {selectedNode.node_type}
                        </p>
                      </div>
                      <div>
                        <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Deterministic Proof</span>
                        <p style={{ margin: '2px 0 0 0', color: selectedNode.provenance === 'VERIFIED' ? '#10b981' : 'var(--color-text-primary)', fontWeight: 600 }}>
                          {selectedNode.provenance === 'VERIFIED' ? 'Verified with HTTP & Sandbox Evidence' : 'Derived from Network Topology'}
                        </p>
                      </div>
                      <div>
                        <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Cross-Product Context</span>
                        <p style={{ margin: '2px 0 0 0', color: '#ef4444', fontWeight: 600 }}>
                          Linked to Code Security &amp; Runtime Defense
                        </p>
                      </div>
                    </div>

                    {selectedPath.finding_id && (
                      <div style={{ marginTop: '16px' }}>
                        <Link
                          href={`/attack/findings/${selectedPath.finding_id}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11.5px',
                            color: '#ef4444',
                            fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          View Exploit Evidence &amp; Reproduction Steps <ArrowRight size={12} />
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AttackWorkshell>
  );
}
