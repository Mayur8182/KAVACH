'use client';

import React from 'react';
import { TopLicenseItem } from '@/types/api/dependencies';

interface TopLicensesChartProps {
  data: TopLicenseItem[];
  loading?: boolean;
}

export const TopLicensesChart: React.FC<TopLicensesChartProps> = ({
  data,
  loading = false,
}) => {
  const maxCount = Math.max(1, ...data.map((d) => d.package_count));

  const getBarColor = (name: string) => {
    switch (name.toUpperCase()) {
      case 'MIT':
        return '#3B82F6';
      case 'APACHE-2.0':
        return '#10B981';
      case 'BSD-3-CLAUSE':
      case 'BSD-2-CLAUSE':
        return '#F59E0B';
      case 'ISC':
        return '#8B5CF6';
      case 'GPL-3.0':
        return '#EF4444';
      default:
        return '#64748B';
    }
  };

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
        height: '240px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
          Top Licenses
        </h3>
        <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
          Most Adopted
        </span>
      </div>

      {loading ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'center' }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                height: '20px',
                backgroundColor: '#F8FAFC',
                borderRadius: '4px',
                animation: 'pulse 1.5s infinite',
              }}
            />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
          No license adoption data available.
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
          {data.slice(0, 5).map((item) => {
            const barWidthPercent = Math.max(6, Math.round((item.package_count / maxCount) * 100));
            const barColor = getBarColor(item.license_name);

            return (
              <div key={item.license_name} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '90px', fontSize: '12px', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>
                  {item.license_name}
                </div>

                <div
                  style={{
                    flex: 1,
                    height: '10px',
                    backgroundColor: '#F1F5F9',
                    borderRadius: '5px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${barWidthPercent}%`,
                      height: '100%',
                      backgroundColor: barColor,
                      borderRadius: '5px',
                      transition: 'width 250ms ease',
                    }}
                  />
                </div>

                <div style={{ width: '65px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                  {item.package_count} <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 400 }}>({item.percentage}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
