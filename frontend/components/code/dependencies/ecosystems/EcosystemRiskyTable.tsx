'use client';

import React from 'react';
import { MoreHorizontal, AlertTriangle, ShieldCheck } from 'lucide-react';
import { EcosystemTopRiskyPackage } from '@/types/api/dependencies';

interface EcosystemRiskyTableProps {
  packages: EcosystemTopRiskyPackage[];
  isLoading?: boolean;
}

export const EcosystemRiskyTable: React.FC<EcosystemRiskyTableProps> = ({
  packages = [],
  isLoading = false,
}) => {
  const getEcosystemBadgeStyle = (ecosystem: string) => {
    const eco = (ecosystem || '').toLowerCase();
    if (eco.includes('npm')) {
      return { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
    }
    if (eco.includes('python') || eco.includes('pypi') || eco.includes('pip')) {
      return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
    }
    if (eco.includes('maven') || eco.includes('gradle') || eco.includes('java')) {
      return { bg: '#FFF1F2', text: '#E11D48', border: '#FECDD3' };
    }
    if (eco.includes('go')) {
      return { bg: '#ECFEFF', text: '#0891B2', border: '#A5F3FC' };
    }
    // Cargo & NuGet / Other
    return { bg: '#FFF7ED', text: '#D97706', border: '#FED7AA' };
  };

  const getSeverityBadgeStyle = (severity: string) => {
    const s = (severity || '').toUpperCase();
    if (s === 'CRITICAL') {
      return { bg: '#FEF2F2', text: '#991B1B', border: '#FCA5A5' };
    }
    if (s === 'HIGH') {
      return { bg: '#FFF7ED', text: '#C2410C', border: '#FDBA74' };
    }
    if (s === 'MEDIUM') {
      return { bg: '#FEFCE8', text: '#854D0E', border: '#FEF08A' };
    }
    return { bg: '#F0FDF4', text: '#166534', border: '#BBF7D0' };
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        height: '100%',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
          Top Risky Packages
        </h2>
        <button
          aria-label="Risky packages actions"
          style={{
            background: 'none',
            border: 'none',
            color: '#94A3B8',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <MoreHorizontal size={16} />
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '10px 0' }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                height: '32px',
                backgroundColor: '#F8FAFC',
                borderRadius: '6px',
                animation: 'pulse 1.5s infinite',
              }}
            />
          ))}
        </div>
      ) : packages.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '180px',
            color: '#64748B',
            fontSize: '13px',
            gap: '8px',
          }}
        >
          <ShieldCheck size={28} color="#10B981" />
          <span style={{ fontWeight: 600, color: '#0F172A' }}>Zero Critical Risks</span>
          <span style={{ color: '#94A3B8', fontSize: '12px' }}>
            No high-risk vulnerabilities detected across ecosystems
          </span>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                <th style={{ padding: '8px 10px', color: '#64748B', fontWeight: 600 }}>Package</th>
                <th style={{ padding: '8px 10px', color: '#64748B', fontWeight: 600 }}>Ecosystem</th>
                <th style={{ padding: '8px 10px', color: '#64748B', fontWeight: 600 }}>Severity</th>
                <th style={{ padding: '8px 4px', width: '28px' }}></th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => {
                const ecoStyle = getEcosystemBadgeStyle(pkg.ecosystem);
                const sevStyle = getSeverityBadgeStyle(pkg.severity);
                return (
                  <tr
                    key={pkg.id || pkg.name}
                    style={{
                      borderBottom: '1px solid #F8FAFC',
                      transition: 'background-color 100ms ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {/* Package */}
                    <td style={{ padding: '10px 10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap' }}>
                          {pkg.name}
                        </span>
                        <span style={{ color: '#94A3B8', fontSize: '11px' }}>
                          v{pkg.version}
                        </span>
                      </div>
                    </td>

                    {/* Ecosystem */}
                    <td style={{ padding: '10px 10px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: ecoStyle.bg,
                          color: ecoStyle.text,
                          border: `1px solid ${ecoStyle.border}`,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {pkg.ecosystem.split('&')[0].trim()}
                      </span>
                    </td>

                    {/* Severity */}
                    <td style={{ padding: '10px 10px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: sevStyle.bg,
                          color: sevStyle.text,
                          border: `1px solid ${sevStyle.border}`,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {pkg.severity}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '10px 4px', textAlign: 'right' }}>
                      <button
                        aria-label={`Actions for ${pkg.name}`}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#94A3B8',
                          cursor: 'pointer',
                          padding: '2px',
                        }}
                      >
                        <MoreHorizontal size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
