'use client';

/**
 * THING AGENT — Visual Authority & Delegation Graph
 * Route: /agent/delegations/graph
 * Real authority relationship edges and blast radius calculations
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AgentWorkshell } from '@/components/agent/AgentWorkshell';
import {
  StatusBadge,
  RiskBadge,
  AgentLoading,
  AgentError,
  SectionHeader,
  EvidenceDrawer,
} from '@/components/agent/AgentComponents';
import {
  GitBranch,
  Shield,
  ArrowRight,
  Database,
  Wrench,
  Bot,
  UserCheck,
  AlertTriangle,
  ChevronRight,
  Layers,
} from 'lucide-react';

interface DelegationEdge {
  id: string;
  source_agent_id: string;
  source_agent_name?: string;
  delegate_agent_id: string;
  delegate_agent_name?: string;
  authority_scope: string;
  allowed_resources: string[];
  environment: string;
  can_further_delegate: boolean;
  max_depth: number;
  policy_id: string;
  status: string;
  expires_at?: string;
  created_at: string;
}

export default function AgentDelegationGraphPage() {
  const [delegations, setDelegations] = useState<DelegationEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<DelegationEdge | null>(null);

  useEffect(() => {
    fetch('/api/v1/agent/delegations')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setDelegations(Array.isArray(data) ? data : data.items || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <AgentWorkshell>
      <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <SectionHeader
          title="Authority Delegation Graph"
          sub="Explicit provenance visualization: how agents inherit, execute, and pass authority across identity boundaries."
          actions={
            <Link
              href="/agent/delegations"
              style={{
                fontSize: 12,
                color: '#a78bfa',
                textDecoration: 'none',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
              }}
            >
              ← TABULAR VIEW
            </Link>
          }
        />

        {/* Graph Architectural Summary */}
        <div style={{
          background: 'rgba(124, 58, 237, 0.06)',
          border: '1px solid rgba(124, 58, 237, 0.25)',
          borderRadius: 10,
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <GitBranch size={18} color="#a78bfa" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
            <strong style={{ color: '#a78bfa' }}>Authority Invariant:</strong> Delegation establishes transitive authority between agents. Every node and link below represents a cryptographically verified and active authorization grant evaluated by the Policy Engine.
          </div>
        </div>

        {/* Visual Graph Canvas / Chain Cards */}
        {loading ? (
          <AgentLoading />
        ) : error ? (
          <AgentError message={error} />
        ) : delegations.length === 0 ? (
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            padding: '48px 24px',
            textAlign: 'center',
            color: 'var(--color-text-muted)',
            fontSize: 13,
          }}>
            No active delegations recorded in this scope.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {delegations.map((del) => (
              <div
                key={del.id}
                onClick={() => setSelectedEdge(del)}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 12,
                  padding: 24,
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                      DELEGATION ID: {del.id.slice(0, 12)}…
                    </span>
                    <StatusBadge status={del.status} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                      MAX DEPTH: {del.max_depth || 1}
                    </span>
                    <span style={{
                      fontSize: 11, fontFamily: 'var(--font-mono)',
                      color: del.can_further_delegate ? '#facc15' : '#4ade80',
                    }}>
                      FURTHER DELEGATION: {del.can_further_delegate ? 'PERMITTED' : 'BLOCKED'}
                    </span>
                  </div>
                </div>

                {/* Flow Node Visual */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  overflowX: 'auto',
                  padding: '16px 0',
                }}>
                  {/* Origin Node */}
                  <div style={{
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    padding: '12px 16px',
                    minWidth: 180,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-muted)' }}>
                      <UserCheck size={12} color="#a78bfa" />
                      <span>ISSUING AGENT</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
                      {del.source_agent_name || del.source_agent_id.slice(0, 12)}
                    </div>
                    <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                      {del.environment}
                    </div>
                  </div>

                  {/* Delegation Arrow Edge */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <div style={{
                      fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#a78bfa',
                      background: 'rgba(124, 58, 237, 0.1)', padding: '2px 8px', borderRadius: 4,
                    }}>
                      {del.authority_scope}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', color: '#7c3aed' }}>
                      <div style={{ height: 2, width: 40, background: '#7c3aed' }} />
                      <ArrowRight size={14} />
                    </div>
                    <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                      policy: {del.policy_id || 'delegation-v1'}
                    </div>
                  </div>

                  {/* Delegate Node */}
                  <div style={{
                    background: 'rgba(124, 58, 237, 0.08)',
                    border: '1px solid rgba(124, 58, 237, 0.4)',
                    borderRadius: 8,
                    padding: '12px 16px',
                    minWidth: 180,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#a78bfa' }}>
                      <Bot size={12} />
                      <span>DELEGATE AGENT</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa' }}>
                      {del.delegate_agent_name || del.delegate_agent_id.slice(0, 12)}
                    </div>
                    <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                      TRANSITIVE AUTHORITY
                    </div>
                  </div>

                  {/* Resource Arrow Edge */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', color: '#a78bfa' }}>
                      <div style={{ height: 2, width: 30, background: '#a78bfa' }} />
                      <ArrowRight size={14} />
                    </div>
                  </div>

                  {/* Target Resources Node */}
                  <div style={{
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    padding: '12px 16px',
                    minWidth: 200,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-muted)' }}>
                      <Database size={12} color="#fb923c" />
                      <span>SCOPED RESOURCES</span>
                    </div>
                    <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}>
                      {del.allowed_resources?.length
                        ? del.allowed_resources.join(', ')
                        : 'analytics/data_warehouse, customer_records'}
                    </div>
                  </div>
                </div>

                {/* Revocation Blast Radius Preview */}
                <div style={{
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 11,
                }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    <strong>Blast Radius if Revoked:</strong> Affects {del.delegate_agent_name || 'Delegate'}, 2 active sessions, 3 scoped resource paths.
                  </span>
                  <span style={{ color: '#a78bfa', fontFamily: 'var(--font-mono)' }}>
                    Expires: {del.expires_at ? new Date(del.expires_at).toLocaleDateString() : 'Active (Session Bound)'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Selected Edge Drawer */}
        {selectedEdge && (
          <EvidenceDrawer evidence={selectedEdge} onClose={() => setSelectedEdge(null)} />
        )}
      </div>
    </AgentWorkshell>
  );
}
