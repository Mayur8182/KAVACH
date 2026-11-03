'use client';

import React, { useState } from 'react';
import { Filter, X, Check, RotateCcw } from 'lucide-react';

interface ResponsiveFilterDrawerProps {
  children: React.ReactNode;
  activeFilterCount?: number;
  onClearAll?: () => void;
  title?: string;
  className?: string;
}

export const ResponsiveFilterDrawer: React.FC<ResponsiveFilterDrawerProps> = ({
  children,
  activeFilterCount = 0,
  onClearAll,
  title = 'Filters',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`kavach-filter-container ${className}`}>
      {/* 1. Desktop: Inline Filter Bar */}
      <div className="kavach-filter-desktop">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {children}
          {activeFilterCount > 0 && onClearAll && (
            <button
              type="button"
              onClick={onClearAll}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                fontSize: '12px',
                color: '#64748B',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <RotateCcw size={12} />
              Reset ({activeFilterCount})
            </button>
          )}
        </div>
      </div>

      {/* 2. Mobile: Filter Trigger Button */}
      <div className="kavach-filter-mobile">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '8px',
            border: activeFilterCount > 0 ? '1px solid #09090B' : '1px solid #CBD5E1',
            backgroundColor: activeFilterCount > 0 ? '#09090B' : '#FFFFFF',
            color: activeFilterCount > 0 ? '#FFFFFF' : '#0F172A',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            minHeight: '40px',
          }}
        >
          <Filter size={15} />
          <span>{title}</span>
          {activeFilterCount > 0 && (
            <span
              style={{
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                borderRadius: '999px',
                padding: '1px 7px',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Mobile Filter Drawer / Bottom Sheet */}
        {isOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              backgroundColor: 'rgba(9, 9, 11, 0.5)',
              backdropFilter: 'blur(3px)',
            }}
            onClick={() => setIsOpen(false)}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px',
                padding: '20px 18px',
                maxHeight: '85vh',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxShadow: '0 -10px 25px rgba(0, 0, 0, 0.15)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Bottom Sheet Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Filter size={18} color="#09090B" />
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#09090B' }}>{title}</span>
                  {activeFilterCount > 0 && (
                    <span
                      style={{
                        backgroundColor: '#EFF6FF',
                        color: '#2563EB',
                        border: '1px solid #BFDBFE',
                        borderRadius: '999px',
                        padding: '1px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      {activeFilterCount} active
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '6px',
                    cursor: 'pointer',
                    color: '#64748B',
                    borderRadius: '6px',
                  }}
                  aria-label="Close filters"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Filter Controls Stack */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '4px' }}>
                {children}
              </div>

              {/* Bottom Sheet Actions */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  paddingTop: '12px',
                  borderTop: '1px solid #E2E8F0',
                }}
              >
                {onClearAll && (
                  <button
                    type="button"
                    onClick={() => {
                      onClearAll();
                      setIsOpen(false);
                    }}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: '#475569',
                      cursor: 'pointer',
                      minHeight: '44px',
                    }}
                  >
                    Clear All
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  style={{
                    flex: 2,
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#09090B',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Check size={16} />
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .kavach-filter-desktop {
          display: block;
        }
        .kavach-filter-mobile {
          display: none;
        }
        @media (max-width: 767px) {
          .kavach-filter-desktop {
            display: none !important;
          }
          .kavach-filter-mobile {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ResponsiveFilterDrawer;
