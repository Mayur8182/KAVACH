'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useOverview } from '../OverviewContext';
import { api } from '@/lib/api/client';
import {
  ShieldAlert,
  RefreshCw,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Eye,
  UserCheck,
  Check,
  AlertCircle,
  FileCode,
} from 'lucide-react';

interface RecentFinding {
  id: string;
  display_id: string;
  title: string;
  severity: string;
  category: string;
  file_path: string;
  line_number?: number;
  line_start?: number;
  line_end?: number;
  repository: string;
  detected_at?: string;
  status: string;
  assigned_to?: string;
  snippet?: string;
  rule_id: string;
}

function RecentFindingsContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category');
  const severityParam = searchParams.get('severity');

  const { repository, branch, dateRange, refreshKey, triggerRefresh } = useOverview();
  const [findings, setFindings] = useState<RecentFinding[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active action menu
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assigneeName, setAssigneeName] = useState<string>('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadFindings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.sast.recentFindings({
        repository: repository !== 'all' ? repository : undefined,
        branch: branch !== 'all' ? branch : undefined,
        category: categoryParam || undefined,
        severity: severityParam || undefined,
        page,
        page_size: pageSize,
      });
      setFindings(res?.items ?? []);
      setTotalCount(res?.total ?? 0);
    } catch (err: any) {
      setError(err?.message || 'Unable to load recent findings.');
    } finally {
      setLoading(false);
    }
  }, [repository, branch, categoryParam, severityParam, page, pageSize]);

  useEffect(() => {
    loadFindings();
  }, [loadFindings, refreshKey]);

  const handleUpdateStatus = async (findingId: string, newStatus: string) => {
    setUpdatingId(findingId);
    setActionMenuId(null);
    try {
      await api.sast.updateFinding(findingId, { status: newStatus });
      triggerRefresh();
      await loadFindings();
    } catch (err: any) {
      alert(`Status update failed: ${err?.message || 'Error communicating with backend'}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAssign = async (findingId: string) => {
    if (!assigneeName.trim()) return;
    setUpdatingId(findingId);
    setAssigningId(null);
    try {
      await api.sast.updateFinding(findingId, { assigned_to: assigneeName.trim() });
      triggerRefresh();
      await loadFindings();
      setAssigneeName('');
    } catch (err: any) {
      alert(`Assignment failed: ${err?.message || 'Error communicating with backend'}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const sevBadge = (sev: string) => {
    const s = sev.toUpperCase();
    if (s === 'CRITICAL') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, color: '#DC2626', backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#DC2626' }} /> Critical
        </span>
      );
    }
    if (s === 'HIGH') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, color: '#EA580C', backgroundColor: '#FFF7ED', border: '1px solid #FFEDD5' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#EA580C' }} /> High
        </span>
      );
    }
    if (s === 'MEDIUM' || s === 'MODERATE') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, color: '#CA8A04', backgroundColor: '#FEFCE8', border: '1px solid #FEF08A' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#CA8A04' }} /> Medium
        </span>
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, color: '#2563EB', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2563EB' }} /> Low
      </span>
    );
  };

  const statusBadge = (statusStr: string) => {
    const s = statusStr.toLowerCase();
    if (s === 'resolved') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 500, color: '#16A34A' }}>
          <CheckCircle2 size={13} color="#16A34A" /> Resolved
        </span>
      );
    }
    if (s === 'in progress' || s === 'in_progress') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 500, color: '#2563EB' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2563EB' }} /> In Progress
        </span>
      );
    }
    if (s === 'false positive' || s === 'false_positive') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 500, color: '#0D9488' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#0D9488' }} /> False Positive
        </span>
      );
    }
    if (s === 'ignored') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 500, color: '#94A3B8' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#94A3B8' }} /> Ignored
        </span>
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 500, color: '#DC2626' }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#DC2626' }} /> Open
      </span>
    );
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>
            Recent Findings
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
            Latest security findings from recent scans.
            {categoryParam && <span style={{ marginLeft: '6px', color: '#2563EB', fontWeight: 600 }}>Filtered by category: {categoryParam}</span>}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {categoryParam && (
            <Link
              href="/code/overview/recent-findings"
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#475569',
                backgroundColor: '#F1F5F9',
                border: '1px solid #E2E8F0',
                borderRadius: '6px',
                textDecoration: 'none',
              }}
            >
              Clear category filter
            </Link>
          )}
          <button
            onClick={async () => {
              try {
                const data = await api.sast.exportFindings({
                  repository: repository !== 'all' ? repository : undefined,
                  branch: branch !== 'all' ? branch : undefined,
                  category: categoryParam || undefined,
                  severity: severityParam || undefined,
                });
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `sast-findings-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
              } catch (e: any) {
                alert(`Export failed: ${e?.message || 'Error exporting findings'}`);
              }
            }}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 500,
              color: '#334155',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            Export JSON
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)', overflow: 'hidden' }}>
        {error ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ color: '#DC2626', marginBottom: '12px' }}>{error}</p>
            <button
              onClick={() => loadFindings()}
              style={{
                padding: '8px 16px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        ) : loading && findings.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94A3B8' }}>
            Loading recent findings...
          </div>
        ) : findings.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: '#64748B' }}>
            <FileCode size={36} color="#94A3B8" style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 600, color: '#334155' }}>
              No findings found
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8' }}>
              There are no security findings recorded matching this filter.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', color: '#475569', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', width: '90px', fontWeight: 600 }}>ID</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Title</th>
                  <th style={{ padding: '12px 16px', width: '110px', fontWeight: 600 }}>Severity</th>
                  <th style={{ padding: '12px 16px', width: '140px', fontWeight: 600 }}>Category</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>File / Line</th>
                  <th style={{ padding: '12px 16px', width: '130px', fontWeight: 600 }}>Repository</th>
                  <th style={{ padding: '12px 16px', width: '120px', fontWeight: 600 }}>Detected</th>
                  <th style={{ padding: '12px 16px', width: '120px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '12px 16px', width: '60px', textAlign: 'right', fontWeight: 600 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {findings.map((f) => {
                  const fileDisplay = f.line_number ? `${f.file_path}:${f.line_number}` : f.file_path;

                  return (
                    <tr
                      key={f.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* ID */}
                      <td style={{ padding: '12px 16px', color: '#2563EB', fontWeight: 500 }}>
                        <Link href={`/code/findings/${encodeURIComponent(f.id)}`} style={{ color: '#2563EB', textDecoration: 'none' }}>
                          {f.display_id}
                        </Link>
                      </td>

                      {/* Title */}
                      <td style={{ padding: '12px 16px', fontWeight: 500, color: '#0F172A', maxWidth: '300px' }}>
                        <Link
                          href={`/code/findings/${encodeURIComponent(f.id)}`}
                          style={{ color: '#0F172A', textDecoration: 'none' }}
                          title={f.title}
                        >
                          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {f.title}
                          </span>
                        </Link>
                      </td>

                      {/* Severity */}
                      <td style={{ padding: '12px 16px' }}>{sevBadge(f.severity)}</td>

                      {/* Category */}
                      <td style={{ padding: '12px 16px', color: '#475569' }}>{f.category}</td>

                      {/* File / Line */}
                      <td style={{ padding: '12px 16px', color: '#475569', fontFamily: 'monospace', fontSize: '12px', maxWidth: '220px' }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {fileDisplay}
                        </span>
                      </td>

                      {/* Repository */}
                      <td style={{ padding: '12px 16px', color: '#334155' }}>{f.repository}</td>

                      {/* Detected */}
                      <td style={{ padding: '12px 16px', color: '#64748B', whiteSpace: 'nowrap' }}>
                        {f.detected_at}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 16px' }}>{statusBadge(f.status)}</td>

                      {/* Actions */}
                      <td style={{ padding: '12px 16px', textAlign: 'right', position: 'relative' }}>
                        <button
                          onClick={() => setActionMenuId(actionMenuId === f.id ? null : f.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#64748B',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                          }}
                          aria-label="Actions menu"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {/* Dropdown Menu */}
                        {actionMenuId === f.id && (
                          <div
                            style={{
                              position: 'absolute',
                              right: '16px',
                              top: '36px',
                              backgroundColor: '#FFFFFF',
                              borderRadius: '6px',
                              border: '1px solid #CBD5E1',
                              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                              zIndex: 100,
                              minWidth: '160px',
                              padding: '4px 0',
                              textAlign: 'left',
                            }}
                          >
                            <Link
                              href={`/code/findings/${encodeURIComponent(f.id)}`}
                              style={menuItemStyle}
                            >
                              <Eye size={13} /> View Finding
                            </Link>
                            <button
                              onClick={() => {
                                setAssigningId(f.id);
                                setActionMenuId(null);
                              }}
                              style={menuItemStyle}
                            >
                              <UserCheck size={13} /> Assign
                            </button>
                            <div style={{ height: '1px', backgroundColor: '#F1F5F9', margin: '4px 0' }} />
                            {f.status.toLowerCase() !== 'open' && (
                              <button
                                onClick={() => handleUpdateStatus(f.id, 'open')}
                                style={menuItemStyle}
                              >
                                Re-open
                              </button>
                            )}
                            {f.status.toLowerCase() !== 'in_progress' && (
                              <button
                                onClick={() => handleUpdateStatus(f.id, 'in_progress')}
                                style={menuItemStyle}
                              >
                                Mark In Progress
                              </button>
                            )}
                            {f.status.toLowerCase() !== 'resolved' && (
                              <button
                                onClick={() => handleUpdateStatus(f.id, 'resolved')}
                                style={{ ...menuItemStyle, color: '#16A34A' }}
                              >
                                <Check size={13} /> Resolve
                              </button>
                            )}
                            {f.status.toLowerCase() !== 'false_positive' && (
                              <button
                                onClick={() => handleUpdateStatus(f.id, 'false_positive')}
                                style={menuItemStyle}
                              >
                                Mark False Positive
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Assign Modal / Popover */}
        {assigningId && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#334155' }}>Assign Finding:</span>
            <input
              type="text"
              placeholder="e.g. dev-security@company.com"
              value={assigneeName}
              onChange={(e) => setAssigneeName(e.target.value)}
              style={{
                padding: '6px 10px',
                fontSize: '12px',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                width: '240px',
                outline: 'none',
              }}
            />
            <button
              onClick={() => handleAssign(assigningId)}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#FFFFFF',
                backgroundColor: '#2563EB',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Assign
            </button>
            <button
              onClick={() => setAssigningId(null)}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                color: '#64748B',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Pagination Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid #E2E8F0', fontSize: '12px', color: '#64748B' }}>
          <span>
            Showing {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min(totalCount, page * pageSize)} of {totalCount} findings
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={pageBtnStyle}
            >
              &lt;
            </button>
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const pNum = i + 1;
              return (
                <button
                  key={pNum}
                  onClick={() => setPage(pNum)}
                  style={{
                    ...pageBtnStyle,
                    backgroundColor: page === pNum ? '#2563EB' : '#FFFFFF',
                    color: page === pNum ? '#FFFFFF' : '#334155',
                    fontWeight: page === pNum ? 600 : 400,
                  }}
                >
                  {pNum}
                </button>
              );
            })}
            {totalPages > 5 && <span style={{ color: '#94A3B8' }}>...</span>}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={pageBtnStyle}
            >
              &gt;
            </button>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              style={{
                marginLeft: '8px',
                padding: '4px 8px',
                fontSize: '12px',
                border: '1px solid #CBD5E1',
                borderRadius: '4px',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <option value="10">10 / page</option>
              <option value="25">25 / page</option>
              <option value="50">50 / page</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RecentFindingsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px' }}>Loading...</div>}>
      <RecentFindingsContent />
    </Suspense>
  );
}

const menuItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  width: '100%',
  padding: '6px 12px',
  fontSize: '12px',
  fontWeight: 500,
  color: '#334155',
  backgroundColor: 'transparent',
  border: 'none',
  textAlign: 'left',
  cursor: 'pointer',
  textDecoration: 'none',
  boxSizing: 'border-box',
};

const pageBtnStyle: React.CSSProperties = {
  width: '28px',
  height: '28px',
  borderRadius: '4px',
  border: '1px solid #E2E8F0',
  backgroundColor: '#FFFFFF',
  color: '#334155',
  fontSize: '12px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};
