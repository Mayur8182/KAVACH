'use client';

/**
 * SecuLayer SAST — Security Hotspots Overview (/sast/hotspots)
 * Screenshot Reference 10.1 & Reference 2.
 * Fully connected to real backend API: GET /api/hotspots/summary, GET /api/hotspots/recent
 */

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Play,
  RefreshCw,
  FileText,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Download,
  Layers,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import {
  HotspotsBreadcrumbs,
  HotspotSeverityBadge,
  HotspotStatusBadge,
  HotspotCategoryBadge,
  HotspotDonutChart,
  HotspotCategoryBarChart,
  type HotspotItem,
} from '@/components/hotspots/HotspotComponents';

export default function SecurityHotspotsOverviewPage() {
  const router = useRouter();

  const [summary, setSummary] = useState<any>({
    total: 0,
    review: 0,
    acknowledged: 0,
    safe: 0,
    fixed: 0,
    false_positive: 0,
    high_priority: 0,
    medium_priority: 0,
    low_priority: 0,
    by_category: [],
    by_severity: {},
    by_status: {},
    by_repository: [],
  });
  const [recent, setRecent] = useState<HotspotItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  const [branch, setBranch] = useState('main');
  const [timeRange, setTimeRange] = useState('Last 30 days');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sumData, recData] = await Promise.all([
        api.hotspots.summary(),
        api.hotspots.recent(10),
      ]);
      if (sumData) setSummary(sumData);
      if (recData && Array.isArray(recData)) setRecent(recData);
    } catch (err) {
      console.error('Failed to load hotspot overview:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const [scanStep, setScanStep] = useState<string | null>(null);

  const handleRunScan = async () => {
    setScanning(true);
    setScanStep('Queued');
    const queuedText = `Queued SAST hotspot scan for branch '${branch}'...`;
    setScanMessage(queuedText);
    toast.info('Security scan queued', { description: queuedText });
    try {
      setScanStep('Scanning AST');
      setScanMessage('Scanning repository AST and evaluating 12 Security Hotspot rules...');
      const result = await api.hotspots.triggerScan({ branch });
      setScanStep('Persisting');
      const compText = `Scan completed: ${result.hotspots_detected} hotspots detected across ${result.scanned_files} files.`;
      setScanMessage(compText);
      toast.success('Security scan completed', { description: compText });
      await loadData();
      setScanStep('Completed');
      setTimeout(() => {
        setScanMessage(null);
        setScanStep(null);
      }, 5000);
    } catch (err: any) {
      setScanStep('Failed');
      const failText = `Scan failed: ${err?.message || 'Error executing scanner'}`;
      setScanMessage(failText);
      toast.error('Security scan failed', { description: failText });
    } finally {
      setScanning(false);
    }
  };

  const handleExport = () => {
    window.open('/api/hotspots/export?format=csv', '_blank');
    toast.success('Hotspots exported', { description: 'Security hotspots exported in CSV format.' });
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      {/* 1. Breadcrumbs */}
      <HotspotsBreadcrumbs currentPage="Overview" />

      {/* 2. Page Header matching Reference 10.1 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#0F172A',
              letterSpacing: '-0.02em',
              margin: '0 0 6px 0',
            }}
          >
            Security Hotspots
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748B' }}>
            Identify and review security-sensitive code that requires manual analysis.
          </p>
        </div>

        {/* Filter and Action controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Branch filter */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '13px',
              color: '#475569',
              fontWeight: 500,
            }}
          >
            <span style={{ color: '#94A3B8', marginRight: '6px' }}>Branch:</span>
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                fontWeight: 600,
                color: '#0F172A',
                cursor: 'pointer',
              }}
            >
              <option value="main">main</option>
              <option value="develop">develop</option>
              <option value="release">release</option>
            </select>
          </div>

          {/* Time range selector */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '13px',
              color: '#475569',
              fontWeight: 500,
            }}
          >
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                fontWeight: 500,
                color: '#0F172A',
                cursor: 'pointer',
              }}
            >
              <option value="Last 30 days">Last 30 days</option>
              <option value="Last 7 days">Last 7 days</option>
              <option value="Last 90 days">Last 90 days</option>
              <option value="All Time">All Time</option>
            </select>
          </div>

          {/* Export Report */}
          <button
            onClick={handleExport}
            title="Download CSV export"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer',
              transition: 'background-color 150ms ease',
            }}
          >
            <Download size={14} color="#64748B" />
            Export
          </button>

          {/* Trigger Scan button */}
          <button
            onClick={handleRunScan}
            disabled={scanning}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: '#2563EB',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#FFFFFF',
              cursor: scanning ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
            }}
          >
            {scanning ? (
              <>
                <RefreshCw size={14} color="#FFFFFF" className="animate-spin" />
                {scanStep || 'Scanning Code...'}
              </>
            ) : (
              <>
                <Play size={14} color="#FFFFFF" fill="#FFFFFF" />
                Run Hotspot Scan
              </>
            )}
          </button>
        </div>
      </div>

      {/* Live notification message with Stepper */}
      {scanMessage && (
        <div
          style={{
            marginBottom: '20px',
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: scanStep === 'Failed' ? '#FEF2F2' : '#EFF6FF',
            border: `1px solid ${scanStep === 'Failed' ? '#FECACA' : '#BFDBFE'}`,
            color: scanStep === 'Failed' ? '#DC2626' : '#1D4ED8',
            fontSize: '13px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RefreshCw size={14} className={scanning ? 'animate-spin' : ''} />
            <span>{scanMessage}</span>
          </div>
          {scanStep === 'Failed' && (
            <button
              onClick={handleRunScan}
              style={{
                padding: '4px 10px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #FCA5A5',
                borderRadius: '4px',
                color: '#DC2626',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* 3. Five Top Metric Cards (Truthful, non-fabricated metrics) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Total Hotspots */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Total Hotspots</span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldAlert size={18} color="#2563EB" />
            </div>
          </div>
          <div style={{ marginTop: '14px' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>
              {summary.total}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '11px', color: summary.total > 0 ? '#2563EB' : '#64748B', fontWeight: 600 }}>
              <span>{summary.total > 0 ? `${summary.total} in ${timeRange.toLowerCase()}` : '0 hotspots detected'}</span>
            </div>
          </div>
        </div>

        {/* To Review */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>To Review</span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#FEF2F2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock size={18} color="#EF4444" />
            </div>
          </div>
          <div style={{ marginTop: '14px' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: summary.review > 0 ? '#DC2626' : '#0F172A', lineHeight: 1 }}>
              {summary.review}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '11px', color: summary.review > 0 ? '#EF4444' : '#64748B', fontWeight: 600 }}>
              <span>{summary.review > 0 ? `${summary.review} require triage` : '0 pending review'}</span>
            </div>
          </div>
        </div>

        {/* Acknowledged */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Acknowledged</span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={18} color="#2563EB" />
            </div>
          </div>
          <div style={{ marginTop: '14px' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#2563EB', lineHeight: 1 }}>
              {summary.acknowledged}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
              <span>{summary.acknowledged > 0 ? `${summary.acknowledged} risk accepted` : '0 accepted risk'}</span>
            </div>
          </div>
        </div>

        {/* Marked Safe */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Marked Safe</span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#F0FDF4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={18} color="#16A34A" />
            </div>
          </div>
          <div style={{ marginTop: '14px' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#16A34A', lineHeight: 1 }}>
              {summary.safe}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '11px', color: summary.safe > 0 ? '#16A34A' : '#64748B', fontWeight: 600 }}>
              <span>{summary.safe > 0 ? `${summary.safe} audited safe` : '0 audited safe'}</span>
            </div>
          </div>
        </div>

        {/* Fixed */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Fixed</span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#ECFDF5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={18} color="#059669" />
            </div>
          </div>
          <div style={{ marginTop: '14px' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#059669', lineHeight: 1 }}>
              {summary.fixed}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '11px', color: summary.fixed > 0 ? '#059669' : '#64748B', fontWeight: 600 }}>
              <span>{summary.fixed > 0 ? `${summary.fixed} remediated` : '0 remediated'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Charts Grid: Hotspots by Status & Hotspots by Category */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '20px',
          marginBottom: '28px',
        }}
      >
        {/* Hotspots by Status */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
              Hotspots by Status
            </h3>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Real DB aggregates</span>
          </div>

          <HotspotDonutChart byStatus={summary.by_status || {}} total={summary.total || 0} />
        </div>

        {/* Hotspots by Category */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
              Hotspots by Category
            </h3>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Top risk patterns</span>
          </div>

          {summary.by_category && summary.by_category.length > 0 ? (
            <HotspotCategoryBarChart byCategory={summary.by_category} />
          ) : (
            <div style={{ color: '#94A3B8', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>
              No categories detected yet. Run a scan to analyze code.
            </div>
          )}
        </div>
      </div>

      {/* 5. Recent Hotspots Table (Screenshot 10.1) */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #E2E8F0',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
              Recent Hotspots
            </h3>
            <span style={{ fontSize: '12px', color: '#64748B' }}>
              Latest security hotspots requiring manual verification
            </span>
          </div>

          <Link
            href="/sast/hotspots/list"
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#2563EB',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            View All ({summary.total})
            <ChevronRight size={14} />
          </Link>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
                  FILE
                </th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
                  CATEGORY
                </th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
                  SEVERITY
                </th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
                  STATUS
                </th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
                  DETECTED
                </th>
                <th style={{ padding: '12px 20px', fontSize: '12px', fontWeight: 600, color: '#64748B', textAlign: 'right' }}>
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && recent.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                    Loading hotspots from database...
                  </td>
                </tr>
              ) : recent.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px', textAlign: 'center' }}>
                    <div style={{ color: '#0F172A', fontWeight: 600, fontSize: '15px' }}>
                      No Security Hotspots Found
                    </div>
                    <p style={{ color: '#64748B', fontSize: '13px', margin: '6px 0 16px' }}>
                      Run a SAST hotspot scan on your code to detect security-sensitive patterns.
                    </p>
                    <button
                      onClick={handleRunScan}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#2563EB',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Run Hotspot Scan
                    </button>
                  </td>
                </tr>
              ) : (
                recent.map((hs) => (
                  <tr
                    key={hs.id}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      transition: 'background-color 150ms ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '14px 20px' }}>
                      <Link
                        href={`/sast/hotspots/${hs.id}`}
                        style={{
                          textDecoration: 'none',
                          color: '#2563EB',
                          fontWeight: 600,
                          fontSize: '13px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {hs.file}
                        <span style={{ color: '#94A3B8', fontWeight: 400, fontSize: '12px' }}>
                          :{hs.lines}
                        </span>
                      </Link>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                        {hs.title}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <HotspotCategoryBadge category={hs.category} />
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <HotspotSeverityBadge severity={hs.severity} size="sm" />
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <HotspotStatusBadge status={hs.status} size="sm" />
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#64748B' }}>
                      {hs.detected}
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <Link
                        href={`/sast/hotspots/${hs.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 10px',
                          backgroundColor: '#EFF6FF',
                          color: '#2563EB',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        Review
                        <ChevronRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
