'use client';

import React from 'react';
import { ViolationByPolicyTypeItem } from '@/types/api/dependencies';
import { ShieldAlert, Package, Scale, Sliders, Lock } from 'lucide-react';

interface ViolationByTypeBarChartProps {
  data: ViolationByPolicyTypeItem[];
  loading?: boolean;
}

export const ViolationByTypeBarChart: React.FC<ViolationByTypeBarChartProps> = ({
  data,
  loading = false,
}) => {
  const totalViolations = data.reduce((acc, curr) => acc + curr.count, 0);
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  const getIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'vulnerability':
      case 'cve':
        return <ShieldAlert size={14} color="#EF4444" />;
      case 'package':
      case 'blocklist':
      case 'blacklist':
        return <Package size={14} color="#F59E0B" />;
      case 'license':
        return <Scale size={14} color="#A855F7" />;
      case 'version':
        return <Sliders size={14} color="#10B981" />;
      default:
        return <Lock size={14} color="#3B82F6" />;
    }
  };

  if (loading) {
    return (
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          height: '260px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ height: '18px', width: '180px', backgroundColor: '#F1F5F9', borderRadius: '4px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flexGrow: 1, justifyContent: 'center' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ height: '14px', backgroundColor: '#F8FAFC', borderRadius: '4px' }} />
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
        height: '260px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
          Violation by Policy Type
        </h3>
        <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
          {totalViolations} Active Violations
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flexGrow: 1, justifyContent: 'center' }}>
        {data.map((item, idx) => {
          const widthPct = Math.max((item.count / maxCount) * 100, 4);

          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  width: '135px',
                  flexShrink: 0,
                  fontSize: '12px',
                  color: '#334155',
                  fontWeight: 500,
                }}
              >
                {getIcon(item.icon_type || item.policy_type)}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.policy_type}
                </span>
              </div>

              <div
                style={{
                  flexGrow: 1,
                  height: '9px',
                  backgroundColor: '#F1F5F9',
                  borderRadius: '9999px',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: `${widthPct}%`,
                    height: '100%',
                    backgroundColor: item.color,
                    borderRadius: '9999px',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>

              <div
                style={{
                  width: '28px',
                  textAlign: 'right',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#0F172A',
                  flexShrink: 0,
                }}
              >
                {item.count}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
