import React from 'react';

// ================================================================
// LoadingState — skeleton preserving layout
// ================================================================

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '16px',
  borderRadius = 'var(--radius-sm)',
  style,
}) => (
  <div
    style={{
      width,
      height,
      borderRadius,
      backgroundColor: 'var(--color-surface-elevated)',
      backgroundImage: 'linear-gradient(90deg, var(--color-surface-elevated) 0%, var(--color-surface-overlay) 50%, var(--color-surface-elevated) 100%)',
      backgroundSize: '200% 100%',
      animation: 'skeleton-shimmer 1.6s ease-in-out infinite',
      ...style,
    }}
  />
);

// Inject keyframes once
const KEYFRAMES = `
@keyframes skeleton-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
`;
if (typeof document !== 'undefined' && !document.getElementById('skeleton-keyframes')) {
  const style = document.createElement('style');
  style.id = 'skeleton-keyframes';
  style.textContent = KEYFRAMES;
  document.head.appendChild(style);
}

// ================================================================
// PageLoadingState — full page skeleton matching real layout
// ================================================================

export const PageLoadingState: React.FC<{ rows?: number; message?: string }> = ({ rows = 5, message }) => (
  <div style={{ padding: 'var(--space-8)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
    {message && (
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{message}</div>
    )}
    {/* Header skeleton */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <Skeleton width="240px" height="22px" />
      <Skeleton width="380px" height="14px" />
    </div>

    {/* Metric row skeleton */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)' }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          style={{
            padding: 'var(--space-5)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--color-surface)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
          }}
        >
          <Skeleton width="80px" height="12px" />
          <Skeleton width="60px" height="28px" />
          <Skeleton width="100px" height="12px" />
        </div>
      ))}
    </div>

    {/* Table skeleton */}
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        backgroundColor: 'var(--color-surface)',
        overflow: 'hidden',
      }}
    >
      {/* Table header */}
      <div
        style={{
          padding: 'var(--space-4) var(--space-5)',
          borderBottom: '1px solid var(--color-border)',
          display: 'grid',
          gridTemplateColumns: '120px 1fr 200px 140px 100px',
          gap: 'var(--space-4)',
        }}
      >
        {['80px', '120px', '100px', '80px', '60px'].map((w, i) => (
          <Skeleton key={i} width={w} height="12px" />
        ))}
      </div>
      {/* Table rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            padding: 'var(--space-4) var(--space-5)',
            borderBottom: i < rows - 1 ? '1px solid var(--color-border)' : 'none',
            display: 'grid',
            gridTemplateColumns: '120px 1fr 200px 140px 100px',
            gap: 'var(--space-4)',
            alignItems: 'center',
          }}
        >
          <Skeleton width="60px" height="20px" borderRadius="var(--radius-sm)" />
          <Skeleton width="80%" height="14px" />
          <Skeleton width="140px" height="14px" />
          <Skeleton width="90px" height="14px" />
          <Skeleton width="60px" height="14px" />
        </div>
      ))}
    </div>
  </div>
);

// ================================================================
// InlineLoadingState — for sections within a page
// ================================================================

export const InlineLoadingState: React.FC<{ label?: string }> = ({ label = 'Loading...' }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      padding: 'var(--space-5)',
      color: 'var(--color-text-muted)',
      fontSize: 'var(--text-sm)',
    }}
  >
    <SpinnerIcon />
    {label}
  </div>
);

// ================================================================
// SpinnerIcon — minimal, purposeful
// ================================================================

export const SpinnerIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 16,
  color = 'currentColor',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}
  >
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </svg>
);
