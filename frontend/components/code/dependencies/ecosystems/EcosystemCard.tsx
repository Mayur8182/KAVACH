'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { EcosystemCardMetric } from '@/types/api/dependencies';
import { EcosystemIcon } from './EcosystemIcons';

interface EcosystemCardProps {
  card: EcosystemCardMetric;
  isLoading?: boolean;
}

export const EcosystemCard: React.FC<EcosystemCardProps> = ({ card, isLoading = false }) => {
  if (isLoading) {
    return (
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: '#F1F5F9',
              animation: 'pulse 1.5s infinite',
            }}
          />
          <div style={{ flex: 1 }}>
            <div
              style={{
                width: '60%',
                height: '14px',
                borderRadius: '4px',
                backgroundColor: '#F1F5F9',
                marginBottom: '6px',
              }}
            />
            <div
              style={{
                width: '40%',
                height: '10px',
                borderRadius: '4px',
                backgroundColor: '#F8FAFC',
              }}
            />
          </div>
        </div>
        <div
          style={{
            width: '100%',
            height: '8px',
            borderRadius: '9999px',
            backgroundColor: '#F1F5F9',
          }}
        />
      </div>
    );
  }

  const healthScore = Math.max(0, Math.min(100, card.health_score || 100));
  const healthColor =
    healthScore >= 80 ? '#10B981' : healthScore >= 50 ? '#F59E0B' : '#EF4444';

  return (
    <Link
      href={card.href}
      style={{
        textDecoration: 'none',
        display: 'block',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          cursor: 'pointer',
          transition: 'transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)';
          e.currentTarget.style.borderColor = '#CBD5E1';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
          e.currentTarget.style.borderColor = '#E2E8F0';
        }}
      >
        {/* Top: Icon + Title + Arrow */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <EcosystemIcon type={card.slug} size={36} />
            </div>
            <div>
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: '#0F172A',
                  letterSpacing: '-0.01em',
                }}
              >
                {card.name}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                {card.total_packages} {card.total_packages === 1 ? 'package' : 'packages'}
                {card.vulnerable_packages > 0 ? (
                  <span style={{ color: '#EF4444', fontWeight: 600, marginLeft: '6px' }}>
                    • {card.vulnerable_packages} vulnerable
                  </span>
                ) : (
                  <span style={{ color: '#10B981', fontWeight: 500, marginLeft: '6px' }}>
                    • Clean
                  </span>
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              backgroundColor: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94A3B8',
              transition: 'background-color 120ms ease, color 120ms ease',
            }}
          >
            <ChevronRight size={16} />
          </div>
        </div>

        {/* Bottom: Progress / Health Bar matching Screenshot skeleton lines */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: '#94A3B8',
              marginBottom: '6px',
            }}
          >
            <span>Security Health</span>
            <span style={{ fontWeight: 600, color: healthColor }}>{healthScore}%</span>
          </div>
          <div
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '9999px',
              backgroundColor: '#F1F5F9',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${healthScore}%`,
                height: '100%',
                backgroundColor: healthColor,
                borderRadius: '9999px',
                transition: 'width 400ms ease',
              }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
};
