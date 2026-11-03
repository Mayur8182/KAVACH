'use client';

/**
 * Thing Attack — Schedules Workspace (/attack/schedules)
 * Automated attack surface and DAST sweeps.
 * Real schedule entities from GET /api/v1/attack/schedules.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AttackWorkshell } from '@/components/attack/AttackWorkshell';
import { EmptyAttackState } from '@/components/attack/AttackComponents';
import { api } from '@/lib/api/client';
import type { AttackScheduleItem, CreateScheduleRequest } from '@/types/api/attack';
import { Calendar, RefreshCw, Plus, Clock, Play } from 'lucide-react';

export default function AttackSchedulesPage() {
  const [schedules, setSchedules] = useState<AttackScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Schedule Modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CreateScheduleRequest>({
    name: '',
    test_type: 'DAST',
    frequency: 'DAILY',
    cron_expression: '0 2 * * *',
    target_url: 'https://api.production.internal',
  });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.attack.schedules();
      setSchedules(res.items);
    } catch (err: any) {
      setError(err?.message || 'Failed to load schedules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    setSubmitting(true);
    try {
      await api.attack.createSchedule(form);
      setShowModal(false);
      setForm({
        name: '',
        test_type: 'DAST',
        frequency: 'DAILY',
        cron_expression: '0 2 * * *',
        target_url: 'https://api.production.internal',
      });
      load();
    } catch (err: any) {
      alert(err?.message || 'Failed to create schedule');
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
            <Plus size={12} /> New Schedule
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
            Attack Automation Schedules
          </h2>
          <p style={{ margin: '3px 0 0 0', fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
            Scheduled recurring adversarial tests, daily API discovery, and CI/CD triggered scans.
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
              Active Schedules ({schedules.length})
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading schedules...</div>
            ) : schedules.length === 0 ? (
              <EmptyAttackState
                title="No Schedules Configured"
                description="Set up daily or weekly automated penetration sweeps to catch regressions."
                actionLabel="Create Schedule"
                onAction={() => setShowModal(true)}
              />
            ) : (
              schedules.map((s) => (
                <div
                  key={s.id}
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
                      <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {s.name}
                      </span>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '3px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                        {s.test_type}
                      </span>
                      <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 600 }}>
                        {s.is_active ? '● Active' : '○ Paused'}
                      </span>
                    </div>

                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'monospace', display: 'block', marginTop: '2px' }}>
                      Cron: {s.cron_expression || 'Daily'} • Target: {s.target_url || 'All Assets'}
                    </span>
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textAlign: 'right' }}>
                    <div>Next Run: <strong>{s.next_run_at || 'Pending'}</strong></div>
                    <div style={{ color: 'var(--color-text-muted)', marginTop: '2px' }}>Last Run: {s.last_run_at || 'Never'}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Create Schedule Modal */}
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
                New Attack Automation Schedule
              </h3>

              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Schedule Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Daily Production Auth Sweep"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
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
                      Test Type
                    </label>
                    <select
                      value={form.test_type}
                      onChange={(e) => setForm({ ...form, test_type: e.target.value })}
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
                      <option value="DAST">DAST Scan</option>
                      <option value="API_DISCOVERY">API Discovery</option>
                      <option value="PENTEST">Pentest Simulation</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Frequency
                    </label>
                    <select
                      value={form.frequency}
                      onChange={(e) => setForm({ ...form, frequency: e.target.value })}
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
                      <option value="DAILY">Daily (02:00 UTC)</option>
                      <option value="WEEKLY">Weekly (Sunday)</option>
                      <option value="CRON">Custom Cron</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Target URL
                  </label>
                  <input
                    type="url"
                    value={form.target_url || ''}
                    onChange={(e) => setForm({ ...form, target_url: e.target.value })}
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
                    {submitting ? 'Saving...' : 'Save Schedule'}
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
