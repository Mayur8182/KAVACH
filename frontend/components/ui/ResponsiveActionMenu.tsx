'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, MoreHorizontal } from 'lucide-react';

export interface ActionItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'destructive';
  disabled?: boolean;
}

interface ResponsiveActionMenuProps {
  primaryAction?: ActionItem;
  secondaryActions: ActionItem[];
  className?: string;
}

export const ResponsiveActionMenu: React.FC<ResponsiveActionMenuProps> = ({
  primaryAction,
  secondaryActions,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getButtonStyle = (variant?: string, disabled?: boolean) => {
    const base: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '7px 12px',
      borderRadius: '7px',
      fontSize: '13px',
      fontWeight: 500,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'all 0.15s ease',
      height: '34px',
      boxSizing: 'border-box',
    };

    if (variant === 'primary') {
      return {
        ...base,
        backgroundColor: '#09090B',
        color: '#FFFFFF',
        border: 'none',
        fontWeight: 600,
      };
    }
    if (variant === 'destructive') {
      return {
        ...base,
        backgroundColor: '#FEF2F2',
        color: '#DC2626',
        border: '1px solid #FECACA',
      };
    }
    return {
      ...base,
      backgroundColor: '#FFFFFF',
      color: '#0F172A',
      border: '1px solid #E2E8F0',
    };
  };

  return (
    <div className={`kavach-action-menu-root ${className}`} ref={menuRef} style={{ position: 'relative' }}>
      {/* 1. Desktop: Full Toolbar Row */}
      <div className="kavach-actions-desktop">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          {secondaryActions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              style={getButtonStyle(action.variant, action.disabled)}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled}
              style={getButtonStyle('primary', primaryAction.disabled)}
            >
              {primaryAction.icon}
              <span>{primaryAction.label}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Mobile: Primary Action + Kebab Dropdown Menu */}
      <div className="kavach-actions-mobile">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled}
              style={getButtonStyle('primary', primaryAction.disabled)}
            >
              {primaryAction.icon}
              <span>{primaryAction.label}</span>
            </button>
          )}

          {secondaryActions.length > 0 && (
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="More actions"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 8px',
                borderRadius: '7px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                color: '#64748B',
                cursor: 'pointer',
                height: '34px',
                minWidth: '34px',
              }}
            >
              <MoreHorizontal size={18} />
            </button>
          )}
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: '6px',
              zIndex: 50,
              minWidth: '180px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              padding: '4px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            {secondaryActions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => {
                  action.onClick();
                  setIsOpen(false);
                }}
                disabled={action.disabled}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'none',
                  fontSize: '13px',
                  fontWeight: 500,
                  textAlign: 'left',
                  cursor: action.disabled ? 'not-allowed' : 'pointer',
                  color: action.variant === 'destructive' ? '#DC2626' : '#0F172A',
                  opacity: action.disabled ? 0.5 : 1,
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .kavach-actions-desktop {
          display: block;
        }
        .kavach-actions-mobile {
          display: none;
        }
        @media (max-width: 767px) {
          .kavach-actions-desktop {
            display: none !important;
          }
          .kavach-actions-mobile {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ResponsiveActionMenu;
