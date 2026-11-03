'use client';

/**
 * Thing Code — SAST Baselines & Drift (/code/sast/baselines)
 * 
 * Production-grade security baseline management.
 * Tracks approved baseline commits to suppress legacy debt and only flag newly introduced regressions.
 * Core Principle: "LLM proposes. Deterministic security systems decide. Runtime evidence proves."
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Compass,
  Plus,
  RefreshCw,
  GitBranch,
  GitCommit,
  FolderGit2,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Search,
  Filter,
  ArrowRight,
  SlidersHorizontal,
  X,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { useScope } from '@/context/ScopeContext';

export default function SASTBaselinesPage() {
  const router = useRouter();
  const { currentProject } = useScope();

  const [baselines, setBaselines] = useState<any[]>([]);
  const [repositories, setRepositories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [repoFilter, setRepoFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRepoId, setSelectedRepoId] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [baselineNote, setBaselineNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const projId = currentProject?.id || undefined;
      const [baseRes, repoRes] = await Promise.allSettled([
        api.sast.baselines({ project_id: projId }),
        api.sast.repositories(projId),
      ]);

      if (baseRes.status === 'fulfilled' && baseRes.value?.items) {
        setBaselines(baseRes.value.items);
      }
      if (repoRes.status === 'fulfilled' && repoRes.value) {
        setRepositories(repoRes.value);
        if (repoRes.value.length > 0 && !selectedRepoId) {
          setSelectedRepoId(repoRes.value[0].id);
        }
      }
    } catch (err: any) {
      console.error('[Baselines] Failed to load:', err);
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, selectedRepoId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateBaseline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepoId) return;

    setIsSubmitting(true);
    try {
      await api.sast.createBaseline(
        {
          repository_id: selectedRepoId,
          branch: selectedBranch,
          note: baselineNote || 'Approved production baseline',
        },
        currentProject?.id
      );
      showToast('Successfully established new approved security baseline.');
      setIsModalOpen(false);
      setBaselineNote('');
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to establish baseline.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredBaselines = baselines.filter((b) => {
    const matchesSearch =
      !searchQuery ||
      b.repository_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.commit_sha?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.branch?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRepo = repoFilter === 'ALL' || b.repository_id === repoFilter;
    return matchesSearch && matchesRepo;
  });

  return (
    <div style={{ minHeight: '100%', backgroundColor: '#F8FAFC', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={16} color="#10B981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumb & Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748B', marginBottom: '6px' }}>
            <Link href="/code" style={{ color: '#64748B', textDecoration: 'none' }}>Code Security</Link>
            <ChevronRight size={12} />
            <Link href="/code/sast" style={{ color: '#64748B', textDecoration: 'none' }}>SAST Analysis</Link>
            <ChevronRight size={12} />
            <span style={{ color: '#0F172A', fontWeight: 600 }}>Baselines & Drift</span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Security Baselines & Drift Control
          </h1>
          <p style={{ fontSize: '13.5px', color: '#64748B', marginTop: '4px', margin: 0 }}>
            Define approved security snapshots to suppress existing legacy findings and gate merges solely on newly introduced vulnerabilities.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={loadData}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              color: '#475569',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: '#2563EB',
              border: 'none',
              borderRadius: '8px',
              color: '#FFFFFF',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
            }}
          >
            <Plus size={14} />
            Establish New Baseline
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>ACTIVE BASELINES</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
            {baselines.filter((b) => b.status === 'ACTIVE').length}
          </div>
          <div style={{ fontSize: '11.5px', color: '#16A34A', marginTop: '4px', fontWeight: 600 }}>
            Guarding CI Merge Gates
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>MONITORED BRANCHES</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
            {new Set(baselines.map((b) => `${b.repository_name}:${b.branch}`)).size || repositories.length}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>
            Tracking git HEAD drift
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>SUPPRESSED BASELINE DEBT</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#EA580C', marginTop: '4px' }}>
            {baselines.reduce((acc, b) => acc + (b.total_findings_at_baseline || 0), 0)}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>
            Existing legacy findings
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>REGRESSION DRIFT ENFORCEMENT</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#10B981', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={16} color="#10B981" />
            0 New Findings Allowed
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '360px' }}>
            <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by repository, branch, or commit SHA..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 12px 7px 34px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                fontSize: '12.5px',
                color: '#0F172A',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Repository:</span>
            <select
              value={repoFilter}
              onChange={(e) => setRepoFilter(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
                color: '#0F172A',
                backgroundColor: '#FFFFFF',
                outline: 'none',
              }}
            >
              <option value="ALL">All Repositories ({repositories.length})</option>
              {repositories.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <span style={{ fontSize: '12px', color: '#64748B' }}>
          Showing <strong>{filteredBaselines.length}</strong> established baselines
        </span>
      </div>

      {/* Baselines Table */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11.5px', fontWeight: 700 }}>
              <th style={{ padding: '12px 16px' }}>REPOSITORY</th>
              <th style={{ padding: '12px 16px' }}>BRANCH</th>
              <th style={{ padding: '12px 16px' }}>BASELINE COMMIT</th>
              <th style={{ padding: '12px 16px' }}>FINDINGS AT BASELINE</th>
              <th style={{ padding: '12px 16px' }}>ESTABLISHED</th>
              <th style={{ padding: '12px 16px' }}>STATUS</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredBaselines.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '48px 16px', textAlign: 'center', color: '#94A3B8' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <Compass size={32} color="#CBD5E1" />
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>No Baselines Found</span>
                    <span style={{ fontSize: '12px', color: '#94A3B8' }}>Establish an approved security baseline to track code drift on incoming PRs.</span>
                    <button
                      onClick={() => setIsModalOpen(true)}
                      style={{
                        marginTop: '8px',
                        padding: '6px 14px',
                        backgroundColor: '#2563EB',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      + Establish First Baseline
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredBaselines.map((b) => (
                <tr
                  key={b.id}
                  style={{ borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.15s ease' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#0F172A' }}>
                      <FolderGit2 size={15} color="#2563EB" />
                      <span>{b.repository_name}</span>
                    </div>
                    {b.note && <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{b.note}</div>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#F1F5F9', padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', color: '#475569', fontWeight: 600 }}>
                      <GitBranch size={12} />
                      {b.branch}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'monospace', fontSize: '12px', color: '#2563EB', fontWeight: 600 }}>
                      <GitCommit size={12} />
                      {b.commit_sha}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px' }}>
                      <span style={{ fontWeight: 700, color: '#0F172A' }}>{b.total_findings_at_baseline} Total:</span>
                      {b.critical_count > 0 && <span style={{ color: '#DC2626', fontWeight: 700 }}>{b.critical_count}C</span>}
                      {b.high_count > 0 && <span style={{ color: '#EA580C', fontWeight: 700 }}>{b.high_count}H</span>}
                      {b.medium_count > 0 && <span style={{ color: '#CA8A04', fontWeight: 700 }}>{b.medium_count}M</span>}
                      {b.low_count > 0 && <span style={{ color: '#2563EB', fontWeight: 700 }}>{b.low_count}L</span>}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: '12px', color: '#0F172A' }}>{b.established_at}</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>by {b.established_by}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: b.status === 'ACTIVE' ? '#F0FDF4' : '#F1F5F9',
                        color: b.status === 'ACTIVE' ? '#16A34A' : '#64748B',
                        border: `1px solid ${b.status === 'ACTIVE' ? '#BBF7D0' : '#E2E8F0'}`,
                      }}
                    >
                      {b.status === 'ACTIVE' ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                      {b.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        onClick={() => router.push(`/code/pull-requests`)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#FFFFFF',
                          color: '#0F172A',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        PR Drift View
                      </button>
                      <button
                        onClick={() => {
                          setSelectedRepoId(b.repository_id);
                          setSelectedBranch(b.branch);
                          setIsModalOpen(true);
                        }}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          border: '1px solid #BFDBFE',
                          backgroundColor: '#EFF6FF',
                          color: '#2563EB',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Re-baseline
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modal: Establish Approved Baseline ── */}
      {isModalOpen && (
        <div
          onClick={() => setIsModalOpen(false)}
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
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Compass size={18} color="#2563EB" />
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Establish Approved Security Baseline
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateBaseline}>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    TARGET REPOSITORY *
                  </label>
                  <select
                    value={selectedRepoId}
                    onChange={(e) => setSelectedRepoId(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      color: '#0F172A',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                    }}
                  >
                    {repositories.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    BRANCH *
                  </label>
                  <input
                    type="text"
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    required
                    placeholder="main or release/v1.0"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      color: '#0F172A',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    BASELINE JUSTIFICATION / NOTE
                  </label>
                  <textarea
                    rows={3}
                    value={baselineNote}
                    onChange={(e) => setBaselineNote(e.target.value)}
                    placeholder="e.g. Approved post-audit release baseline. All existing debt acknowledged."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      color: '#0F172A',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '12px', fontSize: '12px', color: '#1E40AF', display: 'flex', gap: '8px' }}>
                  <Info size={16} color="#2563EB" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    Establishing a baseline takes a deterministic snapshot of current findings on this branch. Subsequent PR checks will exclusively fail if <strong>new</strong> vulnerabilities are added.
                  </div>
                </div>
              </div>

              <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {isSubmitting ? 'Saving Baseline...' : 'Establish Baseline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
