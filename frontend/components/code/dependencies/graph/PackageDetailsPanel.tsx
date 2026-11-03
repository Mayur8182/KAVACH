'use client';

import React from 'react';
import Link from 'next/link';
import { DependencyGraphNode } from '@/types/api/dependencies';
import {
  Package,
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
  GitBranch,
  Layers,
  Calendar,
  AlertTriangle,
  MoreHorizontal,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface PackageDetailsPanelProps {
  packageData: DependencyGraphNode | null;
  onInspectFindings?: (pkg: DependencyGraphNode) => void;
}

export const PackageDetailsPanel: React.FC<PackageDetailsPanelProps> = ({
  packageData,
  onInspectFindings,
}) => {
  if (!packageData) {
    return (
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          height: '560px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94A3B8',
          textAlign: 'center',
        }}
      >
        <Package size={40} strokeWidth={1.5} color="#CBD5E1" style={{ marginBottom: '12px' }} />
        <p style={{ fontSize: '14px', fontWeight: 600, color: '#475569', margin: 0 }}>
          No Package Selected
        </p>
        <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
          Click any node on the graph to inspect its properties and dependencies.
        </p>
      </div>
    );
  }

  const isVulnerable =
    packageData.risk_level === 'Critical' ||
    packageData.risk_level === 'High' ||
    packageData.risk_level === 'Medium';

  const getRiskBadge = (level: string) => {
    switch (level.toLowerCase()) {
      case 'critical':
        return { bg: '#FEF2F2', text: '#DC2626', border: '#FCA5A5' };
      case 'high':
        return { bg: '#FFF7ED', text: '#EA580C', border: '#FDBA74' };
      case 'medium':
        return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
      case 'low':
        return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
      default:
        return { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
    }
  };

  const badgeStyle = getRiskBadge(packageData.risk_level);

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        height: '560px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflowY: 'auto',
      }}
    >
      <div>
        {/* Header Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}
        >
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Package Details
          </h2>
          <button
            title="Options"
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#94A3B8',
              padding: '4px',
            }}
          >
            <MoreHorizontal size={18} />
          </button>
        </div>

        {/* Big Avatar Badge matching Screenshot 06 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              backgroundColor: isVulnerable ? '#FEF2F2' : '#EFF6FF',
              border: `1.5px solid ${isVulnerable ? '#FCA5A5' : '#BFDBFE'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isVulnerable ? '#EF4444' : '#2563EB',
              flexShrink: 0,
            }}
          >
            {isVulnerable ? <ShieldAlert size={28} /> : <Package size={28} />}
          </div>
          <div style={{ minWidth: 0 }}>
            <h3
              style={{
                fontSize: '17px',
                fontWeight: 700,
                color: '#0F172A',
                margin: 0,
                letterSpacing: '-0.01em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {packageData.name}
            </h3>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
              v{packageData.version} &bull; {packageData.ecosystem.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Key-Value Properties List matching Screenshot 06 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748B' }}>Package Name</span>
            <span style={{ fontWeight: 600, color: '#0F172A' }}>{packageData.name}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748B' }}>Version</span>
            <span style={{ fontWeight: 600, color: '#0F172A', fontFamily: 'monospace' }}>
              {packageData.version}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748B' }}>Ecosystem</span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '6px',
                backgroundColor: '#F1F5F9',
                color: '#334155',
              }}
            >
              {packageData.ecosystem.toUpperCase()}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748B' }}>Dependency Type</span>
            <span style={{ fontWeight: 600, color: '#0F172A' }}>
              {packageData.is_direct ? 'Direct Dependency' : 'Transitive Dependency'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748B' }}>Risk Level</span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: badgeStyle.bg,
                color: badgeStyle.text,
                border: `1px solid ${badgeStyle.border}`,
              }}
            >
              {packageData.risk_level.toUpperCase()}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748B' }}>License</span>
            <span style={{ fontWeight: 500, color: '#0F172A' }}>{packageData.license || 'MIT'}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748B' }}>Repository</span>
            <span style={{ fontWeight: 500, color: '#0F172A' }}>
              {packageData.repository_name || 'frontend-monorepo'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748B' }}>First Seen</span>
            <span style={{ color: '#475569', fontSize: '12px' }}>
              {packageData.first_seen ? packageData.first_seen.split('T')[0] : '2024-01-15'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748B' }}>Last Updated</span>
            <span style={{ color: '#475569', fontSize: '12px' }}>
              {packageData.last_updated ? packageData.last_updated.split('T')[0] : '2024-03-22'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Deep-Dive Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
        <Link
          href={`/code/dependencies/graph/risk-paths?search=${encodeURIComponent(packageData.name)}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            backgroundColor: '#EFF6FF',
            color: '#1D4ED8',
            border: '1px solid #BFDBFE',
            padding: '9px 12px',
            borderRadius: '8px',
            fontSize: '12.5px',
            fontWeight: 600,
            textDecoration: 'none',
            cursor: 'pointer',
          }}
        >
          <span>Trace Risk Paths</span>
          <ArrowRight size={14} />
        </Link>

        <Link
          href={`/code/dependencies/graph/upgrade-impact?search=${encodeURIComponent(packageData.name)}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            backgroundColor: '#F8FAFC',
            color: '#334155',
            border: '1px solid #E2E8F0',
            padding: '9px 12px',
            borderRadius: '8px',
            fontSize: '12.5px',
            fontWeight: 600,
            textDecoration: 'none',
            cursor: 'pointer',
          }}
        >
          <TrendingUp size={14} />
          <span>Simulate Upgrade</span>
        </Link>
      </div>
    </div>
  );
};
