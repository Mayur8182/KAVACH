'use client';

/**
 * Thing Code — SAST Risk Exceptions (/code/sast/exceptions)
 * 
 * Production-grade risk acceptance & exception management.
 * Tracks approved security exceptions with mandatory audit justification, approver identity, and expiry dates.
 * Core Principle: "LLM proposes. Deterministic security systems decide. Runtime evidence proves."
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Search,
  Filter,
  XCircle,
  FileCode,
  Calendar,
  User,
  AlertTriangle,
  ChevronRight,
  X,
  ExternalLink,
  Shield,
  Check,
  Info,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { useScope } from '@/context/ScopeContext';

export default function SASTExceptionsPage() {
  const router = useRouter();
  const { currentProject } = useScope();

  const [exceptions, setExceptions] = useState<any[]>([]);
  const [counts, setCounts] = useState({ total: 0, active: 0, expired: 0, revoked: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRED' | 'REVOKED'>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ruleId, setRuleId] = useState('');
  const [filePath, setFilePath] = useState('');
  const [severity, setSeverity] = useState('HIGH');
  const [justification, setJustification] = useState('');
  const [expiryDays, setExpiryDays] = useState(30);
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
      const res = await api.sast.exceptions({ project_id: projId, status: statusFilter === 'ALL' ? undefined : statusFilter });
      if (res?.items) {
        setExceptions(res.items);
        setCounts({
          total: res.total || res.items.length,
          active: res.active_count || res.items.filter((x: any) => x.status === 'ACTIVE').length,
          expired: res.expired_count || res.items.filter((x: any) => x.status === 'EXPIRED').length,
          revoked: res.revoked_count || res.items.filter((x: any) => x.status === 'REVOKED').length,
        });
      }
    } catch (err: any) {
      console.error('[Exceptions] Failed to load:', err);
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleId || !justification) return;

    setIsSubmitting(true);
    try {
      await api.sast.createException(
        {
          rule_id: ruleId,
          file_path: filePath || undefined,
          severity,
          justification,
          expires_in_days: expiryDays,
        },
        currentProject?.id
      );
      showToast('Risk acceptance exception granted successfully.');
      setIsModalOpen(false);
      setRuleId('');
      setFilePath('');
      setJustification('');
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to grant exception.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeException = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this risk acceptance exception? The vulnerability will immediately flag in CI/CD.')) {
      return;
    }
    try {
      await api.sast.updateException(id, { status: 'REVOKED' }, currentProject?.id);
      showToast('Exception revoked. Finding will now block merge gates.');
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to revoke exception.');
    }
  };

  const filteredExceptions = exceptions.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.rule_id?.toLowerCase().includes(q) ||
      e.rule_title?.toLowerCase().includes(q) ||
      e.file_path?.toLowerCase().includes(q) ||
      e.justification?.toLowerCase().includes(q) ||
      e.created_by?.toLowerCase().includes(q)
    );
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
            <span style={{ color: '#0F172A', fontWeight: 600 }}>Risk Exceptions</span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Risk Acceptance Exceptions
          </h1>
          <p style={{ fontSize: '13.5px', color: '#64748B', marginTop: '4px', margin: 0 }}>
            Audited, time-bounded security exemptions with business justification. Temporarily suppresses specific rule violations from blocking merge gates.
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
            Grant Risk Exception
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>TOTAL EXCEPTIONS</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
            {counts.total}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>All recorded requests</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>ACTIVE EXEMPTIONS</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#2563EB', marginTop: '4px' }}>
            {counts.active}
          </div>
          <div style={{ fontSize: '11.5px', color: '#16A34A', marginTop: '4px', fontWeight: 600 }}>Currently suppressing CI gates</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>EXPIRED EXCEPTIONS</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#DC2626', marginTop: '4px' }}>
            {counts.expired}
          </div>
          <div style={{ fontSize: '11.5px', color: '#DC2626', marginTop: '4px', fontWeight: 600 }}>Needs renewal or immediate fix</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px' }}>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>REVOKED / CANCELLED</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#64748B', marginTop: '4px' }}>
            {counts.revoked}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>Security rules re-enforced</div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {(['ACTIVE', 'EXPIRED', 'REVOKED', 'ALL'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: statusFilter === st ? '1px solid #2563EB' : '1px solid #E2E8F0',
                backgroundColor: statusFilter === st ? '#EFF6FF' : '#FFFFFF',
                color: statusFilter === st ? '#2563EB' : '#475569',
                fontSize: '12px',
                fontWeight: statusFilter === st ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              {st === 'ALL' ? 'All Exceptions' : st}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '320px' }}>
          <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search exceptions by rule, file, or owner..."
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
      </div>

      {/* Exceptions Table */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11.5px', fontWeight: 700 }}>
              <th style={{ padding: '12px 16px' }}>RULE / FINDING</th>
              <th style={{ padding: '12px 16px' }}>LOCATION</th>
              <th style={{ padding: '12px 16px' }}>SEVERITY</th>
              <th style={{ padding: '12px 16px' }}>JUSTIFICATION</th>
              <th style={{ padding: '12px 16px' }}>EXPIRY DATE</th>
              <th style={{ padding: '12px 16px' }}>STATUS</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredExceptions.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '48px 16px', textAlign: 'center', color: '#94A3B8' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={32} color="#CBD5E1" />
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>No Exceptions in this View</span>
                    <span style={{ fontSize: '12px', color: '#94A3B8' }}>All security findings are strictly enforced without risk suppression.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredExceptions.map((exc) => {
                const isAct = exc.status === 'ACTIVE';
                const isExp = exc.status === 'EXPIRED';
                return (
                  <tr
                    key={exc.id}
                    style={{ borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.15s ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>{exc.rule_title}</div>
                      <div style={{ fontSize: '11.5px', color: '#64748B', fontFamily: 'monospace', marginTop: '2px' }}>
                        {exc.rule_id}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#334155', fontFamily: 'monospace' }}>
                        <FileCode size={13} color="#2563EB" />
                        {exc.file_path || 'Repository Scope'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{exc.repository_name || 'All branches'}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: exc.severity === 'CRITICAL' ? '#FEF2F2' : exc.severity === 'HIGH' ? '#FFF7ED' : '#FEFCE8',
                          color: exc.severity === 'CRITICAL' ? '#DC2626' : exc.severity === 'HIGH' ? '#EA580C' : '#CA8A04',
                        }}
                      >
                        {exc.severity}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', maxWidth: '300px' }}>
                      <div style={{ fontSize: '12.5px', color: '#334155', lineHeight: '1.4' }}>{exc.justification}</div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                        Requested by <strong>{exc.created_by}</strong>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: isExp ? '#DC2626' : '#0F172A' }}>
                        {exc.expires_at}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Granted: {exc.created_at}</div>
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
                          backgroundColor: isAct ? '#EFF6FF' : isExp ? '#FEF2F2' : '#F1F5F9',
                          color: isAct ? '#2563EB' : isExp ? '#DC2626' : '#64748B',
                          border: `1px solid ${isAct ? '#BFDBFE' : isExp ? '#FECACA' : '#E2E8F0'}`,
                        }}
                      >
                        {isAct ? <CheckCircle2 size={11} /> : isExp ? <AlertTriangle size={11} /> : <XCircle size={11} />}
                        {exc.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {isAct ? (
                        <button
                          onClick={() => handleRevokeException(exc.id)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid #FECACA',
                            backgroundColor: '#FEF2F2',
                            color: '#DC2626',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Revoke
                        </button>
                      ) : (
                        <span style={{ fontSize: '11.5px', color: '#94A3B8' }}>Archived</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modal: Grant Risk Acceptance Exception ── */}
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
              maxWidth: '540px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} color="#EA580C" />
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Grant Risk Acceptance Exception
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateException}>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    RULE ID OR VULNERABILITY KEY *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. semgrep-rules.secrets.generic-token or rules.injection.sqli"
                    value={ruleId}
                    onChange={(e) => setRuleId(e.target.value)}
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

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      TARGET FILE PATH (OPTIONAL)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. tests/fixtures/mock.go"
                      value={filePath}
                      onChange={(e) => setFilePath(e.target.value)}
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
                      SEVERITY
                    </label>
                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value)}
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
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="HIGH">HIGH</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="LOW">LOW</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    EXEMPTION DURATION (EXPIRY)
                  </label>
                  <select
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(Number(e.target.value))}
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
                    <option value={7}>7 Days (Temporary hotfix period)</option>
                    <option value={14}>14 Days (Sprint remediation cycle)</option>
                    <option value={30}>30 Days (Standard business exception)</option>
                    <option value={90}>90 Days (Quarterly review approval)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    BUSINESS JUSTIFICATION & MITIGATION CONTROLS *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Describe why this exception is necessary and what compensating security controls are in place..."
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
                  {isSubmitting ? 'Recording Exception...' : 'Approve Exception'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
