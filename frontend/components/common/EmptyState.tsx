'use client';

import React from 'react';
import Link from 'next/link';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onActionClick?: () => void;
  minHeight?: string | number;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onActionClick,
  minHeight = '320px',
}: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        minHeight,
        textAlign: 'center',
        backgroundColor: '#F8FAFC',
        border: '1.5px dashed #CBD5E1',
        borderRadius: '10px',
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {icon && (
        <div style={{ marginBottom: '14px', color: '#94A3B8' }}>
          {icon}
        </div>
      )}
      <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
        {title}
      </h3>
      <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '420px', margin: '6px auto 18px', lineHeight: 1.5 }}>
        {description}
      </p>
      {actionLabel && (
        <>
          {actionHref ? (
            <Link
              href={actionHref}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                fontSize: '12.5px',
                fontWeight: 600,
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                borderRadius: '6px',
                textDecoration: 'none',
              }}
            >
              {actionLabel}
            </Link>
          ) : (
            <button
              onClick={onActionClick}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                fontSize: '12.5px',
                fontWeight: 600,
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              {actionLabel}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default EmptyState;

