'use client';

import React from 'react';
import Link from 'next/link';
import { TopPackageHealthRiskItem } from '@/types/api/dependencies';
import { Package as PackageIcon, AlertTriangle } from 'lucide-react';

interface TopPackagesHealthRiskChartProps {
  data: TopPackageHealthRiskItem[];
  loading?: boolean;
}

export const TopPackagesHealthRiskChart: React.FC<TopPackagesHealthRiskChartProps> = ({
  data = [],
  loading = false,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        padding: '20px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
          Top Packages by Health Risk
        </h3>
        <span
          style={{
            fontSize: '11.5px',
            color: '#DC2626',
            backgroundColor: '#FEE2E2',
            padding: '2px 8px',
            borderRadius: '9999px',
            fontWeight: 600,
          }}
        >
          Requires Attention
        </span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px 0' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ height: '24px', backgroundColor: '#F1F5F9', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div style={{ padding: '24px 0', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
          No critical health risks detected.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {data.map((item) => (
            <div key={item.package_name} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PackageIcon size={14} color="#64748B" />
                  <Link
                    href={`/code/dependencies/health/${encodeURIComponent(item.package_name)}`}
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#0F172A',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#2563EB')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#0F172A')}
                  >
                    {item.package_name}
                  </Link>
                  <span
                    style={{
                      fontSize: '10.5px',
                      backgroundColor: '#F1F5F9',
                      color: '#475569',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      fontWeight: 500,
                    }}
                  >
                    {item.ecosystem}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: item.color }}>
                    Risk: {item.risk_score}
                  </span>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 600,
                      color: item.color,
                      backgroundColor: `${item.color}15`,
                      padding: '1px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    {item.health_status}
                  </span>
                </div>
              </div>

              {/* Risk bar */}
              <div
                style={{
                  width: '100%',
                  height: '7px',
                  backgroundColor: '#F1F5F9',
                  borderRadius: '9999px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${Math.min(item.risk_score, 100)}%`,
                    height: '100%',
                    backgroundColor: item.color,
                    borderRadius: '9999px',
                    transition: 'width 300ms ease',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
