'use client';

import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  FolderGit2,
  Lock,
  Layers,
  ArrowRight,
  Activity,
  CheckCircle2,
  Terminal,
} from 'lucide-react';

export interface DynamicSecurityPostureCardProps {
  score?: number;
  grade?: string;
  criticalIssues?: number;
  highIssues?: number;
  activeRepositories?: number;
  activePolicies?: number;
  connectedIntegrations?: number;
  recentScansCount?: number;
  onTriggerScan?: () => void;
  onShowCritical?: () => void;
  onOpenDashboard?: () => void;
  onTestApiSecurity?: () => void;
}

export function DynamicSecurityPostureCard({
  score = 85,
  grade = 'B',
  criticalIssues = 0,
  highIssues = 2,
  activeRepositories = 1,
  activePolicies = 4,
  connectedIntegrations = 3,
  recentScansCount = 6,
  onTriggerScan,
  onShowCritical,
  onOpenDashboard,
  onTestApiSecurity,
}: DynamicSecurityPostureCardProps) {
  const getScoreColor = (sc: number) => {
    if (sc >= 90) return { primary: '#16A34A', bg: '#DCFCE7', text: '#15803D' };
    if (sc >= 75) return { primary: '#2563EB', bg: '#EFF6FF', text: '#1D4ED8' };
    if (sc >= 60) return { primary: '#D97706', bg: '#FEF3C7', text: '#B45309' };
    return { primary: '#DC2626', bg: '#FEE2E2', text: '#B91C1C' };
  };

  const colors = getScoreColor(score);

  return (
    <div
      style={{
        marginTop: 14,
        padding: '22px 24px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #CBD5E1',
        borderRadius: 14,
        boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      {/* Top Banner: Score & Status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Circular Score Badge */}
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              backgroundColor: colors.bg,
              border: `2px solid ${colors.primary}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 800, color: colors.text, lineHeight: 1 }}>
              {score}
            </span>
            <span style={{ fontSize: 9, fontWeight: 700, color: colors.text, textTransform: 'uppercase', marginTop: 1 }}>
              Grade {grade}
            </span>
          </div>

          <div>
            <h4 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Workspace Security Posture
            </h4>
            <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 2 }}>
              Authoritative security posture calculated from real database findings, scans, and active policies.
            </div>
          </div>
        </div>

        {onOpenDashboard && (
          <button
            type="button"
            onClick={onOpenDashboard}
            style={{
              padding: '8px 14px',
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>Full Dashboard</span>
            <ArrowRight size={13} />
          </button>
        )}
      </div>

      {/* 4-Grid Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
        }}
      >
        {/* Critical Issues */}
        <div
          style={{
            padding: '12px 14px',
            backgroundColor: criticalIssues > 0 ? '#FEF2F2' : '#F8FAFC',
            border: `1px solid ${criticalIssues > 0 ? '#FECACA' : '#E2E8F0'}`,
            borderRadius: 10,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldAlert size={14} color={criticalIssues > 0 ? '#DC2626' : '#64748B'} />
            <span>Critical Issues</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: criticalIssues > 0 ? '#DC2626' : '#0F172A', marginTop: 4 }}>
            {criticalIssues}
          </div>
        </div>

        {/* High Issues */}
        <div
          style={{
            padding: '12px 14px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 10,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Activity size={14} color="#EA580C" />
            <span>High Severity</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>
            {highIssues}
          </div>
        </div>

        {/* Monitored Repos */}
        <div
          style={{
            padding: '12px 14px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 10,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}>
            <FolderGit2 size={14} color="#2563EB" />
            <span>Repositories</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>
            {activeRepositories}
          </div>
        </div>

        {/* Active Policies */}
        <div
          style={{
            padding: '12px 14px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 10,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Lock size={14} color="#16A34A" />
            <span>Active Policies</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>
            {activePolicies}
          </div>
        </div>
      </div>

      {/* Quick Action Pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingTop: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginRight: 4 }}>
          Quick Actions:
        </span>

        {onTriggerScan && (
          <button
            type="button"
            onClick={onTriggerScan}
            style={{
              padding: '6px 12px',
              backgroundColor: '#F1F5F9',
              border: '1px solid #CBD5E1',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              color: '#0F172A',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Terminal size={12} />
            <span>Run Security Scan</span>
          </button>
        )}

        {onShowCritical && (
          <button
            type="button"
            onClick={onShowCritical}
            style={{
              padding: '6px 12px',
              backgroundColor: '#F1F5F9',
              border: '1px solid #CBD5E1',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              color: '#0F172A',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <ShieldAlert size={12} color="#DC2626" />
            <span>Show Critical Findings</span>
          </button>
        )}

        {onTestApiSecurity && (
          <button
            type="button"
            onClick={onTestApiSecurity}
            style={{
              padding: '6px 12px',
              backgroundColor: '#F1F5F9',
              border: '1px solid #CBD5E1',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              color: '#0F172A',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <CheckCircle2 size={12} color="#16A34A" />
            <span>Test API Security</span>
          </button>
        )}
      </div>
    </div>
  );
}
