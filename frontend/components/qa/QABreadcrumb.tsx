'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export const QABreadcrumb: React.FC<{ items: BreadcrumbItem[] }> = ({ items }) => {
  return (
    <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B', marginBottom: '16px' }}>
      <Link href="/qa" style={{ color: '#64748B', textDecoration: 'none', fontWeight: 500 }} onMouseOver={(e) => (e.currentTarget.style.color = '#0F172A')} onMouseOut={(e) => (e.currentTarget.style.color = '#64748B')}>
        QA
      </Link>
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          <ChevronRight size={13} color="#94A3B8" />
          {item.href ? (
            <Link
              href={item.href}
              style={{ color: '#64748B', textDecoration: 'none', fontWeight: 500 }}
              onMouseOver={(e) => (e.currentTarget.style.color = '#0F172A')}
              onMouseOut={(e) => (e.currentTarget.style.color = '#64748B')}
            >
              {item.label}
            </Link>
          ) : (
            <span style={{ color: '#0F172A', fontWeight: 600 }}>{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};
