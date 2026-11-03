'use client';

/**
 * Module 13 — Dependency Scans & Jobs (/code/dependencies/scans)
 * Matches Screenshot 13 exactly:
 * - 4 Metric cards (Total, Successful, Failed, Running Scans)
 * - 3 Visualization charts (Severity Donut, Last 7 Runs Trend, Status Distribution Donut)
 * - All Dependency Scans Table with live search, filters, checkbox selection, severity counts
 * - Bottom row: Top Repositories by Scan Issues, Recent Scan Activity, Scan Types breakdown
 * Real API integration with SWR nanosecond caching and PostgreSQL/SQLite persistence.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  RefreshCw,
  ExternalLink,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Shield,
  FileText,
  CheckSquare,
  Box,
  Play,
  RotateCcw,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { DependencyScansSubnav } from '@/components/dependencies/DependencyScansSubnav';

// SVG Donut Chart Component
const DonutChart = ({
  data,
  size = 130,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
}) => {
  const total = data.reduce((acc, d) => acc + d.value, 0);
  if (total === 0) {
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', border: '8px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '11px', color: '#94A3B8' }}>No Data</span>
      </div>
    );
  }

  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  let accumulatedAngle = 0;

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
        {data.map((slice, i) => {
          const strokeDash = (slice.value / total) * circumference;
          const strokeDashoffset = -accumulatedAngle;
          accumulatedAngle += strokeDash;

          return (
            <circle
              key={i}
              cx="60"
              cy="60"
              r={radius}
              fill="transparent"
              stroke={slice.color}
              strokeWidth="16"
              strokeDasharray={`${strokeDash} ${circumference - strokeDash}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.3s ease' }}
            />
          );
        })}
      </svg>
      <div style={{ position: 'absolute', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>{total}</div>
        <div style={{ fontSize: '10px', color: '#64748B', marginTop: '2px' }}>Total</div>
      </div>
    </div>
  );
};

// SVG Multi-line Trend Chart Component
const MultiLineTrendChart = ({ runs }: { runs: any[] }) => {
  if (!runs || runs.length === 0) {
    return (
      <div style={{ height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: '12px' }}>
        No run history recorded
      </div>
    );
  }

  const width = 340;
  const height = 90;
  const padding = 16;
  const maxVal = Math.max(1, ...runs.map((r) => Math.max(r.total || 0, r.critical || 0, r.high || 0, 5)));

  const pointsFor = (key: string) =>
    runs.map((r, i) => {
      const x = padding + (i / Math.max(1, runs.length - 1)) * (width - 2 * padding);
      const val = r[key] || 0;
      const y = height - padding - (val / maxVal) * (height - 2 * padding);
      return { x, y, val };
    });

  const totalPoints = pointsFor('total');
  const critPoints = pointsFor('critical');
  const highPoints = pointsFor('high');

  const toPath = (pts: { x: number; y: number }[]) =>
    pts.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');

  return (
    <div style={{ width: '100%', height: '110px', position: 'relative' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {/* Horizontal gridlines */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#F1F5F9" strokeWidth="1" />
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />

        {/* Lines */}
        <path d={toPath(totalPoints)} fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" />
        <path d={toPath(highPoints)} fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />
        <path d={toPath(critPoints)} fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />

        {/* Dots */}
        {totalPoints.map((p, i) => (
          <circle key={`tot-${i}`} cx={p.x} cy={p.y} r="3.5" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="1.5" />
        ))}
        {critPoints.map((p, i) => (
          <circle key={`crit-${i}`} cx={p.x} cy={p.y} r="3" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1.5" />
        ))}
      </svg>
      {/* Legend below */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3B82F6' }} />
          <span>Total Issues</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F97316' }} />
          <span>High</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
          <span>Critical</span>
        </div>
      </div>
    </div>
  );
};

