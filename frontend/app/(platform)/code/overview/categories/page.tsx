'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useOverview } from '../OverviewContext';
import { api } from '@/lib/api/client';
import { ShieldAlert, RefreshCw, ArrowUpRight } from 'lucide-react';

interface CategoryItem {
  category: string;
  count: number;
  percentage: number;
}

interface CategoriesData {
  total_findings: number;
  categories: CategoryItem[];
}

const CATEGORY_COLORS = [
  '#2563EB', // Blue
  '#DC2626', // Red
  '#EA580C', // Orange
  '#CA8A04', // Amber
  '#16A34A', // Green
  '#0D9488', // Teal
  '#7C3AED', // Violet
  '#9333EA', // Purple
  '#64748B', // Slate
];

export default function CategoriesPage() {
  const router = useRouter();
  const { repository, branch, dateRange, refreshKey } = useOverview();
  const [data, setData] = useState<CategoriesData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.sast.categories({
        repository: repository !== 'all' ? repository : undefined,
        branch: branch !== 'all' ? branch : undefined,
        date_range: dateRange,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Unable to load categories.');
    } finally {
      setLoading(false);
    }
  }, [repository, branch, dateRange]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories, refreshKey]);

  if (loading && !data) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: '20px' }}>
          <div style={{ height: '360px', backgroundColor: '#E2E8F0', borderRadius: '8px' }} />
          <div style={{ height: '360px', backgroundColor: '#E2E8F0', borderRadius: '8px' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', padding: '24px', backgroundColor: '#FEF2F2', borderRadius: '8px', border: '1px solid #FECACA' }}>
          <ShieldAlert size={36} color="#DC2626" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600, color: '#991B1B' }}>Unable to load Categories</h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#B91C1C' }}>{error}</p>
          <button
            onClick={() => loadCategories()}
            style={{
              padding: '8px 18px',
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  const totalFindings = data?.total_findings ?? 0;
  const categories = data?.categories ?? [];

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>
          Findings by Category
        </h1>
        <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
          View distribution of findings across different vulnerability categories. Click a category to view matching findings.
        </p>
      </div>

      {categories.length === 0 ? (
        <div style={panelContainerStyle}>
          <div style={{ padding: '48px 24px', textAlign: 'center', color: '#94A3B8' }}>
            <p style={{ margin: 0, fontSize: '14px' }}>No categorized vulnerability findings found for this filter.</p>
          </div>
        </div>
      ) : (
        /* Top Section: Category Donut + Horizontal Bars */
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 4fr) minmax(0, 6fr)', gap: '20px' }}>
          {/* Category Distribution Donut */}
          <div style={panelContainerStyle}>
            <h2 style={{ ...panelTitleStyle, marginBottom: '16px' }}>Category Distribution</h2>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', minHeight: '260px' }}>
              <CategoryDonut
                total={totalFindings}
                slices={categories.map((c, i) => ({
                  label: c.category,
                  count: c.count,
                  color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                }))}
              />

              {/* Legend with Clickable Filters */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                {categories.map((c, i) => {
                  const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
                  return (
                    <Link
                      key={c.category}
                      href={`/code/overview/recent-findings?category=${encodeURIComponent(c.category)}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        minWidth: '180px',
                        padding: '4px 6px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        textDecoration: 'none',
                        color: 'inherit',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
                        <span style={{ color: '#334155', fontWeight: 500 }}>{c.category}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 600, color: '#0F172A' }}>{c.count}</span>
                        <span style={{ color: '#94A3B8', fontSize: '11px' }}>({c.percentage}%)</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Findings by Category Horizontal Bar Chart */}
          <div style={panelContainerStyle}>
            <h2 style={{ ...panelTitleStyle, marginBottom: '20px' }}>Findings by Category</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {categories.map((c, i) => {
                const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
                const maxCount = categories[0]?.count || 1;
                const barWidth = Math.max(8, Math.round((c.count / maxCount) * 100));

                return (
                  <div
                    key={c.category}
                    onClick={() => router.push(`/code/overview/recent-findings?category=${encodeURIComponent(c.category)}`)}
                    style={{
                      cursor: 'pointer',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
                      <span style={{ fontWeight: 600, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {c.category}
                        <ArrowUpRight size={12} color="#94A3B8" />
                      </span>
                      <span style={{ fontWeight: 700, color: '#0F172A' }}>{c.count}</span>
                    </div>

                    <div style={{ width: '100%', height: '14px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${barWidth}%`,
                          height: '100%',
                          backgroundColor: color,
                          borderRadius: '4px',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Donut Component
function CategoryDonut({ total, slices }: { total: number; slices: Array<{ label: string; count: number; color: string }> }) {
  const size = 160;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativePercent = 0;

  return (
    <div style={{ position: 'relative', width: `${size}px`, height: `${size}px` }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {total === 0 ? (
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E2E8F0" strokeWidth={strokeWidth} />
        ) : (
          slices.map((slice, i) => {
            if (slice.count === 0) return null;
            const slicePercent = slice.count / total;
            const strokeDasharray = `${slicePercent * circumference} ${circumference}`;
            const strokeDashoffset = -cumulativePercent * circumference;
            cumulativePercent += slicePercent;

            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            );
          })
        )}
      </svg>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <span style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>{total}</span>
        <span style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Total</span>
      </div>
    </div>
  );
}

const panelContainerStyle: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderRadius: '8px',
  padding: '20px 24px',
  border: '1px solid #E2E8F0',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
};

const panelTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '15px',
  fontWeight: 600,
  color: '#0F172A',
};
