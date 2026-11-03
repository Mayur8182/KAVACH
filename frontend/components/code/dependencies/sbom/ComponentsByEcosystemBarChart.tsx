'use client';

import React from 'react';
import { SBOMComponentsByEcosystem } from '@/types/api/dependencies';

interface ComponentsByEcosystemBarChartProps {
  data: SBOMComponentsByEcosystem[];
  loading?: boolean;
}

export const ComponentsByEcosystemBarChart: React.FC<ComponentsByEcosystemBarChartProps> = ({
  data,
  loading = false,
}) => {
  // Ecosystem badge colors & labels
  const getEcosystemMeta = (eco: string) => {
    const lower = eco.toLowerCase();
    switch (lower) {
      case 'npm':
        return { label: 'npm', iconBg: '#EF4444', textColor: '#FFFFFF', barColor: '#93C5FD' };
      case 'python':
      case 'pypi':
        return { label: 'Python', iconBg: '#3B82F6', textColor: '#FFFFFF', barColor: '#93C5FD' };
      case 'java':
      case 'maven':
        return { label: 'Java', iconBg: '#EA580C', textColor: '#FFFFFF', barColor: '#FED7AA' };
      case 'go':
      case 'golang':
        return { label: 'Go', iconBg: '#06B6D4', textColor: '#FFFFFF', barColor: '#FCA5A5' };
      case 'rust':
      case 'cargo':
        return { label: 'Rust', iconBg: '#334155', textColor: '#FFFFFF', barColor: '#DDD6FE' };
      case '.net':
      case 'nuget':
        return { label: '.NET', iconBg: '#7C3AED', textColor: '#FFFFFF', barColor: '#BFDBFE' };
      default:
        return { label: eco, iconBg: '#64748B', textColor: '#FFFFFF', barColor: '#E2E8F0' };
    }
  };

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  if (loading) {
    return (
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          height: '270px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ height: '18px', width: '180px', backgroundColor: '#F1F5F9', borderRadius: '4px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} style={{ height: '18px', backgroundColor: '#F1F5F9', borderRadius: '4px' }} />
          ))}
        </div>
      </div>
    );
  }

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
        justifyContent: 'space-between',
        height: '270px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
          Components by Ecosystem
        </h3>
        <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
          {data.length} ecosystems
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', flexGrow: 1, justifyContent: 'center' }}>
        {data.map((item, idx) => {
          const meta = getEcosystemMeta(item.ecosystem);
          const barWidthPercent = Math.max(Math.round((item.count / maxCount) * 100), 10);

          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Ecosystem Icon Badge */}
              <div
                style={{
                  width: '38px',
                  height: '20px',
                  borderRadius: '4px',
                  backgroundColor: meta.iconBg,
                  color: meta.textColor,
                  fontSize: '10.5px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  letterSpacing: '0.01em',
                  flexShrink: 0,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                }}
              >
                {meta.label}
              </div>

              {/* Progress Bar Container */}
              <div
                style={{
                  flexGrow: 1,
                  height: '14px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  position: 'relative',
                  border: '1px solid #F1F5F9',
                }}
              >
                <div
                  style={{
                    width: `${barWidthPercent}%`,
                    height: '100%',
                    backgroundColor: meta.barColor,
                    borderRadius: '6px',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>

              {/* Count and Percentage */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: '60px', justifyContent: 'flex-end', fontSize: '11.5px' }}>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>{item.count}</span>
                <span style={{ color: '#94A3B8', fontSize: '10.5px' }}>({item.percentage}%)</span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ paddingTop: '8px', borderTop: '1px solid #F1F5F9' }}>
        <span style={{ fontSize: '11px', color: '#94A3B8' }}>
          Extracted from repository lockfiles: package-lock.json, poetry.lock, go.sum, Cargo.lock.
        </span>
      </div>
    </div>
  );
};
