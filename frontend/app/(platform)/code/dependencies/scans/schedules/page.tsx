'use client';

/**
 * Module 13 — Dependency Scans & Jobs: Scheduled Scans
 * Route: /code/dependencies/scans/schedules
 * Automated recurring scans management, cron configuration, active/pause toggles,
 * real execution trigger, and new schedule creation modal. Zero mock/hardcoded repos.
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Plus,
  Play,
  Trash2,
  FolderGit2,
  GitBranch,
  X,
  RotateCcw,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { DependencyScansSubnav } from '@/components/dependencies/DependencyScansSubnav';

export default function ScheduledScansPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [runningScheduleId, setRunningScheduleId] = useState<string | null>(null);

  // Dynamic Repositories from Database
  const [repoList, setRepoList] = useState<string[]>([]);

  // Filter state
  const [selectedRepo, setSelectedRepo] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('all');

  // Form State for new schedule modal
  const [scheduleName, setScheduleName] = useState('');
  const [formRepo, setFormRepo] = useState('');
  const [formBranch, setFormBranch] = useState('main');
  const [frequency, setFrequency] = useState('DAILY');
  const [cronExpression, setCronExpression] = useState('0 2 * * *');
  const [scanType, setScanType] = useState('FULL_SCA');
  const [engine, setEngine] = useState('Trivy SCA + OSV Engine');
  const [notifyOnFailure, setNotifyOnFailure] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const data = await api.dependencyScans.listSchedules();
      setSchedules(data || []);
    } catch (err) {
      console.warn('Failed to load scan schedules', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
    const loadRepos = async () => {
      try {
        const repos = await api.dependencyScans.getRepositories();
        if (repos && repos.length > 0) {
          setRepoList(repos);
          setFormRepo(repos[0]);
        }
      } catch (err) {
        console.warn('Failed to fetch repositories for schedules', err);
      }
    };
    loadRepos();
  }, []);

  const handleToggle = async (id: string) => {
    try {
      setSchedules((prev) =>
        prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s))
      );
      await api.dependencyScans.toggleSchedule(id);
    } catch (err) {
      console.warn('Failed to toggle schedule', err);
      fetchSchedules();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scheduled scan?')) return;
    try {
      setSchedules((prev) => prev.filter((s) => s.id !== id));
      await api.dependencyScans.deleteSchedule(id);
    } catch (err) {
      console.warn('Failed to delete schedule', err);
      fetchSchedules();
    }
  };

  const handleRunScheduleNow = async (s: any) => {
    setRunningScheduleId(s.id);
    try {
      const res = await api.dependencyScans.runScan({
        repository_name: s.repository_name,
        branch: s.branch || 'main',
        scan_type: s.scan_type || 'FULL_SCA',
        engine: s.engine,
      });
      if (res && res.job_id) {
        router.push(`/code/dependencies/scans/${res.job_id}`);
      } else {
        router.push('/code/dependencies/scans');
      }
    } catch (err: any) {
      alert(`Failed to trigger scan: ${err?.message || 'Server error'}`);
    } finally {
      setRunningScheduleId(null);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleName.trim()) {
      setFormError('Please enter a schedule name.');
      return;
    }
    if (!formRepo) {
      setFormError('Please select a target repository.');
      return;
    }
    setSubmitting(true);
    setFormError(null);

    try {
      const newSched = await api.dependencyScans.createSchedule({
        schedule_name: scheduleName.trim(),
        repository_name: formRepo,
        branch: formBranch,
        frequency: frequency,
        cron_expression: cronExpression,
        scan_type: scanType,
        engine: engine,
        notify_on_failure: notifyOnFailure,
      });

      setSchedules((prev) => [newSched, ...prev]);
      setShowCreateModal(false);
      setScheduleName('');
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create schedule.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFrequencyChange = (freq: string) => {
    setFrequency(freq);
    if (freq === 'DAILY') setCronExpression('0 2 * * *');
    else if (freq === 'WEEKLY') setCronExpression('0 0 * * 1');
    else if (freq === 'EVERY_6_HOURS') setCronExpression('0 */6 * * *');
  };

  const activeCount = schedules.filter((s) => s.active).length;

  return (
    <div style={{ padding: '24px 32px 48px', maxWidth: '1600px', margin: '0 auto', width: '100%', fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif)" }}>
      <DependencyScansSubnav
        selectedRepo={selectedRepo}
        onSelectRepo={(r) => setSelectedRepo(r)}
        selectedBranch={selectedBranch}
        onSelectBranch={(b) => setSelectedBranch(b)}
      />

      {/* ── Top Summary & Action Banner ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>Active Schedules</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A' }}>{activeCount}</span>
            <span style={{ fontSize: '12px', color: '#059669' }}>of {schedules.length} enabled</span>
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>Next Automated Run</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '20px', fontWeight: 700, color: '#2563EB' }}>Tonight 02:00</span>
            <span style={{ fontSize: '12px', color: '#64748B' }}>UTC</span>
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>Weekly Cadence</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A' }}>{activeCount * 7} Scans</span>
            <span style={{ fontSize: '12px', color: '#64748B' }}>/ week</span>
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              width: '100%',
              padding: '10px 16px',
              borderRadius: '8px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
            }}
          >
            <Plus size={16} />
            <span>Create New Schedule</span>
          </button>
        </div>
      </div>

      {/* ── Schedules Table ── */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>Automated Recurring Schedules</h3>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>Autonomous scanner triggers configured to run on predetermined intervals.</p>
          </div>

          <button
            onClick={fetchSchedules}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 500,
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={12} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', color: '#64748B', fontWeight: 600, fontSize: '12px' }}>
                <th style={{ padding: '12px 16px' }}>Schedule Name</th>
                <th style={{ padding: '12px 16px' }}>Repository &amp; Branch</th>
                <th style={{ padding: '12px 16px' }}>Cadence</th>
                <th style={{ padding: '12px 16px' }}>Cron Expression</th>
                <th style={{ padding: '12px 16px' }}>Scan Type</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Next Run</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {schedules.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
                    No recurring schedules configured yet. Click &quot;Create New Schedule&quot; to set one up.
                  </td>
                </tr>
              ) : (
                schedules.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#0F172A' }}>{s.schedule_name}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Engine: {s.engine}</div>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1E293B', fontWeight: 500 }}>
                        <FolderGit2 size={13} color="#64748B" />
                        <span>{s.repository_name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                        <GitBranch size={12} />
                        <span>{s.branch}</span>
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: '#EFF6FF',
                          color: '#2563EB',
                        }}
                      >
                        {s.frequency}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: '#475569', fontSize: '12px' }}>
                      {s.cron_expression}
                    </td>

                    <td style={{ padding: '14px 16px', color: '#334155' }}>
                      {s.scan_type}
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <button
                        onClick={() => handleToggle(s.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: 0,
                        }}
                      >
                        {s.active ? (
                          <>
                            <ToggleRight size={26} color="#10B981" />
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#059669' }}>Active</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft size={26} color="#94A3B8" />
                            <span style={{ fontSize: '12px', fontWeight: 500, color: '#94A3B8' }}>Paused</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td style={{ padding: '14px 16px', color: '#64748B', fontSize: '12px' }}>
                      {s.next_run_at || 'Pending'}
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          onClick={() => handleRunScheduleNow(s)}
                          disabled={runningScheduleId === s.id}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '6px',
                            backgroundColor: '#2563EB',
                            color: '#FFFFFF',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: runningScheduleId === s.id ? 'not-allowed' : 'pointer',
                            opacity: runningScheduleId === s.id ? 0.7 : 1,
                          }}
                        >
                          <Play size={11} fill="#FFFFFF" />
                          <span>{runningScheduleId === s.id ? 'Triggering...' : 'Run Now'}</span>
                        </button>

                        <button
                          onClick={() => handleDelete(s.id)}
                          style={{
                            padding: '5px 8px',
                            borderRadius: '6px',
                            border: '1px solid #FEE2E2',
                            backgroundColor: '#FEF2F2',
                            color: '#DC2626',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal: Create Schedule ── */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              maxWidth: '560px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} color="#2563EB" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0F172A' }}>
                  Create Automated Scan Schedule
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} style={{ padding: '24px' }}>
              {formError && (
                <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', fontSize: '12px' }}>
                  {formError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Schedule Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nightly Production SCA Audit"
                    value={scheduleName}
                    onChange={(e) => setScheduleName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Target Repository
                    </label>
                    <select
                      value={formRepo}
                      onChange={(e) => setFormRepo(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        backgroundColor: '#FFFFFF',
                        outline: 'none',
                      }}
                    >
                      {repoList.length === 0 ? (
                        <option value="">No connected repositories</option>
                      ) : (
                        repoList.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Target Branch
                    </label>
                    <input
                      type="text"
                      value={formBranch}
                      onChange={(e) => setFormBranch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Frequency Cadence
                    </label>
                    <select
                      value={frequency}
                      onChange={(e) => handleFrequencyChange(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        backgroundColor: '#FFFFFF',
                        outline: 'none',
                      }}
                    >
                      <option value="DAILY">Daily (Once per day)</option>
                      <option value="WEEKLY">Weekly (Mondays)</option>
                      <option value="EVERY_6_HOURS">Every 6 Hours</option>
                      <option value="CUSTOM_CRON">Custom Cron Expression</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Cron Expression
                    </label>
                    <input
                      type="text"
                      value={cronExpression}
                      onChange={(e) => setCronExpression(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        fontFamily: 'monospace',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Scan Type
                    </label>
                    <select
                      value={scanType}
                      onChange={(e) => setScanType(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        backgroundColor: '#FFFFFF',
                        outline: 'none',
                      }}
                    >
                      <option value="FULL_SCA">Full SCA Suite</option>
                      <option value="VULNERABILITY">Vulnerability Only</option>
                      <option value="LICENSE">License Compliance</option>
                      <option value="SBOM">SBOM Generation</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Engine
                    </label>
                    <select
                      value={engine}
                      onChange={(e) => setEngine(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        backgroundColor: '#FFFFFF',
                        outline: 'none',
                      }}
                    >
                      <option value="Trivy SCA + OSV Engine">Trivy + OSV Engine</option>
                      <option value="Trivy Standalone">Trivy Standalone</option>
                      <option value="Google OSV-Scanner">Google OSV-Scanner</option>
                    </select>
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#1E293B', cursor: 'pointer', marginTop: '4px' }}>
                  <input
                    type="checkbox"
                    checked={notifyOnFailure}
                    onChange={(e) => setNotifyOnFailure(e.target.checked)}
                    style={{ width: '15px', height: '15px', accentColor: '#2563EB' }}
                  />
                  <span>Send urgent notifications if critical CVEs or license breaches are found</span>
                </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '24px', borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
                  }}
                >
                  {submitting ? 'Creating...' : 'Save Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
