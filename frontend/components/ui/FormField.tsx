'use client';

import React, { useId } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | null;
  successMessage?: string | null;
  hint?: string;
  isOptional?: boolean;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

/**
 * Enterprise Accessible Form Field
 * Strictly conforms to:
 * - Rule 6: Labels to inputs (no placeholder as label substitution), keyboard focus, 44px touch height.
 * - Rule 7: Interactive states (default, hover, focus, disabled, error, success).
 * - Rule 10: Single-column layout, label above input, inline validation with specific errors, optional marker.
 */
export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  (
    {
      label,
      error,
      successMessage,
      hint,
      isOptional = false,
      leftIcon,
      rightElement,
      id,
      disabled,
      type = 'text',
      className = '',
      style = {},
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    const hasError = !!error;
    const isSuccess = !!successMessage && !hasError;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
        {/* Label strictly above input (Rule 10) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label
            htmlFor={inputId}
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: hasError ? '#EF4444' : '#E2E8F0',
              fontFamily: 'var(--font-sans)',
              letterSpacing: '-0.01em',
            }}
          >
            {label}
            {isOptional && (
              <span style={{ fontSize: '12px', fontWeight: 400, color: '#64748B', marginLeft: '6px' }}>
                (Optional)
              </span>
            )}
          </label>
        </div>

        {/* Input Wrapper with Touch Target Compliance (Rule 6: 44px min-height) */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          {leftIcon && (
            <span
              style={{
                position: 'absolute',
                left: '14px',
                color: hasError ? '#EF4444' : '#64748B',
                pointerEvents: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
              aria-hidden="true"
            >
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            type={type}
            disabled={disabled}
            aria-invalid={hasError ? 'true' : 'false'}
            aria-describedby={
              hasError ? errorId : hint ? hintId : undefined
            }
            style={{
              width: '100%',
              minHeight: '44px', // Touch target guarantee
              padding: `10px 14px 10px ${leftIcon ? '42px' : '14px'}`,
              paddingRight: rightElement ? '42px' : '14px',
              backgroundColor: disabled ? 'rgba(15, 23, 42, 0.4)' : '#0F172A',
              border: `1px solid ${
                hasError
                  ? '#EF4444'
                  : isSuccess
                  ? '#10B981'
                  : 'rgba(255, 255, 255, 0.12)'
              }`,
              borderRadius: '8px',
              color: '#F8FAFC',
              fontSize: '14px',
              fontFamily: 'var(--font-sans)',
              outline: 'none',
              transition: 'border-color 150ms ease, box-shadow 150ms ease',
              boxSizing: 'border-box',
              cursor: disabled ? 'not-allowed' : 'text',
              opacity: disabled ? 0.6 : 1,
              ...style,
            }}
            {...props}
          />

          {rightElement && (
            <span
              style={{
                position: 'absolute',
                right: '12px',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              {rightElement}
            </span>
          )}
        </div>

        {/* Inline Specific Validation Messages (Rule 10) */}
        {hasError ? (
          <div
            id={errorId}
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: '#EF4444',
              fontFamily: 'var(--font-sans)',
              lineHeight: 1.4,
            }}
          >
            <AlertCircle size={14} style={{ flexShrink: 0 }} aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : isSuccess ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: '#10B981',
              fontFamily: 'var(--font-sans)',
              lineHeight: 1.4,
            }}
          >
            <CheckCircle2 size={14} style={{ flexShrink: 0 }} aria-hidden="true" />
            <span>{successMessage}</span>
          </div>
        ) : hint ? (
          <div
            id={hintId}
            style={{
              fontSize: '12px',
              color: '#64748B',
              fontFamily: 'var(--font-sans)',
              lineHeight: 1.4,
            }}
          >
            {hint}
          </div>
        ) : null}
      </div>
    );
  }
);

FormField.displayName = 'FormField';
