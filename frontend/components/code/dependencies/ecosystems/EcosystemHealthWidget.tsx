'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, MoreHorizontal } from 'lucide-react';
import { EcosystemHealthItem } from '@/types/api/dependencies';
import { EcosystemIcon } from './EcosystemIcons';

interface EcosystemHealthWidgetProps {
  items: EcosystemHealthItem[];
  isLoading?: boolean;
}

export const EcosystemHealthWidget: React.FC<EcosystemHealthWidgetProps> = ({
  items = [],
  isLoading = false,
}) => {
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
          Ecosystem Health
        </h2>
        <button
          aria-label="Ecosystem health actions"
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '10px 0' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                height: '28px',
                backgroundColor: '#F8FAFC',
                borderRadius: '6px',
                animation: 'pulse 1.5s infinite',
              }}
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '180px',
            color: '#94A3B8',
            fontSize: '13px',
          }}
        >
          No ecosystem data available
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, justifyContent: 'center' }}>
          {items.map((item) => {
            const pct = Math.max(0, Math.min(100, item.health_score || 100));
            const barColor =
              pct >= 80 ? '#22C55E' : pct >= 50 ? '#F59E0B' : '#EF4444';

            return (
              <Link
                key={item.id}
                href={item.href}
                style={{
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '6px 8px',
                  borderRadius: '8px',
                  transition: 'background-color 100ms ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                {/* Left: Icon + Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '130px', flexShrink: 0 }}>
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <EcosystemIcon type={item.slug} size={22} />
                  </div>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#1E293B',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.name}
                  </span>
                </div>

                {/* Middle: Progress Bar */}
                <div style={{ flex: 1, minWidth: '80px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      flex: 1,
                      height: '8px',
                      borderRadius: '9999px',
                      backgroundColor: '#F1F5F9',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        backgroundColor: barColor,
                        borderRadius: '9999px',
                        transition: 'width 300ms ease',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#64748B',
                      width: '32px',
                      textAlign: 'right',
                    }}
                  >
                    {pct}%
                  </span>
                </div>

                {/* Right: Chevron */}
                <ChevronRight size={14} color="#94A3B8" style={{ flexShrink: 0 }} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
