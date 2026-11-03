'use client';

import React from 'react';
import { Onee, type AnimationName } from './Onee';

export type AvatarEmptyStateProps = {
  animation?: AnimationName;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  size?: 'sm' | 'md' | 'lg';
};

const SIZE_MAP = {
  sm: { avatar: 64, container: 80 },
  md: { avatar: 96, container: 112 },
  lg: { avatar: 120, container: 140 },
};

export function AvatarEmptyState({
  animation = 'idle',
  title,
  description,
  action,
  size = 'md',
}: AvatarEmptyStateProps) {
  const dim = SIZE_MAP[size];
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        gap: '16px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: `${dim.container}px`,
          height: `${dim.container}px`,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #F1F5F9 0%, #EFF6FF 100%)',
          border: '1.5px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.06)',
        }}
      >
        <Onee animation={animation} playing={true} loop={true} size={dim.avatar} />
      </div>
      <div style={{ maxWidth: '320px' }}>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#0F172A',
            marginBottom: description ? '6px' : '0',
          }}
        >
          {title}
        </div>
        {description && (
          <div style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.55 }}>
            {description}
          </div>
        )}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            marginTop: '4px',
            padding: '8px 20px',
            backgroundColor: '#2563EB',
            border: '1px solid #1D4ED8',
            borderRadius: '8px',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'opacity 0.15s ease',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export default AvatarEmptyState;
