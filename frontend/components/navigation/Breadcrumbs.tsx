import React from 'react';
import Link from 'next/link';
import type { BreadcrumbItem } from '@/types/navigation';

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumbs" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            {index > 0 && <span style={{ color: 'var(--color-text-muted)' }}>/</span>}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                
                style={{
                  color: 'var(--color-text-muted)',
                  transition: 'color var(--transition-fast)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
              >
                {item.label}
              </Link>
            ) : (
              <span
                style={{
                  color: isLast ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  fontWeight: isLast ? 'var(--weight-medium)' : 'var(--weight-normal)',
                }}
              >
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

