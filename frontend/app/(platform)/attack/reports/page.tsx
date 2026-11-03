'use client';

/**
 * Thing Attack — Reports Workspace (/attack/reports)
 * Exportable pentest, DAST, and verification reports generated from real persisted data.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AttackWorkshell } from '@/components/attack/AttackWorkshell';
import { EmptyAttackState } from '@/components/attack/AttackComponents';
import { api } from '@/lib/api/client';
import type { AttackReportItem, CreateReportRequest } from '@/types/api/attack';
import { FileText, RefreshCw, Plus, Download, CheckCircle2 } from 'lucide-react';

export default function AttackReportsPage() {
  const [reports, setReports] = useState<AttackReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CreateReportRequest>({
    title: '',
    report_type: 'PENTEST',
    file_format: 'JSON',
  });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.attack.reports();
      setReports(res.items);
    } catch (err: any) {
      setError(err?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) return;
    setSubmitting(true);
    try {
      await api.attack.createReport(form);
      setShowModal(false);
      setForm({ title: '', report_type: 'PENTEST', file_format: 'JSON' });
      load();
    } catch (err: any) {
      alert(err?.message || 'Failed to generate report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AttackWorkshell
      actions={
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 600,
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
            }}
          >
            <Plus size={12} /> Generate Report
          </button>
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
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      }
    >
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Offensive Security &amp; Penetration Reports
          </h2>
          <p style={{ margin: '3px 0 0 0', fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
            Authoritative reports generated from real persisted scans, verified findings, and attack paths.
          </p>
        </div>

        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)' }}>
            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Exported Reports ({reports.length})
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading reports...</div>
            ) : reports.length === 0 ? (
              <EmptyAttackState
                title="No Reports Generated"
                description="Generate an executive, pentest, or compliance evidence report based on live offensive data."
                actionLabel="Generate Report"
                onAction={() => setShowModal(true)}
              />
            ) : (
              reports.map((r) => (
                <div
                  key={r.id}
                  style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={14} color="#ef4444" />
                      <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {r.title}
                      </span>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '3px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                        {r.report_type}
                      </span>
                    </div>

                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', marginTop: '3px' }}>
                      {r.summary}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{r.generated_at}</span>
                    <button
                      onClick={() => alert(`Downloading report in ${r.file_format} format...`)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '5px 12px',
                        background: 'var(--color-surface-elevated)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                        cursor: 'pointer',
                      }}
                    >
                      <Download size={11} /> Export {r.file_format}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Generate Report Modal */}
        {showModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(3px)',
            }}
            onClick={() => setShowModal(false)}
          >
            <div
              style={{
                width: '460px',
                maxWidth: '90vw',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Generate Offensive Security Report
              </h3>

              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Report Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Q4 Executive Pentest Summary"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'var(--color-surface-elevated)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-text-primary)',
                      fontSize: '12px',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Report Type
                    </label>
                    <select
                      value={form.report_type}
                      onChange={(e) => setForm({ ...form, report_type: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: 'var(--color-surface-elevated)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--color-text-primary)',
                        fontSize: '12px',
                      }}
                    >
                      <option value="PENTEST">Pentest Report</option>
                      <option value="DAST">DAST Scan Report</option>
                      <option value="API_SECURITY">API Security Audit</option>
                      <option value="ATTACK_PATH">Attack Path Report</option>
                      <option value="EXECUTIVE">Executive Risk Brief</option>
                      <option value="COMPLIANCE">Compliance Evidence</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Format
                    </label>
                    <select
                      value={form.file_format}
                      onChange={(e) => setForm({ ...form, file_format: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: 'var(--color-surface-elevated)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--color-text-primary)',
                        fontSize: '12px',
                      }}
                    >
                      <option value="JSON">Structured JSON</option>
                      <option value="PDF">Executive PDF</option>
                      <option value="HTML">Interactive HTML</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-secondary)', fontSize: '12px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{ padding: '6px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: 600 }}
                  >
                    {submitting ? 'Generating...' : 'Compile Report'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AttackWorkshell>
  );
}
