'use client';

import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'subtle' | 'interactive' | 'flat';
}

/**
 * Kavach Enterprise Card Component
 * Standardized across dashboards, settings, and analytical panels.
 * Provides consistent surface colors, borders, and rounded corners.
 */
export const Card: React.FC<CardProps> = ({
  children,
  padding = 'md',
  variant = 'default',
  className = '',
  style = {},
  ...props
}) => {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3.5',
    md: 'p-5',
    lg: 'p-6',
  };

  const variantClasses = {
    default: 'bg-white border border-[#E2E8F0] shadow-xs',
    subtle: 'bg-[#F8FAFC] border border-[#E2E8F0]',
    flat: 'bg-white border border-[#E2E8F0]',
    interactive:
      'bg-white border border-[#E2E8F0] shadow-xs hover:border-[#CBD5E1] hover:shadow-sm cursor-pointer transition-all duration-150',
  };

  return (
    <div
      className={`rounded-lg flex flex-col box-border text-[#0F172A] ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  style = {},
  ...props
}) => (
  <div
    className={`mb-4 flex flex-col gap-1 ${className}`}
    style={style}
    {...props}
  >
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = '',
  style = {},
  ...props
}) => (
  <h3
    className={`text-sm font-semibold text-[#0F172A] tracking-tight m-0 ${className}`}
    style={style}
    {...props}
  >
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = '',
  style = {},
  ...props
}) => (
  <p
    className={`text-xs text-[#64748B] m-0 leading-relaxed ${className}`}
    style={style}
    {...props}
  >
    {children}
  </p>
);

export const CardBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  style = {},
  ...props
}) => (
  <div
    className={`flex-1 flex flex-col gap-3 ${className}`}
    style={style}
    {...props}
  >
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  style = {},
  ...props
}) => (
  <div
    className={`mt-4 pt-3.5 border-t border-[#F1F5F9] flex items-center justify-between gap-3 text-xs text-[#64748B] ${className}`}
    style={style}
    {...props}
  >
    {children}
  </div>
);
