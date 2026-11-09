'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  error?: string | null;
  onRetry?: () => void;
  minHeight?: string | number;
}

export function ErrorState({
  title = 'Failed to load security data',
  error = 'An error occurred while connecting to the security engine.',
  onRetry,
  minHeight = '240px',
}: ErrorStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '36px 24px',
        minHeight,
        textAlign: 'center',
        backgroundColor: '#FEF2F2',
        border: '1px solid #FECACA',
        borderRadius: '10px',
        color: '#991B1B',
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <AlertTriangle size={28} color="#DC2626" style={{ marginBottom: '12px' }} />
      <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#991B1B' }}>
        {title}
      </h3>
      {error && (
        <p style={{ fontSize: '13px', color: '#B91C1C', maxWidth: '440px', margin: '6px auto 16px', lineHeight: 1.5 }}>
          {error}
        </p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: '7px 16px',
            fontSize: '12.5px',
            fontWeight: 600,
            backgroundColor: '#FFFFFF',
            color: '#991B1B',
            border: '1px solid #FCA5A5',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Retry Request
        </button>
      )}
    </div>
  );
}

export default ErrorState;

