import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  target: string;
  reason?: string;
  impact?: string;
  policyRule?: string;
  confirmLabel?: string;
  isDangerous?: boolean;
  loading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  target,
  reason,
  impact,
  policyRule,
  confirmLabel = 'Confirm Action',
  isDangerous = true,
  loading = false,
}) => {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(3px)',
        zIndex: 'var(--z-modal)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="animate-fade-in"
        style={{
          width: '480px',
          maxWidth: '100%',
          backgroundColor: 'var(--color-surface)',
          border: `1px solid ${isDangerous ? 'var(--color-danger-border)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-xl)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: 'var(--shadow-lg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: '15px', fontWeight: 'var(--weight-semibold)', color: isDangerous ? 'var(--color-danger-text)' : 'var(--color-text-primary)' }}>
          {title}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', background: 'var(--color-surface-elevated)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <div>
            <span style={{ color: 'var(--color-text-muted)' }}>Target: </span>
            <strong style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>{target}</strong>
          </div>
          {reason && (
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Reason: </span>
              <span style={{ color: 'var(--color-text-secondary)' }}>{reason}</span>
            </div>
          )}
          {impact && (
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Impact: </span>
              <span style={{ color: 'var(--color-warning-text)' }}>{impact}</span>
            </div>
          )}
          {policyRule && (
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Enforcing Policy: </span>
              <code style={{ color: 'var(--color-primary-text)' }}>{policyRule}</code>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '7px 14px',
              fontSize: '12px',
              borderRadius: 'var(--radius-md)',
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: 'var(--weight-semibold)',
              borderRadius: 'var(--radius-md)',
              background: isDangerous ? 'var(--color-danger)' : 'var(--color-primary)',
              color: '#ffffff',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Executing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
