'use client';

import React, { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
  priority?: 'high' | 'medium' | 'low'; // High = shown in mobile card header/summary, low = hidden in mobile collapsed card
}

interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  emptyState?: React.ReactNode;
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
  className?: string;
  mobileTitleExtractor?: (item: T) => React.ReactNode;
  mobileSubtitleExtractor?: (item: T) => React.ReactNode;
  mobileBadgeExtractor?: (item: T) => React.ReactNode;
}

export function ResponsiveTable<T>({
  columns,
  data,
  keyExtractor,
  emptyState,
  onRowClick,
  isLoading = false,
  className = '',
  mobileTitleExtractor,
  mobileSubtitleExtractor,
  mobileBadgeExtractor,
}: ResponsiveTableProps<T>) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleExpand = (rowKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRows((prev) => ({ ...prev, [rowKey]: !prev[rowKey] }));
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px' }}>
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            style={{
              height: '48px',
              backgroundColor: '#F1F5F9',
              borderRadius: '8px',
              animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return emptyState ? (
      <>{emptyState}</>
    ) : (
      <div
        style={{
          padding: '36px 16px',
          textAlign: 'center',
          color: '#64748B',
          fontSize: '13px',
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #E2E8F0',
        }}
      >
        No records found.
      </div>
    );
  }

  return (
    <div className={`kavach-responsive-table-wrapper ${className}`}>
      {/* 1. Desktop View (Tablet & Desktop: >= 768px) */}
      <div className="kavach-table-desktop">
        <div
          style={{
            width: '100%',
            overflowX: 'auto',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            backgroundColor: '#FFFFFF',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    style={{
                      padding: '10px 14px',
                      fontWeight: 600,
                      color: '#475569',
                      fontSize: '12px',
                      letterSpacing: '0.01em',
                      width: col.width,
                      textAlign: col.align || 'left',
                    }}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => {
                const rowKey = keyExtractor(item, index);
                return (
                  <tr
                    key={rowKey}
                    onClick={() => onRowClick && onRowClick(item)}
                    style={{
                      borderBottom: index < data.length - 1 ? '1px solid #F1F5F9' : 'none',
                      cursor: onRowClick ? 'pointer' : 'default',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (onRowClick) e.currentTarget.style.backgroundColor = '#F8FAFC';
                    }}
                    onMouseLeave={(e) => {
                      if (onRowClick) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        style={{
                          padding: '12px 14px',
                          color: '#0F172A',
                          textAlign: col.align || 'left',
                          verticalAlign: 'middle',
                        }}
                      >
                        {col.render ? col.render(item, index) : (item as any)[col.key]}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Mobile Card Transformation View (< 768px) */}
      <div className="kavach-table-mobile">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {data.map((item, index) => {
            const rowKey = keyExtractor(item, index);
            const isExpanded = expandedRows[rowKey] || false;
            const title = mobileTitleExtractor
              ? mobileTitleExtractor(item)
              : columns[0]?.render
              ? columns[0].render(item, index)
              : (item as any)[columns[0]?.key];
            const subtitle = mobileSubtitleExtractor ? mobileSubtitleExtractor(item) : null;
            const badge = mobileBadgeExtractor ? mobileBadgeExtractor(item) : null;

            return (
              <div
                key={rowKey}
                onClick={() => onRowClick && onRowClick(item)}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  cursor: onRowClick ? 'pointer' : 'default',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                {/* Mobile Header: Title + Badge */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#0F172A', wordBreak: 'break-word' }}>
                      {title}
                    </div>
                    {subtitle && (
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', wordBreak: 'break-word' }}>
                        {subtitle}
                      </div>
                    )}
                  </div>
                  {badge && <div style={{ flexShrink: 0 }}>{badge}</div>}
                </div>

                {/* Collapsible Details Button */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '8px',
                    borderTop: '1px solid #F1F5F9',
                    fontSize: '12px',
                    color: '#64748B',
                  }}
                >
                  <button
                    type="button"
                    onClick={(e) => toggleExpand(rowKey, e)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563EB',
                      fontWeight: 500,
                      cursor: 'pointer',
                      padding: '4px 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                    }}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronDown size={14} /> Less details
                      </>
                    ) : (
                      <>
                        <ChevronRight size={14} /> Full details
                      </>
                    )}
                  </button>
                  {onRowClick && (
                    <span style={{ fontSize: '11px', color: '#94A3B8', display: 'flex', alignItems: 'center' }}>
                      Tap to open <ChevronRight size={12} />
                    </span>
                  )}
                </div>

                {/* Expanded Fields List */}
                {isExpanded && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      paddingTop: '8px',
                      borderTop: '1px dashed #E2E8F0',
                      fontSize: '12px',
                    }}
                  >
                    {columns.slice(1).map((col) => (
                      <div
                        key={col.key}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}
                      >
                        <span style={{ color: '#64748B', fontWeight: 500 }}>{col.header}</span>
                        <span style={{ color: '#0F172A', textAlign: 'right' }}>
                          {col.render ? col.render(item, index) : (item as any)[col.key]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .kavach-table-desktop {
          display: block;
        }
        .kavach-table-mobile {
          display: none;
        }
        @media (max-width: 767px) {
          .kavach-table-desktop {
            display: none !important;
          }
          .kavach-table-mobile {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}

export default ResponsiveTable;
