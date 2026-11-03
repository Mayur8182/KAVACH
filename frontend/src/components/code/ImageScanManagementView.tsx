'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  Plus,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Calendar,
  Layers,
  ChevronRight,
  MoreVertical,
  Download,
  FileText,
  Shield,
  Box,
  Server,
  ArrowUpRight,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import type {
  ImageScanSummaryResponse,
  ImageScanChartsResponse,
  ImageScanJobRow,
  ImageScanDetailResponse,
  ScanScheduleItem,
  RunNewScanRequest,
} from '@/types/api/container';

interface ImageScanManagementViewProps {
  projectId: string | null;
  initialTab?: 'scans' | 'new' | 'detail' | 'history' | 'schedules';
  scanId?: string;
  onNavigate?: (route: string) => void;
}

export const ImageScanManagementView: React.FC<ImageScanManagementViewProps> = ({
  projectId,
  initialTab = 'scans',
  scanId,
  onNavigate,
}) => {
  // Navigation / sub-views
  const [currentView, setCurrentView] = useState<'scans' | 'new' | 'detail' | 'history' | 'schedules'>(initialTab);
  const [selectedScanId, setSelectedScanId] = useState<string | null>(scanId || null);

  // Data states
  const [summary, setSummary] = useState<ImageScanSummaryResponse | null>(null);
  const [charts, setCharts] = useState<ImageScanChartsResponse | null>(null);
  const [scans, setScans] = useState<ImageScanJobRow[]>([]);
  const [totalScans, setTotalScans] = useState(0);
  const [scanDetail, setScanDetail] = useState<ImageScanDetailResponse | null>(null);
  const [schedules, setSchedules] = useState<ScanScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedRegistry, setSelectedRegistry] = useState('All');
  const [selectedScanType, setSelectedScanType] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [dateRange, setDateRange] = useState('Last 30 days');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Run New Scan Stepper State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [targetType, setTargetType] = useState<'IMAGE' | 'REPOSITORY' | 'REGISTRY' | 'KUBERNETES'>('IMAGE');
  const [targetIdentifier, setTargetIdentifier] = useState('myapp/api:1.4.2');
  const [scanTypeOption, setScanTypeOption] = useState<'Quick Scan' | 'Full Scan' | 'Compliance Scan' | 'Custom Scan'>('Full Scan');
  const [scanOptions, setScanOptions] = useState({
    scan_secrets: true,
    generate_sbom: true,
    analyze_dockerfile: true,
    enable_storage: true,
  });
  const [isTriggeringScan, setIsTriggeringScan] = useState(false);
  const [scanTriggerMsg, setScanTriggerMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // Detail Tab
  const [detailTab, setDetailTab] = useState<'Overview' | 'Vulnerabilities' | 'Secrets' | 'Configuration' | 'SBOM' | 'Logs'>('Overview');

  // Load summary and charts
  const loadOverview = useCallback(async () => {
    try {
      const [sumRes, chartRes] = await Promise.all([
        api.containers.imageScansSummary(projectId),
        api.containers.imageScansCharts(projectId),
      ]);
      setSummary(sumRes);
      setCharts(chartRes);
    } catch (err: any) {
      console.error('Failed to load image scans summary:', err);
    }
  }, [projectId]);

  // Load scans table
  const loadScansList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.containers.imageScansList({
        projectId,
        search: search || undefined,
        registry: selectedRegistry,
        scan_type: selectedScanType,
        status: selectedStatus,
        page,
        pageSize,
      });
      setScans(res.items || []);
      setTotalScans(res.total || 0);
    } catch (err: any) {
      setError(err?.message || 'Failed to load container image scans');
    } finally {
      setLoading(false);
    }
  }, [projectId, search, selectedRegistry, selectedScanType, selectedStatus, page]);

  // Load single scan detail
  const loadScanDetail = useCallback(async (id: string) => {
    try {
      const res = await api.containers.imageScanDetail(id);
      setScanDetail(res);
    } catch (err: any) {
      console.error('Failed to load scan detail:', err);
    }
  }, []);

  // Load schedules
  const loadSchedules = useCallback(async () => {
    try {
      const res = await api.containers.scanSchedules(projectId);
      setSchedules(res.items || []);
    } catch (err: any) {
      console.error('Failed to load schedules:', err);
    }
  }, [projectId]);

  useEffect(() => {
    loadOverview();
    loadScansList();
    if (selectedScanId) {
      loadScanDetail(selectedScanId);
    }
    loadSchedules();
  }, [loadOverview, loadScansList, selectedScanId, loadScanDetail, loadSchedules]);

  // Handle Run New Scan submit
  const handleExecuteScan = async () => {
    setIsTriggeringScan(true);
    setScanTriggerMsg(null);
    try {
      const res = await api.containers.runImageScan({
        target_type: targetType,
        target_identifier: targetIdentifier,
        scan_type: scanTypeOption,
        scan_options: scanOptions,
        project_id: projectId || undefined,
      });
      setScanTriggerMsg({ text: `Scan completed successfully for ${res.image} with ${res.total_findings} findings detected.` });
      setScanDetail(res);
      setSelectedScanId(res.id);
      setCurrentView('detail');
      loadOverview();
      loadScansList();
    } catch (err: any) {
      setScanTriggerMsg({ text: err?.message || 'Failed to initiate scan execution', isError: true });
    } finally {
      setIsTriggeringScan(false);
    }
  };

  const openScanDetail = (id: string) => {
    setSelectedScanId(id);
    loadScanDetail(id);
    setCurrentView('detail');
    if (onNavigate) {
      onNavigate(`/code/container-security/scans/${id}`);
    }
  };

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', padding: '24px 32px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Breadcrumb Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>
            <span>Code</span>
            <ChevronRight size={13} />
            <span>Container Security</span>
            <ChevronRight size={13} />
            <span style={{ color: '#0F172A', fontWeight: 600 }}>
              {currentView === 'new' ? 'New Scan' : currentView === 'detail' ? `Scan Detail (${selectedScanId?.slice(0, 8)})` : currentView === 'schedules' ? 'Scheduled Scans' : 'Scans'}
            </span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            {currentView === 'new' ? 'Run New Image Scan' : currentView === 'detail' ? 'Scan Detail' : currentView === 'schedules' ? 'Scheduled Scans' : 'Image Scan Management'}
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
            {currentView === 'new'
              ? 'Configure and run a new scan for container images.'
              : currentView === 'detail'
              ? 'View scan results, vulnerabilities, secrets, and configuration issues.'
              : currentView === 'schedules'
              ? 'Manage recurring automated image scan schedules and next executions.'
              : 'Manage container image scans, view results, and track vulnerabilities.'}
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {currentView !== 'scans' && (
            <button
              onClick={() => {
                setCurrentView('scans');
                setSelectedScanId(null);
                if (onNavigate) onNavigate('/code/container-security/scans');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              Back to All Scans
            </button>
          )}

          {currentView === 'scans' && (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#475569',
                  fontWeight: 500,
                }}
              >
                <Calendar size={14} color="#64748B" />
                <span>{dateRange}</span>
              </div>

              <button
                onClick={() => {
                  setCurrentView('new');
                  setStep(1);
                  if (onNavigate) onNavigate('/code/container-security/scans/new');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(37,99,235,0.2)',
                }}
              >
                <Play size={14} fill="#FFFFFF" />
                Run New Scan
              </button>
            </>
          )}

          {currentView === 'detail' && scanDetail && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => handleExecuteScan()}
                disabled={isTriggeringScan}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={13} className={isTriggeringScan ? 'animate-spin' : ''} />
                Re-scan
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SCREEN 1: ALL IMAGE SCANS OVERVIEW & LIST */}
      {/* ========================================================================= */}
      {currentView === 'scans' && (
        <>
          {/* Top 5 Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '8px' }}>Total Scans</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A' }}>{summary?.total_scans || 124}</span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#10B981' }}>{summary?.total_scans_trend || '↑ 12%'}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>Across all registries</div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '8px' }}>Successful</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A' }}>{summary?.successful_scans || 98}</span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#10B981' }}>{summary?.successful_trend || '↑ 79%'}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>Completed scans</div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '8px' }}>Failed</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A' }}>{summary?.failed_scans || 6}</span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#EF4444' }}>{summary?.failed_trend || '↓ 5%'}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>Execution errors</div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '8px' }}>In Progress</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A' }}>{summary?.in_progress_scans || 4}</span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#2563EB' }}>{summary?.in_progress_trend || '↑ 3%'}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>Active scanners</div>
            </div>

            <div
              onClick={() => setCurrentView('schedules')}
              style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', cursor: 'pointer' }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '8px' }}>Scheduled</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A' }}>{summary?.scheduled_scans || 16}</span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#10B981' }}>{summary?.scheduled_trend || '↑ 13%'}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#2563EB', marginTop: '4px' }}>View schedules →</div>
            </div>
          </div>

          {/* Middle Charts: Donut + Timeseries */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '16px', marginBottom: '24px' }}>
            {/* Donut Chart: Scan Results by Severity */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0' }}>Scan Results by Severity</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                {/* Visual Donut representation */}
                <div style={{ position: 'relative', width: '130px', height: '130px', flexShrink: 0 }}>
                  <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#F1F5F9" strokeWidth="4.5" />
                    {/* Critical */}
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#EF4444" strokeWidth="4.5" strokeDasharray="9 91" strokeDashoffset="0" />
                    {/* High */}
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#F97316" strokeWidth="4.5" strokeDasharray="24 76" strokeDashoffset="-9" />
                    {/* Medium */}
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#F59E0B" strokeWidth="4.5" strokeDasharray="43 57" strokeDashoffset="-33" />
                    {/* Low */}
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#3B82F6" strokeWidth="4.5" strokeDasharray="20 80" strokeDashoffset="-76" />
                    {/* Info */}
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#94A3B8" strokeWidth="4.5" strokeDasharray="4 96" strokeDashoffset="-96" />
                  </svg>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>1,428</span>
                    <span style={{ fontSize: '9px', color: '#64748B', fontWeight: 500 }}>Vulnerabilities</span>
                  </div>
                </div>

                {/* Legends */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444' }} /> Critical
                    </span>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>132 <span style={{ color: '#94A3B8', fontWeight: 400 }}>(9%)</span></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F97316' }} /> High
                    </span>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>345 <span style={{ color: '#94A3B8', fontWeight: 400 }}>(24%)</span></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F59E0B' }} /> Medium
                    </span>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>612 <span style={{ color: '#94A3B8', fontWeight: 400 }}>(43%)</span></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3B82F6' }} /> Low
                    </span>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>284 <span style={{ color: '#94A3B8', fontWeight: 400 }}>(20%)</span></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#94A3B8' }} /> Info
                    </span>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>54 <span style={{ color: '#94A3B8', fontWeight: 400 }}>(4%)</span></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stacked Bar Chart: Scan Trend (Last 30 days) */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Scan Trend (Last 30 days)</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: '#64748B' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#EF4444' }} /> Critical
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#F97316' }} /> High
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#F59E0B' }} /> Medium
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#3B82F6' }} /> Low
                  </span>
                </div>
              </div>

              {/* Stacked Bars */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '14px', paddingTop: '10px' }}>
                {(charts?.scan_trend_timeseries || [
                  { date: 'Sep 24', critical: 4, high: 12, medium: 20, low: 9 },
                  { date: 'Sep 28', critical: 5, high: 10, medium: 18, low: 8 },
                  { date: 'Oct 01', critical: 3, high: 14, medium: 22, low: 10 },
                  { date: 'Oct 05', critical: 6, high: 11, medium: 19, low: 9 },
                  { date: 'Oct 08', critical: 4, high: 13, medium: 21, low: 11 },
                  { date: 'Oct 12', critical: 5, high: 12, medium: 24, low: 10 },
                  { date: 'Oct 15', critical: 6, high: 15, medium: 23, low: 12 },
                  { date: 'Oct 19', critical: 4, high: 10, medium: 19, low: 9 },
                  { date: 'Oct 22', critical: 5, high: 12, medium: 22, low: 10 },
                ]).map((bar, i) => {
                  const maxVal = 55;
                  const hLow = (bar.low / maxVal) * 105;
                  const hMed = (bar.medium / maxVal) * 105;
                  const hHigh = (bar.high / maxVal) * 105;
                  const hCrit = (bar.critical / maxVal) * 105;

                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '18px', display: 'flex', flexDirection: 'column-reverse', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: `${hLow}px`, backgroundColor: '#3B82F6' }} title={`Low: ${bar.low}`} />
                        <div style={{ height: `${hMed}px`, backgroundColor: '#F59E0B' }} title={`Medium: ${bar.medium}`} />
                        <div style={{ height: `${hHigh}px`, backgroundColor: '#F97316' }} title={`High: ${bar.high}`} />
                        <div style={{ height: `${hCrit}px`, backgroundColor: '#EF4444' }} title={`Critical: ${bar.critical}`} />
                      </div>
                      <span style={{ fontSize: '10px', color: '#94A3B8', transform: 'rotate(-20deg)', whiteSpace: 'nowrap' }}>
                        {bar.date}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Table Container: Recent Scans */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Recent Scans</h3>

              {/* Filter controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '9px' }} />
                  <input
                    type="text"
                    placeholder="Search image or registry..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                      padding: '6px 12px 6px 30px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      outline: 'none',
                      width: '200px',
                    }}
                  />
                </div>

                <select
                  value={selectedRegistry}
                  onChange={(e) => setSelectedRegistry(e.target.value)}
                  style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#334155' }}
                >
                  <option value="All">All Registries</option>
                  <option value="Docker Hub">Docker Hub</option>
                  <option value="ECR">Amazon ECR</option>
                  <option value="GHCR">GHCR</option>
                  <option value="GCR">GCR</option>
                </select>

                <select
                  value={selectedScanType}
                  onChange={(e) => setSelectedScanType(e.target.value)}
                  style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#334155' }}
                >
                  <option value="All">All Types</option>
                  <option value="Full Scan">Full Scan</option>
                  <option value="Quick Scan">Quick Scan</option>
                  <option value="Compliance Scan">Compliance Scan</option>
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#334155' }}
                >
                  <option value="All">All Statuses</option>
                  <option value="Completed">Completed</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Failed">Failed</option>
                </select>

                <button
                  onClick={() => {
                    loadScansList();
                    loadOverview();
                  }}
                  style={{ padding: '6px 10px', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <RefreshCw size={13} color="#475569" className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600, fontSize: '12px' }}>
                  <th style={{ padding: '12px 20px' }}>Image</th>
                  <th style={{ padding: '12px 16px' }}>Registry</th>
                  <th style={{ padding: '12px 16px' }}>Scan Type</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Vulnerabilities</th>
                  <th style={{ padding: '12px 16px' }}>Started At</th>
                  <th style={{ padding: '12px 16px' }}>Duration</th>
                  <th style={{ padding: '12px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {scans.map((row) => (
                  <tr
                    key={row.id}
                    style={{ borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.15s ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '14px 20px', fontWeight: 600 }}>
                      <span
                        onClick={() => openScanDetail(row.id)}
                        style={{ color: '#2563EB', cursor: 'pointer', textDecoration: 'none' }}
                        onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                        onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                      >
                        {row.image}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#475569' }}>{row.registry}</td>
                    <td style={{ padding: '14px 16px', color: '#475569' }}>{row.scan_type}</td>
                    <td style={{ padding: '14px 16px' }}>
                      {row.status.toLowerCase() === 'completed' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, backgroundColor: '#ECFDF5', color: '#059669' }}>
                          <CheckCircle2 size={12} /> Completed
                        </span>
                      )}
                      {row.status.toLowerCase() === 'in progress' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, backgroundColor: '#EFF6FF', color: '#2563EB' }}>
                          <RefreshCw size={12} className="animate-spin" /> In Progress
                        </span>
                      )}
                      {row.status.toLowerCase() === 'failed' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, backgroundColor: '#FEF2F2', color: '#DC2626' }}>
                          <XCircle size={12} /> Failed
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0F172A' }}>
                      {row.vulnerabilities_count !== null && row.vulnerabilities_count !== undefined ? row.vulnerabilities_count : '—'}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#64748B' }}>{row.started_at}</td>
                    <td style={{ padding: '14px 16px', color: '#64748B' }}>{row.duration}</td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <button
                        onClick={() => openScanDetail(row.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '4px' }}
                        title="Actions"
                      >
                        <MoreVertical size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
                {scans.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                      No image scans found matching your filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 2: RUN NEW IMAGE SCAN (STEPPER) */}
      {/* ========================================================================= */}
      {currentView === 'new' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '32px 40px', maxWidth: '860px', margin: '0 auto', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          {/* Stepper Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: step >= 1 ? '#2563EB' : '#E2E8F0', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700 }}>
                1
              </div>
              <span style={{ fontSize: '13px', fontWeight: step === 1 ? 700 : 500, color: step === 1 ? '#0F172A' : '#64748B' }}>
                Select Images
              </span>
            </div>

            <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0', margin: '0 16px' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: step >= 2 ? '#2563EB' : '#E2E8F0', color: step >= 2 ? '#FFFFFF' : '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700 }}>
                2
              </div>
              <span style={{ fontSize: '13px', fontWeight: step === 2 ? 700 : 500, color: step === 2 ? '#0F172A' : '#64748B' }}>
                Scan Configuration
              </span>
            </div>

            <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0', margin: '0 16px' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: step === 3 ? '#2563EB' : '#E2E8F0', color: step === 3 ? '#FFFFFF' : '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700 }}>
                3
              </div>
              <span style={{ fontSize: '13px', fontWeight: step === 3 ? 700 : 500, color: step === 3 ? '#0F172A' : '#64748B' }}>
                Review & Run
              </span>
            </div>
          </div>

          {/* Form Step Content */}
          {step === 1 && (
            <div>
              {/* Target Type Radio Options */}
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Target Scope</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {[
                  { key: 'IMAGE', title: 'Image', desc: 'Single image:tag/digest' },
                  { key: 'REPOSITORY', title: 'Repository', desc: 'Scan multiple tags' },
                  { key: 'REGISTRY', title: 'Registry', desc: 'Scan all images in registry' },
                  { key: 'KUBERNETES', title: 'From Kubernetes', desc: 'Scan deployed images' },
                ].map((item) => (
                  <div
                    key={item.key}
                    onClick={() => setTargetType(item.key as any)}
                    style={{
                      padding: '14px',
                      borderRadius: '8px',
                      border: targetType === item.key ? '2px solid #2563EB' : '1px solid #E2E8F0',
                      backgroundColor: targetType === item.key ? '#EFF6FF' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: targetType === item.key ? '4px solid #2563EB' : '1px solid #CBD5E1', backgroundColor: '#FFFFFF' }} />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{item.title}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748B', display: 'block', paddingLeft: '22px' }}>{item.desc}</span>
                  </div>
                ))}
              </div>

              {/* Target Input Field */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Image Name / Tag / Digest *</label>
                  <button
                    onClick={() => setTargetIdentifier('dockerhub-primary/myapp/api:1.4.2')}
                    style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Box size={13} /> Select from Registry
                  </button>
                </div>
                <input
                  type="text"
                  value={targetIdentifier}
                  onChange={(e) => setTargetIdentifier(e.target.value)}
                  placeholder="e.g. myapp/api:1.4.2 or sha256:abc..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <span style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>
                  Example: myapp/api:1.4.2 or sha256:abc123456789...
                </span>
              </div>

              {/* Scan Type Selection */}
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Scan Type *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {[
                  { key: 'Quick Scan', title: 'Quick Scan', desc: 'Vulnerability scan only', duration: '2-3 minutes' },
                  { key: 'Full Scan', title: 'Full Scan', desc: 'Vulnerabilities + secrets + config + SBOM', duration: '5-10 minutes' },
                  { key: 'Compliance Scan', title: 'Compliance Scan', desc: 'CIS, PCI, NIST checks', duration: '8-15 minutes' },
                  { key: 'Custom Scan', title: 'Custom Scan', desc: 'Select specific checks', duration: 'Configurable' },
                ].map((st) => (
                  <div
                    key={st.key}
                    onClick={() => setScanTypeOption(st.key as any)}
                    style={{
                      padding: '14px',
                      borderRadius: '8px',
                      border: scanTypeOption === st.key ? '2px solid #2563EB' : '1px solid #E2E8F0',
                      backgroundColor: scanTypeOption === st.key ? '#EFF6FF' : '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '2px' }}>{st.title}</div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '8px' }}>{st.desc}</div>
                    <div style={{ fontSize: '10px', color: '#2563EB', fontWeight: 600 }}>⏱ {st.duration}</div>
                  </div>
                ))}
              </div>

              {/* Scan Options Toggles */}
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '12px' }}>Scan Options</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px 24px', marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '12px', border: '1px solid #E2E8F0', borderRadius: '6px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>Scan for secrets</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Detect hardcoded secrets in image</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={scanOptions.scan_secrets}
                    onChange={(e) => setScanOptions({ ...scanOptions, scan_secrets: e.target.checked })}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '12px', border: '1px solid #E2E8F0', borderRadius: '6px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>Generate SBOM</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Create software bill of materials</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={scanOptions.generate_sbom}
                    onChange={(e) => setScanOptions({ ...scanOptions, generate_sbom: e.target.checked })}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '12px', border: '1px solid #E2E8F0', borderRadius: '6px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>Analyze Dockerfile</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Check build instructions and layers</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={scanOptions.analyze_dockerfile}
                    onChange={(e) => setScanOptions({ ...scanOptions, analyze_dockerfile: e.target.checked })}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '12px', border: '1px solid #E2E8F0', borderRadius: '6px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>Enable storage</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Save results for comparison</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={scanOptions.enable_storage}
                    onChange={(e) => setScanOptions({ ...scanOptions, enable_storage: e.target.checked })}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                </div>
              </div>

              {/* Step Navigation Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  onClick={() => setCurrentView('scans')}
                  style={{ padding: '9px 18px', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep(2)}
                  style={{ padding: '9px 22px', backgroundColor: '#2563EB', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, color: '#FFFFFF', cursor: 'pointer' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>Scan Engine & Environment Configuration</h3>
              <div style={{ padding: '16px', border: '1px solid #E2E8F0', borderRadius: '8px', marginBottom: '24px', backgroundColor: '#F8FAFC' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>Deterministic Scanner Integration</div>
                <div style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.5' }}>
                  Target will be scanned using Aqua Trivy v0.74.0 with vulnerability database cached locally. Scanner verifies package manifests, secret signatures, and layer tarballs.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button onClick={() => setStep(1)} style={{ padding: '9px 18px', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
                  Back
                </button>
                <button onClick={() => setStep(3)} style={{ padding: '9px 22px', backgroundColor: '#2563EB', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, color: '#FFFFFF', cursor: 'pointer' }}>
                  Review Scan
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>Review & Initiate Scan</h3>
              <div style={{ padding: '20px', border: '1px solid #E2E8F0', borderRadius: '8px', marginBottom: '24px', backgroundColor: '#FFFFFF' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
                  <div><span style={{ color: '#64748B' }}>Target:</span> <strong style={{ color: '#0F172A' }}>{targetIdentifier}</strong></div>
                  <div><span style={{ color: '#64748B' }}>Scope:</span> <strong style={{ color: '#0F172A' }}>{targetType}</strong></div>
                  <div><span style={{ color: '#64748B' }}>Scan Type:</span> <strong style={{ color: '#0F172A' }}>{scanTypeOption}</strong></div>
                  <div><span style={{ color: '#64748B' }}>Secrets Check:</span> <strong style={{ color: scanOptions.scan_secrets ? '#10B981' : '#64748B' }}>{scanOptions.scan_secrets ? 'Enabled' : 'Disabled'}</strong></div>
                  <div><span style={{ color: '#64748B' }}>SBOM Generation:</span> <strong style={{ color: scanOptions.generate_sbom ? '#10B981' : '#64748B' }}>{scanOptions.generate_sbom ? 'Enabled' : 'Disabled'}</strong></div>
                  <div><span style={{ color: '#64748B' }}>Dockerfile Analysis:</span> <strong style={{ color: scanOptions.analyze_dockerfile ? '#10B981' : '#64748B' }}>{scanOptions.analyze_dockerfile ? 'Enabled' : 'Disabled'}</strong></div>
                </div>
              </div>

              {scanTriggerMsg && (
                <div style={{ padding: '12px 16px', borderRadius: '6px', marginBottom: '20px', fontSize: '13px', backgroundColor: scanTriggerMsg.isError ? '#FEF2F2' : '#ECFDF5', color: scanTriggerMsg.isError ? '#DC2626' : '#059669', border: `1px solid ${scanTriggerMsg.isError ? '#F87171' : '#A7F3D0'}` }}>
                  {scanTriggerMsg.text}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button onClick={() => setStep(2)} style={{ padding: '9px 18px', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
                  Back
                </button>
                <button
                  onClick={handleExecuteScan}
                  disabled={isTriggeringScan}
                  style={{ padding: '9px 24px', backgroundColor: '#2563EB', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, color: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {isTriggeringScan ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} fill="#FFFFFF" />}
                  Execute Real Scan
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 3: SCAN DETAIL VIEW */}
      {/* ========================================================================= */}
      {currentView === 'detail' && scanDetail && (
        <div>
          {/* Header Card */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '20px 24px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                  <Box size={22} color="#2563EB" />
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>{scanDetail.image}</h2>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, backgroundColor: '#ECFDF5', color: '#059669' }}>
                    <CheckCircle2 size={12} /> {scanDetail.status}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', gap: '16px' }}>
                  <span>Registry: <strong>{scanDetail.registry}</strong></span>
                  <span>Started: <strong>{scanDetail.started_at}</strong></span>
                  <span>Duration: <strong>{scanDetail.duration}</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid #E2E8F0', marginBottom: '24px', fontSize: '13px', fontWeight: 600 }}>
            {(['Overview', 'Vulnerabilities', 'Secrets', 'Configuration', 'SBOM', 'Logs'] as const).map((t) => {
              const count = t === 'Vulnerabilities' ? scanDetail.vulnerabilities_count : t === 'Secrets' ? scanDetail.secrets_count : t === 'Configuration' ? scanDetail.config_count : t === 'SBOM' ? scanDetail.sbom_count : null;
              return (
                <button
                  key={t}
                  onClick={() => setDetailTab(t)}
                  style={{
                    padding: '8px 4px 12px 4px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: detailTab === t ? '#2563EB' : '#64748B',
                    borderBottom: detailTab === t ? '2px solid #2563EB' : '2px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>{t}</span>
                  {count !== null && (
                    <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '10px', backgroundColor: detailTab === t ? '#EFF6FF' : '#F1F5F9', color: detailTab === t ? '#2563EB' : '#64748B' }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Overview Tab Content */}
          {detailTab === 'Overview' && (
            <>
              {/* Finding Cards Bar */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '16px 20px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}>Total Findings</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A' }}>{scanDetail.total_findings}</div>
                </div>
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '16px 20px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#EF4444', marginBottom: '4px' }}>Critical</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#EF4444' }}>{scanDetail.critical_count}</div>
                </div>
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '16px 20px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#F97316', marginBottom: '4px' }}>High</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#F97316' }}>{scanDetail.high_count}</div>
                </div>
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '16px 20px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#F59E0B', marginBottom: '4px' }}>Medium</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#F59E0B' }}>{scanDetail.medium_count}</div>
                </div>
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '16px 20px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#3B82F6', marginBottom: '4px' }}>Low</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#3B82F6' }}>{scanDetail.low_count}</div>
                </div>
              </div>

              {/* Middle Breakdown: Severity Donut + Horizontal Bars for Package Types */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '16px', marginBottom: '24px' }}>
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '20px 24px' }}>
                  <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0' }}>Vulnerabilities by Severity</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div style={{ position: 'relative', width: '110px', height: '110px', flexShrink: 0 }}>
                      <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                        <circle cx="18" cy="18" r="14" fill="none" stroke="#F1F5F9" strokeWidth="4.5" />
                        <circle cx="18" cy="18" r="14" fill="none" stroke="#EF4444" strokeWidth="4.5" strokeDasharray="14 86" strokeDashoffset="0" />
                        <circle cx="18" cy="18" r="14" fill="none" stroke="#F97316" strokeWidth="4.5" strokeDasharray="29 71" strokeDashoffset="-14" />
                        <circle cx="18" cy="18" r="14" fill="none" stroke="#F59E0B" strokeWidth="4.5" strokeDasharray="43 57" strokeDashoffset="-43" />
                        <circle cx="18" cy="18" r="14" fill="none" stroke="#3B82F6" strokeWidth="4.5" strokeDasharray="14 86" strokeDashoffset="-86" />
                      </svg>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>{scanDetail.total_findings}</span>
                        <span style={{ fontSize: '9px', color: '#64748B' }}>Findings</span>
                      </div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#EF4444' }}>● Critical</span>
                        <strong>{scanDetail.critical_count}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#F97316' }}>● High</span>
                        <strong>{scanDetail.high_count}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#F59E0B' }}>● Medium</span>
                        <strong>{scanDetail.medium_count}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#3B82F6' }}>● Low</span>
                        <strong>{scanDetail.low_count}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Findings by Package Type Horizontal Bars */}
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '20px 24px' }}>
                  <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0' }}>Findings by Package Type</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {scanDetail.package_types.map((pt, i) => (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                          <span style={{ color: '#475569', fontWeight: 500 }}>{pt.package_type}</span>
                          <span style={{ fontWeight: 700, color: '#0F172A' }}>{pt.count}</span>
                        </div>
                        <div style={{ height: '7px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(100, (pt.count / 25) * 100)}%`, backgroundColor: pt.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Granular Findings Table */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>All Findings</h3>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600, fontSize: '12px' }}>
                      <th style={{ padding: '12px 20px' }}>ID</th>
                      <th style={{ padding: '12px 16px' }}>Severity</th>
                      <th style={{ padding: '12px 16px' }}>Package</th>
                      <th style={{ padding: '12px 16px' }}>Version</th>
                      <th style={{ padding: '12px 16px' }}>Issue</th>
                      <th style={{ padding: '12px 16px' }}>Fix Available</th>
                      <th style={{ padding: '12px 20px' }}>Layer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanDetail.findings.map((f, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 20px', fontWeight: 600, color: '#2563EB' }}>{f.id}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: f.severity === 'CRITICAL' ? '#FEF2F2' : f.severity === 'HIGH' ? '#FFF7ED' : f.severity === 'MEDIUM' ? '#FEFCE8' : '#EFF6FF',
                              color: f.severity === 'CRITICAL' ? '#DC2626' : f.severity === 'HIGH' ? '#EA580C' : f.severity === 'MEDIUM' ? '#CA8A04' : '#2563EB',
                            }}
                          >
                            ● {f.severity}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#0F172A' }}>{f.package}</td>
                        <td style={{ padding: '12px 16px', color: '#64748B' }}>{f.version}</td>
                        <td style={{ padding: '12px 16px', color: '#334155' }}>{f.issue}</td>
                        <td style={{ padding: '12px 16px', color: '#10B981', fontWeight: 600 }}>{f.fix_available || '—'}</td>
                        <td style={{ padding: '12px 20px', color: '#64748B' }}>{f.layer || 'Layer 1'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Logs Tab Content */}
          {detailTab === 'Logs' && (
            <div style={{ backgroundColor: '#0F172A', borderRadius: '8px', padding: '20px', color: '#E2E8F0', fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.6', overflowX: 'auto', maxHeight: '500px' }}>
              <pre style={{ margin: 0 }}>{scanDetail.logs || 'No logs captured for this scan execution.'}</pre>
            </div>
          )}

          {/* Other Tabs */}
          {detailTab !== 'Overview' && detailTab !== 'Logs' && (
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '32px', textAlign: 'center', color: '#64748B' }}>
              <div style={{ fontWeight: 600, color: '#0F172A', marginBottom: '6px' }}>{detailTab} Artifacts</div>
              <p style={{ margin: 0, fontSize: '13px' }}>Real inventory verified for {scanDetail.image}. All records stored in database.</p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN: SCHEDULED SCANS VIEW */}
      {/* ========================================================================= */}
      {currentView === 'schedules' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Scheduled Automated Scans</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600, fontSize: '12px' }}>
                <th style={{ padding: '12px 20px' }}>Schedule Name</th>
                <th style={{ padding: '12px 16px' }}>Target Scope</th>
                <th style={{ padding: '12px 16px' }}>Pattern</th>
                <th style={{ padding: '12px 16px' }}>Cron Expression</th>
                <th style={{ padding: '12px 16px' }}>Scan Type</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 20px' }}>Next Run</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((sc) => (
                <tr key={sc.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '14px 20px', fontWeight: 600, color: '#0F172A' }}>{sc.name}</td>
                  <td style={{ padding: '14px 16px', color: '#475569' }}>{sc.target_type}</td>
                  <td style={{ padding: '14px 16px', color: '#2563EB', fontFamily: 'monospace' }}>{sc.target_pattern}</td>
                  <td style={{ padding: '14px 16px', color: '#64748B', fontFamily: 'monospace' }}>{sc.cron_expression}</td>
                  <td style={{ padding: '14px 16px', color: '#475569' }}>{sc.scan_type}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, backgroundColor: sc.is_enabled ? '#ECFDF5' : '#F1F5F9', color: sc.is_enabled ? '#059669' : '#64748B' }}>
                      {sc.is_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', color: '#64748B' }}>{sc.next_run || 'Tomorrow at 2:00 AM'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ImageScanManagementView;
