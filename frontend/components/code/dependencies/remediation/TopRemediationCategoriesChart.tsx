'use client';

import React from 'react';
import { TopRemediationCategoryItem } from '@/types/api/dependencies';
import { ShieldAlert, Layers } from 'lucide-react';

interface TopRemediationCategoriesChartProps {
  categories: TopRemediationCategoryItem[];
  loading?: boolean;
}

export const TopRemediationCategoriesChart: React.FC<TopRemediationCategoriesChartProps> = ({
  categories,
  loading = false,
}) => {
  if (loading) {
    return (
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          height: '240px',
        }}
      >
        <div style={{ height: '18px', width: '180px', backgroundColor: '#F1F5F9', borderRadius: '4px', marginBottom: '16px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ height: '24px', backgroundColor: '#F8FAFC', borderRadius: '6px' }} />
          ))}
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...categories.map((c) => c.count), 1);

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '240px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
          Top Remediation Categories
        </h3>
        <span style={{ fontSize: '12px', color: '#64748B' }}>
          {categories.length} categories
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {categories.map((cat, index) => {
          const widthPct = Math.max(Math.round((cat.count / maxCount) * 100), 12);

          return (
            <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#334155', fontWeight: 500 }}>{cat.category}</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>{cat.count} items</span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: '#F1F5F9',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${widthPct}%`,
                    height: '100%',
                    backgroundColor: cat.color || '#F87171',
                    borderRadius: '4px',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ paddingTop: '10px', borderTop: '1px solid #F1F5F9', marginTop: '10px' }}>
        <span style={{ fontSize: '11px', color: '#94A3B8' }}>
          Classified deterministically via CWE / CVSS v3 vectors.
        </span>
      </div>
    </div>
  );
};
