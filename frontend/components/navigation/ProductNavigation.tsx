import React from 'react';
import type { ProductNavTab } from '@/types/navigation';

interface ProductNavigationProps {
  productTitle: string;
  productSubtitle?: string;
  tabs: ProductNavTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  actions?: React.ReactNode;
}

export const ProductNavigation: React.FC<ProductNavigationProps> = ({
  productTitle,
  productSubtitle,
  tabs,
  activeTab,
  onTabChange,
  actions,
}) => {
  return (
    <div
      style={{
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        padding: '0 24px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Product Title Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 0 12px 0',
        }}
      >
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 'var(--weight-bold)', color: 'var(--color-text-primary)' }}>
            {productTitle}
          </h1>
          {productSubtitle && (
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              {productSubtitle}
            </p>
          )}
        </div>

        {actions && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{actions}</div>}
      </div>

      {/* Product Secondary Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '20px',
          overflowX: 'auto',
          marginTop: '4px',
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                padding: '8px 2px 10px 2px',
                fontSize: '12px',
                fontWeight: isActive ? 'var(--weight-semibold)' : 'var(--weight-normal)',
                color: isActive ? 'var(--color-primary-text)' : 'var(--color-text-secondary)',
                borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                background: 'transparent',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                transition: 'all var(--transition-fast)',
              }}
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  style={{
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)',
                    padding: '1px 5px',
                    borderRadius: 'var(--radius-pill)',
                    background: isActive ? 'var(--color-primary-subtle)' : 'rgba(255, 255, 255, 0.08)',
                    color: isActive ? 'var(--color-primary-text)' : 'var(--color-text-muted)',
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
