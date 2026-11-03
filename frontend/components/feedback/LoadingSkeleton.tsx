import React from 'react';

interface LoadingSkeletonProps {
  rows?: number;
  lines?: number;
  height?: string;
  width?: string;
  style?: React.CSSProperties;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  rows,
  lines,
  height = '18px',
  width = '100%',
  style = {},
}) => {
  const rowCount = rows ?? lines ?? 1;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width, ...style }}>
      {Array.from({ length: rowCount }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse"
          style={{
            height,
            width: i === rowCount - 1 && rowCount > 1 ? '70%' : '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border-subtle)',
          }}
        />
      ))}
    </div>
  );
};
