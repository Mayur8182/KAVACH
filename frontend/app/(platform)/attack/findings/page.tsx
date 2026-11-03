'use client';

/**
 * Thing Attack — Findings Workspace (/attack/findings)
 * Verified offensive security findings with strict separation of Severity and Exploitability.
 * Real database values queried from GET /api/v1/attack/findings.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AttackWorkshell } from '@/components/attack/AttackWorkshell';
import {
  SeverityBadge,
  ExploitabilityBadge,
  EmptyAttackState,
} from '@/components/attack/AttackComponents';
import { api } from '@/lib/api/client';
import type { AttackFindingItem } from '@/types/api/attack';
import {
  Bug,
  RefreshCw,
  Search,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export default function AttackFindingsPage() {
  const router = useRouter();
  const [findings, setFindings] = useState<AttackFindingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [exploitFilter, setExploitFilter] = useState('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.attack.findings({
        search: search || undefined,
        severity: severityFilter !== 'ALL' ? severityFilter : undefined,
        exploitability: exploitFilter !== 'ALL' ? exploitFilter : undefined,
      });
      setFindings(res.items);
      setTotal(res.total);
    } catch (err: any) {
      setError(err?.message || 'Failed to load attack findings');
    } finally {
      setLoading(false);
    }
  }, [search, severityFilter, exploitFilter]);

  useEffect(() => {
    load();
  }, [load]);

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
        {/* Controls Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '12px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexGrow: 1, maxWidth: '400px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '6px 12px',
                width: '100%',
              }}
            >
              <Search size={13} color="var(--color-text-muted)" />
              <input
                type="text"
                placeholder="Search finding title, vulnerability type..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--color-text-primary)',
                  fontSize: '11.5px',
                  width: '100%',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              style={{
                background: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                fontSize: '11px',
                borderRadius: 'var(--radius-md)',
                padding: '6px 10px',
                outline: 'none',
              }}
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select
              value={exploitFilter}
              onChange={(e) => setExploitFilter(e.target.value)}
              style={{
                background: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                fontSize: '11px',
                borderRadius: 'var(--radius-md)',
                padding: '6px 10px',
                outline: 'none',
              }}
            >
              <option value="ALL">All Exploitability</option>
              <option value="EXPLOITABLE">Exploitable</option>
              <option value="THEORETICAL">Theoretical</option>
              <option value="NOT_EXPLOITABLE">Not Exploitable</option>
              <option value="TESTED">Tested</option>
              <option value="BLOCKED">Blocked</option>
            </select>
          </div>
        </div>

        {/* Findings Table */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Attack Findings ({total})
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              Severity ≠ Exploitability
            </span>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
              Querying verified findings...
            </div>
          ) : findings.length === 0 ? (
            <div style={{ padding: '60px 24px' }}>
              <EmptyAttackState
                title="No Findings Found"
                description="No offensive findings matched your search criteria."
              />
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-elevated)', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Finding</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Severity</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Exploitability</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Attack Type</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Evidence</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Retest Status</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--color-text-muted)' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {findings.map((f) => (
                  <tr
                    key={f.id}
                    onClick={() => router.push(`/attack/findings/${f.id}`)}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      cursor: 'pointer',
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-elevated)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      <div>{f.title}</div>
                      <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', fontWeight: 400, marginTop: '2px' }}>
                        {f.description.slice(0, 90)}...
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <SeverityBadge severity={f.severity} size="sm" />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <ExploitabilityBadge status={f.exploitability} />
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>
                      {f.attack_type}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {f.has_evidence ? (
                        <span style={{ fontSize: '10.5px', color: '#10b981', fontWeight: 600 }}>
                          ✓ Verifiable
                        </span>
                      ) : (
                        <span style={{ fontSize: '10.5px', color: 'var(--color-text-muted)' }}>
                          Hypothesis
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: '3px',
                          background: f.retest_status === 'VERIFIED_FIXED' ? 'rgba(16, 185, 129, 0.15)' : 'var(--color-surface-elevated)',
                          color: f.retest_status === 'VERIFIED_FIXED' ? '#10b981' : 'var(--color-text-muted)',
                        }}
                      >
                        {f.retest_status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <ChevronRight size={14} color="var(--color-text-muted)" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AttackWorkshell>
  );
}
