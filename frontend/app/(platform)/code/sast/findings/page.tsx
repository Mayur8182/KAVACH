'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  RefreshCw,
  Sparkles,
  MoreVertical,
  X,
  FileDown,
  FileCode2,
  ChevronDown,
  FileSpreadsheet,
  Printer,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { useScope } from '@/context/ScopeContext';
import { KavachSastLayout } from '@/components/code/sast/KavachSastLayout';

const SEVERITY_CONFIG: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  CRITICAL: { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA', dot: '#EF4444' },
  HIGH: { bg: '#FFF7ED', text: '#EA580C', border: '#FFEDD5', dot: '#F97316' },
  MEDIUM: { bg: '#FFFBEB', text: '#D97706', border: '#FEF3C7', dot: '#F59E0B' },
  LOW: { bg: '#F0FDF4', text: '#16A34A', border: '#DCFCE7', dot: '#22C55E' },
  INFO: { bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0', dot: '#94A3B8' },
};

function formatTimeAgo(dateStr?: string | null): string {
  if (!dateStr) return 'Just now';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function SASTFindingsPage() {
  const router = useRouter();
  const { currentProject, currentRepository } = useScope();

  const [findings, setFindings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [modalFinding, setModalFinding] = useState<any | null>(null);
  const [isFindingModalOpen, setIsFindingModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'Details' | 'Evidence' | 'Remediation'>('Details');
  const [activeRowMenuId, setActiveRowMenuId] = useState<string | null>(null);

  const loadFindings = useCallback(async () => {
    setLoading(true);
    try {
      const repoParam = currentRepository?.name && currentRepository.name !== 'All Repositories' ? currentRepository.name : undefined;
      const projParam = currentProject?.id || undefined;
      const res = await api.sast.recentFindings({ page: 1, page_size: 150, repository: repoParam, project_id: projParam });
      if (res?.items) {
        setFindings(res.items);
      } else {
        const fallback = await api.code.findings({ limit: 150 });
        if (fallback?.items) setFindings(fallback.items);
      }
    } catch {
      // Fallback
      api.code.findings({ limit: 100 })
        .then((r: any) => { if (r?.items) setFindings(r.items); })
        .catch(() => {});
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, currentRepository?.name]);

  useEffect(() => {
    loadFindings();
  }, [loadFindings]);

  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      const matchSearch =
        searchQuery === '' ||
        (f.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.rule_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.file_path || '').toLowerCase().includes(searchQuery.toLowerCase());

      const sev = (f.severity || '').toUpperCase();
      const matchSev = severityFilter === 'ALL' || sev === severityFilter;

      const st = (f.status || '').toUpperCase();
      const matchStatus = statusFilter === 'ALL' || st === statusFilter;

      return matchSearch && matchSev && matchStatus;
    });
  }, [findings, searchQuery, severityFilter, statusFilter]);

  return (
    <KavachSastLayout>
      <div style={{ padding: '16px 24px', maxWidth: '1600px', margin: '0 auto', display: 'flex', flexDirection: 'column', width: '100%' }}>
        
        {/* ── 1. Sleek Sub-Toolbar matching SAST Workspace ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px',
            padding: '4px 0',
          }}
        >
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              SAST Findings Hub
            </h1>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '3px 0 0 0' }}>
              Explore, filter, triage, and remediate static application code vulnerabilities.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={loadFindings}
              disabled={loading}
              title="Refresh Findings"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                fontSize: '12px',
                fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer',
              }}
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden',
          }}
        >
          {/* Filter Toolbar */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                Active SAST Findings
              </span>
              <span style={{ fontSize: '12px', color: '#64748B', marginLeft: '8px' }}>
                ({filteredFindings.length} records)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#F8FAFC',
                  fontSize: '12px',
                }}
              >
                <Search size={13} color="#94A3B8" />
                <input
                  type="text"
                  placeholder="Search finding or path..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: '12px',
                    color: '#0F172A',
                    width: '200px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', backgroundColor: '#F1F5F9', borderRadius: '6px', padding: '2px' }}>
                {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSeverityFilter(s)}
                    style={{
                      padding: '4px 8px',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: severityFilter === s ? 700 : 500,
                      backgroundColor: severityFilter === s ? '#0F172A' : 'transparent',
                      color: severityFilter === s ? '#FFFFFF' : '#64748B',
                      cursor: 'pointer',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>
              <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 10px auto' }} />
              <div>Loading findings...</div>
            </div>
          ) : filteredFindings.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>
              <ShieldCheck size={36} color="#10B981" style={{ margin: '0 auto 12px auto' }} />
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>No findings match your filter</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#64748B', fontSize: '11.5px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 16px', fontWeight: 700 }}>Severity</th>
                    <th style={{ padding: '10px 16px', fontWeight: 700 }}>Title / Rule</th>
                    <th style={{ padding: '10px 16px', fontWeight: 700 }}>File &amp; Line</th>
                    <th style={{ padding: '10px 16px', fontWeight: 700 }}>Detected</th>
                    <th style={{ padding: '10px 16px', fontWeight: 700 }}>Status</th>
                    <th style={{ padding: '10px 16px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFindings.map((f: any) => {
                    const sevKey = (f.severity || 'LOW').toUpperCase();
                    const sevStyle = SEVERITY_CONFIG[sevKey] || SEVERITY_CONFIG.LOW;
                    return (
                      <tr
                        key={f.id}
                        onClick={() => {
                          setModalFinding(f);
                          setModalTab('Details');
                          setIsFindingModalOpen(true);
                        }}
                        style={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: sevStyle.bg,
                              color: sevStyle.text,
                              border: `1px solid ${sevStyle.border}`,
                            }}
                          >
                            {sevKey}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600, color: '#0F172A' }}>{f.title}</div>
                          <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>{f.rule_id}</div>
                        </td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '11.5px', color: '#2563EB' }}>
                          {f.file_path}:{f.line_number || 1}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '12px', color: '#64748B' }}>
                          {formatTimeAgo(f.created_at)}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: f.status === 'FIXED' ? '#ECFDF5' : '#FEF3C7',
                              color: f.status === 'FIXED' ? '#059669' : '#D97706',
                            }}
                          >
                            {f.status || 'OPEN'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setModalFinding(f);
                              setModalTab('Remediation');
                              setIsFindingModalOpen(true);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              border: '1px solid #7C3AED',
                              backgroundColor: '#F5F3FF',
                              color: '#7C3AED',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            <Sparkles size={12} />
                            <span>AutoFix</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Centered Modal Popup */}
      {isFindingModalOpen && modalFinding && (
        <div
          onClick={() => setIsFindingModalOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '820px',
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #E2E8F0',
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  {modalFinding.title}
                </h3>
                <div style={{ fontSize: '12px', color: '#64748B', fontFamily: 'monospace', marginTop: '2px' }}>
                  {modalFinding.rule_id} • {modalFinding.file_path}:{modalFinding.line_number || 1}
                </div>
              </div>
              <button onClick={() => setIsFindingModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                <X size={18} color="#64748B" />
              </button>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', padding: '0 24px' }}>
              {(['Details', 'Evidence', 'Remediation'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setModalTab(tab)}
                  style={{
                    padding: '12px 16px',
                    fontSize: '13px',
                    fontWeight: modalTab === tab ? 700 : 500,
                    color: modalTab === tab ? '#0F172A' : '#64748B',
                    borderBottom: modalTab === tab ? '2px solid #0F172A' : '2px solid transparent',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {tab === 'Remediation' ? '✨ Remediation & AutoFix' : tab}
                </button>
              ))}
            </div>

            <div style={{ padding: '24px', overflowY: 'auto' }}>
              {modalTab === 'Details' && (
                <div>
                  <p style={{ fontSize: '13.5px', color: '#1E293B', lineHeight: 1.6 }}>
                    {modalFinding.description || 'Static analysis pattern match identified security risk.'}
                  </p>
                  {modalFinding.code_snippet && (
                    <pre style={{ backgroundColor: '#0F172A', color: '#F8FAFC', padding: '14px', borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace', overflowX: 'auto' }}>
                      <code>{modalFinding.code_snippet}</code>
                    </pre>
                  )}
                </div>
              )}

              {modalTab === 'Evidence' && (
                <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px' }}>
                  <div><strong>Fingerprint:</strong> <code>{modalFinding.fingerprint || modalFinding.id}</code></div>
                  <div style={{ marginTop: '8px' }}><strong>Scanner:</strong> Semgrep AST Engine</div>
                  <div style={{ marginTop: '8px' }}><strong>Rule:</strong> <code>{modalFinding.rule_id}</code></div>
                </div>
              )}

              {modalTab === 'Remediation' && (
                <div>
                  <div style={{ backgroundColor: '#F5F3FF', padding: '16px', borderRadius: '8px', border: '1px solid #DDD6FE', marginBottom: '16px' }}>
                    <div style={{ fontWeight: 700, color: '#6D28D9', marginBottom: '4px' }}>Remediation Recommendation</div>
                    <div style={{ fontSize: '13px', color: '#4C1D95' }}>
                      {modalFinding.remediation_advice || 'Sanitize user controlled input and validate boundaries before execution.'}
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/code/autofix?finding_id=${modalFinding.id}`)}
                    style={{
                      padding: '10px 18px',
                      backgroundColor: '#7C3AED',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Sparkles size={14} />
                    <span>Open in AI AutoFix Studio</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </KavachSastLayout>
  );
}
