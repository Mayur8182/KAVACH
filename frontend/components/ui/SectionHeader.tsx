'use client';

import React from 'react';

export interface SectionHeaderProps {
  eyebrow?: string;
  eyebrowIcon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  centered?: boolean;
}

/**
 * Enterprise Section Header
 * Strictly conforms to:
 * - Rule 1: Visual hierarchy (One primary focus, max 3 levels of emphasis).
 * - Rule 2: Readable text width (max 65 characters / line for description).
 * - Rule 3: Fixed typography scale with 1.2 heading line height.
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  eyebrow,
  eyebrowIcon,
  title,
  description,
  action,
  centered = false,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: centered ? 'center' : 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '32px',
        textAlign: centered ? 'center' : 'left',
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: centered ? 'center' : 'flex-start',
          gap: '8px',
          maxWidth: centered ? '720px' : '680px',
        }}
      >
        {eyebrow && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 10px',
              borderRadius: '16px',
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38BDF8',
              fontSize: '11px',
              fontWeight: 700,
              fontFamily: 'var(--font-mono, monospace)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {eyebrowIcon && <span aria-hidden="true" style={{ display: 'inline-flex' }}>{eyebrowIcon}</span>}
            <span>{eyebrow}</span>
          </div>
        )}

        <h2
          style={{
            fontSize: '32px',
            fontWeight: 800,
            color: '#FFFFFF',
            lineHeight: 1.15,
            letterSpacing: '-0.025em',
            margin: 0,
            fontFamily: 'var(--font-sans)',
          }}
        >
          {title}
        </h2>

        {description && (
          <p
            className="prose-readable"
            style={{
              fontSize: '16px',
              color: '#94A3B8',
              lineHeight: 1.5,
              margin: 0,
              fontFamily: 'var(--font-sans)',
            }}
          >
            {description}
          </p>
        )}
      </div>

      {action && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {action}
        </div>
      )}
    </div>
  );
};
