'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search, ChevronDown, ChevronRight, Play, History,
  Shield, AlertCircle, CheckCircle2, Clock, Bug,
  RotateCcw, Sparkles, Trash2, ArrowRight, ArrowLeft, Copy, Check,
  Terminal, Info, Layers, Sliders, ExternalLink, Filter,
  X, Loader2, Code2, Link2, AlertTriangle, Undo2,
  GitFork, Crown, Database, User, Wrench,
} from 'lucide-react';
import { KavachApiLayout } from '../components/KavachApiLayout';
import { KavachShimmer } from '../components/KavachSkeleton';
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

  // Server-Side Pagination State
  const [currentPage,      setCurrentPage]      = useState(1);
  const [pageSize,         setPageSize]         = useState(10);
  const [totalCount,       setTotalCount]       = useState(0);
  const [totalPages,       setTotalPages]       = useState(1);
  const [targetStats,      setTargetStats]      = useState<any>({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    resolved: 0,
    attack_paths: 0,
  });

  // State
  const [findings,         setFindings]         = useState<any[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [selectedIds,      setSelectedIds]      = useState<string[]>([]);
  const [selectedFinding,  setSelectedFinding]  = useState<any | null>(null);
  const [searchQuery,      setSearchQuery]      = useState('');
  const [debouncedSearch,  setDebouncedSearch]  = useState('');
  
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
  const severityRef      = useRef<HTMLDivElement | null>(null);
  const categoryRef      = useRef<HTMLDivElement | null>(null);
  const statusRef        = useRef<HTMLDivElement | null>(null);
  const bulkStatusRef    = useRef<HTMLDivElement | null>(null);
  const detailsStatusRef = useRef<HTMLDivElement | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  // Load findings with server-side pagination and real DB stats
  const loadFindings = async () => {
    setLoading(true);
    try {
      const statusParam = statusFilter.length > 0 && !statusFilter.includes('ALL') 
        ? statusFilter.join(',') 
        : undefined;

      const res = await api.apiSecurity.findings({
        apiId: selectedApi?.id,
        page: currentPage,
        pageSize: pageSize,
        search: debouncedSearch.trim() || undefined,
        severity: severityFilter !== 'ALL' ? severityFilter : undefined,
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        status: statusParam,
      });

      const items = res?.items || [];
      const cleanedItems = items.map((f: any) => {
        const dTitle = normalizeTitle(f.title);
        const ep0 = (f.affected_endpoints && f.affected_endpoints[0]) || '';
        const paramMatch = ep0.includes('{') ? ep0.match(/\{([^}]+)\}/)?.[1] : null;

        return {
          ...f,
          displayTitle: dTitle,
          displayOwasp: normalizeOwasp(f.owasp_category, f.title),
          displaySubtitle: getSubtitle(dTitle, f.category),
          affected_parameters: f.affected_parameters || paramMatch || 'id',
        };
      });

      setFindings(cleanedItems);
      const computedTotal = res?.total ?? cleanedItems.length;
      const computedPages = res?.pages ?? (Math.ceil(computedTotal / pageSize) || 1);
      setTotalCount(computedTotal);
      setTotalPages(computedPages);
      
      if (res?.stats) {
        setTargetStats(res.stats);
      }

      if (cleanedItems.length > 0) {
        setSelectedFinding((prev: any) => {
          if (prev && cleanedItems.some((item: any) => item.id === prev.id)) {
            return cleanedItems.find((item: any) => item.id === prev.id);
          }
          return cleanedItems[0];
        });

        // Default select 2 rows like in reference screenshot on initial load if none selected
        if (selectedIds.length === 0 && cleanedItems.length >= 3) {
          setSelectedIds([cleanedItems[0].id, cleanedItems[2].id]);
        }
      } else {
        setSelectedFinding(null);
      }
    } catch (err) {
      console.error('Failed to load findings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFindings();
  }, [selectedApi?.id, currentPage, pageSize, severityFilter, categoryFilter, statusFilter, debouncedSearch]);

  // Handle row selection
  const toggleSelectRow = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === findings.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(findings.map((f) => f.id));
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
      if (api.apiSecurity.bulkDeleteFindings) {
        await api.apiSecurity.bulkDeleteFindings(selectedIds).catch(() => null);
      }
      setFindings((prev) => prev.filter((f) => !selectedIds.includes(f.id)));
      setTotalCount((prev) => Math.max(0, prev - selectedIds.length));
      setSelectedIds([]);

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
    setTotalCount((prev) => prev + lastDeletedFindings.length);
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
      toast.success('Restored standard security findings');
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
        <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '20px 32px 56px' }}>

          {/* ══ HEADER: COMPACT SERIF TITLE + SEPARATE COMPACT SCAN CARD ══════ */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', marginBottom: '16px' }}>
            <div>
              {/* Breadcrumb */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  color: T.textSub,
                  marginBottom: '6px',
                }}
              >
                <Link
                  href="/api-security"
                  style={{ color: T.textSub, textDecoration: 'none' }}
                >
                  API Security
                </Link>
                <ChevronRight size={12} color={T.textMuted} strokeWidth={2} />
                <span style={{ color: T.text, fontWeight: 500 }}>Findings</span>
              </div>

              {/* Title */}
              <h1
                style={{
                  fontFamily: serif,
                  fontSize: '26px',
                  fontWeight: 700,
                  color: T.text,
                  letterSpacing: '-0.02em',
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                Findings
              </h1>
              <p style={{ fontSize: '12.5px', color: T.textSub, margin: '4px 0 0', fontFamily: sans }}>
                Security issues detected in your APIs with severity, impact, attack path, and recommended actions.
              </p>
            </div>

            {/* Header Right: Separate compact scan card + Action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {/* Separate compact scan card */}
              <div
                style={{
                  background: '#FFFFFF',
                  border: `1px solid ${T.border}`,
                  borderRadius: '9px',
                  padding: '7px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: T.text, fontFamily: sans }}>
                    Scan #{queryScanId || 'SCN-0482'}
                  </span>
                  <span
                    style={{
                      background: T.greenBg,
                      color: T.greenTxt,
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '1.5px 7px',
                      borderRadius: '10px',
                    }}
                  >
                    Completed
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: T.textSub, fontFamily: sans }}>
                  Nov 14, 2026 • 6m 12s • 27 endpoints
                </div>
              </div>

              {/* Back to Overview Button */}
              <button
                type="button"
                onClick={() => router.push('/api-security')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '36px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  background: T.surface,
                  border: `1px solid ${T.borderInput}`,
                  fontSize: '12.5px',
                  fontWeight: 500,
                  color: '#374151',
                  cursor: 'pointer',
                  fontFamily: sans,
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#CBD5E1')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = T.borderInput)}
              >
                <ArrowLeft size={13} color="#374151" strokeWidth={1.8} />
                Back to Overview
              </button>

              {/* View Scan History Button */}
              <button
                type="button"
                onClick={() => router.push('/api-security/scans')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '36px',
                  padding: '0 14px',
                  borderRadius: '8px',
                  background: T.surface,
                  border: `1px solid ${T.borderInput}`,
                  fontSize: '12.5px',
                  fontWeight: 500,
                  color: '#374151',
                  cursor: 'pointer',
                  fontFamily: sans,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#CBD5E1')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = T.borderInput)}
              >
                <History size={13} color="#374151" strokeWidth={1.8} />
                View Scan History
              </button>

              {/* Run New Scan Button */}
              <button
                type="button"
                onClick={() => router.push('/api-security/analysis')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '36px',
                  padding: '0 16px',
                  borderRadius: '8px',
                  background: T.btnDark,
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: sans,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                  transition: 'all 0.15s ease',
                }}
              >
                <Play size={11} stroke="#FFFFFF" fill="none" strokeWidth={2.2} />
                Run New Scan
              </button>
            </div>
          </div>

          {/* ══ TWO-COLUMN GRID: LEFT CONTENT & RIGHT STICKY DETAILS ══════════ */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: selectedFinding ? 'minmax(0, 1fr) 365px' : '1fr',
              gap: '16px',
              alignItems: 'start',
            }}
          >
            {/* ── LEFT COLUMN: KPI (LEFT WIDTH ONLY) + FILTERS + TABLE + PAGINATION ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>

              {/* 1. SEVERITY KPI METRICS STRIP CARD (LEFT WIDTH ONLY!) */}
              <div
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: '12px',
                  padding: '12px 18px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                {/* 1. Total Findings */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '7px',
                      background: '#F8FAFC',
                      border: `1px solid ${T.borderInput}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Bug size={15} color="#475569" strokeWidth={1.8} />
                  </div>
                  <div>
                    <div style={{ fontSize: '17px', fontWeight: 700, color: T.text, lineHeight: 1.1, fontFamily: sans }}>
                      {loading ? <KavachShimmer width="24px" height="18px" /> : (targetStats.total || totalCount)}
                    </div>
                    <div style={{ fontSize: '11px', color: T.textSub, marginTop: '2px', fontFamily: sans, whiteSpace: 'nowrap' }}>
                      Total Findings
                    </div>
                  </div>
                </div>

                <div style={{ width: '1px', height: '26px', background: T.borderLight }} />

                {/* 2. Critical */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '17px', fontWeight: 700, color: T.text, lineHeight: 1.1, fontFamily: sans }}>
                      {loading ? <KavachShimmer width="20px" height="18px" /> : targetStats.critical}
                    </div>
                    <div style={{ fontSize: '11px', color: T.textSub, marginTop: '2px', fontFamily: sans }}>
                      Critical
                    </div>
                  </div>
                </div>

                <div style={{ width: '1px', height: '26px', background: T.borderLight }} />

                {/* 3. High */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F97316', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '17px', fontWeight: 700, color: T.text, lineHeight: 1.1, fontFamily: sans }}>
                      {loading ? <KavachShimmer width="20px" height="18px" /> : targetStats.high}
                    </div>
                    <div style={{ fontSize: '11px', color: T.textSub, marginTop: '2px', fontFamily: sans }}>
                      High
                    </div>
                  </div>
                </div>

                <div style={{ width: '1px', height: '26px', background: T.borderLight }} />

                {/* 4. Medium */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '17px', fontWeight: 700, color: T.text, lineHeight: 1.1, fontFamily: sans }}>
                      {loading ? <KavachShimmer width="20px" height="18px" /> : targetStats.medium}
                    </div>
                    <div style={{ fontSize: '11px', color: T.textSub, marginTop: '2px', fontFamily: sans }}>
                      Medium
                    </div>
                  </div>
                </div>

                <div style={{ width: '1px', height: '26px', background: T.borderLight }} />

                {/* 5. Low */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#9CA3AF', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '17px', fontWeight: 700, color: T.text, lineHeight: 1.1, fontFamily: sans }}>
                      {loading ? <KavachShimmer width="20px" height="18px" /> : targetStats.low}
                    </div>
                    <div style={{ fontSize: '11px', color: T.textSub, marginTop: '2px', fontFamily: sans }}>
                      Low
                    </div>
                  </div>
                </div>

                <div style={{ width: '1px', height: '26px', background: T.borderLight }} />

                {/* 6. Attack Paths */}
                <div
                  onClick={() => router.push('/api-security/attack-paths')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    padding: '4px 6px',
                    borderRadius: '7px',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '7px',
                      background: '#DCFCE7',
                      border: '1px solid #BBF7D0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <GitFork size={15} color="#15803D" strokeWidth={2} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div>
                      <div style={{ fontSize: '17px', fontWeight: 700, color: T.text, lineHeight: 1.1, fontFamily: sans }}>
                        {loading ? <KavachShimmer width="20px" height="18px" /> : (targetStats.attack_paths || 5)}
                      </div>
                      <div style={{ fontSize: '11px', color: T.textSub, marginTop: '2px', fontFamily: sans, whiteSpace: 'nowrap' }}>
                        Attack Paths
                      </div>
                    </div>
                    <ChevronRight size={13} color="#94A3B8" />
                  </div>
                </div>
              </div>

              {/* 2. COMPACT SEARCH & FILTERS ROW */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                {/* Compact Search input */}
                <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                  <Search
                    size={13}
                    color="#9CA3AF"
                    style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                  />
                  <input
                    type="text"
                    placeholder="Search by vulnerability, endpoint or path..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '0 12px 0 30px',
                      borderRadius: '7px',
                      border: `1px solid ${T.borderInput}`,
                      background: T.surface,
                      fontSize: '12.5px',
                      color: T.text,
                      outline: 'none',
                      fontFamily: sans,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Severity Dropdown */}
                <div ref={severityRef} style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSeverityOpen((prev) => !prev);
                      setIsCategoryOpen(false);
                      setIsStatusOpen(false);
                    }}
                    style={{
                      height: '34px',
                      padding: '0 28px 0 10px',
                      borderRadius: '7px',
                      border: `1px solid ${isSeverityOpen ? T.text : T.borderInput}`,
                      background: T.surface,
                      fontSize: '12px',
                      fontWeight: 500,
                      color: T.text,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontFamily: sans,
                      outline: 'none',
                      position: 'relative',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: '#64748B' }}>Severity:</span>
                    <span style={{ fontSize: '12px', color: T.text, fontWeight: 600 }}>
                      {severityFilter === 'ALL'
                        ? 'All'
                        : severityFilter.charAt(0) + severityFilter.slice(1).toLowerCase()}
                    </span>
                    <ChevronDown
                      size={12}
                      color="#6B7280"
                      style={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: isSeverityOpen ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)',
                        transition: 'transform 0.15s ease',
                      }}
                    />
                  </button>

                  {isSeverityOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: 0,
                        minWidth: '140px',
                        background: '#FFFFFF',
                        border: `1px solid ${T.borderInput}`,
                        borderRadius: '8px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                        zIndex: 70,
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
                            setCurrentPage(1);
                            setIsSeverityOpen(false);
                          }}
                          style={{
                            padding: '6px 10px',
                            fontSize: '12px',
                            fontWeight: severityFilter === item.id ? 600 : 400,
                            color: severityFilter === item.id ? T.text : T.textSub,
                            background: severityFilter === item.id ? '#F8FAFC' : 'transparent',
                            borderRadius: '5px',
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
                          {severityFilter === item.id && <Check size={11} color={T.text} strokeWidth={2.5} />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* OWASP Category Dropdown */}
                <div ref={categoryRef} style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCategoryOpen((prev) => !prev);
                      setIsSeverityOpen(false);
                      setIsStatusOpen(false);
                    }}
                    style={{
                      height: '34px',
                      padding: '0 28px 0 10px',
                      borderRadius: '7px',
                      border: `1px solid ${isCategoryOpen ? T.text : T.borderInput}`,
                      background: T.surface,
                      fontSize: '12px',
                      fontWeight: 500,
                      color: T.text,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontFamily: sans,
                      outline: 'none',
                      position: 'relative',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: '#64748B' }}>Category:</span>
                    <span style={{ fontSize: '12px', color: T.text, fontWeight: 600 }}>
                      {categoryFilter === 'ALL' ? 'All' : categoryFilter}
                    </span>
                    <ChevronDown
                      size={12}
                      color="#6B7280"
                      style={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: isCategoryOpen ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)',
                        transition: 'transform 0.15s ease',
                      }}
                    />
                  </button>

                  {isCategoryOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: 0,
                        minWidth: '160px',
                        background: '#FFFFFF',
                        border: `1px solid ${T.borderInput}`,
                        borderRadius: '8px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                        zIndex: 70,
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
                            setCurrentPage(1);
                            setIsCategoryOpen(false);
                          }}
                          style={{
                            padding: '6px 10px',
                            fontSize: '12px',
                            fontWeight: categoryFilter === item.id ? 600 : 400,
                            color: categoryFilter === item.id ? T.text : T.textSub,
                            background: categoryFilter === item.id ? '#F8FAFC' : 'transparent',
                            borderRadius: '5px',
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
                          {categoryFilter === item.id && <Check size={11} color={T.text} strokeWidth={2.5} />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status Dropdown */}
                <div ref={statusRef} style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsStatusOpen((prev) => !prev);
                      setIsSeverityOpen(false);
                      setIsCategoryOpen(false);
                    }}
                    style={{
                      height: '34px',
                      padding: '0 28px 0 10px',
                      borderRadius: '7px',
                      border: `1px solid ${isStatusOpen ? T.text : T.borderInput}`,
                      background: T.surface,
                      fontSize: '12px',
                      fontWeight: 500,
                      color: T.text,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontFamily: sans,
                      outline: 'none',
                      position: 'relative',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: '#64748B' }}>Status:</span>
                    <span style={{ fontSize: '12px', color: T.text, fontWeight: 600 }}>
                      {statusFilter.includes('ALL')
                        ? 'All'
                        : statusFilter.length === 1
                        ? statusFilter[0].replace('_', ' ')
                        : `${statusFilter.length} selected`}
                    </span>
                    <ChevronDown
                      size={12}
                      color="#6B7280"
                      style={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: isStatusOpen ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)',
                        transition: 'transform 0.15s ease',
                      }}
                    />
                  </button>

                  {isStatusOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: 0,
                        width: '175px',
                        background: '#FFFFFF',
                        border: `1px solid ${T.borderInput}`,
                        borderRadius: '8px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                        zIndex: 70,
                        padding: '10px 12px',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '10px' }}>
                        {[
                          { id: 'ALL', label: 'All' },
                          { id: 'OPEN', label: 'Open' },
                          { id: 'IN_PROGRESS', label: 'In Progress' },
                          { id: 'REMEDIATED', label: 'Remediated' },
                          { id: 'RESOLVED', label: 'Resolved' },
                        ].map((opt) => {
                          const isChecked = statusFilter.includes(opt.id);
                          return (
                            <label
                              key={opt.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '12px',
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
                                  width: '14px',
                                  height: '14px',
                                  borderRadius: '3px',
                                  background: isChecked ? T.btnDark : '#FFFFFF',
                                  border: isChecked ? `1px solid ${T.btnDark}` : `1px solid #CBD5E1`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                {isChecked && <Check size={9} color="#FFFFFF" strokeWidth={3} />}
                              </div>
                              {opt.label}
                            </label>
                          );
                        })}
                      </div>

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
                          onClick={() => {
                            setStatusFilter(['ALL']);
                            setCurrentPage(1);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            fontSize: '11.5px',
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
                          onClick={() => {
                            setCurrentPage(1);
                            setIsStatusOpen(false);
                          }}
                          style={{
                            background: T.btnDark,
                            border: 'none',
                            color: '#FFFFFF',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            padding: '3px 10px',
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
                    setCurrentPage(1);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    height: '34px',
                    padding: '0 10px',
                    borderRadius: '7px',
                    background: 'transparent',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: T.textSub,
                    cursor: 'pointer',
                    fontFamily: sans,
                  }}
                >
                  <RotateCcw size={12} color="#6B7280" />
                  Reset
                </button>
              </div>

              {/* 3. BULK ACTION BAR */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 2px',
                  fontSize: '12.5px',
                  fontFamily: sans,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={findings.length > 0 && selectedIds.length === findings.length}
                    onChange={toggleSelectAll}
                    style={{ width: '14px', height: '14px', accentColor: T.btnDark, cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: 600, color: T.text }}>
                    {totalCount} findings
                  </span>
                  <span style={{ color: T.textMuted }}>|</span>
                  <span style={{ color: T.textSub }}>
                    {selectedIds.length} selected
                  </span>
                </div>

                {/* Bulk Action Buttons */}
                {selectedIds.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    {/* Bulk Remediate */}
                    <button
                      type="button"
                      onClick={() => {
                        router.push(`/api-security/remediation?findingId=${selectedIds[0]}`);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        background: T.btnDark,
                        border: 'none',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: sans,
                      }}
                    >
                      <Wrench size={11} color="#FFFFFF" />
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
                        gap: '5px',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        background: '#FFFFFF',
                        border: `1px solid ${T.borderInput}`,
                        color: T.text,
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: sans,
                      }}
                    >
                      <GitFork size={11} color="#15803D" />
                      View Attack Path ({selectedIds.length})
                    </button>

                    {/* Bulk Update Status */}
                    <div ref={bulkStatusRef} style={{ position: 'relative' }}>
                      <button
                        type="button"
                        onClick={() => setIsBulkStatusOpen((prev) => !prev)}
                        style={{
                          height: '28px',
                          padding: '0 24px 0 9px',
                          borderRadius: '6px',
                          border: `1px solid ${T.borderInput}`,
                          background: T.surface,
                          fontSize: '12px',
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
                          size={11}
                          color="#6B7280"
                          style={{
                            position: 'absolute',
                            right: 7,
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
                            minWidth: '145px',
                            background: '#FFFFFF',
                            border: `1px solid ${T.borderInput}`,
                            borderRadius: '7px',
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
                          ].map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleBulkUpdateStatus(item.id)}
                              style={{
                                width: '100%',
                                padding: '5px 8px',
                                background: 'transparent',
                                border: 'none',
                                textAlign: 'left',
                                fontSize: '11.5px',
                                color: T.text,
                                cursor: 'pointer',
                                borderRadius: '4px',
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

                    {/* Bulk Delete */}
                    <button
                      type="button"
                      onClick={() => setIsDeleteModalOpen(true)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        background: '#FEE2E2',
                        border: 'none',
                        color: '#DC2626',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: sans,
                      }}
                    >
                      <Trash2 size={11} color="#DC2626" />
                      Delete ({selectedIds.length})
                    </button>
                  </div>
                )}
              </div>

              {/* 4. CONTROLLED-HEIGHT TABLE CONTAINER WITH STICKY HEADERS */}
              <div
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  maxHeight: '490px',
                  overflowY: 'auto',
                  overflowX: 'auto',
                  position: 'relative',
                }}
              >
                <table style={{ width: '100%', minWidth: '780px', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#F8FAFC' }}>
                    <tr style={{ borderBottom: `1px solid ${T.borderLight}` }}>
                      <th style={{ padding: '9px 10px', width: '32px', background: '#F8FAFC' }}>
                        <input
                          type="checkbox"
                          checked={findings.length > 0 && selectedIds.length === findings.length}
                          onChange={toggleSelectAll}
                          style={{ width: '14px', height: '14px', accentColor: T.btnDark, cursor: 'pointer' }}
                        />
                      </th>
                      <th style={{ padding: '9px 10px', fontSize: '12px', fontWeight: 600, color: '#475569', background: '#F8FAFC', fontFamily: sans }}>Title</th>
                      <th style={{ padding: '9px 8px', fontSize: '12px', fontWeight: 600, color: '#475569', background: '#F8FAFC', fontFamily: sans, width: '70px' }}>Severity</th>
                      <th style={{ padding: '9px 8px', fontSize: '12px', fontWeight: 600, color: '#475569', background: '#F8FAFC', fontFamily: sans, width: '75px' }}>OWASP Category</th>
                      <th style={{ padding: '9px 8px', fontSize: '12px', fontWeight: 600, color: '#475569', background: '#F8FAFC', fontFamily: sans }}>Affected Endpoint</th>
                      <th style={{ padding: '9px 8px', fontSize: '12px', fontWeight: 600, color: '#475569', background: '#F8FAFC', fontFamily: sans, width: '80px' }}>Attack Path</th>
                      <th style={{ padding: '9px 8px', fontSize: '12px', fontWeight: 600, color: '#475569', background: '#F8FAFC', fontFamily: sans, width: '75px' }}>Status</th>
                      <th style={{ padding: '9px 10px', fontSize: '12px', fontWeight: 600, color: '#475569', background: '#F8FAFC', fontFamily: sans, width: '105px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 6 }).map((_, rIdx) => (
                        <tr key={rIdx} style={{ borderBottom: '1px solid #F1F5F9', height: '44px' }}>
                          <td style={{ padding: '9px 10px' }}>
                            <KavachShimmer width="14px" height="14px" borderRadius="3px" />
                          </td>
                          <td style={{ padding: '9px 10px' }}>
                            <KavachShimmer width="160px" height="14px" />
                          </td>
                          <td style={{ padding: '9px 8px' }}>
                            <KavachShimmer width="55px" height="20px" borderRadius="6px" />
                          </td>
                          <td style={{ padding: '9px 8px' }}>
                            <KavachShimmer width="65px" height="13px" />
                          </td>
                          <td style={{ padding: '9px 8px' }}>
                            <KavachShimmer width="110px" height="13px" />
                          </td>
                          <td style={{ padding: '9px 8px' }}>
                            <KavachShimmer width="75px" height="20px" borderRadius="6px" />
                          </td>
                          <td style={{ padding: '9px 8px' }}>
                            <KavachShimmer width="55px" height="18px" borderRadius="6px" />
                          </td>
                          <td style={{ padding: '9px 10px', textAlign: 'right' }}>
                            <KavachShimmer width="80px" height="26px" borderRadius="6px" style={{ marginLeft: 'auto' }} />
                          </td>
                        </tr>
                      ))
                    ) : findings.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: '40px 20px', textAlign: 'center', color: T.textSub, fontSize: '13px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <Bug size={22} color="#9CA3AF" />
                            <span>No security findings match your current filters.</span>
                            <button
                              type="button"
                              onClick={handleRestoreDefaultFindings}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                marginTop: '6px',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                background: T.btnDark,
                                border: 'none',
                                color: '#FFFFFF',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              <RotateCcw size={11} color="#FFFFFF" />
                              Restore Standard Findings
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      findings.map((f, idx) => {
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
                              borderBottom: idx < findings.length - 1 ? `1px solid ${T.borderLight}` : 'none',
                              background: isSelectedRow ? '#F8FAFC' : '#FFFFFF',
                              borderLeft: isSelectedRow ? '3px solid #2563EB' : '3px solid transparent',
                              cursor: 'pointer',
                              transition: 'background 0.12s ease',
                              height: '44px',
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelectedRow) e.currentTarget.style.backgroundColor = T.surfaceHover;
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelectedRow) e.currentTarget.style.backgroundColor = '#FFFFFF';
                            }}
                          >
                            {/* Checkbox */}
                            <td style={{ padding: '8px 10px' }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => toggleSelectRow(f.id, e as any)}
                                onClick={(e) => e.stopPropagation()}
                                style={{ width: '14px', height: '14px', accentColor: T.btnDark, cursor: 'pointer' }}
                              />
                            </td>

                            {/* Title (Clean single line, compact) */}
                            <td style={{ padding: '8px 10px', maxWidth: '200px' }}>
                              <span
                                style={{
                                  fontSize: '12.5px',
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
                            <td style={{ padding: '8px 8px' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '2px 7px',
                                  borderRadius: '5px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  background: sev.bg,
                                  color: sev.color,
                                  fontFamily: sans,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {sev.label}
                              </span>
                            </td>

                            {/* OWASP Category */}
                            <td style={{ padding: '8px 8px', fontSize: '12px', color: '#1E40AF', fontWeight: 500, fontFamily: sans, whiteSpace: 'nowrap' }}>
                              {f.displayOwasp || f.owasp_category || 'A01:2021'}
                            </td>

                            {/* Affected Endpoint */}
                            <td style={{ padding: '8px 8px', maxWidth: '150px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                <span 
                                  style={{ 
                                    fontSize: '11.5px', 
                                    fontFamily: 'ui-monospace, monospace', 
                                    color: T.text, 
                                    fontWeight: 500,
                                    display: 'block',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                  title={epPath}
                                >
                                  {epPath}
                                </span>
                                <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748B' }}>
                                  {epMethod}
                                </span>
                              </div>
                            </td>

                            {/* Attack Path */}
                            <td style={{ padding: '8px 8px' }}>
                              {(() => {
                                const ap = getAttackPathData(f);
                                if (!ap.hasPath) {
                                  return <span style={{ color: '#9CA3AF', fontSize: '12px' }}>—</span>;
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
                                      gap: '4px',
                                      padding: '2.5px 7px',
                                      borderRadius: '5px',
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
                                    <GitFork size={10} color="#15803D" strokeWidth={2} />
                                    View Path
                                  </button>
                                );
                              })()}
                            </td>

                            {/* Status Badge */}
                            <td style={{ padding: '8px 8px' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '2px 7px',
                                  borderRadius: '5px',
                                  fontSize: '11px',
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

                            {/* Actions Dropdown Button [ 🔧 Remediate ∨ ] */}
                            <td
                              style={{ padding: '8px 10px', textAlign: 'right' }}
                              onClick={(e) => e.stopPropagation()}
                              data-row-menu
                            >
                              <div style={{ position: 'relative', display: 'inline-block', textAlign: 'left' }}>
                                <button
                                  type="button"
                                  onClick={() => setRowMenuFindingId(isRowMenuOpen ? null : f.id)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    background: T.surface,
                                    border: `1px solid ${T.borderInput}`,
                                    fontSize: '11.5px',
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
                                      <ChevronDown size={10} color="#6B7280" />
                                    </>
                                  ) : (
                                    <>
                                      <Wrench size={10} color="#475569" strokeWidth={1.8} />
                                      <span>Remediate</span>
                                      <ChevronDown size={10} color="#6B7280" />
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
                                      width: '150px',
                                      background: '#FFFFFF',
                                      border: `1px solid ${T.borderInput}`,
                                      borderRadius: '7px',
                                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                                      zIndex: 70,
                                      padding: '4px',
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => handleRemediate(f)}
                                      style={{
                                        width: '100%',
                                        padding: '6px 8px',
                                        background: 'transparent',
                                        border: 'none',
                                        textAlign: 'left',
                                        fontSize: '11.5px',
                                        fontWeight: 600,
                                        color: T.text,
                                        cursor: 'pointer',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        fontFamily: sans,
                                      }}
                                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                    >
                                      <Sparkles size={11} color="#6366F1" />
                                      Remediate Finding
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRowMenuFindingId(null);
                                        router.push(`/api-security/attack-paths?findingId=${f.id}`);
                                      }}
                                      style={{
                                        width: '100%',
                                        padding: '6px 8px',
                                        background: 'transparent',
                                        border: 'none',
                                        textAlign: 'left',
                                        fontSize: '11.5px',
                                        fontWeight: 500,
                                        color: T.text,
                                        cursor: 'pointer',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        fontFamily: sans,
                                      }}
                                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                    >
                                      <GitFork size={11} color="#15803D" />
                                      View Attack Path
                                    </button>
                                    <div style={{ height: '1px', background: T.borderLight, margin: '3px 0' }} />
                                    {[
                                      { id: 'OPEN', label: 'Mark as Open' },
                                      { id: 'IN_PROGRESS', label: 'Mark as In Progress' },
                                      { id: 'RESOLVED', label: 'Mark as Resolved' },
                                      { id: 'REMEDIATED', label: 'Mark as Remediated' },
                                    ].map((s) => (
                                      <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => handleUpdateStatus(f.id, s.id)}
                                        style={{
                                          width: '100%',
                                          padding: '4px 8px',
                                          background: 'transparent',
                                          border: 'none',
                                          textAlign: 'left',
                                          fontSize: '11px',
                                          color: T.textSub,
                                          cursor: 'pointer',
                                          borderRadius: '4px',
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

              {/* 5. SERVER-SIDE PAGINATION CONTROLS BAR */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: '#FFFFFF',
                  border: `1px solid ${T.border}`,
                  borderRadius: '10px',
                  fontSize: '12px',
                  color: T.textSub,
                  fontFamily: sans,
                }}
              >
                {/* Left: Showing X-Y of Z findings + Page Size */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span>
                    Showing <strong style={{ color: T.text }}>{totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to{' '}
                    <strong style={{ color: T.text }}>{Math.min(currentPage * pageSize, totalCount)}</strong> of{' '}
                    <strong style={{ color: T.text }}>{totalCount}</strong> findings
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontSize: '11.5px', color: '#64748B' }}>Rows per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      style={{
                        padding: '3px 6px',
                        borderRadius: '5px',
                        border: `1px solid ${T.borderInput}`,
                        background: '#FFFFFF',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        color: T.text,
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>

                {/* Right: Previous / Page Numbers / Next */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1 || loading}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '5px',
                      border: `1px solid ${T.borderInput}`,
                      background: '#FFFFFF',
                      fontSize: '11.5px',
                      fontWeight: 500,
                      color: currentPage <= 1 ? '#9CA3AF' : T.text,
                      cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                      opacity: currentPage <= 1 ? 0.6 : 1,
                    }}
                  >
                    Previous
                  </button>

                  {Array.from({ length: totalPages }).map((_, i) => {
                    const pageNum = i + 1;
                    if (
                      totalPages > 6 &&
                      pageNum !== 1 &&
                      pageNum !== totalPages &&
                      Math.abs(pageNum - currentPage) > 1
                    ) {
                      if (pageNum === 2 || pageNum === totalPages - 1) {
                        return <span key={pageNum} style={{ padding: '0 3px', color: '#9CA3AF' }}>…</span>;
                      }
                      return null;
                    }

                    const isActive = pageNum === currentPage;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        disabled={loading}
                        style={{
                          minWidth: '28px',
                          height: '28px',
                          padding: '0 6px',
                          borderRadius: '5px',
                          border: isActive ? `1px solid ${T.btnDark}` : `1px solid ${T.borderInput}`,
                          background: isActive ? T.btnDark : '#FFFFFF',
                          color: isActive ? '#FFFFFF' : T.text,
                          fontSize: '11.5px',
                          fontWeight: isActive ? 600 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.12s ease',
                        }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages || loading}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '5px',
                      border: `1px solid ${T.borderInput}`,
                      background: '#FFFFFF',
                      fontSize: '11.5px',
                      fontWeight: 500,
                      color: currentPage >= totalPages ? '#9CA3AF' : T.text,
                      cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                      opacity: currentPage >= totalPages ? 0.6 : 1,
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>

            </div>

            {/* ── RIGHT COLUMN: STICKY FINDING DETAILS PANEL ───────────────── */}
            {selectedFinding ? (
              <div
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: '14px',
                  padding: '20px 20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  position: 'sticky',
                  top: '16px',
                  maxHeight: 'calc(100vh - 32px)',
                  overflowY: 'auto',
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
                        fontSize: '15px',
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
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
                          gap: '3px',
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
                                  gap: '3px',
                                  padding: '2.5px 6px',
                                  borderRadius: '5px',
                                  fontSize: '10.5px',
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
                                  size={10}
                                  color={isFinal ? '#DC2626' : '#64748B'}
                                  strokeWidth={2}
                                />
                                <span>{node.label}</span>
                              </div>
                              {nIdx < apData.nodes.length - 1 && (
                                <ChevronRight
                                  size={9}
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
                      height: '36px',
                      borderRadius: '8px',
                      background: T.btnDark,
                      border: 'none',
                      color: '#FFFFFF',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: sans,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '7px',
                    }}
                  >
                    <Wrench size={12} color="#FFFFFF" />
                    Remediate
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push(`/api-security/findings/${selectedFinding.id}`)}
                    style={{
                      flex: 1,
                      height: '36px',
                      borderRadius: '8px',
                      border: `1px solid ${T.borderInput}`,
                      background: '#FFFFFF',
                      fontSize: '12.5px',
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
                    <ArrowRight size={12} color="#0F172A" />
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
