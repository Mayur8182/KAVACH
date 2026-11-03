'use client';

import React from 'react';

interface DependenciesMetricCardProps {
  title?: string;
  label?: string;
  value: string | number;
  subtext?: string;
  badge?: string;
  badgeColor?: string;
  badgeBg?: string;
  icon: React.ReactNode | React.ComponentType<{ size?: number; className?: string }>;
  iconBg: string;
  iconColor: string;
  loading?: boolean;
}

export const DependenciesMetricCard: React.FC<DependenciesMetricCardProps> = ({
  title,
  label,
  value,
  subtext,
  badge,
  badgeColor = '#10B981',
  badgeBg = '#ECFDF5',
  icon,
  iconBg,
  iconColor,
  loading = false,
}) => {
  const displayTitle = title || label || '';

  const renderIcon = () => {
    if (React.isValidElement(icon)) {
      return icon;
    }
    if (
      typeof icon === 'function' ||
      (typeof icon === 'object' && icon !== null && ('render' in icon || '$$typeof' in icon))
    ) {
      const IconComponent = icon as React.ComponentType<{ size?: number }>;
      return <IconComponent size={24} />;
    }
    return null;
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        transition: 'transform 120ms ease, box-shadow 120ms ease',
      }}
    >
      {/* Icon Circle */}
      <div
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '12px',
          backgroundColor: iconBg,
          color: iconColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {renderIcon()}
      </div>

      {/* Metric details */}
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flexGrow: 1 }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', letterSpacing: '0.01em', textTransform: 'uppercase' }}>
          {displayTitle}
        </span>

        {loading ? (
          <div
            style={{
              height: '28px',
              width: '80px',
              backgroundColor: '#F1F5F9',
              borderRadius: '6px',
              margin: '4px 0',
              animation: 'pulse 1.5s infinite ease-in-out',
            }}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '2px 0' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </span>
            {badge && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: badgeColor,
                  backgroundColor: badgeBg,
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                {badge}
              </span>
            )}
          </div>
        )}

        {subtext && (
          <span style={{ fontSize: '12px', color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {subtext}
          </span>
        )}
      </div>
    </div>
  );
};
