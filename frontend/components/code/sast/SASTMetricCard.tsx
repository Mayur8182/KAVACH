'use client';

import React from 'react';

interface SASTMetricCardProps {
  title?: string;
  label?: string;
  value: string | number;
  subtext?: string;
  description?: string;
  badge?: string;
  badgeColor?: string;
  badgeBg?: string;
  icon: React.ReactNode | React.ComponentType<{ size?: number; className?: string }>;
  iconBg?: string;
  iconBgColor?: string;
  iconColor: string;
  loading?: boolean;
}

export const SASTMetricCard: React.FC<SASTMetricCardProps> = ({
  title,
  label,
  value,
  subtext,
  description,
  badge,
  badgeColor = '#10B981',
  badgeBg = '#ECFDF5',
  icon,
  iconBg,
  iconBgColor,
  iconColor,
  loading = false,
}) => {
  const displayTitle = title || label || '';
  const effectiveIconBg = iconBg || iconBgColor || '#EEF2FF';
  const effectiveSubtext = subtext || description;

  const renderIcon = () => {
    if (React.isValidElement(icon)) {
      return icon;
    }
    if (
      typeof icon === 'function' ||
      (typeof icon === 'object' && icon !== null && ('render' in icon || '$$typeof' in icon))
    ) {
      const IconComponent = icon as React.ComponentType<{ size?: number }>;
      return <IconComponent size={18} />;
    }
    return null;
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '10px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
        transition: 'transform 120ms ease, box-shadow 120ms ease',
      }}
    >
      {/* Icon Circle */}
      <div
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '8px',
          backgroundColor: effectiveIconBg,
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
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#64748B',
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
          }}
        >
          {displayTitle}
        </span>

        {loading ? (
          <div
            style={{
              height: '22px',
              width: '60px',
              backgroundColor: '#F1F5F9',
              borderRadius: '4px',
              margin: '3px 0',
              animation: 'pulse 1.5s infinite ease-in-out',
            }}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '1px 0' }}>
            <span
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#0F172A',
                letterSpacing: '-0.02em',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              {typeof value === 'number' ? value.toLocaleString() : value}
            </span>
            {badge && (
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 600,
                  color: badgeColor,
                  backgroundColor: badgeBg,
                  padding: '1.5px 5px',
                  borderRadius: '4px',
                }}
              >
                {badge}
              </span>
            )}
          </div>
        )}

        {effectiveSubtext && (
          <span
            style={{
              fontSize: '11px',
              color: '#94A3B8',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {effectiveSubtext}
          </span>
        )}
      </div>
    </div>
  );
};
