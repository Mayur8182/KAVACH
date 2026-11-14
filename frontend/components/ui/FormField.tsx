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
 * Kavach Enterprise Accessible Form Field
 * Strictly conforms to:
 * - High-contrast text on white enterprise surface
 * - 36px/40px touch height standard
 * - Clear error and hint text associations
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
      <div className="flex flex-col gap-1.5 w-full">
        {/* Label strictly above input */}
        <div className="flex items-center justify-between">
          <label
            htmlFor={inputId}
            className={`text-xs font-semibold tracking-tight ${
              hasError ? 'text-[#DC2626]' : 'text-[#0F172A]'
            }`}
          >
            {label}
            {isOptional && (
              <span className="text-xs font-normal text-[#64748B] ml-1.5">
                (Optional)
              </span>
            )}
          </label>
        </div>

        {/* Input Wrapper */}
        <div className="relative flex items-center">
          {leftIcon && (
            <span
              className={`absolute left-3 text-[#64748B] pointer-events-none inline-flex items-center ${
                hasError ? 'text-[#DC2626]' : ''
              }`}
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
            aria-describedby={hasError ? errorId : hint ? hintId : undefined}
            className={`w-full min-h-[38px] py-2 px-3 text-sm text-[#0F172A] bg-white border rounded-md outline-none transition-colors duration-150 disabled:bg-[#F8FAFC] disabled:text-[#94A3B8] disabled:cursor-not-allowed ${
              leftIcon ? 'pl-9' : 'pl-3'
            } ${rightElement ? 'pr-9' : 'pr-3'} ${
              hasError
                ? 'border-[#EF4444] focus:border-[#DC2626] focus:ring-1 focus:ring-[#EF4444]'
                : isSuccess
                ? 'border-[#10B981] focus:border-[#059669] focus:ring-1 focus:ring-[#10B981]'
                : 'border-[#CBD5E1] hover:border-[#94A3B8] focus:border-[#09090B] focus:ring-1 focus:ring-[#09090B]'
            } ${className}`}
            style={style}
            {...props}
          />

          {rightElement && (
            <span className="absolute right-3 inline-flex items-center">
              {rightElement}
            </span>
          )}
        </div>

        {/* Inline Feedback */}
        {hasError && (
          <div
            id={errorId}
            className="flex items-center gap-1.5 text-xs text-[#DC2626] mt-0.5"
            role="alert"
          >
            <AlertCircle size={13} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isSuccess && (
          <div className="flex items-center gap-1.5 text-xs text-[#059669] mt-0.5">
            <CheckCircle2 size={13} className="shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {hint && !hasError && !isSuccess && (
          <p id={hintId} className="text-xs text-[#64748B] m-0">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';
