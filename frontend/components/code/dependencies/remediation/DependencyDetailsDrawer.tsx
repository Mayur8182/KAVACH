'use client';

import React, { useState } from 'react';
import { RemediationQueueItem } from '@/types/api/dependencies';
import {
  X,
  Box,
  CheckCircle2,
  Clock,
  GitPullRequest,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  RotateCcw,
  Sparkles,
  FileCode2,
} from 'lucide-react';

interface DependencyDetailsDrawerProps {
  item: RemediationQueueItem | null;
  onClose: () => void;
  onCreatePR: (item: RemediationQueueItem) => Promise<void>;
  onMarkResolved: (item: RemediationQueueItem) => Promise<void>;
  creatingPR?: boolean;
  markingResolved?: boolean;
}

export const DependencyDetailsDrawer: React.FC<DependencyDetailsDrawerProps> = ({
  item,
  onClose,
  onCreatePR,
  onMarkResolved,
  creatingPR = false,
  markingResolved = false,
}) => {
  if (!item) {
    return (
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          textAlign: 'center',
          color: '#94A3B8',
        }}
      >
        <Box size={36} color="#CBD5E1" style={{ marginBottom: '12px' }} />
        <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#475569', margin: '0 0 6px 0' }}>
          No Dependency Selected
        </h4>
        <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0, maxWidth: '240px' }}>
          Select any row in the Remediation Queue table to inspect details and dispatch fix PRs.
        </p>
      </div>
    );
  }

  const steps = [
    { number: 1, label: 'Review Issue', description: 'Analyze CVE advisory and breaking risk' },
    { number: 2, label: 'Apply Fix', description: 'Update package manifest & lockfile version' },
    { number: 3, label: 'Create PR', description: 'Automated pull request dispatch with diff' },
    { number: 4, label: 'Verify Fix', description: 'Deterministic SCA rescan verifies 0 findings' },
  ];

  const currentStep = item.remediation_step || (item.status === 'FIXED' ? 4 : item.pr_url ? 3 : 1);

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* Header matching Screenshot 09 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Dependency Details
          </h3>
          <span style={{ fontSize: '12px', color: '#64748B' }}>
            Remediation plan & automated fix
          </span>
        </div>
        <button
          type="button"
          aria-label="Close dependency details"
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94A3B8',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '6px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#0F172A';
            e.currentTarget.style.backgroundColor = '#F1F5F9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#94A3B8';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Package Header with Blue Box Icon */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '12px 14px',
          backgroundColor: '#EFF6FF',
          borderRadius: '10px',
          border: '1px solid #DBEAFE',
        }}
      >
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '8px',
            backgroundColor: '#2563EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            flexShrink: 0,
          }}
        >
          <Box size={22} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#1E3A8A' }}>
              {item.package_name}
            </span>
            <span style={{ fontSize: '12px', color: '#3B82F6', fontWeight: 500 }}>
              {item.current_version}
            </span>
            <ArrowRight size={12} color="#3B82F6" />
            <span style={{ fontSize: '12px', color: '#059669', fontWeight: 700 }}>
              {item.fixed_version}
            </span>
          </div>
          <span style={{ fontSize: '11.5px', color: '#64748B', display: 'block', marginTop: '2px' }}>
            {item.cve_id || 'Security Upgrade'} • {item.repository_name}
          </span>
        </div>
      </div>

      {/* Metadata Key-Value List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #F8FAFC' }}>
          <span style={{ color: '#64748B' }}>Current Version</span>
          <span style={{ fontWeight: 600, color: '#0F172A', fontFamily: 'monospace' }}>{item.current_version}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #F8FAFC' }}>
          <span style={{ color: '#64748B' }}>Fixed Version</span>
          <span style={{ fontWeight: 600, color: '#059669', fontFamily: 'monospace' }}>{item.fixed_version}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #F8FAFC' }}>
          <span style={{ color: '#64748B' }}>Ecosystem</span>
          <span style={{ fontWeight: 600, color: '#0F172A', textTransform: 'uppercase' }}>{item.ecosystem}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #F8FAFC' }}>
          <span style={{ color: '#64748B' }}>Package Type</span>
          <span style={{ fontWeight: 600, color: '#0F172A' }}>{item.dependency_type}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #F8FAFC' }}>
          <span style={{ color: '#64748B' }}>Severity</span>
          <span
            style={{
              padding: '1px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: item.severity === 'CRITICAL' ? '#FEF2F2' : item.severity === 'HIGH' ? '#FFF7ED' : '#EFF6FF',
              color: item.severity === 'CRITICAL' ? '#DC2626' : item.severity === 'HIGH' ? '#EA580C' : '#2563EB',
            }}
          >
            {item.severity}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #F8FAFC' }}>
          <span style={{ color: '#64748B' }}>Status</span>
          <span
            style={{
              padding: '1px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: item.status === 'FIXED' ? '#ECFDF5' : item.status === 'IN_PROGRESS' ? '#FFFBEB' : '#FEF2F2',
              color: item.status === 'FIXED' ? '#059669' : item.status === 'IN_PROGRESS' ? '#D97706' : '#DC2626',
            }}
          >
            {item.status.replace('_', ' ')}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #F8FAFC' }}>
          <span style={{ color: '#64748B' }}>Repository</span>
          <span style={{ fontWeight: 600, color: '#0F172A' }}>{item.repository_name}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #F8FAFC' }}>
          <span style={{ color: '#64748B' }}>Target Manifest</span>
          <span style={{ fontWeight: 600, color: '#475569', fontFamily: 'monospace', fontSize: '11.5px' }}>
            {item.manifest_path}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
          <span style={{ color: '#64748B' }}>Breaking Change</span>
          <span style={{ fontWeight: 600, color: item.breaking_change ? '#EA580C' : '#059669' }}>
            {item.breaking_change ? 'Yes (Major update)' : 'No (Safe patch)'}
          </span>
        </div>
      </div>

      {/* Remediation Steps Stepper matching Screenshot 09 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
          Remediation Steps
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {steps.map((st) => {
            const isCompleted = currentStep > st.number;
            const isCurrent = currentStep === st.number;

            return (
              <div key={st.number} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: isCompleted ? '#10B981' : isCurrent ? '#2563EB' : '#E2E8F0',
                    color: isCompleted || isCurrent ? '#FFFFFF' : '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 700,
                    marginTop: '2px',
                    flexShrink: 0,
                  }}
                >
                  {isCompleted ? '✓' : st.number}
                </div>
                <div>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: isCurrent ? 600 : 500,
                      color: isCurrent ? '#0F172A' : '#475569',
                    }}
                  >
                    {st.number}. {st.label}
                  </span>
                  <span style={{ display: 'block', fontSize: '11px', color: '#94A3B8' }}>
                    {st.description}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PR Link if already created */}
      {item.pr_url && (
        <div
          style={{
            padding: '10px 12px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <GitPullRequest size={14} color="#2563EB" />
            <span style={{ fontWeight: 600, color: '#0F172A' }}>PR #{item.pr_number || '42'}</span>
          </div>
          <a
            href={item.pr_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '12px',
              color: '#2563EB',
              textDecoration: 'none',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>View PR</span>
            <ExternalLink size={12} />
          </a>
        </div>
      )}

      {/* Primary & Secondary Actions matching Screenshot 09 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
        <button
          type="button"
          onClick={() => onCreatePR(item)}
          disabled={creatingPR || item.status === 'FIXED'}
          style={{
            width: '100%',
            padding: '10px 16px',
            backgroundColor: item.status === 'FIXED' ? '#94A3B8' : '#2563EB',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: item.status === 'FIXED' || creatingPR ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
            transition: 'background-color 120ms ease',
          }}
        >
          <GitPullRequest size={15} />
          <span>{creatingPR ? 'Creating PR...' : item.pr_url ? 'Recreate Fix PR' : 'Create Fix Pull Request'}</span>
        </button>

        <button
          type="button"
          onClick={() => onMarkResolved(item)}
          disabled={markingResolved || item.status === 'FIXED'}
          style={{
            width: '100%',
            padding: '9px 16px',
            backgroundColor: '#FFFFFF',
            color: item.status === 'FIXED' ? '#059669' : '#334155',
            border: '1px solid #CBD5E1',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: item.status === 'FIXED' || markingResolved ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'background-color 120ms ease',
          }}
        >
          <RotateCcw size={14} className={markingResolved ? 'animate-spin' : ''} />
          <span>{markingResolved ? 'Resolving...' : item.status === 'FIXED' ? 'Resolved & Verified' : 'Mark as Resolved'}</span>
        </button>
      </div>
    </div>
  );
};
