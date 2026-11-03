import React from 'react';
import { Breadcrumbs } from '../navigation/Breadcrumbs';
import type { BreadcrumbItem } from '@/types/navigation';

interface ProductPageProps {
  breadcrumbs: BreadcrumbItem[];
  title: string;
  description?: string;
  badge?: React.ReactNode;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}

export const ProductPage: React.FC<ProductPageProps> = ({
  breadcrumbs,
  title,
  description,
  badge,
  toolbar,
  children,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, padding: '24px', gap: '20px' }}>
      {/* 1. Where am I? (Breadcrumbs) */}
      <Breadcrumbs items={breadcrumbs} />

      {/* 2. What am I looking at? (Page Header) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 className="typography-title-page">{title}</h1>
            {badge}
          </div>
          {description && (
            <p className="typography-body" style={{ marginTop: '4px', maxWidth: '800px' }}>
              {description}
            </p>
          )}
        </div>

        {/* 5. What action can I take? (Toolbar Actions) */}
        {toolbar && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{toolbar}</div>}
      </div>

      {/* 3 & 4. Current State & Supporting Evidence (Page Content) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flexGrow: 1 }}>
        {children}
      </div>
    </div>
  );
};
