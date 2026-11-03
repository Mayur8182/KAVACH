'use client';

/**
 * Thing Code — Evidence Workspace (/code/evidence)
 * 
 * Cryptographically-bound, immutable execution evidence for code security.
 * Every security conclusion (SAFE / VULNERABLE / BLOCKED / ALLOWED) must link to
 * real scanner execution artifacts, policy evaluations, and commit references.
 * 
 * Data: GET /api/v1/code/evidence
 */

import React, { useState, useEffect, useCallback } from 'react';

import { EmptyCodeState } from '@/components/code/CodeComponents';
import { api } from '@/lib/api/client';
import {
  Archive,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Terminal,
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  FileCode2,
  ShieldCheck,
  Cpu,
  GitCommit,
} from 'lucide-react';

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function EvidencePage() {
  const [evidenceItems, setEvidenceItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { limit: 50 };
      if (sourceFilter !== 'all') {
        params.source = sourceFilter;
      }
      const data = await api.code.evidence(params);
      setEvidenceItems(data?.items ?? []);
      setTotal(data?.total ?? 0);
    } catch {
      setEvidenceItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [sourceFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredItems = evidenceItems.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.id?.toLowerCase().includes(q) ||
      item.target_ref?.toLowerCase().includes(q) ||
      item.source?.toLowerCase().includes(q) ||
      item.evidence_type?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '24px 32px' }}>
      {/* ── Top Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Thing Code Workspace
            </span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
            Immutable Evidence Registry
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
            Deterministic proof records backing every scan, finding, and policy evaluation. Rule: "Runtime evidence proves."
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ textAlign: 'right', padding: '6px 14px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
            <div style={{ fontSize: '10px', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
              Verified Records
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
              {total}
            </div>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              color: '#0F172A',
              fontSize: '13px',
              fontWeight: 500,
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* ── Filters & Search ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexGrow: 1, maxWidth: '400px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                padding: '6px 12px',
                width: '100%',
              }}
            >
              <Search size={14} style={{ color: 'var(--color-text-secondary)' }} />
              <input
                type="text"
                placeholder="Search by ID, repo, source..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--color-text-primary)',
                  fontSize: '13px',
                  width: '100%',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Source:</span>
            {['all', 'semgrep', 'gitleaks', 'trivy', 'osv'].map((s) => (
              <button
                key={s}
                onClick={() => setSourceFilter(s)}
                style={{
                  background: sourceFilter === s ? 'var(--color-surface-hover)' : 'transparent',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: sourceFilter === s ? 600 : 400,
                  color: sourceFilter === s ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* ── Evidence Table & Detail Drawer Layout ── */}
        <div style={{ display: 'grid', gridTemplateColumns: selectedItem ? '1fr 420px' : '1fr', gap: '16px' }}>
          {/* Evidence List */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            {loading ? (
              <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} style={{ height: '36px', background: 'var(--color-surface-hover)', borderRadius: '4px' }} />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <EmptyCodeState
                title="No Evidence Records"
                description={
                  sourceFilter !== 'all'
                    ? `No evidence found for source '${sourceFilter}'.`
                    : 'No scanner execution evidence has been recorded yet.'
                }
              />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-background)', borderBottom: '1px solid var(--color-border)' }}>
                      <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--color-text-secondary)', width: '130px' }}>Evidence ID</th>
                      <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--color-text-secondary)', width: '110px' }}>Source</th>
                      <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Target & Commit</th>
                      <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--color-text-secondary)', width: '100px' }}>Findings</th>
                      <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--color-text-secondary)', width: '110px' }}>Status</th>
                      <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--color-text-secondary)', width: '120px' }}>Recorded</th>
                      <th style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--color-text-secondary)', width: '60px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                        style={{
                          borderBottom: '1px solid var(--color-border)',
                          cursor: 'pointer',
                          background: selectedItem?.id === item.id ? 'var(--color-surface-hover)' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px' }}>
                          #{item.id.slice(0, 8)}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: 'rgba(99, 102, 241, 0.1)',
                              color: 'var(--color-primary)',
                              textTransform: 'uppercase',
                            }}
                          >
                            {item.source}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.target_ref}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontFamily: 'monospace', marginTop: '2px' }}>
                            {item.commit_sha ? `commit:${item.commit_sha.slice(0, 7)}` : 'HEAD'}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: item.findings_count > 0 ? 'var(--color-warning)' : 'var(--color-text-secondary)' }}>
                          {item.findings_count} findings
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background:
                                item.status === 'COMPLETED'
                                  ? 'rgba(34, 197, 94, 0.1)'
                                  : item.status === 'FAILED'
                                  ? 'rgba(239, 68, 68, 0.1)'
                                  : 'var(--color-surface-hover)',
                              color:
                                item.status === 'COMPLETED'
                                  ? 'var(--color-success)'
                                  : item.status === 'FAILED'
                                  ? 'var(--color-critical)'
                                  : 'var(--color-text-secondary)',
                            }}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                          {timeAgo(item.timestamp)}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <ChevronRight
                            size={14}
                            style={{
                              transform: selectedItem?.id === item.id ? 'rotate(90deg)' : 'none',
                              transition: 'transform 0.15s ease',
                              color: 'var(--color-text-secondary)',
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Evidence Inspector Side Panel */}
          {selectedItem && (
            <div
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                maxHeight: '800px',
                overflowY: 'auto',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  Evidence Artifact #{selectedItem.id.slice(0, 8)}
                </h3>
                <button
                  onClick={() => setSelectedItem(null)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '14px' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Evidence Type</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{selectedItem.evidence_type}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Scanner Engine</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{selectedItem.source}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Target Reference</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{selectedItem.target_ref}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Commit Binding</span>
                  <span style={{ fontFamily: 'monospace', color: 'var(--color-text-primary)' }}>
                    {selectedItem.commit_sha || 'HEAD'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Duration</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>
                    {selectedItem.metadata?.duration_ms ? `${selectedItem.metadata.duration_ms}ms` : '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Exit Code</span>
                  <span style={{ fontFamily: 'monospace', color: 'var(--color-text-primary)' }}>
                    {selectedItem.metadata?.exit_code ?? 0}
                  </span>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    Raw Execution Payload
                  </span>
                  <button
                    onClick={() => copyToClipboard(selectedItem.raw_artifact || JSON.stringify(selectedItem, null, 2), selectedItem.id)}
                    className="thing-btn"
                    style={{ fontSize: '11px', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {copiedId === selectedItem.id ? <Check size={11} style={{ color: 'var(--color-success)' }} /> : <Copy size={11} />}
                    {copiedId === selectedItem.id ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div
                  style={{
                    background: '#0d1117',
                    border: '1px solid #30363d',
                    borderRadius: '6px',
                    padding: '12px',
                    overflowX: 'auto',
                    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                    fontSize: '11px',
                    lineHeight: '1.5',
                    color: '#e6edf3',
                    maxHeight: '350px',
                    overflowY: 'auto',
                  }}
                >
                  <pre style={{ margin: 0 }}>
                    {selectedItem.raw_artifact || JSON.stringify(selectedItem, null, 2)}
                  </pre>
                </div>
              </div>

              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  background: 'rgba(34, 197, 94, 0.08)',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  fontSize: '11px',
                  color: 'var(--color-text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <ShieldCheck size={14} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                <span>Deterministic proof stored in PostgreSQL. Cryptographically traceable.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
