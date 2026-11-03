'use client';

/**
 * Enterprise Dangerous Action Confirmation Modal
 * Strictly complies with:
 * - Rule 9: Destructive action visually distinct, action-oriented labels, standard placement.
 * - Rule 6: Touch target minimum 44px, full keyboard accessibility (Escape, focus-visible).
 * - Rule 11: Clear explanations, non-generic descriptions.
 */

import React, { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  impactWarning?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  isDestructive = true,
  isLoading = false,
  impactWarning = 'This action cannot be undone.',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: '#0F172A',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: isDestructive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isDestructive ? '#EF4444' : '#F59E0B',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <h3
              id="confirm-modal-title"
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: '#F8FAFC',
                margin: 0,
                fontFamily: 'var(--font-sans)',
              }}
            >
              {title}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close dialog"
            style={{
              color: '#64748B',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px' }}>
          <p
            className="prose-readable"
            style={{
              fontSize: '14px',
              color: '#94A3B8',
              lineHeight: 1.5,
              margin: '0 0 16px',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {description}
          </p>

          {impactWarning && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: isDestructive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                border: `1px solid ${isDestructive ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                color: isDestructive ? '#FCA5A5' : '#FCD34D',
                lineHeight: 1.4,
              }}
            >
              <strong>Notice:</strong> {impactWarning}
            </div>
          )}
        </div>

        {/* Action Buttons (Standard Placement: Cancel left, Primary right) */}
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>

          <Button
            type="button"
            variant={isDestructive ? 'destructive' : 'primary'}
            size="md"
            onClick={onConfirm}
            isLoading={isLoading}
            loadingText="Processing..."
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
