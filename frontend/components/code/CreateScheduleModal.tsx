'use client';

import React from 'react';
import { X, Clock, Calendar, CheckSquare, Plus } from 'lucide-react';

interface CreateScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  creatingSchedule: boolean;
  formScheduleName: string;
  setFormScheduleName: (val: string) => void;
  formScanType: string;
  setFormScanType: (val: string) => void;
  formTarget: string;
  setFormTarget: (val: string) => void;
  formBranch: string;
  setFormBranch: (val: string) => void;
  formFrequency: string;
  setFormFrequency: (val: string) => void;
  formTimeUtc: string;
  setFormTimeUtc: (val: string) => void;
  formRunOnlyOnChanges: boolean;
  setFormRunOnlyOnChanges: (val: boolean) => void;
  formSendNotification: boolean;
  setFormSendNotification: (val: boolean) => void;
  formFailOnHighSeverity: boolean;
  setFormFailOnHighSeverity: (val: boolean) => void;
}

export const CreateScheduleModal: React.FC<CreateScheduleModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  creatingSchedule,
  formScheduleName,
  setFormScheduleName,
  formScanType,
  setFormScanType,
  formTarget,
  setFormTarget,
  formBranch,
  setFormBranch,
  formFrequency,
  setFormFrequency,
  formTimeUtc,
  setFormTimeUtc,
  formRunOnlyOnChanges,
  setFormRunOnlyOnChanges,
  formSendNotification,
  setFormSendNotification,
  formFailOnHighSeverity,
  setFormFailOnHighSeverity,
}) => {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !creatingSchedule) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, creatingSchedule, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '580px',
          maxWidth: '92vw',
          maxHeight: '90vh',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
          border: '1px solid #CBD5E1',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563EB',
              }}
            >
              <Calendar size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
                Create Security Scan Schedule
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#64748B' }}>
                Configure automated recurring security checks for this repository.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748B',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Schedule Name <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Daily SAST &amp; Secrets Scan"
                value={formScheduleName}
                onChange={(e) => setFormScheduleName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: '13px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  color: '#0F172A',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Scan Type <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <select
                  value={formScanType}
                  onChange={(e) => setFormScanType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '13px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="SAST">SAST (Semgrep)</option>
                  <option value="Dependency">Dependency / SCA (Trivy)</option>
                  <option value="Container">Container Image Scan</option>
                  <option value="Secrets">Secrets Detection (Gitleaks)</option>
                  <option value="License">License Compliance</option>
                  <option value="All Scans">Comprehensive All Scans</option>
                  <option value="Custom">Custom Security Job</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Target <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <select
                  value={formTarget}
                  onChange={(e) => setFormTarget(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '13px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="Repository">Repository Root</option>
                  <option value="Docker Image">Docker Image Artifact</option>
                  <option value="IaC (Terraform)">IaC Directory (iac/)</option>
                  <option value="Pull Request">Pull Request Triggers</option>
                  <option value="Release Tag">Release Tags</option>
                  <option value="Path: src/">Source Path (src/)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Branch <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <select
                  value={formBranch}
                  onChange={(e) => setFormBranch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '12.5px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="main">main</option>
                  <option value="develop">develop</option>
                  <option value="staging">staging</option>
                  <option value="release/*">release/*</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Frequency <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <select
                  value={formFrequency}
                  onChange={(e) => setFormFrequency(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '12.5px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Every 6 hours">Every 6 hours</option>
                  <option value="Every 12 hours">Every 12 hours</option>
                  <option value="Monthly">Monthly</option>
                  <option value="On PR">On PR</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Time (UTC) <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={formTimeUtc}
                    onChange={(e) => setFormTimeUtc(e.target.value)}
                    placeholder="01:00 AM"
                    style={{
                      width: '100%',
                      padding: '8px 10px 8px 28px',
                      fontSize: '12.5px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      color: '#0F172A',
                      boxSizing: 'border-box',
                    }}
                  />
                  <Clock size={13} style={{ position: 'absolute', left: 9, top: 11, color: '#64748B' }} />
                </div>
              </div>
            </div>

            {/* Advanced Checkboxes */}
            <div style={{ backgroundColor: '#F8FAFC', padding: '14px 16px', borderRadius: '8px', border: '1px solid #E2E8F0', marginTop: '4px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', marginBottom: '10px' }}>
                Execution Policies &amp; Gates
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formRunOnlyOnChanges}
                    onChange={(e) => setFormRunOnlyOnChanges(e.target.checked)}
                  />
                  <span>Run only if new commits or layer changes detected</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formSendNotification}
                    onChange={(e) => setFormSendNotification(e.target.checked)}
                  />
                  <span>Send notifications via Slack/Webhook on completion</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formFailOnHighSeverity}
                    onChange={(e) => setFormFailOnHighSeverity(e.target.checked)}
                  />
                  <span>Fail pipeline &amp; trigger security gate on High/Critical severity</span>
                </label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '14px 24px',
              backgroundColor: '#F8FAFC',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#475569',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingSchedule}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 20px',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#FFFFFF',
                backgroundColor: '#2563EB',
                border: 'none',
                borderRadius: '6px',
                cursor: creatingSchedule ? 'wait' : 'pointer',
              }}
            >
              <Plus size={14} />
              {creatingSchedule ? 'Creating Schedule...' : 'Create Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
