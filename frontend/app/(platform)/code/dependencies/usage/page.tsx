'use client';

/**
 * Thing Code — Dependency Usage & References (/code/dependencies/usage)
 *
 * Code-level import occurrences, call-sites, and manifest traces.
 * Data Source: Real PostgreSQL queries via `GET /api/v1/code/dependencies/usage`
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';
import { useProject } from '@/contexts/ProjectContext';
import { DependencyUsageResponse, DependencyUsageRef } from '@/types/api/dependencies';
import { DependenciesHeader } from '@/components/code/dependencies/DependenciesHeader';
import { DependenciesMetricCard } from '@/components/code/dependencies/DependenciesMetricCard';
import {
  FileCode2,
  Search,
  Code2,
  Layers,
  FileText,
  CheckCircle2,
} from 'lucide-react';

export default function DependencyUsagePage() {
  const { currentProject } = useProject();
  const [data, setData] = useState<DependencyUsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.code.dependencies.usage({
        projectId: currentProject?.id,
        search: search.trim() ? search.trim() : undefined,
        limit: 100,
      });
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load dependency usage references.');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refs = data?.references || [];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', padding: '24px 32px' }}>
      <DependenciesHeader
        title="Dependency Usage & References"
        subtitle="Code-level import statements, require calls, and manifest references across all repository files."
        currentSubpage="usage"
        onRefresh={loadData}
        isLoading={loading}
        showInventoryTabs={true}
      />

      {error && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', padding: '14px', borderRadius: '8px', color: '#991B1B', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <DependenciesMetricCard
          title="Indexed References"
          value={data?.total_references || refs.length}
          subtext="Total code call-sites"
          icon={<FileCode2 size={24} />}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Unique File Citations"
          value={new Set(refs.map((r) => r.file_path)).size}
          subtext="Distinct files with imports"
          icon={<FileText size={24} />}
          iconBg="#F0FDF4"
          iconColor="#16A34A"
          loading={loading}
        />
        <DependenciesMetricCard
          title="Analysis Mode"
          value="AST + Static"
          subtext="Static import resolution"
          icon={<Code2 size={24} />}
          iconBg="#FAF5FF"
          iconColor="#8B5CF6"
          loading={loading}
        />
      </div>

      {/* Search Input */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '6px 12px', maxWidth: '380px' }}>
          <Search size={14} color="#94A3B8" />
          <input
            type="text"
            placeholder="Search package name or file path..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', color: '#0F172A', width: '100%' }}
          />
        </div>
      </div>

      {/* Table of Usage References */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 110px 3fr', gap: '12px', padding: '12px 16px', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
          <span>File Path</span>
          <span>Line</span>
          <span>Type</span>
          <span>Code Citation</span>
        </div>

        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', gap: '16px' }}>
              <div style={{ height: '16px', width: '180px', backgroundColor: '#F1F5F9', borderRadius: '4px' }} />
              <div style={{ height: '16px', flexGrow: 1, backgroundColor: '#F1F5F9', borderRadius: '4px' }} />
            </div>
          ))
        ) : refs.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748B' }}>
            <CheckCircle2 size={36} color="#10B981" style={{ marginBottom: '8px' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: 0 }}>No Usage References Found</h3>
          </div>
        ) : (
          refs.map((ref, idx) => (
            <div
              key={idx}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 80px 110px 3fr',
                gap: '12px',
                padding: '12px 16px',
                alignItems: 'center',
                borderBottom: idx < refs.length - 1 ? '1px solid #F1F5F9' : 'none',
                fontSize: '13px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <FileCode2 size={14} color="#2563EB" />
                <span style={{ fontFamily: 'monospace', color: '#0F172A', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ref.file_path}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '12px', color: '#64748B', fontFamily: 'monospace' }}>
                  :{ref.line_number}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#EFF6FF', color: '#2563EB', textTransform: 'uppercase' }}>
                  {ref.reference_type}
                </span>
              </div>

              <div>
                {ref.code_snippet ? (
                  <code style={{ fontSize: '11px', backgroundColor: '#F1F5F9', color: '#0F172A', padding: '3px 8px', borderRadius: '4px', fontFamily: 'monospace', display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ref.code_snippet}
                  </code>
                ) : (
                  <span style={{ color: '#94A3B8' }}>—</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
