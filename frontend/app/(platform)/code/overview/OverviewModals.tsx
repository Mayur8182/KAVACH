'use client';

import React, { useState } from 'react';
import { useOverview } from './OverviewContext';
import { api } from '@/lib/api/client';
import { X, Play, Clock, GitPullRequest, ShieldCheck, AlertCircle } from 'lucide-react';

export const OverviewModals: React.FC = () => {
  const {
    isStartScanOpen,
    setIsStartScanOpen,
    isScanPrOpen,
    setIsScanPrOpen,
    isScheduleScanOpen,
    setIsScheduleScanOpen,
    repositories,
    branches,
    triggerRefresh,
  } = useOverview();

  // Start Scan Form
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('main');
  const [scanType, setScanType] = useState<string>('SAST');
  const [ruleset, setRuleset] = useState<string>('standard');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Scan PR Form
  const [prRepo, setPrRepo] = useState<string>('');
  const [prNumber, setPrNumber] = useState<string>('');

  // Schedule Scan Form
  const [schedRepo, setSchedRepo] = useState<string>('');
  const [schedBranch, setSchedBranch] = useState<string>('main');
  const [schedFreq, setSchedFreq] = useState<string>('Daily');
  const [schedTime, setSchedTime] = useState<string>('01:00 AM');

  const handleStartScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.sast.triggerScan({
        repository_id: selectedRepo || (repositories[0]?.id ?? 'default-repo'),
        branch: selectedBranch || 'main',
        scan_type: scanType,
        ruleset: ruleset,
      });
      setIsStartScanOpen(false);
      triggerRefresh();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to trigger scan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScanPR = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.sast.triggerScan({
        repository_id: prRepo || (repositories[0]?.id ?? 'default-repo'),
        branch: `refs/pull/${prNumber || '1'}/head`,
        scan_type: 'SAST Pull Request',
        ruleset: 'standard',
      });
      setIsScanPrOpen(false);
      triggerRefresh();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to trigger PR scan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScheduleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.sast.scheduleScan({
        repository_id: schedRepo || (repositories[0]?.id ?? 'default-repo'),
        branch: schedBranch || 'main',
        frequency: schedFreq,
        time_utc: schedTime,
        enabled: true,
      });
      setIsScheduleScanOpen(false);
      triggerRefresh();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to schedule scan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* 1. START NEW SCAN MODAL */}
      {isStartScanOpen && (
        <div style={modalBackdropStyle}>
          <div style={modalCardStyle}>
            <div style={modalHeaderStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Play size={18} color="#2563EB" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0F172A' }}>
                  Start New SAST Scan
                </h3>
              </div>
              <button
                onClick={() => setIsStartScanOpen(false)}
                style={closeBtnStyle}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleStartScan} style={{ padding: '20px' }}>
              {errorMsg && (
                <div style={errorBannerStyle}>
                  <AlertCircle size={16} color="#DC2626" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Repository</label>
                <select
                  value={selectedRepo}
                  onChange={(e) => setSelectedRepo(e.target.value)}
                  style={inputStyle}
                  required
                >
                  <option value="">Select a repository...</option>
                  {repositories.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.default_branch})
                    </option>
                  ))}
                  {repositories.length === 0 && (
                    <option value="workspace-root">Default Workspace Repository</option>
                  )}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Branch</label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  style={inputStyle}
                >
                  {branches.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Scan Profile / Ruleset</label>
                <select
                  value={ruleset}
                  onChange={(e) => setRuleset(e.target.value)}
                  style={inputStyle}
                >
                  <option value="standard">Standard SAST (OWASP Top 10 + CWE Top 25)</option>
                  <option value="security-audit">Security Audit & Insecure Patterns</option>
                  <option value="strict">Strict Enterprise Compliance Gate</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setIsStartScanOpen(false)}
                  style={cancelBtnStyle}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={primaryBtnStyle}
                >
                  {isSubmitting ? 'Starting...' : 'Start Scan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. SCAN PULL REQUEST MODAL */}
      {isScanPrOpen && (
        <div style={modalBackdropStyle}>
          <div style={modalCardStyle}>
            <div style={modalHeaderStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GitPullRequest size={18} color="#2563EB" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0F172A' }}>
                  Scan Pull Request
                </h3>
              </div>
              <button
                onClick={() => setIsScanPrOpen(false)}
                style={closeBtnStyle}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleScanPR} style={{ padding: '20px' }}>
              {errorMsg && (
                <div style={errorBannerStyle}>
                  <AlertCircle size={16} color="#DC2626" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Repository</label>
                <select
                  value={prRepo}
                  onChange={(e) => setPrRepo(e.target.value)}
                  style={inputStyle}
                  required
                >
                  <option value="">Select a repository...</option>
                  {repositories.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                  {repositories.length === 0 && (
                    <option value="workspace-root">Default Workspace Repository</option>
                  )}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Pull Request Number</label>
                <input
                  type="number"
                  placeholder="e.g. 42"
                  value={prNumber}
                  onChange={(e) => setPrNumber(e.target.value)}
                  style={inputStyle}
                  required
                  min="1"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setIsScanPrOpen(false)}
                  style={cancelBtnStyle}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={primaryBtnStyle}
                >
                  {isSubmitting ? 'Scanning PR...' : 'Scan PR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. SCHEDULE SCAN MODAL */}
      {isScheduleScanOpen && (
        <div style={modalBackdropStyle}>
          <div style={modalCardStyle}>
            <div style={modalHeaderStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} color="#2563EB" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0F172A' }}>
                  Schedule Recurring Scan
                </h3>
              </div>
              <button
                onClick={() => setIsScheduleScanOpen(false)}
                style={closeBtnStyle}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleScheduleScan} style={{ padding: '20px' }}>
              {errorMsg && (
                <div style={errorBannerStyle}>
                  <AlertCircle size={16} color="#DC2626" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Repository</label>
                <select
                  value={schedRepo}
                  onChange={(e) => setSchedRepo(e.target.value)}
                  style={inputStyle}
                  required
                >
                  <option value="">Select a repository...</option>
                  {repositories.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                  {repositories.length === 0 && (
                    <option value="workspace-root">Default Workspace Repository</option>
                  )}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Branch</label>
                <input
                  type="text"
                  value={schedBranch}
                  onChange={(e) => setSchedBranch(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Frequency</label>
                  <select
                    value={schedFreq}
                    onChange={(e) => setSchedFreq(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Time (UTC)</label>
                  <input
                    type="text"
                    value={schedTime}
                    onChange={(e) => setSchedTime(e.target.value)}
                    style={inputStyle}
                    placeholder="01:00 AM"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setIsScheduleScanOpen(false)}
                  style={cancelBtnStyle}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={primaryBtnStyle}
                >
                  {isSubmitting ? 'Saving...' : 'Create Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

// Styling tokens
const modalBackdropStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.45)',
  backdropFilter: 'blur(2px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
};

const modalCardStyle: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderRadius: '8px',
  width: '100%',
  maxWidth: '460px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  border: '1px solid #E2E8F0',
  overflow: 'hidden',
};

const modalHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 20px',
  borderBottom: '1px solid #E2E8F0',
  backgroundColor: '#F8FAFC',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#64748B',
  cursor: 'pointer',
  padding: '4px',
  borderRadius: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: '#334155',
  marginBottom: '6px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: '13px',
  borderRadius: '6px',
  border: '1px solid #CBD5E1',
  backgroundColor: '#FFFFFF',
  color: '#0F172A',
  outline: 'none',
  boxSizing: 'border-box',
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  fontSize: '13px',
  fontWeight: 500,
  color: '#475569',
  backgroundColor: '#F1F5F9',
  border: '1px solid #E2E8F0',
  borderRadius: '6px',
  cursor: 'pointer',
};

const primaryBtnStyle: React.CSSProperties = {
  padding: '8px 18px',
  fontSize: '13px',
  fontWeight: 600,
  color: '#FFFFFF',
  backgroundColor: '#2563EB',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
};

const errorBannerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  backgroundColor: '#FEF2F2',
  color: '#B91C1C',
  padding: '10px 14px',
  borderRadius: '6px',
  fontSize: '12px',
  marginBottom: '16px',
  border: '1px solid #FECACA',
};
