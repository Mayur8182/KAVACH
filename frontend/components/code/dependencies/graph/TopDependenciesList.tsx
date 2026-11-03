'use client';

import React from 'react';
import { TopDependencyItem } from '@/types/api/dependencies';
import { Package, ShieldAlert, ArrowUpRight } from 'lucide-react';

interface TopDependenciesListProps {
  items: TopDependencyItem[];
  loading?: boolean;
  onSelect?: (item: TopDependencyItem) => void;
}

export const TopDependenciesList: React.FC<TopDependenciesListProps> = ({
  items,
  loading = false,
  onSelect,
}) => {
  const getBadgeStyle = (risk: string) => {
    switch (risk.toLowerCase()) {
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
        height: '270px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
          Top Dependencies
        </h3>
        <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
          By Dependency Count
        </span>
      </div>

      {loading ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: '46px',
                backgroundColor: '#F8FAFC',
                borderRadius: '8px',
                animation: 'pulse 1.5s infinite',
              }}
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
          No dependency rankings available.
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            paddingRight: '4px',
          }}
        >
          {items.map((item) => {
            const badge = getBadgeStyle(item.risk_level);
            return (
              <div
                key={item.id}
                onClick={() => onSelect?.(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid #F1F5F9',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all 120ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F8FAFC';
                  e.currentTarget.style.borderColor = '#E2E8F0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#F1F5F9';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: '#F1F5F9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#475569',
                      flexShrink: 0,
                    }}
                  >
                    <Package size={16} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#0F172A',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>
                      v{item.version} &bull; {item.dependents_count} dependents
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      backgroundColor: badge.bg,
                      color: badge.text,
                      border: `1px solid ${badge.border}`,
                    }}
                  >
                    {item.risk_level}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
