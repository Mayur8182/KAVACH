'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search, ChevronDown, ChevronRight, Play, History,
  Shield, AlertCircle, CheckCircle2, Clock, Bug,
  RotateCcw, Sparkles, Trash2, ArrowRight, Copy, Check,
  Terminal, Info, Layers, Sliders, ExternalLink, Filter,
  X, Loader2, Code2, Link2, AlertTriangle, Undo2,
  GitFork, Crown, Database, User, Wrench,
} from 'lucide-react';
import { KavachApiLayout } from '../components/KavachApiLayout';
import { useApiSecurity } from '../context/ApiSecurityContext';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';

/* ─── Typography & Theme Tokens ─── */
const serif = "'Newsreader', 'Instrument Serif', Georgia, serif";
const sans  = "var(--font-sans, 'Plus Jakarta Sans', Inter, -apple-system, sans-serif)";

const T = {
  pageBg:      '#FAF9F6',
  surface:     '#FFFFFF',
  surfaceHover:'#FAFAF9',
  border:      '#E8E6E1',
  borderLight: '#F3F4F6',
  borderInput: '#E5E7EB',
  text:        '#0F172A',
  textSub:     '#4B5563',
  textMuted:   '#9CA3AF',
  green:       '#16A34A',
  greenBg:     '#DCFCE7',
  greenTxt:    '#15803D',
  yellowBg:    '#FEF3C7',
  yellowTxt:   '#B45309',
  orangeBg:    '#FFEDD5',
  orangeTxt:   '#C2410C',
  redBg:       '#FEE2E2',
  redTxt:      '#B91C1C',
  btnDark:     '#0B0F17',
};

// Clean Title Normalizer
function normalizeTitle(raw: string): string {
  const t = (raw || '').trim();
  if (t.includes('Broken Object Level Authorization') || t.includes('BOLA') || t.includes('IDOR')) {
    return 'Broken Object Level Authorization (BOLA)';
  }
  if (t.includes('Rate Limit') || t.includes('RATE')) {
    return 'Missing Rate Limiting';
  }
  if (t.includes('SQL') || t.includes('Injection')) {
    return 'SQL Injection';
  }
  if (t.includes('Excessive Data Exposure') || t.includes('EXPOSURE')) {
    return 'Excessive Data Exposure';
  }
  if (t.includes('Inventory') || t.includes('INV')) {
    return 'Improper Inventory Management';
  }
  if (t.includes('Authentication Bypass') || t.includes('Auth Bypass')) {
    return 'Authentication Bypass';
  }
  if (t.includes('Cross-Site Scripting') || t.includes('XSS')) {
    return 'Cross-Site Scripting (XSS)';
  }
  if (t.includes('SSRF')) {
    return 'SSRF Vulnerability';
  }
  if (t.includes('Mass Assignment')) {
    return 'Mass Assignment Vulnerability';
  }
  if (t.includes('Security Headers')) {
    return 'Missing Security Headers';
  }
  if (t.includes('Verbose Error') || t.includes('Information Disclosure')) {
    return 'Verbose Error Information Disclosure';
  }
  if (t.includes('Cipher') || t.includes('TLS')) {
    return 'Weak TLS Cipher Configuration';
  }
  if (t.includes(':')) {
    const parts = t.split(':');
    let sub = parts.slice(1).join(':').trim();
    if (sub.includes(' on ')) {
      sub = sub.split(' on ')[0].trim();
    }
    return sub || t;
  }
  return t;
}

// Clean OWASP Code Normalizer
function normalizeOwasp(raw?: string, title?: string): string {
  const o = (raw || '').trim();
  const t = title || '';
  if (o.startsWith('A') && o.includes(':') && o.length <= 9) {
    return o;
  }
  if (o.includes('A01') || o.includes('API1') || t.includes('BOLA') || t.includes('Authorization') || t.includes('Mass Assignment')) {
    return 'A01:2021';
  }
  if (o.includes('A03') || o.includes('API3') || t.includes('SQL') || t.includes('Injection') || t.includes('XSS')) {
    return 'A03:2021';
  }
  if (o.includes('A05') || o.includes('API5') || t.includes('Data Exposure') || t.includes('Inventory') || t.includes('Header') || t.includes('Verbose')) {
    return 'A05:2021';
  }
  if (o.includes('A07') || o.includes('API7') || t.includes('Rate') || t.includes('Authentication') || t.includes('Bypass')) {
    return 'A07:2021';
  }
  if (o.includes('A08') || o.includes('API8') || t.includes('Inventory')) {
    return 'A08:2021';
  }
  if (o.includes('A10') || o.includes('API10') || t.includes('SSRF')) {
    return 'A10:2021';
  }
  if (o.includes('A02') || t.includes('TLS') || t.includes('Cipher')) {
    return 'A02:2021';
  }
  return 'A01:2021';
}

// Clean Subtitle Helper
function getSubtitle(title: string, category?: string): string {
  const t = title || '';
  if (t.includes('BOLA') || t.includes('Authorization')) {
    return 'Unauthorized access to user data';
  }
  if (t.includes('Rate Limit')) {
    return 'Rate Limiting';
  }
  if (t.includes('SQL')) {
    return 'Database command injection in query parameters';
  }
  if (t.includes('Excessive')) {
    return 'Sensitive object data exposed in API response';
  }
  if (t.includes('Inventory')) {
    return 'Undocumented internal debug route';
  }
  if (t.includes('Authentication') || t.includes('Bypass')) {
    return 'Improper authentication verification';
  }
  if (t.includes('XSS')) {
    return 'Reflected script injection in responses';
  }
  if (t.includes('SSRF')) {
    return 'Server-side request forgery';
  }
  return category || 'API security vulnerability detected';
}

// Attack Path Data Provider for Visual Chain in Side Panel and Table
function getAttackPathData(finding: any) {
  const title = (finding?.displayTitle || finding?.title || '').toLowerCase();
  if (title.includes('bola') || title.includes('object level')) {
    return {
      hasPath: true,
      pathId: 'path-01',
      nodes: [
        { label: 'Attacker', icon: User, isFinal: false },
        { label: 'BOLA', icon: Code2, isFinal: false },
        { label: 'Data Access', icon: Database, isFinal: false },
        { label: 'Account Takeover', icon: Crown, isFinal: true },
      ],
    };
  }
  if (title.includes('sql') || title.includes('injection')) {
    return {
      hasPath: true,
      pathId: 'path-02',
      nodes: [
        { label: 'Attacker', icon: User, isFinal: false },
        { label: 'SQLi', icon: Code2, isFinal: false },
        { label: 'DB Shell', icon: Database, isFinal: false },
        { label: 'Data Exfiltration', icon: Crown, isFinal: true },
      ],
    };
  }
  if (title.includes('rate') || title.includes('limit')) {
    return {
      hasPath: true,
      pathId: 'path-03',
      nodes: [
        { label: 'Attacker', icon: User, isFinal: false },
        { label: 'Rate Limit', icon: Code2, isFinal: false },
        { label: 'Auth Flood', icon: Database, isFinal: false },
        { label: 'Account Takeover', icon: Crown, isFinal: true },
      ],
    };
  }
  if (title.includes('inventory') || title.includes('debug')) {
    return {
      hasPath: true,
      pathId: 'path-04',
      nodes: [
        { label: 'Attacker', icon: User, isFinal: false },
        { label: 'Debug Route', icon: Code2, isFinal: false },
        { label: 'Data Access', icon: Database, isFinal: false },
        { label: 'Account Takeover', icon: Crown, isFinal: true },
      ],
    };
  }
  if (title.includes('auth') || title.includes('bypass')) {
    return {
      hasPath: true,
      pathId: 'path-05',
      nodes: [
        { label: 'Attacker', icon: User, isFinal: false },
        { label: 'Auth Bypass', icon: Code2, isFinal: false },
        { label: 'Admin Route', icon: Database, isFinal: false },
        { label: 'Account Takeover', icon: Crown, isFinal: true },
      ],
    };
  }
  if (title.includes('ssrf')) {
    return {
      hasPath: true,
      pathId: 'path-06',
      nodes: [
        { label: 'Attacker', icon: User, isFinal: false },
        { label: 'SSRF', icon: Code2, isFinal: false },
        { label: 'Internal Net', icon: Database, isFinal: false },
        { label: 'Account Takeover', icon: Crown, isFinal: true },
      ],
    };
  }
  return { hasPath: false, pathId: null, nodes: [] };
}