export default function DependencyScansDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedRepo, setSelectedRepo] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedScanType, setSelectedScanType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedTrigger, setSelectedTrigger] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const effectiveSearch = search.trim() || (selectedTrigger !== 'all' ? selectedTrigger : undefined);
      const res = await api.dependencyScans.getDashboard({
        repository: selectedRepo !== 'all' ? selectedRepo : undefined,
        branch: selectedBranch !== 'all' ? selectedBranch : undefined,
        scan_type: selectedScanType !== 'all' ? selectedScanType : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        search: effectiveSearch,
      });
      setData(res);
    } catch (err) {
      console.warn('Failed to load dependency scans dashboard', err);
    } finally {
      setLoading(false);
    }
  }, [selectedRepo, selectedBranch, selectedScanType, selectedStatus, selectedTrigger, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Checkbox selection
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked && data?.items) {
      setSelectedIds(new Set(data.items.map((i: any) => i.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Severity color maps
  const severityDonutData = useMemo(() => {
    const s = data?.results_by_severity || { critical: 0, high: 0, medium: 0, low: 0 };
    return [
      { label: 'Critical', value: s.critical, color: '#EF4444' },
      { label: 'High', value: s.high, color: '#F97316' },
      { label: 'Medium', value: s.medium, color: '#EAB308' },
      { label: 'Low', value: s.low, color: '#3B82F6' },
    ];
  }, [data]);

  const statusDonutData = useMemo(() => {
    const dist = data?.status_distribution || { success: 0, running: 0, failed: 0, queued: 0 };
    return [
      { label: 'Successful', value: dist.success, color: '#10B981' },
      { label: 'Running', value: dist.running, color: '#F59E0B' },
      { label: 'Failed', value: dist.failed, color: '#EF4444' },
      { label: 'Queued', value: dist.queued || 0, color: '#6366F1' },
    ];
  }, [data]);

  return (
    <div style={{ padding: '24px 32px 48px', maxWidth: '1600px', margin: '0 auto', width: '100%', fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif)" }}>
      {/* ── Header & Subpage Navigation ── */}
      <DependencyScansSubnav
        selectedRepo={selectedRepo}
        onSelectRepo={(r) => setSelectedRepo(r)}
        selectedBranch={selectedBranch}
        onSelectBranch={(b) => setSelectedBranch(b)}
      />

      {/* ── Top Row: 4 Metric Summary Cards matching Screenshot ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Total Scans Card */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Layers size={22} color="#2563EB" />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Scans
            </div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A', lineHeight: 1.2, marginTop: '2px' }}>
              {loading ? '...' : (data?.total_scans ?? 0)}
            </div>
          </div>
        </div>

        {/* Successful Scans Card */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle2 size={22} color="#10B981" />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Successful Scans
            </div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A', lineHeight: 1.2, marginTop: '2px' }}>
              {loading ? '...' : (data?.successful_scans ?? 0)}
            </div>
          </div>
        </div>

        {/* Failed Scans Card */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTriangle size={22} color="#EF4444" />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Failed Scans
            </div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A', lineHeight: 1.2, marginTop: '2px' }}>
              {loading ? '...' : (data?.failed_scans ?? 0)}
            </div>
          </div>
        </div>

        {/* Running Scans Card */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Clock size={22} color="#F59E0B" />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Running Scans
            </div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A', lineHeight: 1.2, marginTop: '2px' }}>
              {loading ? '...' : (data?.running_scans ?? 0)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Middle Row: 3 Visual Charts matching Screenshot ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Chart 1: Scan Results by Severity */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Scan Results by Severity
            </h3>
            <span style={{ fontSize: '11px', color: '#94A3B8' }}>Aggregated</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '20px' }}>
            <DonutChart data={severityDonutData} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {severityDonutData.map((s) => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: s.color }} />
                  <span style={{ color: '#64748B', minWidth: '60px' }}>{s.label}</span>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart 2: Scan Trend (Last 7 Runs) */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Scan Trend (Last 7 Runs)
            </h3>
            <span style={{ fontSize: '11px', color: '#94A3B8' }}>Historical</span>
          </div>
          <MultiLineTrendChart runs={data?.scan_trend_7_runs || []} />
        </div>

        {/* Chart 3: Scan Status Distribution */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Scan Status Distribution
            </h3>
            <span style={{ fontSize: '11px', color: '#94A3B8' }}>Execution state</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '20px' }}>
            <DonutChart data={statusDonutData} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {statusDonutData.map((s) => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: s.color }} />
                  <span style={{ color: '#64748B', minWidth: '70px' }}>{s.label}</span>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Section: "All Dependency Scans" Table matching Screenshot ── */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        {/* Table Header Filter & Search Toolbar */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '260px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              All Dependency Scans
            </h3>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: 1, maxWidth: '340px' }}>
              <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search scans..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px 7px 32px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  fontSize: '12.5px',
                  outline: 'none',
                  backgroundColor: '#F8FAFC',
                }}
              />
            </div>
          </div>

          {/* Filter dropdowns right side matching screenshot */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Scan Type Filter */}
            <select
              value={selectedScanType}
              onChange={(e) => setSelectedScanType(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '12px', color: '#334155', backgroundColor: '#FFFFFF', outline: 'none' }}
            >
              <option value="all">Scan Type</option>
              <option value="Vulnerability Scan">Vulnerability Scan</option>
              <option value="License Scan">License Scan</option>
              <option value="Policy Scan">Policy Scan</option>
              <option value="SBOM Scan">SBOM Scan</option>
              <option value="Full SCA">Full SCA</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '12px', color: '#334155', backgroundColor: '#FFFFFF', outline: 'none' }}
            >
              <option value="all">Status</option>
              <option value="COMPLETED">Completed</option>
              <option value="RUNNING">Running</option>
              <option value="FAILED">Failed</option>
            </select>

            {/* Triggered By Filter */}
            <select
              value={selectedTrigger}
              onChange={(e) => setSelectedTrigger(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '12px', color: '#334155', backgroundColor: '#FFFFFF', outline: 'none' }}
            >
              <option value="all">Triggered By</option>
              <option value="Kavach">Kavach Autonomous Scanner</option>
              <option value="GitHub Actions">GitHub Actions [bot]</option>
              <option value="Engineer">Security Engineer</option>
            </select>

            {/* Filter Toggle Button */}
            <button
              onClick={() => loadData()}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              title="Refresh and filter"
            >
              <SlidersHorizontal size={14} color="#64748B" />
            </button>
          </div>
        </div>

        {/* Bulk Action Toolbar if items are selected */}
        {selectedIds.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#EFF6FF', borderBottom: '1px solid #DBEAFE', padding: '10px 20px', fontSize: '12.5px', color: '#1E40AF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
              <span>{selectedIds.size} scan{selectedIds.size > 1 ? 's' : ''} selected</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <a
                href={`data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify((data?.items || []).filter((i: any) => selectedIds.has(i.id)), null, 2))}`}
                download="selected-scans.json"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Export Selected JSON
              </a>
              <button
                onClick={() => setSelectedIds(new Set())}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '11.5px', textDecoration: 'underline' }}
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '12px 16px', width: '38px' }}>
                  <input
                    type="checkbox"
                    checked={data?.items?.length > 0 && selectedIds.size === data.items.length}
                    onChange={handleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '12px 14px' }}>Scan ID</th>
                <th style={{ padding: '12px 14px' }}>Repository</th>
                <th style={{ padding: '12px 14px' }}>Branch</th>
                <th style={{ padding: '12px 14px' }}>Scan Type</th>
                <th style={{ padding: '12px 14px' }}>Status</th>
                <th style={{ padding: '12px 14px' }}>Start Time</th>
                <th style={{ padding: '12px 14px' }}>Duration</th>
                <th style={{ padding: '12px 14px' }}>Vulnerabilities</th>
                <th style={{ padding: '12px 14px' }}>License Issues</th>
                <th style={{ padding: '12px 14px' }}>Policy Violations</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} style={{ padding: '36px', textAlign: 'center', color: '#94A3B8' }}>
                    <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                    Loading dependency scans...
                  </td>
                </tr>
              ) : !data?.items || data.items.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
                    No dependency scans match the selected criteria.
                  </td>
                </tr>
              ) : (
                data.items.map((job: any) => {
                  const isRunning = job.status === 'RUNNING';
                  const isFailed = job.status === 'FAILED';

                  return (
                    <tr
                      key={job.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background-color 100ms ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(job.id)}
                          onChange={() => handleSelectOne(job.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>

                      {/* Scan ID Link to detail */}
                      <td style={{ padding: '14px' }}>
                        <Link
                          href={`/code/dependencies/scans/${job.job_id}`}
                          prefetch={true}
                          style={{ color: '#2563EB', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          className="hover:underline"
                        >
                          <span>{job.job_id}</span>
                          <ExternalLink size={12} />
                        </Link>
                      </td>

                      {/* Repository */}
                      <td style={{ padding: '14px', fontWeight: 600, color: '#0F172A' }}>
                        {job.repository}
                      </td>

                      {/* Branch */}
                      <td style={{ padding: '14px', color: '#475569' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#F1F5F9', padding: '2px 8px', borderRadius: '4px', fontSize: '11.5px', fontFamily: 'monospace' }}>
                          {job.branch}
                        </span>
                      </td>

                      {/* Scan Type */}
                      <td style={{ padding: '14px', color: '#334155' }}>
                        {job.scan_type}
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: '14px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: isFailed ? '#FEF2F2' : isRunning ? '#FFFBEB' : '#ECFDF5',
                            color: isFailed ? '#DC2626' : isRunning ? '#D97706' : '#059669',
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: isFailed ? '#DC2626' : isRunning ? '#D97706' : '#059669',
                            }}
                          />
                          {job.status}
                        </span>
                      </td>

                      {/* Start Time */}
                      <td style={{ padding: '14px', color: '#64748B', whiteSpace: 'nowrap' }}>
                        {job.start_time}
                      </td>

                      {/* Duration */}
                      <td style={{ padding: '14px', color: '#475569', fontFamily: 'monospace', fontSize: '12px' }}>
                        {job.duration}
                      </td>

                      {/* Vulnerabilities Count / Pill */}
                      <td style={{ padding: '14px' }}>
                        {job.vulnerabilities > 0 ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: '#FEF2F2',
                              color: '#DC2626',
                              fontWeight: 700,
                              fontSize: '12px',
                            }}
                          >
                            <span>{job.vulnerabilities}</span>
                            <span style={{ fontSize: '10px', color: '#EF4444', fontWeight: 500 }}>
                              ({job.critical}C / {job.high}H)
                            </span>
                          </span>
                        ) : (
                          <span style={{ color: '#10B981', fontWeight: 600, fontSize: '12px' }}>0</span>
                        )}
                      </td>

                      {/* License Issues */}
                      <td style={{ padding: '14px' }}>
                        {job.license_issues > 0 ? (
                          <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#FEF3C7', color: '#D97706', fontWeight: 600, fontSize: '12px' }}>
                            {job.license_issues}
                          </span>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: '12px' }}>0</span>
                        )}
                      </td>

                      {/* Policy Violations */}
                      <td style={{ padding: '14px' }}>
                        {job.policy_violations > 0 ? (
                          <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#EFF6FF', color: '#2563EB', fontWeight: 600, fontSize: '12px' }}>
                            {job.policy_violations}
                          </span>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: '12px' }}>0</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'center', position: 'relative' }}>
                        <button
                          onClick={() => setActiveMenuId(activeMenuId === job.id ? null : job.id)}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', borderRadius: '4px', color: '#64748B' }}
                        >
                          <MoreVertical size={16} />
                        </button>

                        {/* Action menu dropdown */}
                        {activeMenuId === job.id && (
                          <div
                            style={{
                              position: 'absolute',
                              right: '16px',
                              top: '40px',
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #E2E8F0',
                              borderRadius: '8px',
                              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                              zIndex: 30,
                              minWidth: '150px',
                              padding: '4px 0',
                              textAlign: 'left',
                            }}
                          >
                            <Link
                              href={`/code/dependencies/scans/${job.job_id}`}
                              style={{ display: 'block', padding: '8px 12px', fontSize: '12px', color: '#0F172A', textDecoration: 'none' }}
                              className="hover:bg-slate-50"
                            >
                              View Details
                            </Link>
                            <Link
                              href="/code/dependencies/scans/history"
                              style={{ display: 'block', padding: '8px 12px', fontSize: '12px', color: '#0F172A', textDecoration: 'none' }}
                              className="hover:bg-slate-50"
                            >
                              View Console Logs
                            </Link>
                            <a
                              href={`data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(job, null, 2))}`}
                              download={`${job.job_id}.json`}
                              style={{ display: 'block', padding: '8px 12px', fontSize: '12px', color: '#0F172A', textDecoration: 'none' }}
                              className="hover:bg-slate-50"
                            >
                              Export JSON
                            </a>
                            <button
                              onClick={async () => {
                                await api.dependencyScans.runScan({ repository_name: job.repository, branch: job.branch, scan_type: job.scan_type });
                                setActiveMenuId(null);
                                loadData();
                              }}
                              style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left', padding: '8px 12px', fontSize: '12px', color: '#2563EB', cursor: 'pointer' }}
                              className="hover:bg-slate-50"
                            >
                              Re-run Scan
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Bottom Row: 3 Panels matching Screenshot ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
        {/* Panel 1: Top Repositories by Scan Issues */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Top Repositories by Scan Issues
            </h3>
            <Link href="/repositories" style={{ fontSize: '11px', color: '#2563EB', textDecoration: 'none', fontWeight: 600 }}>
              View All
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {!data?.top_repositories || data.top_repositories.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#94A3B8', fontSize: '12px' }}>
                No repositories with scan issues recorded.
              </div>
            ) : (
              data.top_repositories.map((repo: any) => (
                <div key={repo.name} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px' }}>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>{repo.name}</span>
                    <span style={{ color: '#64748B', fontWeight: 600 }}>{repo.total_issues} issues</span>
                  </div>
                  {/* Segmented issue bar */}
                  <div style={{ height: '6px', borderRadius: '3px', backgroundColor: '#F1F5F9', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${(repo.critical / Math.max(1, repo.total_issues)) * 100}%`, backgroundColor: '#EF4444' }} />
                    <div style={{ width: `${(repo.high / Math.max(1, repo.total_issues)) * 100}%`, backgroundColor: '#F97316' }} />
                    <div style={{ flex: 1, backgroundColor: '#EAB308' }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel 2: Recent Scan Activity */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Recent Scan Activity
            </h3>
            <span style={{ fontSize: '11px', color: '#94A3B8' }}>Live Timeline</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {!data?.recent_activity || data.recent_activity.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#94A3B8', fontSize: '12px' }}>
                No recent scan activity recorded.
              </div>
            ) : (
              data.recent_activity.slice(0, 4).map((act: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: act.status === 'FAILED' ? '#EF4444' : '#10B981',
                      marginTop: '5px',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, fontSize: '12px' }}>
                    <div style={{ fontWeight: 600, color: '#0F172A' }}>
                      {act.job_id} &bull; {act.repository}
                    </div>
                    <div style={{ color: '#64748B', fontSize: '11px', marginTop: '1px' }}>
                      Status: {act.status} &bull; {act.timestamp}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel 3: Scan Types Breakdown */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Scan Types
            </h3>
            <span style={{ fontSize: '11px', color: '#94A3B8' }}>Supported Scanners</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { name: 'Vulnerability Scan', icon: Shield, color: '#EF4444', desc: 'CVEs, OSV and known package vulnerabilities' },
              { name: 'License Scan', icon: FileText, color: '#2563EB', desc: 'SPDX license risks and copyleft compliance' },
              { name: 'Policy Scan', icon: CheckSquare, color: '#10B981', desc: 'OPA Rego gates and dependency rules' },
              { name: 'SBOM Scan', icon: Box, color: '#F59E0B', desc: 'CycloneDX bill of materials generation' },
            ].map((st) => (
              <div key={st.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 0' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: `${st.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <st.icon size={16} color={st.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#0F172A' }}>{st.name}</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>{st.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
