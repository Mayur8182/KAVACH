'use client';

import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg' | 'none';
  variant?: 'default' | 'elevated' | 'interactive';
}

/**
 * Enterprise Card Component
 * Strictly conforms to:
 * - Rule 1: Visual hierarchy (Header -> Body -> Footer).
 * - Rule 2: 8-point spacing (padding: 16px/24px/32px, never arbitrary).
 * - Rule 4: 60-30-10 surface and neutral structure.
 * - Rule 5: Unified 10px-12px corner radii.
 */
export const Card: React.FC<CardProps> = ({
  children,
  padding = 'md',
  variant = 'default',
  className = '',
  style = {},
  ...props
}) => {
  const paddingMap = {
    none: '0',
    sm: '16px', // Mobile standard
    md: '24px', // Desktop standard
    lg: '32px',
  };

  const isInteractive = variant === 'interactive';

  return (
    <div
      style={{
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: paddingMap[padding],
        display: 'flex',
        flexDirection: 'column',
        backdropFilter: 'blur(12px)',
        transition: isInteractive ? 'all 200ms ease-out' : undefined,
        cursor: isInteractive ? 'pointer' : 'default',
        boxSizing: 'border-box',
        ...style,
      }}
      onMouseEnter={
        isInteractive
          ? (e) => {
              e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 28px -6px rgba(0, 0, 0, 0.5)';
            }
          : undefined
      }
      onMouseLeave={
        isInteractive
          ? (e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = 'none';
            }
          : undefined
      }
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  style = {},
  ...props
}) => (
  <div
    style={{
      marginBottom: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      ...style,
    }}
    {...props}
  >
    {children}
  </div>
);

export const CardBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  style = {},
  ...props
}) => (
  <div
    style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      ...style,
    }}
    {...props}
  >
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  style = {},
  ...props
}) => (
  <div
    style={{
      marginTop: '20px',
      paddingTop: '16px',
      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: '12px',
      ...style,
    }}
    {...props}
  >
    {children}
  </div>
);