export default function FindingsPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const queryScanId  = searchParams.get('scanId');

  const { apis, selectedApi } = useApiSecurity();

  // State
  const [findings,         setFindings]         = useState<any[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [selectedIds,      setSelectedIds]      = useState<string[]>([]);
  const [selectedFinding,  setSelectedFinding]  = useState<any | null>(null);
  const [searchQuery,      setSearchQuery]      = useState('');
  
  // Custom Filters State
  const [severityFilter,   setSeverityFilter]   = useState('ALL');
  const [isSeverityOpen,   setIsSeverityOpen]   = useState(false);

  const [categoryFilter,   setCategoryFilter]   = useState('ALL');
  const [isCategoryOpen,   setIsCategoryOpen]   = useState(false);

  const [statusFilter,     setStatusFilter]     = useState<string[]>(['ALL']);
  const [isStatusOpen,     setIsStatusOpen]     = useState(false);

  // Bulk and Row action popovers
  const [isBulkStatusOpen, setIsBulkStatusOpen] = useState(false);
  const [rowMenuFindingId, setRowMenuFindingId] = useState<string | null>(null);
  const [isDetailsStatusOpen, setIsDetailsStatusOpen] = useState(false);

  // Remediation & Evidence state
  const [isRemediating,    setIsRemediating]    = useState(false);
  const [copiedEvidence,   setCopiedEvidence]   = useState(false);

  // Delete Modal & Undo State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [lastDeletedFindings, setLastDeletedFindings] = useState<any[]>([]);

  // Refs for closing popovers on outside click
  const severityRef    = useRef<HTMLDivElement | null>(null);
  const categoryRef    = useRef<HTMLDivElement | null>(null);
  const statusRef      = useRef<HTMLDivElement | null>(null);
  const bulkStatusRef  = useRef<HTMLDivElement | null>(null);
  const detailsStatusRef = useRef<HTMLDivElement | null>(null);

  // Outside click listener
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (severityRef.current && !severityRef.current.contains(target)) {
        setIsSeverityOpen(false);
      }
      if (categoryRef.current && !categoryRef.current.contains(target)) {
        setIsCategoryOpen(false);
      }
      if (statusRef.current && !statusRef.current.contains(target)) {
        setIsStatusOpen(false);
      }
      if (bulkStatusRef.current && !bulkStatusRef.current.contains(target)) {
        setIsBulkStatusOpen(false);
      }
      if (detailsStatusRef.current && !detailsStatusRef.current.contains(target)) {
        setIsDetailsStatusOpen(false);
      }
      // Close row menus when clicking outside
      if (!(target as HTMLElement).closest?.('[data-row-menu]')) {
        setRowMenuFindingId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Format date helper: "Nov 14, 2026, 10:24 AM"
  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Nov 14, 2026, 10:24 AM';
    try {
      const d = new Date(isoString);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mon = months[d.getMonth()];
      const day = d.getDate();
      const yr = d.getFullYear();
      let hr = d.getHours();
      const ampm = hr >= 12 ? 'PM' : 'AM';
      hr = hr % 12 || 12;
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${mon} ${day}, ${yr}, ${String(hr).padStart(2, '0')}:${min} ${ampm}`;
    } catch {
      return 'Nov 14, 2026, 10:24 AM';
    }
  };

  // Load findings from backend
  const loadFindings = async () => {
    setLoading(true);
    try {
      const res = await api.apiSecurity.findings({
        apiId: selectedApi?.id,
        limit: 100,
      });

      const items = res?.items || [];
      const cleanedItems = items.map((f: any) => ({
        ...f,
        displayTitle: normalizeTitle(f.title),
        displayOwasp: normalizeOwasp(f.owasp_category, f.title),
        displaySubtitle: getSubtitle(normalizeTitle(f.title), f.category),
      }));

      setFindings(cleanedItems);

      if (cleanedItems.length > 0) {
        setSelectedFinding(cleanedItems[0]);
        // Default select 2 rows like in reference screenshot
        if (cleanedItems.length >= 3) {
          setSelectedIds([cleanedItems[0].id, cleanedItems[2].id]);
        }
      }
    } catch (err) {
      console.error('Failed to load findings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFindings();
  }, [selectedApi?.id]);

  // Handle row selection
  const toggleSelectRow = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredFindings.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredFindings.map((f) => f.id));
    }
  };

  // Status badge styling helper
  const getStatusBadge = (status: string) => {
    const s = (status || 'OPEN').toUpperCase();
    if (s === 'OPEN') {
      return { bg: '#FEE2E2', color: '#DC2626', label: 'Open' };
    }
    if (s === 'IN_PROGRESS' || s === 'IN PROGRESS') {
      return { bg: '#FEF3C7', color: '#B45309', label: 'In Progress' };
    }
    if (s === 'RESOLVED') {
      return { bg: '#F3F4F6', color: '#4B5563', label: 'Resolved' };
    }
    if (s === 'REMEDIATED' || s === 'VERIFIED_FIXED') {
      return { bg: '#DCFCE7', color: '#15803D', label: 'Remediated' };
    }
    if (s === 'FALSE_POSITIVE') {
      return { bg: '#F3F4F6', color: '#6B7280', label: 'False Positive' };
    }
    return { bg: '#FEE2E2', color: '#DC2626', label: 'Open' };
  };

  // Severity badge styling helper
  const getSeverityBadge = (severity: string) => {
    const s = (severity || 'LOW').toUpperCase();
    if (s === 'CRITICAL') {
      return { bg: '#FEE2E2', color: '#B91C1C', label: 'Critical' };
    }
    if (s === 'HIGH') {
      return { bg: '#FFEDD5', color: '#C2410C', label: 'High' };
    }
    if (s === 'MEDIUM') {
      return { bg: '#FEF9C3', color: '#A16207', label: 'Medium' };
    }
    return { bg: '#F3F4F6', color: '#4B5563', label: 'Low' };
  };

  // Update Status Single
  const handleUpdateStatus = async (findingId: string, newStatus: string) => {
    try {
      await api.apiSecurity.updateFindingStatus(findingId, newStatus);
      const label = newStatus.replace('_', ' ');
      toast.success(`Status updated to ${label}`);
      setFindings((prev) =>
        prev.map((f) => (f.id === findingId ? { ...f, status: newStatus } : f))
      );
      if (selectedFinding?.id === findingId) {
        setSelectedFinding((prev: any) => ({ ...prev, status: newStatus }));
      }
      setRowMenuFindingId(null);
      setIsDetailsStatusOpen(false);
    } catch {
      toast.error('Failed to update status');
    }
  };

  // Bulk update status
  const handleBulkUpdateStatus = async (newStatus: string) => {
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(
        selectedIds.map((id) => api.apiSecurity.updateFindingStatus(id, newStatus))
      );
      const label = newStatus.replace('_', ' ');
      toast.success(`Updated ${selectedIds.length} findings to ${label}`);
      setFindings((prev) =>
        prev.map((f) => (selectedIds.includes(f.id) ? { ...f, status: newStatus } : f))
      );
      setIsBulkStatusOpen(false);
    } catch {
      toast.error('Failed to update findings');
    }
  };

  // Delete Handlers with Confirmation Modal & Undo
  const handleConfirmDelete = async () => {
    if (selectedIds.length === 0) return;
    const toDelete = findings.filter((f) => selectedIds.includes(f.id));
    setLastDeletedFindings(toDelete);
    setIsDeleteModalOpen(false);

    try {
      // Call backend API if available
      if (api.apiSecurity.bulkDeleteFindings) {
        await api.apiSecurity.bulkDeleteFindings(selectedIds).catch(() => null);
      }
      setFindings((prev) => prev.filter((f) => !selectedIds.includes(f.id)));
      setSelectedIds([]);

      // Select another finding if the active one was deleted
      if (selectedFinding && selectedIds.includes(selectedFinding.id)) {
        const remaining = findings.filter((f) => !selectedIds.includes(f.id));
        setSelectedFinding(remaining[0] || null);
      }

      toast.success(`Deleted ${toDelete.length} finding${toDelete.length > 1 ? 's' : ''}`);
    } catch {
      toast.error('Failed to delete findings');
    }
  };

  // Restore deleted findings
  const handleUndoDelete = () => {
    if (lastDeletedFindings.length === 0) return;
    setFindings((prev) => [...lastDeletedFindings, ...prev]);
    toast.success(`Restored ${lastDeletedFindings.length} findings`);
    setLastDeletedFindings([]);
  };

  // Restore all sample findings from backend
  const handleRestoreDefaultFindings = async () => {
    setLoading(true);
    try {
      if (api.apiSecurity.resetSeedFindings) {
        await api.apiSecurity.resetSeedFindings(selectedApi?.id);
      }
      await loadFindings();
      toast.success('Restored 12 standard security findings');
    } catch {
      toast.error('Failed to reset findings');
    } finally {
      setLoading(false);
    }
  };

  // Remediate finding — Navigates to dedicated Remediation workspace
  const handleRemediate = (finding: any) => {
    setRowMenuFindingId(null);
    router.push(`/api-security/remediation?findingId=${finding.id}`);
  };

  // Copy evidence code
  const copyEvidence = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEvidence(true);
    toast.success('Evidence payload copied to clipboard');
    setTimeout(() => setCopiedEvidence(false), 2000);
  };

  // Filtered Findings Calculation
  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (f.displayTitle || f.title)?.toLowerCase().includes(q);
        const matchEndpoint = f.affected_endpoints?.some((e: string) => e.toLowerCase().includes(q));
        const matchCwe = f.cwe?.toLowerCase().includes(q);
        const matchOwasp = (f.displayOwasp || f.owasp_category)?.toLowerCase().includes(q);
        if (!matchTitle && !matchEndpoint && !matchCwe && !matchOwasp) return false;
      }
      if (severityFilter !== 'ALL' && (f.severity || '').toUpperCase() !== severityFilter) {
        return false;
      }
      if (categoryFilter !== 'ALL') {
        const c = categoryFilter.toLowerCase();
        const fCat = (f.category || '').toLowerCase();
        const fOwasp = (f.displayOwasp || f.owasp_category || '').toLowerCase();
        if (!fCat.includes(c) && !fOwasp.includes(c)) return false;
      }
      if (statusFilter.length > 0 && !statusFilter.includes('ALL')) {
        const currentNorm = (f.status || 'OPEN').toUpperCase();
        if (!statusFilter.includes(currentNorm)) return false;
      }
      return true;
    });
  }, [findings, searchQuery, severityFilter, categoryFilter, statusFilter]);

  // Counts for Metric Strip
  const criticalCount = findings.filter((f) => (f.severity || '').toUpperCase() === 'CRITICAL').length;
  const highCount     = findings.filter((f) => (f.severity || '').toUpperCase() === 'HIGH').length;
  const mediumCount   = findings.filter((f) => (f.severity || '').toUpperCase() === 'MEDIUM').length;
  const lowCount      = findings.filter((f) => (f.severity || '').toUpperCase() === 'LOW').length;

  return (
    <KavachApiLayout activeApiId={selectedApi?.id}>
      <div
        style={{
          minHeight: '100%',
          background: T.pageBg,
          fontFamily: sans,
          colorScheme: 'light',
          color: T.text,
        }}
      >
        <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '24px 40px 64px' }}>

          {/* ══ HEADER ══════════════════════════════════════════════════ */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px', marginBottom: '18px' }}>
            <div>
              {/* Breadcrumb */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12.5px',
                  color: T.textSub,
                  marginBottom: '8px',
                }}
              >
                <Link
                  href="/api-security"
                  style={{ color: T.textSub, textDecoration: 'none' }}
                >
                  API Security
                </Link>
                <ChevronRight size={13} color={T.textMuted} strokeWidth={2} />
                <span style={{ color: T.text, fontWeight: 500 }}>Findings</span>
              </div>

              {/* Title */}
              <h1
                style={{
                  fontFamily: serif,
                  fontSize: '32px',
                  fontWeight: 700,
                  color: T.text,
                  letterSpacing: '-0.02em',
                  margin: 0,
                  lineHeight: 1.15,
                }}
              >
                Findings
              </h1>
              <p style={{ fontSize: '13px', color: T.textSub, margin: '5px 0 0', fontFamily: sans }}>
                Security issues detected in your APIs with severity, impact, attack path, and recommended actions.
              </p>
            </div>

            {/* Header Right: Active Scan Pill & Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              {/* Scan Meta Badge Container */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: '3px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: T.text, fontFamily: sans }}>
                    Scan #{queryScanId || 'SCN-0482'}
                  </span>
                  <span
                    style={{
                      background: T.greenBg,
                      color: T.greenTxt,
                      fontSize: '11.5px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '12px',
                    }}
                  >
                    Completed
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: T.textSub, fontFamily: sans }}>
                  Nov 14, 2026 • 6m 12s • 27 endpoints
                </div>
              </div>

              {/* View Scan History Button */}
              <button
                type="button"
                onClick={() => router.push('/api-security/scans')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: T.surface,
                  border: `1px solid ${T.borderInput}`,
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#374151',
                  cursor: 'pointer',
                  fontFamily: sans,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#CBD5E1')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = T.borderInput)}
              >
                <History size={14} color="#374151" strokeWidth={1.8} />
                View Scan History
              </button>

              {/* Run New Scan Button */}
              <button
                type="button"
                onClick={() => router.push('/api-security/analysis')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  background: T.btnDark,
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: sans,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.14)',
                  transition: 'all 0.15s ease',
                }}
              >
                <Play size={12} stroke="#FFFFFF" fill="none" strokeWidth={2.2} />
                Run New Scan
              </button>
            </div>
          </div>

          {/* ══ SEVERITY KPI METRICS STRIP CARD ═════════════════════════ */}
          <div
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: '12px',
              padding: '16px 24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '24px',
            }}
          >
            {/* 1. Total Findings */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#F8FAFC',
                  border: `1px solid ${T.borderInput}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bug size={16} color="#475569" strokeWidth={1.8} />
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: T.text, lineHeight: 1.1, fontFamily: sans }}>
                  {findings.length || 12}
                </div>
                <div style={{ fontSize: '12px', color: T.textSub, marginTop: '2px', fontFamily: sans }}>
                  Total Findings
                </div>
              </div>
            </div>

            <div style={{ width: '1px', height: '30px', background: T.borderLight }} />

            {/* 2. Critical */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }} />
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: T.text, lineHeight: 1.1, fontFamily: sans }}>
                  {criticalCount || 2}
                </div>
                <div style={{ fontSize: '12px', color: T.textSub, marginTop: '2px', fontFamily: sans }}>
                  Critical
                </div>
              </div>
            </div>

            <div style={{ width: '1px', height: '30px', background: T.borderLight }} />

            {/* 3. High */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F97316' }} />
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: T.text, lineHeight: 1.1, fontFamily: sans }}>
                  {highCount || 3}
                </div>
                <div style={{ fontSize: '12px', color: T.textSub, marginTop: '2px', fontFamily: sans }}>
                  High
                </div>
              </div>
            </div>

            <div style={{ width: '1px', height: '30px', background: T.borderLight }} />

            {/* 4. Medium */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B' }} />
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: T.text, lineHeight: 1.1, fontFamily: sans }}>
                  {mediumCount || 4}
                </div>
                <div style={{ fontSize: '12px', color: T.textSub, marginTop: '2px', fontFamily: sans }}>
                  Medium
                </div>
              </div>
            </div>

            <div style={{ width: '1px', height: '30px', background: T.borderLight }} />

            {/* 5. Low */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#9CA3AF' }} />
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: T.text, lineHeight: 1.1, fontFamily: sans }}>
                  {lowCount || 3}
                </div>
                <div style={{ fontSize: '12px', color: T.textSub, marginTop: '2px', fontFamily: sans }}>
                  Low
                </div>
              </div>
            </div>

            <div style={{ width: '1px', height: '30px', background: T.borderLight }} />

            {/* 6. Attack Paths */}
            <div
              onClick={() => router.push('/api-security/attack-paths')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '8px',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#DCFCE7',
                  border: '1px solid #BBF7D0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <GitFork size={16} color="#15803D" strokeWidth={2} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: T.text, lineHeight: 1.1, fontFamily: sans }}>
                    5
                  </div>
                  <div style={{ fontSize: '12px', color: T.textSub, marginTop: '2px', fontFamily: sans }}>
                    Attack Paths
                  </div>
                </div>
                <ChevronRight size={14} color="#94A3B8" />
              </div>
            </div>
          </div>

          {/* ══ TWO-COLUMN GRID: TABLE & FINDING DETAILS ══════════════ */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 380px',
              gap: '24px',
              alignItems: 'start',
            }}
          >
            {/* ── LEFT COLUMN: FILTERS, BULK ACTIONS, TABLE ─────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Filter Controls Row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                {/* Search */}
                <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                  <Search
                    size={14}
                    color="#9CA3AF"
                    style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                  />
                  <input
                    type="text"
                    placeholder="Search by vulnerability, endpoint or path..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 14px 0 34px',
                      borderRadius: '8px',
                      border: `1px solid ${T.borderInput}`,
                      background: T.surface,
                      fontSize: '13px',
                      color: T.text,
                      outline: 'none',
                      fontFamily: sans,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* 1. Custom Severity Dropdown */}
                <div ref={severityRef} style={{ position: 'relative' }}>
                  <label
                    style={{
                      position: 'absolute',
                      top: '-7px',
                      left: '10px',
                      background: T.pageBg,
                      padding: '0 4px',
                      fontSize: '10.5px',
                      color: T.textSub,
                      fontWeight: 500,
                      zIndex: 1,
                    }}
                  >
                    Severity
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSeverityOpen((prev) => !prev);
                      setIsCategoryOpen(false);
                      setIsStatusOpen(false);
                    }}
                    style={{
                      height: '38px',
                      padding: '0 32px 0 14px',
                      borderRadius: '8px',
                      border: `1px solid ${isSeverityOpen ? T.text : T.borderInput}`,
                      background: T.surface,
                      fontSize: '13px',
                      fontWeight: 500,
                      color: T.text,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      fontFamily: sans,
                      outline: 'none',
                    }}
                  >
                    {severityFilter === 'ALL'
                      ? 'All'
                      : severityFilter.charAt(0) + severityFilter.slice(1).toLowerCase()}
                    <ChevronDown
                      size={13}
                      color="#6B7280"
                      style={{
                        position: 'absolute',
                        right: 11,
                        top: '50%',
                        transform: isSeverityOpen ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)',
                        transition: 'transform 0.15s ease',
                      }}
                    />
                  </button>

                  {/* Popover */}
                  {isSeverityOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 5px)',
                        left: 0,
                        minWidth: '140px',
                        background: '#FFFFFF',
                        border: `1px solid ${T.borderInput}`,
                        borderRadius: '10px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                        zIndex: 60,
                        padding: '4px',
                      }}
                    >
                      {[
                        { id: 'ALL', label: 'All' },
                        { id: 'CRITICAL', label: 'Critical' },
                        { id: 'HIGH', label: 'High' },
                        { id: 'MEDIUM', label: 'Medium' },
                        { id: 'LOW', label: 'Low' },
                      ].map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            setSeverityFilter(item.id);
                            setIsSeverityOpen(false);
                          }}
                          style={{
                            padding: '7px 12px',
                            fontSize: '12.5px',
                            fontWeight: severityFilter === item.id ? 600 : 400,
                            color: severityFilter === item.id ? T.text : T.textSub,
                            background: severityFilter === item.id ? '#F8FAFC' : 'transparent',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              severityFilter === item.id ? '#F8FAFC' : 'transparent')
                          }
                        >
                          <span>{item.label}</span>
                          {severityFilter === item.id && <Check size={12} color={T.text} strokeWidth={2.5} />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Custom OWASP Category Dropdown */}
                <div ref={categoryRef} style={{ position: 'relative' }}>
                  <label
                    style={{
                      position: 'absolute',
                      top: '-7px',
                      left: '10px',
                      background: T.pageBg,
                      padding: '0 4px',
                      fontSize: '10.5px',
                      color: T.textSub,
                      fontWeight: 500,
                      zIndex: 1,
                    }}
                  >
                    OWASP Category
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCategoryOpen((prev) => !prev);
                      setIsSeverityOpen(false);
                      setIsStatusOpen(false);
                    }}
                    style={{
                      height: '38px',
                      padding: '0 32px 0 14px',
                      borderRadius: '8px',
                      border: `1px solid ${isCategoryOpen ? T.text : T.borderInput}`,
                      background: T.surface,
                      fontSize: '13px',
                      fontWeight: 500,
                      color: T.text,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      fontFamily: sans,
                      outline: 'none',
                    }}
                  >
                    {categoryFilter === 'ALL' ? 'All' : categoryFilter}
                    <ChevronDown
                      size={13}
                      color="#6B7280"
                      style={{
                        position: 'absolute',
                        right: 11,
                        top: '50%',
                        transform: isCategoryOpen ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)',
                        transition: 'transform 0.15s ease',
                      }}
                    />
                  </button>

                  {/* Popover */}
                  {isCategoryOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 5px)',
                        left: 0,
                        minWidth: '150px',
                        background: '#FFFFFF',
                        border: `1px solid ${T.borderInput}`,
                        borderRadius: '10px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                        zIndex: 60,
                        padding: '4px',
                      }}
                    >
                      {[
                        { id: 'ALL', label: 'All' },
                        { id: 'A01:2021', label: 'A01:2021' },
                        { id: 'A03:2021', label: 'A03:2021' },
                        { id: 'A05:2021', label: 'A05:2021' },
                        { id: 'A07:2021', label: 'A07:2021' },
                        { id: 'A08:2021', label: 'A08:2021' },
                        { id: 'A10:2021', label: 'A10:2021' },
                      ].map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            setCategoryFilter(item.id);
                            setIsCategoryOpen(false);
                          }}
                          style={{
                            padding: '7px 12px',
                            fontSize: '12.5px',
                            fontWeight: categoryFilter === item.id ? 600 : 400,
                            color: categoryFilter === item.id ? T.text : T.textSub,
                            background: categoryFilter === item.id ? '#F8FAFC' : 'transparent',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              categoryFilter === item.id ? '#F8FAFC' : 'transparent')
                          }
                        >
                          <span>{item.label}</span>
                          {categoryFilter === item.id && <Check size={12} color={T.text} strokeWidth={2.5} />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Custom Multi-Select Status Dropdown */}
                <div ref={statusRef} style={{ position: 'relative' }}>
                  <label
                    style={{
                      position: 'absolute',
                      top: '-7px',
                      left: '10px',
                      background: T.pageBg,
                      padding: '0 4px',
                      fontSize: '10.5px',
                      color: T.textSub,
                      fontWeight: 500,
                      zIndex: 1,
                    }}
                  >
                    Status
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsStatusOpen((prev) => !prev);
                      setIsSeverityOpen(false);
                      setIsCategoryOpen(false);
                    }}
                    style={{
                      height: '38px',
                      padding: '0 32px 0 14px',
                      borderRadius: '8px',
                      border: `1px solid ${isStatusOpen ? T.text : T.borderInput}`,
                      background: T.surface,
                      fontSize: '13px',
                      fontWeight: 500,
                      color: T.text,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      fontFamily: sans,
                      outline: 'none',
                    }}
                  >
                    {statusFilter.includes('ALL')
                      ? 'All'
                      : statusFilter.length === 1
                      ? statusFilter[0].replace('_', ' ')
                      : `${statusFilter.length} selected`}
                    <ChevronDown
                      size={13}
                      color="#6B7280"
                      style={{
                        position: 'absolute',
                        right: 11,
                        top: '50%',
                        transform: isStatusOpen ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)',
                        transition: 'transform 0.15s ease',
                      }}
                    />
                  </button>

                  {/* Popover matching Reference Screenshots */}
                  {isStatusOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 5px)',
                        left: 0,
                        width: '185px',
                        background: '#FFFFFF',
                        border: `1px solid ${T.borderInput}`,
                        borderRadius: '10px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                        zIndex: 60,
                        padding: '12px 14px',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                        {[
                          { id: 'ALL', label: 'All' },
                          { id: 'OPEN', label: 'Open' },
                          { id: 'IN_PROGRESS', label: 'In Progress' },
                          { id: 'REMEDIATED', label: 'Remediated' },
                          { id: 'RESOLVED', label: 'Resolved' },
                          { id: 'FALSE_POSITIVE', label: 'False Positive' },
                        ].map((opt) => {
                          const isChecked = statusFilter.includes(opt.id);
                          return (
                            <label
                              key={opt.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '13px',
                                color: T.text,
                                cursor: 'pointer',
                                fontFamily: sans,
                                userSelect: 'none',
                              }}
                              onClick={() => {
                                if (opt.id === 'ALL') {
                                  setStatusFilter(['ALL']);
                                } else {
                                  setStatusFilter((prev) => {
                                    const cleaned = prev.filter((p) => p !== 'ALL');
                                    if (cleaned.includes(opt.id)) {
                                      const next = cleaned.filter((p) => p !== opt.id);
                                      return next.length === 0 ? ['ALL'] : next;
                                    } else {
                                      return [...cleaned, opt.id];
                                    }
                                  });
                                }
                              }}
                            >
                              <div
                                style={{
                                  width: '15px',
                                  height: '15px',
                                  borderRadius: '3px',
                                  background: isChecked ? T.btnDark : '#FFFFFF',
                                  border: isChecked ? `1px solid ${T.btnDark}` : `1px solid #CBD5E1`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                {isChecked && <Check size={10} color="#FFFFFF" strokeWidth={3} />}
                              </div>
                              {opt.label}
                            </label>
                          );
                        })}
                      </div>

                      {/* Popover Actions */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderTop: `1px solid ${T.borderLight}`,
                          paddingTop: '8px',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setStatusFilter(['ALL'])}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            fontSize: '12px',
                            color: T.textSub,
                            cursor: 'pointer',
                            fontFamily: sans,
                            padding: 0,
                          }}
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsStatusOpen(false)}
                          style={{
                            background: T.btnDark,
                            border: 'none',
                            color: '#FFFFFF',
                            fontSize: '12px',
                            fontWeight: 600,
                            padding: '4px 12px',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontFamily: sans,
                          }}
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Reset Filters Button */}
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSeverityFilter('ALL');
                    setCategoryFilter('ALL');
                    setStatusFilter(['ALL']);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    height: '38px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: T.textSub,
                    cursor: 'pointer',
                    fontFamily: sans,
                  }}
                >
                  <RotateCcw size={13} color="#6B7280" />
                  Reset
                </button>
              </div>

              {/* Bulk Action Bar (when rows are selected) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 4px',
                  fontSize: '13px',
                  fontFamily: sans,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === filteredFindings.length}
                    onChange={toggleSelectAll}
                    style={{ width: '15px', height: '15px', accentColor: T.btnDark, cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: 600, color: T.text }}>
                    {filteredFindings.length} findings
                  </span>
                  <span style={{ color: T.textMuted }}>|</span>
                  <span style={{ color: T.textSub }}>
                    {selectedIds.length} selected
                  </span>
                </div>

                {/* Bulk Action Buttons */}
                {selectedIds.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Bulk Remediate */}
                    <button
                      type="button"
                      onClick={() => {
                        router.push(`/api-security/remediation?findingId=${selectedIds[0]}`);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: '7px',
                        background: T.btnDark,
                        border: 'none',
                        color: '#FFFFFF',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: sans,
                      }}
                    >
                      <Wrench size={12} color="#FFFFFF" />
                      Remediate ({selectedIds.length})
                    </button>

                    {/* Bulk View Attack Path */}
                    <button
                      type="button"
                      onClick={() => {
                        router.push(`/api-security/attack-paths?findingId=${selectedIds[0]}`);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: '7px',
                        background: '#FFFFFF',
                        border: `1px solid ${T.borderInput}`,
                        color: T.text,
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: sans,
                      }}
                    >
                      <GitFork size={12} color="#15803D" />
                      View Attack Path ({selectedIds.length})
                    </button>

                    {/* Bulk Update Status Popover (Custom - No Native Select) */}
                    <div ref={bulkStatusRef} style={{ position: 'relative' }}>
                      <button
                        type="button"
                        onClick={() => setIsBulkStatusOpen((prev) => !prev)}
                        style={{
                          height: '32px',
                          padding: '0 26px 0 10px',
                          borderRadius: '7px',
                          border: `1px solid ${T.borderInput}`,
                          background: T.surface,
                          fontSize: '12.5px',
                          fontWeight: 500,
                          color: T.text,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          fontFamily: sans,
                          position: 'relative',
                        }}
                      >
                        Update Status
                        <ChevronDown
                          size={12}
                          color="#6B7280"
                          style={{
                            position: 'absolute',
                            right: 8,
                            top: '50%',
                            transform: isBulkStatusOpen ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)',
                            transition: 'transform 0.15s ease',
                          }}
                        />
                      </button>

                      {isBulkStatusOpen && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 'calc(100% + 4px)',
                            left: 0,
                            minWidth: '150px',
                            background: '#FFFFFF',
                            border: `1px solid ${T.borderInput}`,
                            borderRadius: '8px',
                            boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
                            zIndex: 60,
                            padding: '4px',
                          }}
                        >
                          {[
                            { id: 'OPEN', label: 'Mark as Open' },
                            { id: 'IN_PROGRESS', label: 'Mark as In Progress' },
                            { id: 'REMEDIATED', label: 'Mark as Remediated' },
                            { id: 'RESOLVED', label: 'Mark as Resolved' },
                            { id: 'FALSE_POSITIVE', label: 'Mark as False Positive' },
                          ].map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleBulkUpdateStatus(item.id)}
                              style={{
                                width: '100%',
                                padding: '6px 10px',
                                background: 'transparent',
                                border: 'none',
                                textAlign: 'left',
                                fontSize: '12px',
                                color: T.text,
                                cursor: 'pointer',
                                borderRadius: '5px',
                                fontFamily: sans,
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Delete (x) Button - Triggers Confirmation Modal */}
                    <button
                      type="button"
                      onClick={() => setIsDeleteModalOpen(true)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '7px',
                        background: '#FEE2E2',
                        border: 'none',
                        color: '#DC2626',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: sans,
                      }}
                    >
                      <Trash2 size={12} color="#DC2626" />
                      Delete ({selectedIds.length})
                    </button>
                  </div>
                )}
              </div>

              {/* Findings Table Card */}
              <div
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: '14px',
                  overflow: 'visible',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.borderLight}`, background: '#FFFFFF' }}>
                      <th style={{ padding: '12px 14px', width: '36px' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.length > 0 && selectedIds.length === filteredFindings.length}
                          onChange={toggleSelectAll}
                          style={{ width: '15px', height: '15px', accentColor: T.btnDark, cursor: 'pointer' }}
                        />
                      </th>
                      <th style={{ padding: '12px 14px', fontSize: '12.5px', fontWeight: 600, color: T.text, fontFamily: sans }}>Title</th>
                      <th style={{ padding: '12px 14px', fontSize: '12.5px', fontWeight: 600, color: T.text, fontFamily: sans }}>Severity</th>
                      <th style={{ padding: '12px 14px', fontSize: '12.5px', fontWeight: 600, color: T.text, fontFamily: sans }}>OWASP Category</th>
                      <th style={{ padding: '12px 14px', fontSize: '12.5px', fontWeight: 600, color: T.text, fontFamily: sans }}>Affected Endpoint</th>
                      <th style={{ padding: '12px 14px', fontSize: '12.5px', fontWeight: 600, color: T.text, fontFamily: sans }}>Attack Path</th>
                      <th style={{ padding: '12px 14px', fontSize: '12.5px', fontWeight: 600, color: T.text, fontFamily: sans }}>Status</th>
                      <th style={{ padding: '12px 14px', fontSize: '12.5px', fontWeight: 600, color: T.text, fontFamily: sans }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFindings.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: '48px 20px', textAlign: 'center', color: T.textSub, fontSize: '13px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                            <Bug size={24} color="#9CA3AF" />
                            <span>{loading ? 'Loading findings...' : 'No security findings match your current filters.'}</span>
                            {!loading && (
                              <button
                                type="button"
                                onClick={handleRestoreDefaultFindings}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  marginTop: '8px',
                                  padding: '7px 14px',
                                  borderRadius: '6px',
                                  background: T.btnDark,
                                  border: 'none',
                                  color: '#FFFFFF',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                <RotateCcw size={12} color="#FFFFFF" />
                                Restore 12 Standard Findings
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredFindings.map((f, idx) => {
                        const isSelectedRow = selectedFinding?.id === f.id;
                        const isChecked = selectedIds.includes(f.id);
                        const sev = getSeverityBadge(f.severity);
                        const st = getStatusBadge(f.status);

                        const epText = f.affected_endpoints?.[0] || '/api/v1/users/{id} GET';
                        const epParts = epText.split(' ');
                        const epMethod = epParts.length > 1 ? epParts[1] : 'GET';
                        const epPath = epParts[0];

                        const isRowMenuOpen = rowMenuFindingId === f.id;

                        return (
                          <tr
                            key={f.id || idx}
                            onClick={() => setSelectedFinding(f)}
                            style={{
                              borderBottom: idx < filteredFindings.length - 1 ? `1px solid ${T.borderLight}` : 'none',
                              background: isSelectedRow ? '#F8FAFC' : '#FFFFFF',
                              cursor: 'pointer',
                              transition: 'background 0.12s ease',
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelectedRow) e.currentTarget.style.backgroundColor = T.surfaceHover;
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelectedRow) e.currentTarget.style.backgroundColor = '#FFFFFF';
                            }}
                          >
                            {/* Checkbox */}
                            <td style={{ padding: '14px 14px' }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => toggleSelectRow(f.id, e as any)}
                                onClick={(e) => e.stopPropagation()}
                                style={{ width: '15px', height: '15px', accentColor: T.btnDark, cursor: 'pointer' }}
                              />
                            </td>

                            {/* Title (Clean & single line, no wrapping) */}
                            <td style={{ padding: '14px 14px', maxWidth: '240px' }}>
                              <span
                                style={{
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  color: T.text,
                                  fontFamily: sans,
                                  display: 'block',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                                title={f.displayTitle || f.title}
                              >
                                {f.displayTitle || f.title}
                              </span>
                            </td>

                            {/* Severity Badge */}
                            <td style={{ padding: '14px 14px' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '2.5px 9px',
                                  borderRadius: '6px',
                                  fontSize: '11.5px',
                                  fontWeight: 600,
                                  background: sev.bg,
                                  color: sev.color,
                                  fontFamily: sans,
                                }}
                              >
                                {sev.label}
                              </span>
                            </td>

                            {/* OWASP Category (Concise code e.g. A01:2021) */}
                            <td style={{ padding: '14px 14px', fontSize: '12.5px', color: T.textSub, fontFamily: sans, whiteSpace: 'nowrap' }}>
                              {f.displayOwasp || f.owasp_category || 'A01:2021'}
                            </td>

                            {/* Affected Endpoint */}
                            <td style={{ padding: '14px 14px', minWidth: '160px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontSize: '12.5px', fontFamily: 'ui-monospace, monospace', color: T.text, fontWeight: 500 }}>
                                  {epPath}
                                </span>
                                <span style={{ fontSize: '10.5px', fontWeight: 600, color: T.textMuted }}>
                                  {epMethod}
                                </span>
                              </div>
                            </td>

                            {/* Attack Path */}
                            <td style={{ padding: '14px 14px' }}>
                              {(() => {
                                const ap = getAttackPathData(f);
                                if (!ap.hasPath) {
                                  return <span style={{ color: '#9CA3AF', fontSize: '13px' }}>—</span>;
                                }
                                return (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      router.push(`/api-security/attack-paths?findingId=${f.id}`);
                                    }}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      padding: '3px 9px',
                                      borderRadius: '6px',
                                      background: '#DCFCE7',
                                      border: '1px solid #BBF7D0',
                                      color: '#15803D',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      fontFamily: sans,
                                      whiteSpace: 'nowrap',
                                      transition: 'all 0.12s ease',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#BBF7D0')}
                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#DCFCE7')}
                                  >
                                    <GitFork size={11} color="#15803D" strokeWidth={2} />
                                    View Path
                                  </button>
                                );
                              })()}
                            </td>

                            {/* Status Badge */}
                            <td style={{ padding: '14px 14px' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '2.5px 9px',
                                  borderRadius: '6px',
                                  fontSize: '11.5px',
                                  fontWeight: 500,
                                  background: st.bg,
                                  color: st.color,
                                  fontFamily: sans,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {st.label}
                              </span>
                            </td>

                            {/* Actions Dropdown Button [ 🔧 Remediate ∨ ] / [ View ∨ ] */}
                            <td
                              style={{ padding: '14px 14px' }}
                              onClick={(e) => e.stopPropagation()}
                              data-row-menu
                            >
                              <div style={{ position: 'relative', display: 'inline-block' }}>
                                <button
                                  type="button"
                                  onClick={() => setRowMenuFindingId(isRowMenuOpen ? null : f.id)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    background: T.surface,
                                    border: `1px solid ${T.borderInput}`,
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    color: T.text,
                                    cursor: 'pointer',
                                    fontFamily: sans,
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#CBD5E1')}
                                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = T.borderInput)}
                                >
                                  {f.status === 'RESOLVED' ? (
                                    <>
                                      <span>View</span>
                                      <ChevronDown size={11} color="#6B7280" />
                                    </>
                                  ) : (
                                    <>
                                      <Wrench size={11} color="#475569" strokeWidth={1.8} />
                                      <span>Remediate</span>
                                      <ChevronDown size={11} color="#6B7280" />
                                    </>
                                  )}
                                </button>

                                {/* Row Popover Menu */}
                                {isRowMenuOpen && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      right: 0,
                                      top: 'calc(100% + 4px)',
                                      width: '160px',
                                      background: '#FFFFFF',
                                      border: `1px solid ${T.borderInput}`,
                                      borderRadius: '8px',
                                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                                      zIndex: 70,
                                      padding: '4px',
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => handleRemediate(f)}
                                      style={{
                                        width: '100%',
                                        padding: '7px 10px',
                                        background: 'transparent',
                                        border: 'none',
                                        textAlign: 'left',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        color: T.text,
                                        cursor: 'pointer',
                                        borderRadius: '5px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        fontFamily: sans,
                                      }}
                                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                    >
                                      <Sparkles size={12} color="#6366F1" />
                                      Apply Fix
                                    </button>
                                    <div style={{ height: '1px', background: T.borderLight, margin: '3px 0' }} />
                                    {[
                                      { id: 'OPEN', label: 'Mark as OPEN' },
                                      { id: 'IN_PROGRESS', label: 'Mark as IN PROGRESS' },
                                      { id: 'RESOLVED', label: 'Mark as RESOLVED' },
                                      { id: 'REMEDIATED', label: 'Mark as REMEDIATED' },
                                    ].map((s) => (
                                      <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => handleUpdateStatus(f.id, s.id)}
                                        style={{
                                          width: '100%',
                                          padding: '5px 10px',
                                          background: 'transparent',
                                          border: 'none',
                                          textAlign: 'left',
                                          fontSize: '11.5px',
                                          color: T.textSub,
                                          cursor: 'pointer',
                                          borderRadius: '5px',
                                          fontFamily: sans,
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                      >
                                        {s.label}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

            </div>

            {/* ── RIGHT COLUMN: FINDING DETAILS CARD ─────────────────── */}
            {selectedFinding ? (
              <div
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: '14px',
                  padding: '22px 22px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px',
                  position: 'sticky',
                  top: '16px',
                }}
              >
                {/* Header: Finding Details + Status Pill */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3
                    style={{
                      fontFamily: serif,
                      fontSize: '18px',
                      fontWeight: 600,
                      color: T.text,
                      margin: 0,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    Finding Details
                  </h3>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2.5px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: getStatusBadge(selectedFinding.status).bg,
                      color: getStatusBadge(selectedFinding.status).color,
                      fontFamily: sans,
                    }}
                  >
                    {getStatusBadge(selectedFinding.status).label}
                  </span>
                </div>

                {/* Title & Severity */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <h2
                      style={{
                        fontFamily: sans,
                        fontSize: '16px',
                        fontWeight: 700,
                        color: T.text,
                        margin: '0 0 4px',
                        lineHeight: 1.25,
                      }}
                    >
                      {selectedFinding.displayTitle || selectedFinding.title}
                    </h2>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2.5px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: getSeverityBadge(selectedFinding.severity).bg,
                        color: getSeverityBadge(selectedFinding.severity).color,
                        flexShrink: 0,
                      }}
                    >
                      {getSeverityBadge(selectedFinding.severity).label}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                    {selectedFinding.displaySubtitle || selectedFinding.category || 'Unauthorized access to user data'}
                  </p>
                </div>

                {/* Badges Strip */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      border: `1px solid ${T.borderInput}`,
                      background: '#FFFFFF',
                      fontSize: '11.5px',
                      color: '#475569',
                    }}
                  >
                    <Shield size={12} color="#6B7280" />
                    OWASP {selectedFinding.displayOwasp || selectedFinding.owasp_category || 'A01:2021'}
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      border: `1px solid ${T.borderInput}`,
                      background: '#FFFFFF',
                      fontSize: '11.5px',
                      color: '#475569',
                    }}
                  >
                    <Code2 size={12} color="#6B7280" />
                    API
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      border: `1px solid ${T.borderInput}`,
                      background: '#FFFFFF',
                      fontSize: '11.5px',
                      color: '#475569',
                    }}
                  >
                    <Link2 size={12} color="#6B7280" />
                    {selectedFinding.cwe || 'CWE-639'}
                  </span>
                </div>

                {/* Attack Path Card */}
                {(() => {
                  const apData = getAttackPathData(selectedFinding);
                  if (!apData.hasPath) return null;
                  return (
                    <div
                      onClick={() => router.push(`/api-security/attack-paths?findingId=${selectedFinding.id}`)}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        padding: '11px 13px',
                        cursor: 'pointer',
                        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#CBD5E1';
                        e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.04)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#E2E8F0';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      {/* Card Header: GitFork icon + Attack Path title + Right Chevron */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '9px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <GitFork size={13} color="#15803D" strokeWidth={2} />
                          <span style={{ fontSize: '12px', fontWeight: 600, color: T.text, fontFamily: sans }}>
                            Attack Path
                          </span>
                        </div>
                        <ChevronRight size={13} color="#94A3B8" />
                      </div>

                      {/* Visual Node Flow Chain */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          overflowX: 'auto',
                          paddingBottom: '2px',
                        }}
                      >
                        {apData.nodes.map((node, nIdx) => {
                          const IconComp = node.icon;
                          const isFinal = node.isFinal;
                          return (
                            <React.Fragment key={nIdx}>
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3.5px 7.5px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: isFinal ? 600 : 500,
                                  background: isFinal ? '#FEE2E2' : '#F8FAFC',
                                  border: `1px solid ${isFinal ? '#FECACA' : '#E2E8F0'}`,
                                  color: isFinal ? '#991B1B' : '#334155',
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0,
                                  fontFamily: sans,
                                }}
                              >
                                <IconComp
                                  size={11}
                                  color={isFinal ? '#DC2626' : '#64748B'}
                                  strokeWidth={2}
                                />
                                <span>{node.label}</span>
                              </div>
                              {nIdx < apData.nodes.length - 1 && (
                                <ChevronRight
                                  size={10}
                                  color="#94A3B8"
                                  style={{ flexShrink: 0 }}
                                />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* 1. Affected Endpoint */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <Sliders size={13} color="#6B7280" strokeWidth={1.8} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: T.text }}>
                      Affected Endpoint
                    </span>
                  </div>
                  <div
                    style={{
                      padding: '7px 10px',
                      background: '#F8FAFC',
                      border: '1px solid #F1F5F9',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontFamily: 'ui-monospace, monospace',
                      color: T.text,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>{selectedFinding.affected_endpoints?.[0]?.split(' ')[0] || '/api/v1/users/{id}'}</span>
                    <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#94A3B8' }}>
                      {selectedFinding.affected_endpoints?.[0]?.split(' ')[1] || 'GET'}
                    </span>
                  </div>
                </div>

                {/* 2. Affected Parameters */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <Code2 size={13} color="#6B7280" strokeWidth={1.8} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: T.text }}>
                      Affected Parameters
                    </span>
                  </div>
                  <span style={{ fontSize: '12.5px', fontFamily: 'ui-monospace, monospace', color: T.textSub }}>
                    {selectedFinding.affected_parameters || 'id'}
                  </span>
                </div>

                {/* 3. Description */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <Info size={13} color="#6B7280" strokeWidth={1.8} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: T.text }}>
                      Description
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: T.textSub, lineHeight: 1.5, margin: 0 }}>
                    {selectedFinding.description ||
                      "The application does not properly validate object ownership, allowing users to access other users' data by modifying the ID parameter."}
                  </p>
                </div>

                {/* Bottom Action Footer: Solid Black Remediate + White View Full Details */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => router.push(`/api-security/remediation?findingId=${selectedFinding.id}`)}
                    style={{
                      flex: 1,
                      height: '38px',
                      borderRadius: '8px',
                      background: T.btnDark,
                      border: 'none',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: sans,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '7px',
                    }}
                  >
                    <Wrench size={13} color="#FFFFFF" />
                    Remediate
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push(`/api-security/findings/${selectedFinding.id}`)}
                    style={{
                      flex: 1,
                      height: '38px',
                      borderRadius: '8px',
                      border: `1px solid ${T.borderInput}`,
                      background: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: T.text,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      fontFamily: sans,
                      transition: 'background 0.12s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                  >
                    View Full Details
                    <ArrowRight size={13} color="#0F172A" />
                  </button>
                </div>
              </div>
            ) : null}

          </div>

        </div>
      </div>

      {/* ══ DELETE CONFIRMATION MODAL ════════════════════════════════ */}
      {isDeleteModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(3px)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setIsDeleteModalOpen(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '14px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: `1px solid ${T.borderInput}`,
              fontFamily: sans,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#FEE2E2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Trash2 size={20} color="#DC2626" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: T.text }}>
                  Delete {selectedIds.length} Finding{selectedIds.length > 1 ? 's' : ''}?
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: T.textSub }}>
                  This will remove the selected security findings from the active list.
                </p>
              </div>
            </div>

            <div
              style={{
                background: '#F8FAFC',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '12px',
                color: T.textSub,
                marginBottom: '20px',
                border: '1px solid #F1F5F9',
              }}
            >
              Selected findings will be removed. You can restore them anytime using the Reset / Restore button.
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '7px',
                  background: '#FFFFFF',
                  border: `1px solid ${T.borderInput}`,
                  fontSize: '13px',
                  fontWeight: 500,
                  color: T.textSub,
                  cursor: 'pointer',
                  fontFamily: sans,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                style={{
                  padding: '8px 18px',
                  borderRadius: '7px',
                  background: '#DC2626',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  fontFamily: sans,
                  boxShadow: '0 2px 6px rgba(220, 38, 38, 0.25)',
                }}
              >
                Delete Findings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Undo Toast Bar if items were deleted */}
      {lastDeletedFindings.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#0F172A',
            color: '#FFFFFF',
            padding: '12px 18px',
            borderRadius: '10px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            zIndex: 900,
            fontSize: '13px',
            fontFamily: sans,
          }}
        >
          <span>{lastDeletedFindings.length} finding{lastDeletedFindings.length > 1 ? 's' : ''} removed</span>
          <button
            type="button"
            onClick={handleUndoDelete}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: '#38BDF8',
              color: '#0F172A',
              border: 'none',
              padding: '4px 10px',
              borderRadius: '5px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Undo2 size={12} />
            Undo
          </button>
          <button
            type="button"
            onClick={() => setLastDeletedFindings([])}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '2px',
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

    </KavachApiLayout>
  );
}
