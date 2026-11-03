'use client';

/**
 * Thing Protect — Enforcement Center Page (/protect/enforcement)
 * Real-time decision stream, gateway proxy logs, and cryptographic proof inspector.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  Search,
  Filter,
  RefreshCw,
  Lock,
  ChevronRight,
  Shield,
  Layers,
} from 'lucide-react';
import { ProtectWorkshell } from '@/components/protect/ProtectWorkshell';
import {
  EnforcementDecisionBadge,
  EvidenceDrawer,
  EmptyProtectState,
} from '@/components/protect/ProtectComponents';
import { api } from '@/lib/api/client';
import type { ProtectionEvidence } from '@/types/api/protect';

export default function EnforcementPage() {
  const [decisions, setDecisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [decisionFilter, setDecisionFilter] = useState('ALL');
  const [selectedEvidence, setSelectedEvidence] = useState<ProtectionEvidence | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchDecisions = async () => {
    try {
      setLoading(true);
      const data: any = await api.protect.decisions();
      const list = Array.isArray(data) ? data : data?.items || [];
      setDecisions(list);
    } catch (err) {
      console.error('Failed to load enforcement decisions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDecisions();
  }, []);

  const handleInspectEvidence = async (evId?: string) => {
    if (!evId) return;
    try {
      const ev = await api.protect.evidenceDetail(evId);
      setSelectedEvidence(ev);
      setDrawerOpen(true);
    } catch (err) {
      console.error('Failed to fetch evidence:', err);
    }
  };

  const safeDecisions = Array.isArray(decisions) ? decisions : [];
  const filtered = safeDecisions.filter((d) => {
    const actor = d.actor || '';
    const action = d.action || '';
    const resource = d.resource || '';
    const policy = d.policy_name || '';
    const dec = d.decision || '';
    const matchSearch =
      actor.toLowerCase().includes(search.toLowerCase()) ||
      action.toLowerCase().includes(search.toLowerCase()) ||
      resource.toLowerCase().includes(search.toLowerCase()) ||
      policy.toLowerCase().includes(search.toLowerCase());
    const matchDecision = decisionFilter === 'ALL' || dec === decisionFilter;
    return matchSearch && matchDecision;
  });

  return (
    <ProtectWorkshell>
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
              ENFORCEMENT CENTER
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
              Real-time policy decisions, gate evaluations, and runtime blocks across all proxies and gateways.
            </p>
          </div>

          <button
            onClick={fetchDecisions}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 600,
              background: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            Sync Decisions
          </button>
        </div>

        {/* Filters */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={13} color="var(--color-text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              placeholder="Search actor, action, resource, policy..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                fontSize: '12px',
                background: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text-primary)',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            <Filter size={12} />
            <span>Decision:</span>
            <select
              value={decisionFilter}
              onChange={(e) => setDecisionFilter(e.target.value)}
              style={{
                background: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                fontSize: '11px',
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                outline: 'none',
              }}
            >
              <option value="ALL">ALL DECISIONS</option>
              <option value="ALLOW">ALLOW</option>
              <option value="BLOCK">BLOCK</option>
              <option value="CHALLENGE">CHALLENGE</option>
              <option value="REQUIRE_APPROVAL">REQUIRE APPROVAL</option>
              <option value="RATE_LIMIT">RATE LIMIT</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}
        >
          {loading && safeDecisions.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Loading enforcement decisions stream...
            </div>
          ) : filtered.length === 0 ? (
            <EmptyProtectState
              title="NO ENFORCEMENT EVENTS"
              description="No enforcement decisions match the selected filter."
            />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    background: 'var(--color-surface-elevated)',
                    color: 'var(--color-text-muted)',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  <th style={{ padding: '10px 16px' }}>TIMESTAMP</th>
                  <th style={{ padding: '10px 16px' }}>ACTOR</th>
                  <th style={{ padding: '10px 16px' }}>ACTION &amp; TARGET</th>
                  <th style={{ padding: '10px 16px' }}>POLICY</th>
                  <th style={{ padding: '10px 16px' }}>DECISION</th>
                  <th style={{ padding: '10px 16px' }}>REASON</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right' }}>EVIDENCE &amp; PROOF</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr
                    key={d.id}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                      {d.timestamp ? new Date(d.timestamp).toLocaleTimeString() : 'Now'}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {d.actor}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-primary)' }}>
                      <span>{d.action}</span>
                      <span style={{ color: 'var(--color-text-muted)', margin: '0 4px' }}>→</span>
                      <span style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>{d.resource}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>
                      {d.policy_name}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <EnforcementDecisionBadge decision={d.decision || 'BLOCK'} />
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>
                      {d.reason}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {d.evidence_id && (
                          <button
                            onClick={() => handleInspectEvidence(d.evidence_id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              fontSize: '11px',
                              color: '#10b981',
                              background: 'rgba(16, 185, 129, 0.08)',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                            }}
                          >
                            <Lock size={10} />
                            <span>PROOF</span>
                          </button>
                        )}
                        <Link
                          href={`/protect/enforcement/${d.id}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px',
                            padding: '2px 8px',
                            fontSize: '11px',
                            color: 'var(--color-text-secondary)',
                            background: 'var(--color-surface-elevated)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            textDecoration: 'none',
                          }}
                        >
                          <span>DETAIL</span>
                          <ChevronRight size={10} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <EvidenceDrawer
        evidence={selectedEvidence}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </ProtectWorkshell>
  );
}
