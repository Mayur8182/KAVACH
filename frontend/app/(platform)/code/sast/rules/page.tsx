'use client';

/**
 * Kavach SAST — Unified Rules, Baselines & Risk Policies (/code/sast/rules)
 * 
 * Unified Policy & Governance Suite:
 * 1. Detection Rules: Semgrep AST & custom syntax heuristics with in-drawer Pattern Tester
 * 2. Baselines & Drift: Approved snapshots to suppress legacy debt and guard CI merge gates
 * 3. Risk Exceptions: Time-bounded, audited risk acceptance with mandatory justification
 * 
 * Strict adherence to AGENTS.md & GEMINI.md:
 * "LLM proposes. Deterministic security systems decide. Runtime evidence proves."
 */

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Code2,
  ShieldAlert,
  Terminal,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Layers,
  SlidersHorizontal,
  X,
  FileCode2,
  AlertTriangle,
  Info,
  Check,
  Copy,
  Compass,
  GitBranch,
  GitCommit,
  FolderGit2,
  Clock,
  ShieldCheck,
  Calendar,
  User,
  Shield,
  Play,
  RotateCw,
  FileText,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { KavachSastLayout } from '@/components/code/sast/KavachSastLayout';
import { useScope } from '@/context/ScopeContext';

// ── Types ────────────────────────────────────────────────────────────────────

interface SASTRule {
  id: string;
  rule_id: string;
  title: string;
  description: string;
  severity: string;
  category: string;
  cwe?: string;
  owasp?: string;
  pattern?: string;
  scanner: string;
  enabled: boolean;
  is_custom: boolean;
  created_at?: string;
  updated_at?: string;
}

const SEVERITY_CONFIG: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  CRITICAL: { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA', dot: '#EF4444' },
  HIGH: { bg: '#FFF7ED', text: '#EA580C', border: '#FFEDD5', dot: '#F97316' },
  MEDIUM: { bg: '#FFFBEB', text: '#D97706', border: '#FEF3C7', dot: '#F59E0B' },
  LOW: { bg: '#F0FDF4', text: '#16A34A', border: '#DCFCE7', dot: '#22C55E' },
  INFO: { bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0', dot: '#94A3B8' },
};

function SASTRulesPoliciesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentProject } = useScope();

  // Active top tab: rules | baselines | exceptions
  const initialTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'rules' | 'baselines' | 'exceptions'>(
    initialTab === 'baselines' ? 'baselines' : initialTab === 'exceptions' ? 'exceptions' : 'rules'
  );

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'baselines' || tabParam === 'exceptions' || tabParam === 'rules') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'rules' | 'baselines' | 'exceptions') => {
    setActiveTab(tab);
    router.replace(`/code/sast/rules?tab=${tab}`);
  };

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // 1. RULES STATE & HANDLERS
  // ═════════════════════════════════════════════════════════════════════════════
  const [rules, setRules] = useState<SASTRule[]>([]);
  const [loadingRules, setLoadingRules] = useState(true);
  const [rulesError, setRulesError] = useState<string | null>(null);

  const [ruleSearch, setRuleSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [ruleStatusFilter, setRuleStatusFilter] = useState<'ALL' | 'ENABLED' | 'DISABLED'>('ALL');

  const [selectedRule, setSelectedRule] = useState<SASTRule | null>(null);
  const [isCreateRuleOpen, setIsCreateRuleOpen] = useState(false);
  const [copiedPattern, setCopiedPattern] = useState(false);

  // Pattern Tester state inside drawer
  const [testCodeSnippet, setTestCodeSnippet] = useState('');
  const [testingPattern, setTestingPattern] = useState(false);
  const [testResult, setTestResult] = useState<{ matched: boolean; matchCount: number; message: string } | null>(null);

  // Create rule form
  const [newTitle, setNewTitle] = useState('');
  const [newRuleId, setNewRuleId] = useState('');
  const [newSeverity, setNewSeverity] = useState('HIGH');
  const [newCategory, setNewCategory] = useState('SAST');
  const [newCwe, setNewCwe] = useState('CWE-78: Command Injection');
  const [newOwasp, setNewOwasp] = useState('A03:2021-Injection');
  const [newPattern, setNewPattern] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [submittingRule, setSubmittingRule] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadRules = useCallback(async () => {
    setLoadingRules(true);
    setRulesError(null);
    try {
      const res = await api.sast.rules();
      if (res?.rules) {
        setRules(res.rules);
      }
    } catch (err: any) {
      console.error('Failed to fetch SAST rules:', err);
      setRulesError(err?.message || 'Failed to communicate with SAST rules engine.');
    } finally {
      setLoadingRules(false);
    }
  }, []);

  const handleToggleRule = async (rule: SASTRule, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !rule.enabled;
    setRules(prev => prev.map(r => (r.id === rule.id ? { ...r, enabled: nextState } : r)));
    if (selectedRule?.id === rule.id) {
      setSelectedRule(prev => (prev ? { ...prev, enabled: nextState } : null));
    }

    try {
      await api.sast.toggleRule(rule.id, nextState);
      showToast(`Rule ${rule.rule_id} is now ${nextState ? 'ENABLED' : 'DISABLED'}. Audit log generated.`);
    } catch (err: any) {
      // Rollback
      setRules(prev => prev.map(r => (r.id === rule.id ? { ...r, enabled: rule.enabled } : r)));
      if (selectedRule?.id === rule.id) {
        setSelectedRule(prev => (prev ? { ...prev, enabled: rule.enabled } : null));
      }
      showToast(`Error changing rule state: ${err?.message || 'Failed'}`);
    }
  };

  const handleRunPatternTest = () => {
    if (!selectedRule?.pattern) return;
    setTestingPattern(true);
    setTestResult(null);

    setTimeout(() => {
      try {
        const regex = new RegExp(selectedRule.pattern!, 'gm');
        const matches = testCodeSnippet.match(regex);
        if (matches && matches.length > 0) {
          setTestResult({
            matched: true,
            matchCount: matches.length,
            message: `Pattern successfully matched ${matches.length} occurrence(s) in sample snippet!`,
          });
        } else {
          setTestResult({
            matched: false,
            matchCount: 0,
            message: 'Pattern did not match sample code. Clean syntax tree verification.',
          });
        }
      } catch (e: any) {
        setTestResult({
          matched: false,
          matchCount: 0,
          message: `Regex evaluation error: ${e?.message || 'Invalid syntax'}`,
        });
      } finally {
        setTestingPattern(false);
      }
    }, 350);
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setFormError('Rule title is required.');
      return;
    }
    if (!newPattern.trim()) {
      setFormError('Pattern or regex definition is required.');
      return;
    }
    if (!newDescription.trim()) {
      setFormError('Rule description is required.');
      return;
    }

    setSubmittingRule(true);
    setFormError(null);

    try {
      const created = await api.sast.createRule({
        title: newTitle.trim(),
        rule_id: newRuleId.trim() || undefined,
        severity: newSeverity,
        category: newCategory,
        cwe: newCwe.trim() || undefined,
        owasp: newOwasp.trim() || undefined,
        pattern: newPattern.trim(),
        description: newDescription.trim(),
        enabled: true,
      });

      setRules(prev => [created, ...prev]);
      setIsCreateRuleOpen(false);
      showToast(`Custom rule ${created.rule_id || newTitle} created successfully.`);

      setNewTitle('');
      setNewRuleId('');
      setNewPattern('');
      setNewDescription('');
    } catch (err: any) {
      setFormError(err?.message || 'Failed to persist custom rule.');
    } finally {
      setSubmittingRule(false);
    }
  };

  const filteredRules = useMemo(() => {
    return rules.filter(r => {
      const q = ruleSearch.toLowerCase();
      const matchSearch =
        !q ||
        r.title.toLowerCase().includes(q) ||
        r.rule_id.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        (r.cwe && r.cwe.toLowerCase().includes(q)) ||
        (r.owasp && r.owasp.toLowerCase().includes(q));

      const matchCat =
        selectedCategory === 'ALL' || r.category.toUpperCase() === selectedCategory.toUpperCase();

      const matchSev =
        selectedSeverity === 'ALL' || r.severity.toUpperCase() === selectedSeverity.toUpperCase();

      const matchStatus =
        ruleStatusFilter === 'ALL' ||
        (ruleStatusFilter === 'ENABLED' && r.enabled) ||
        (ruleStatusFilter === 'DISABLED' && !r.enabled);

      return matchSearch && matchCat && matchSev && matchStatus;
    });
  }, [rules, ruleSearch, selectedCategory, selectedSeverity, ruleStatusFilter]);

  // ═════════════════════════════════════════════════════════════════════════════
  // 2. BASELINES STATE & HANDLERS
  // ═════════════════════════════════════════════════════════════════════════════
  const [baselines, setBaselines] = useState<any[]>([]);
  const [repositories, setRepositories] = useState<any[]>([]);
  const [loadingBaselines, setLoadingBaselines] = useState(false);
  const [baselineSearch, setBaselineSearch] = useState('');
  const [baselineRepoFilter, setBaselineRepoFilter] = useState('ALL');

  const [isEstablishModalOpen, setIsEstablishModalOpen] = useState(false);
  const [selectedRepoId, setSelectedRepoId] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [baselineNote, setBaselineNote] = useState('');
  const [submittingBaseline, setSubmittingBaseline] = useState(false);

  const loadBaselines = useCallback(async () => {
    setLoadingBaselines(true);
    try {
      const projId = currentProject?.id || undefined;
      const [baseRes, repoRes] = await Promise.allSettled([
        api.sast.baselines({ project_id: projId }),
        api.sast.repositories(projId),
      ]);

      if (baseRes.status === 'fulfilled' && baseRes.value?.items) {
        setBaselines(baseRes.value.items);
      }
      if (repoRes.status === 'fulfilled' && repoRes.value) {
        setRepositories(repoRes.value);
        if (repoRes.value.length > 0 && !selectedRepoId) {
          setSelectedRepoId(repoRes.value[0].id);
        }
      }
    } catch (err: any) {
      console.error('[Baselines] Failed to load:', err);
    } finally {
      setLoadingBaselines(false);
    }
  }, [currentProject?.id, selectedRepoId]);

  const handleEstablishBaseline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepoId) return;

    setSubmittingBaseline(true);
    try {
      await api.sast.createBaseline(
        {
          repository_id: selectedRepoId,
          branch: selectedBranch,
          note: baselineNote || 'Approved production baseline snapshot',
        },
        currentProject?.id
      );
      showToast('Successfully established approved security baseline.');
      setIsEstablishModalOpen(false);
      setBaselineNote('');
      await loadBaselines();
    } catch (err: any) {
      showToast(err?.message || 'Failed to establish baseline.');
    } finally {
      setSubmittingBaseline(false);
    }
  };

  const filteredBaselines = useMemo(() => {
    return baselines.filter(b => {
      const matchesSearch =
        !baselineSearch ||
        b.repository_name?.toLowerCase().includes(baselineSearch.toLowerCase()) ||
        b.commit_sha?.toLowerCase().includes(baselineSearch.toLowerCase()) ||
        b.branch?.toLowerCase().includes(baselineSearch.toLowerCase());
      const matchesRepo = baselineRepoFilter === 'ALL' || b.repository_id === baselineRepoFilter;
      return matchesSearch && matchesRepo;
    });
  }, [baselines, baselineSearch, baselineRepoFilter]);

  // ═════════════════════════════════════════════════════════════════════════════
  // 3. EXCEPTIONS STATE & HANDLERS
  // ═════════════════════════════════════════════════════════════════════════════
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [exceptionCounts, setExceptionCounts] = useState({ total: 0, active: 0, expired: 0, revoked: 0 });
  const [loadingExceptions, setLoadingExceptions] = useState(false);
  const [exceptionStatusFilter, setExceptionStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRED' | 'REVOKED'>('ACTIVE');
  const [exceptionSearch, setExceptionSearch] = useState('');

  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);
  const [exceptionRuleId, setExceptionRuleId] = useState('');
  const [exceptionFilePath, setExceptionFilePath] = useState('');
  const [exceptionSeverity, setExceptionSeverity] = useState('HIGH');
  const [exceptionJustification, setExceptionJustification] = useState('');
  const [exceptionExpiryDays, setExceptionExpiryDays] = useState(30);
  const [submittingException, setSubmittingException] = useState(false);

  const loadExceptions = useCallback(async () => {
    setLoadingExceptions(true);
    try {
      const projId = currentProject?.id || undefined;
      const res = await api.sast.exceptions({
        project_id: projId,
        status: exceptionStatusFilter === 'ALL' ? undefined : exceptionStatusFilter,
      });
      if (res?.items) {
        setExceptions(res.items);
        setExceptionCounts({
          total: res.total || res.items.length,
          active: res.active_count || res.items.filter((x: any) => x.status === 'ACTIVE').length,
          expired: res.expired_count || res.items.filter((x: any) => x.status === 'EXPIRED').length,
          revoked: res.revoked_count || res.items.filter((x: any) => x.status === 'REVOKED').length,
        });
      }
    } catch (err: any) {
      console.error('[Exceptions] Failed to load:', err);
    } finally {
      setLoadingExceptions(false);
    }
  }, [currentProject?.id, exceptionStatusFilter]);

  const handleCreateException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exceptionRuleId || !exceptionJustification) return;

    setSubmittingException(true);
    try {
      await api.sast.createException(
        {
          rule_id: exceptionRuleId,
          file_path: exceptionFilePath || undefined,
          severity: exceptionSeverity,
          justification: exceptionJustification,
          expires_in_days: exceptionExpiryDays,
        },
        currentProject?.id
      );
      showToast('Risk acceptance exception approved and logged to audit trail.');
      setIsExceptionModalOpen(false);
      setExceptionRuleId('');
      setExceptionFilePath('');
      setExceptionJustification('');
      await loadExceptions();
    } catch (err: any) {
      showToast(err?.message || 'Failed to submit risk exception.');
    } finally {
      setSubmittingException(false);
    }
  };

  const handleRevokeException = async (id: string) => {
    try {
      await api.sast.revokeException(id);
      showToast('Exception revoked. Findings re-enforced in CI gate.');
      await loadExceptions();
    } catch (err: any) {
      showToast(err?.message || 'Failed to revoke exception.');
    }
  };

  const filteredExceptions = useMemo(() => {
    return exceptions.filter(ex => {
      const q = exceptionSearch.toLowerCase();
      return (
        !q ||
        ex.rule_id?.toLowerCase().includes(q) ||
        ex.file_path?.toLowerCase().includes(q) ||
        ex.justification?.toLowerCase().includes(q) ||
        ex.approver_name?.toLowerCase().includes(q)
      );
    });
  }, [exceptions, exceptionSearch]);

  // ── Initial Load based on tab ──────────────────────────────────────────────
  useEffect(() => {
    loadRules();
    loadBaselines();
    loadExceptions();
  }, [loadRules, loadBaselines, loadExceptions]);

  return (
    <KavachSastLayout>
      <div style={{ padding: '16px 24px', maxWidth: '1600px', margin: '0 auto', display: 'flex', flexDirection: 'column', width: '100%' }}>
        
        {/* Toast Notification */}
        {toastMessage && (
          <div
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              padding: '12px 20px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={16} color="#10B981" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ── 1. Top Header with Policy Sub-Tab Switcher ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px',
            padding: '4px 0',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>
              <Link href="/code" style={{ color: '#64748B', textDecoration: 'none' }}>Code Security</Link>
              <ChevronRight size={12} />
              <Link href="/code/sast" style={{ color: '#64748B', textDecoration: 'none' }}>SAST Analysis</Link>
              <ChevronRight size={12} />
              <span style={{ color: '#0F172A', fontWeight: 600 }}>Rules & Policies</span>
            </div>
            <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              SAST Rules, Baselines & Security Policies
            </h1>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '3px 0 0 0' }}>
              Deterministic AST syntax heuristics, repository drift baselines, and audited risk acceptance governance.
            </p>
          </div>

          {/* Action Button depending on Active Tab */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {activeTab === 'rules' && (
              <>
                <button
                  type="button"
                  onClick={loadRules}
                  disabled={loadingRules}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    backgroundColor: '#FFFFFF',
                    color: '#334155',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: loadingRules ? 'wait' : 'pointer',
                  }}
                >
                  <RefreshCw size={12} className={loadingRules ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateRuleOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#2563EB',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
                  }}
                >
                  <Plus size={13} />
                  <span>New Custom Rule</span>
                </button>
              </>
            )}

            {activeTab === 'baselines' && (
              <>
                <button
                  type="button"
                  onClick={loadBaselines}
                  disabled={loadingBaselines}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#475569',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: loadingBaselines ? 'wait' : 'pointer',
                  }}
                >
                  <RefreshCw size={12} className={loadingBaselines ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEstablishModalOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    backgroundColor: '#2563EB',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
                  }}
                >
                  <Plus size={13} />
                  <span>Establish Baseline</span>
                </button>
              </>
            )}

            {activeTab === 'exceptions' && (
              <>
                <button
                  type="button"
                  onClick={loadExceptions}
                  disabled={loadingExceptions}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#475569',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: loadingExceptions ? 'wait' : 'pointer',
                  }}
                >
                  <RefreshCw size={12} className={loadingExceptions ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsExceptionModalOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    backgroundColor: '#2563EB',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
                  }}
                >
                  <Plus size={13} />
                  <span>Add Risk Exception</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── 2. Sleek Tab Switcher ── */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px', marginBottom: '16px' }}>
          <button
            onClick={() => handleTabChange('rules')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: activeTab === 'rules' ? '#EFF6FF' : 'transparent',
              color: activeTab === 'rules' ? '#1D4ED8' : '#64748B',
              fontSize: '13px',
              fontWeight: activeTab === 'rules' ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            <BookOpen size={15} />
            <span>Detection Rules ({rules.length})</span>
          </button>

          <button
            onClick={() => handleTabChange('baselines')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: activeTab === 'baselines' ? '#EFF6FF' : 'transparent',
              color: activeTab === 'baselines' ? '#1D4ED8' : '#64748B',
              fontSize: '13px',
              fontWeight: activeTab === 'baselines' ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            <Compass size={15} />
            <span>Baselines & Drift ({baselines.filter(b => b.status === 'ACTIVE').length} active)</span>
          </button>

          <button
            onClick={() => handleTabChange('exceptions')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: activeTab === 'exceptions' ? '#EFF6FF' : 'transparent',
              color: activeTab === 'exceptions' ? '#1D4ED8' : '#64748B',
              fontSize: '13px',
              fontWeight: activeTab === 'exceptions' ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            <ShieldAlert size={15} />
            <span>Risk Acceptance Exceptions ({exceptionCounts.active} active)</span>
          </button>
        </div>

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: DETECTION RULES                                                */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'rules' && (
          <div>
            {rulesError && (
              <div style={{ marginBottom: '14px', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={15} />
                <span style={{ fontSize: '12.5px' }}>{rulesError}</span>
              </div>
            )}

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    Total AST Rules
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                    {loadingRules ? '—' : rules.length}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '1px' }}>
                    Semgrep & Custom Heuristics
                  </div>
                </div>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
                  <BookOpen size={18} />
                </div>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    Enforced / Enabled
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#16A34A', marginTop: '2px' }}>
                    {loadingRules ? '—' : rules.filter(r => r.enabled).length}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '1px' }}>
                    Actively scanning commits
                  </div>
                </div>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A' }}>
                  <CheckCircle2 size={18} />
                </div>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    Exempt / Disabled
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#64748B', marginTop: '2px' }}>
                    {loadingRules ? '—' : rules.filter(r => !r.enabled).length}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '1px' }}>
                    Audited policy suppression
                  </div>
                </div>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                  <XCircle size={18} />
                </div>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    Custom AST Rules
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#7C3AED', marginTop: '2px' }}>
                    {loadingRules ? '—' : rules.filter(r => r.is_custom).length}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '1px' }}>
                    Workspace specific
                  </div>
                </div>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C3AED' }}>
                  <Sparkles size={18} />
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input
                    type="text"
                    placeholder="Search rules by title, rule ID, CWE, OWASP, or pattern..."
                    value={ruleSearch}
                    onChange={e => setRuleSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 34px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '12.5px',
                      color: '#0F172A',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Status Tabs */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#F1F5F9', padding: '3px', borderRadius: '6px' }}>
                  {(['ALL', 'ENABLED', 'DISABLED'] as const).map(st => (
                    <button
                      key={st}
                      onClick={() => setRuleStatusFilter(st)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: ruleStatusFilter === st ? '#FFFFFF' : 'transparent',
                        color: ruleStatusFilter === st ? '#0F172A' : '#64748B',
                        fontSize: '12px',
                        fontWeight: ruleStatusFilter === st ? 600 : 500,
                        cursor: 'pointer',
                        boxShadow: ruleStatusFilter === st ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                      }}
                    >
                      {st === 'ALL' ? 'All Rules' : st === 'ENABLED' ? 'Enabled Only' : 'Disabled'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category & Severity Filter */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', marginRight: '4px' }}>
                    Category:
                  </span>
                  {['ALL', 'SAST', 'SECURITY_HOTSPOT', 'INJECTION', 'CRYPTO'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      style={{
                        padding: '3px 10px',
                        borderRadius: '14px',
                        border: `1px solid ${selectedCategory === cat ? '#2563EB' : '#E2E8F0'}`,
                        backgroundColor: selectedCategory === cat ? '#EFF6FF' : '#FFFFFF',
                        color: selectedCategory === cat ? '#1D4ED8' : '#475569',
                        fontSize: '11.5px',
                        fontWeight: selectedCategory === cat ? 600 : 500,
                        cursor: 'pointer',
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', marginRight: '4px' }}>
                    Severity:
                  </span>
                  {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => (
                    <button
                      key={sev}
                      onClick={() => setSelectedSeverity(sev)}
                      style={{
                        padding: '3px 10px',
                        borderRadius: '14px',
                        border: `1px solid ${selectedSeverity === sev ? '#0F172A' : '#E2E8F0'}`,
                        backgroundColor: selectedSeverity === sev ? '#0F172A' : '#FFFFFF',
                        color: selectedSeverity === sev ? '#FFFFFF' : '#475569',
                        fontSize: '11.5px',
                        fontWeight: selectedSeverity === sev ? 600 : 500,
                        cursor: 'pointer',
                      }}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Rules Table */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', overflow: 'hidden', marginBottom: '40px' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                  Rules Catalog ({filteredRules.length} matching)
                </span>
                <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                  Click any rule row to test pattern on sample code and inspect AST details
                </span>
              </div>

              {loadingRules ? (
                <div style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px', color: '#2563EB' }} />
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>Loading SAST Rules Catalog...</div>
                </div>
              ) : filteredRules.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center' }}>
                  <BookOpen size={36} style={{ color: '#94A3B8', margin: '0 auto 12px' }} />
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
                    No matching detection rules
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#64748B' }}>
                    Try adjusting your search query, severity, or category filters.
                  </div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        <th style={{ padding: '12px 18px', width: '90px' }}>Severity</th>
                        <th style={{ padding: '12px 18px', width: '200px' }}>Rule Identifier</th>
                        <th style={{ padding: '12px 18px' }}>Rule Name & Threat Model</th>
                        <th style={{ padding: '12px 18px', width: '150px' }}>CWE Taxonomy</th>
                        <th style={{ padding: '12px 18px', width: '110px' }}>Engine</th>
                        <th style={{ padding: '12px 18px', width: '110px', textAlign: 'center' }}>Status</th>
                        <th style={{ padding: '12px 18px', width: '100px', textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRules.map(rule => {
                        const sevConf = SEVERITY_CONFIG[rule.severity.toUpperCase()] || SEVERITY_CONFIG.INFO;
                        const isSelected = selectedRule?.id === rule.id;

                        return (
                          <tr
                            key={rule.id}
                            onClick={() => {
                              setSelectedRule(rule);
                              setTestResult(null);
                            }}
                            style={{
                              borderBottom: '1px solid #F1F5F9',
                              backgroundColor: isSelected ? '#F0F9FF' : '#FFFFFF',
                              cursor: 'pointer',
                              transition: 'background-color 0.15s ease',
                            }}
                            onMouseEnter={e => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = '#F8FAFC';
                            }}
                            onMouseLeave={e => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = '#FFFFFF';
                            }}
                          >
                            <td style={{ padding: '14px 18px' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  backgroundColor: sevConf.bg,
                                  border: `1px solid ${sevConf.border}`,
                                  color: sevConf.text,
                                  fontSize: '11px',
                                  fontWeight: 700,
                                }}
                              >
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: sevConf.dot }} />
                                {rule.severity}
                              </span>
                            </td>

                            <td style={{ padding: '14px 18px' }}>
                              <div style={{ fontFamily: 'monospace', fontSize: '11.5px', fontWeight: 700, color: '#1E293B' }}>
                                {rule.rule_id}
                              </div>
                              {rule.is_custom && (
                                <span style={{ display: 'inline-block', fontSize: '10px', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#F5F3FF', color: '#7C3AED', fontWeight: 600, marginTop: '2px' }}>
                                  Custom Rule
                                </span>
                              )}
                            </td>

                            <td style={{ padding: '14px 18px' }}>
                              <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '13px' }}>
                                {rule.title}
                              </div>
                              <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px', maxWidth: '480px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {rule.description}
                              </div>
                            </td>

                            <td style={{ padding: '14px 18px' }}>
                              <span style={{ fontSize: '11.5px', color: '#334155', fontWeight: 500 }}>
                                {rule.cwe || 'CWE-Unassigned'}
                              </span>
                            </td>

                            <td style={{ padding: '14px 18px' }}>
                              <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#475569', fontWeight: 600 }}>
                                {rule.scanner}
                              </span>
                            </td>

                            <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={e => handleToggleRule(rule, e)}
                                title={rule.enabled ? 'Click to disable rule' : 'Click to enable rule'}
                                style={{
                                  padding: '3px 10px',
                                  borderRadius: '12px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  border: 'none',
                                  backgroundColor: rule.enabled ? '#DCFCE7' : '#F1F5F9',
                                  color: rule.enabled ? '#15803D' : '#64748B',
                                }}
                              >
                                {rule.enabled ? 'ACTIVE' : 'DISABLED'}
                              </button>
                            </td>

                            <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                              <span style={{ color: '#2563EB', fontSize: '11.5px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                Inspect <ChevronRight size={13} />
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── Rule Detail & Pattern Tester Drawer ── */}
            {selectedRule && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  right: 0,
                  bottom: 0,
                  width: '640px',
                  maxWidth: '92vw',
                  backgroundColor: '#FFFFFF',
                  borderLeft: '1px solid #E2E8F0',
                  boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
                  zIndex: 1000,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', backgroundColor: '#F8FAFC' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: '#F1F5F9',
                          border: '1px solid #E2E8F0',
                          color: '#1E293B',
                        }}
                      >
                        {selectedRule.rule_id}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          backgroundColor: (SEVERITY_CONFIG[selectedRule.severity.toUpperCase()] || SEVERITY_CONFIG.INFO).bg,
                          color: (SEVERITY_CONFIG[selectedRule.severity.toUpperCase()] || SEVERITY_CONFIG.INFO).text,
                          border: `1px solid ${(SEVERITY_CONFIG[selectedRule.severity.toUpperCase()] || SEVERITY_CONFIG.INFO).border}`,
                        }}
                      >
                        {selectedRule.severity}
                      </span>
                    </div>
                    <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                      {selectedRule.title}
                    </h2>
                  </div>
                  <button
                    onClick={() => setSelectedRule(null)}
                    style={{ border: 'none', backgroundColor: 'transparent', color: '#64748B', cursor: 'pointer', padding: '4px' }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Threat Model */}
                  <div>
                    <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                      Threat Model & Security Impact
                    </div>
                    <div style={{ fontSize: '13px', color: '#1E293B', lineHeight: '1.5', backgroundColor: '#F8FAFC', padding: '12px 14px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                      {selectedRule.description}
                    </div>
                  </div>

                  {/* Taxonomy */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>CWE Taxonomy</div>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#0F172A', marginTop: '4px' }}>
                        {selectedRule.cwe || 'CWE-Unassigned'}
                      </div>
                    </div>
                    <div style={{ backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>OWASP Top 10</div>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#0F172A', marginTop: '4px' }}>
                        {selectedRule.owasp || 'A03:2021-Injection'}
                      </div>
                    </div>
                  </div>

                  {/* Matching Signature */}
                  {selectedRule.pattern && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          AST / Regex Matching Signature
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(selectedRule.pattern!);
                            setCopiedPattern(true);
                            setTimeout(() => setCopiedPattern(false), 2000);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: '1px solid #CBD5E1',
                            backgroundColor: '#FFFFFF',
                            color: '#475569',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          {copiedPattern ? <Check size={12} color="#16A34A" /> : <Copy size={12} />}
                          {copiedPattern ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <pre
                        style={{
                          margin: 0,
                          padding: '12px',
                          borderRadius: '6px',
                          backgroundColor: '#0F172A',
                          color: '#38BDF8',
                          fontFamily: 'monospace',
                          fontSize: '12px',
                          overflowX: 'auto',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                        }}
                      >
                        {selectedRule.pattern}
                      </pre>
                    </div>
                  )}

                  {/* ── Pattern Tester against Sample Code ── */}
                  <div style={{ border: '1px solid #BFDBFE', borderRadius: '8px', backgroundColor: '#F0F9FF', padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#1E40AF' }}>
                        <Terminal size={14} />
                        <span>Interactive Rule Pattern Tester</span>
                      </div>
                      <button
                        onClick={handleRunPatternTest}
                        disabled={testingPattern || !testCodeSnippet.trim()}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '4px 10px',
                          backgroundColor: '#2563EB',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: testingPattern || !testCodeSnippet.trim() ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <Play size={10} fill="#FFFFFF" />
                        <span>{testingPattern ? 'Evaluating...' : 'Test Pattern'}</span>
                      </button>
                    </div>
                    <textarea
                      placeholder="Paste sample vulnerable or safe code snippet here to test this rule pattern against..."
                      rows={4}
                      value={testCodeSnippet}
                      onChange={e => setTestCodeSnippet(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        fontFamily: 'monospace',
                        fontSize: '11.5px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        backgroundColor: '#FFFFFF',
                        color: '#0F172A',
                        boxSizing: 'border-box',
                        outline: 'none',
                        resize: 'vertical',
                      }}
                    />
                    {testResult && (
                      <div
                        style={{
                          marginTop: '10px',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          backgroundColor: testResult.matched ? '#FEF2F2' : '#F0FDF4',
                          border: `1px solid ${testResult.matched ? '#FECACA' : '#DCFCE7'}`,
                          color: testResult.matched ? '#DC2626' : '#16A34A',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        {testResult.matched ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                        <span>{testResult.message}</span>
                      </div>
                    )}
                  </div>

                  {/* Scope & Exclusions */}
                  <div>
                    <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                      Scope & Exclusions
                    </div>
                    <div style={{ backgroundColor: '#F8FAFC', padding: '12px 14px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '12px', color: '#475569' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: '#64748B' }}>Target Extensions:</span>
                        <span style={{ fontWeight: 600, color: '#0F172A' }}>*.py, *.js, *.ts, *.go, *.java</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748B' }}>Default Exclusions:</span>
                        <span style={{ fontFamily: 'monospace', color: '#64748B' }}>tests/**, vendor/**, node_modules/**</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC' }}>
                  <button
                    onClick={e => handleToggleRule(selectedRule, e)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 14px',
                      borderRadius: '6px',
                      backgroundColor: selectedRule.enabled ? '#DC2626' : '#16A34A',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {selectedRule.enabled ? 'Disable Rule (Suppress in CI)' : 'Enable Rule (Enforce in CI)'}
                  </button>
                  <button
                    onClick={() => setSelectedRule(null)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      color: '#475569',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: BASELINES & DRIFT                                              */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'baselines' && (
          <div>
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Active Baselines</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                    {loadingBaselines ? '—' : baselines.filter(b => b.status === 'ACTIVE').length}
                  </div>
                  <div style={{ fontSize: '11px', color: '#16A34A', marginTop: '1px', fontWeight: 600 }}>Guarding CI Merge Gates</div>
                </div>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A' }}>
                  <ShieldCheck size={18} />
                </div>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Monitored Branches</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                    {new Set(baselines.map(b => `${b.repository_name}:${b.branch}`)).size || repositories.length || 1}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>Tracking git HEAD drift</div>
                </div>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
                  <GitBranch size={18} />
                </div>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Suppressed Legacy Debt</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#EA580C', marginTop: '2px' }}>
                    {baselines.reduce((acc, b) => acc + (b.total_findings_at_baseline || 0), 0)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>Pre-existing findings accepted</div>
                </div>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EA580C' }}>
                  <Layers size={18} />
                </div>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Regression Gate</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#16A34A', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={16} /> Enforced
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>Only newly added flaws block</div>
                </div>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A' }}>
                  <Check size={18} />
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type="text"
                  placeholder="Search baselines by repository, branch, or commit SHA..."
                  value={baselineSearch}
                  onChange={e => setBaselineSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '12.5px',
                    color: '#0F172A',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {repositories.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>Repository:</span>
                  <select
                    value={baselineRepoFilter}
                    onChange={e => setBaselineRepoFilter(e.target.value)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '12.5px',
                      color: '#0F172A',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                    }}
                  >
                    <option value="ALL">All Repositories</option>
                    {repositories.map(r => (
                      <option key={r.id} value={r.id}>{r.name || r.full_name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Baselines Table */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', overflow: 'hidden', marginBottom: '40px' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                  Active Security Baselines ({filteredBaselines.length})
                </span>
                <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                  CI PR merge checks compare commit diffs against these established snapshots
                </span>
              </div>

              {loadingBaselines ? (
                <div style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px', color: '#2563EB' }} />
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>Loading Security Baselines...</div>
                </div>
              ) : filteredBaselines.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center' }}>
                  <Compass size={36} style={{ color: '#94A3B8', margin: '0 auto 12px' }} />
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
                    No security baselines established yet
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#64748B', maxWidth: '420px', margin: '0 auto 16px' }}>
                    Establish a reviewed security baseline to accept legacy technical debt and only alert on newly introduced code flaws.
                  </div>
                  <button
                    onClick={() => setIsEstablishModalOpen(true)}
                    style={{
                      padding: '7px 16px',
                      borderRadius: '6px',
                      backgroundColor: '#2563EB',
                      border: 'none',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={12} style={{ marginRight: '6px', display: 'inline' }} />
                    Establish Baseline Now
                  </button>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        <th style={{ padding: '12px 18px' }}>Repository</th>
                        <th style={{ padding: '12px 18px', width: '160px' }}>Branch</th>
                        <th style={{ padding: '12px 18px', width: '150px' }}>Commit Snapshot</th>
                        <th style={{ padding: '12px 18px', width: '140px' }}>Baseline Debt</th>
                        <th style={{ padding: '12px 18px', width: '120px' }}>Status</th>
                        <th style={{ padding: '12px 18px', width: '180px' }}>Established At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBaselines.map(b => (
                        <tr key={b.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#0F172A' }}>
                              <FolderGit2 size={14} color="#2563EB" />
                              <span>{b.repository_name || 'kavach'}</span>
                            </div>
                            {b.note && (
                              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{b.note}</div>
                            )}
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'monospace', fontSize: '11.5px', color: '#334155' }}>
                              <GitBranch size={13} color="#64748B" />
                              <span>{b.branch}</span>
                            </div>
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', color: '#1E293B' }}>
                              sha:{b.commit_sha ? b.commit_sha.slice(0, 7) : 'HEAD'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <span style={{ fontWeight: 700, color: '#EA580C' }}>
                              {b.total_findings_at_baseline ?? 0} flaws suppressed
                            </span>
                          </td>
                          <td style={{ padding: '14px 18px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, backgroundColor: '#DCFCE7', color: '#15803D' }}>
                              <CheckCircle2 size={12} /> ACTIVE
                            </span>
                          </td>
                          <td style={{ padding: '14px 18px', fontSize: '11.5px', color: '#64748B' }}>
                            {b.created_at ? new Date(b.created_at).toLocaleDateString() : 'Recent'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: RISK EXCEPTIONS                                                */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'exceptions' && (
          <div>
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Active Exceptions</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                    {loadingExceptions ? '—' : exceptionCounts.active}
                  </div>
                  <div style={{ fontSize: '11px', color: '#16A34A', marginTop: '1px', fontWeight: 600 }}>Temporarily accepted</div>
                </div>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A' }}>
                  <ShieldCheck size={18} />
                </div>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Expired Exceptions</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#DC2626', marginTop: '2px' }}>
                    {loadingExceptions ? '—' : exceptionCounts.expired}
                  </div>
                  <div style={{ fontSize: '11px', color: '#DC2626', marginTop: '1px', fontWeight: 600 }}>Re-enforced in scans</div>
                </div>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626' }}>
                  <Clock size={18} />
                </div>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Revoked Exceptions</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#64748B', marginTop: '2px' }}>
                    {loadingExceptions ? '—' : exceptionCounts.revoked}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>Manually rescinded</div>
                </div>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                  <XCircle size={18} />
                </div>
              </div>

              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Total Governance Ledger</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#2563EB', marginTop: '2px' }}>
                    {loadingExceptions ? '—' : exceptionCounts.total}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>Audited risk requests</div>
                </div>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
                  <FileText size={18} />
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type="text"
                  placeholder="Search exceptions by rule ID, file path, approver, or justification..."
                  value={exceptionSearch}
                  onChange={e => setExceptionSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '12.5px',
                    color: '#0F172A',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Status Tabs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#F1F5F9', padding: '3px', borderRadius: '6px' }}>
                {(['ALL', 'ACTIVE', 'EXPIRED', 'REVOKED'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setExceptionStatusFilter(st)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '4px',
                      border: 'none',
                      backgroundColor: exceptionStatusFilter === st ? '#FFFFFF' : 'transparent',
                      color: exceptionStatusFilter === st ? '#0F172A' : '#64748B',
                      fontSize: '12px',
                      fontWeight: exceptionStatusFilter === st ? 600 : 500,
                      cursor: 'pointer',
                      boxShadow: exceptionStatusFilter === st ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Exceptions Table */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', overflow: 'hidden', marginBottom: '40px' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                  Risk Acceptance Ledger ({filteredExceptions.length})
                </span>
                <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                  Exceptions require mandatory justification, expiration date, and security officer approval
                </span>
              </div>

              {loadingExceptions ? (
                <div style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px', color: '#2563EB' }} />
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>Loading Risk Exceptions...</div>
                </div>
              ) : filteredExceptions.length === 0 ? (
                <div style={{ padding: '48px', textAlign: 'center' }}>
                  <ShieldAlert size={36} style={{ color: '#94A3B8', margin: '0 auto 12px' }} />
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
                    No risk exceptions recorded
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#64748B', maxWidth: '420px', margin: '0 auto 16px' }}>
                    Every vulnerability is currently enforced. Add an audited exception if business requirements demand temporary risk acceptance.
                  </div>
                  <button
                    onClick={() => setIsExceptionModalOpen(true)}
                    style={{
                      padding: '7px 16px',
                      borderRadius: '6px',
                      backgroundColor: '#2563EB',
                      border: 'none',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={12} style={{ marginRight: '6px', display: 'inline' }} />
                    Add Risk Exception
                  </button>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        <th style={{ padding: '12px 18px', width: '100px' }}>Status</th>
                        <th style={{ padding: '12px 18px', width: '180px' }}>Rule Identifier</th>
                        <th style={{ padding: '12px 18px' }}>Business Justification & Scope</th>
                        <th style={{ padding: '12px 18px', width: '140px' }}>Approver</th>
                        <th style={{ padding: '12px 18px', width: '140px' }}>Expires In</th>
                        <th style={{ padding: '12px 18px', width: '100px', textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExceptions.map(ex => {
                        const isExpired = ex.status === 'EXPIRED';
                        const isActive = ex.status === 'ACTIVE';

                        return (
                          <tr key={ex.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '14px 18px' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  backgroundColor: isActive ? '#DCFCE7' : isExpired ? '#FEF2F2' : '#F1F5F9',
                                  color: isActive ? '#15803D' : isExpired ? '#DC2626' : '#64748B',
                                }}
                              >
                                {ex.status}
                              </span>
                            </td>

                            <td style={{ padding: '14px 18px' }}>
                              <div style={{ fontFamily: 'monospace', fontSize: '11.5px', fontWeight: 700, color: '#1E293B' }}>
                                {ex.rule_id}
                              </div>
                              {ex.file_path && (
                                <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace', marginTop: '2px' }}>
                                  {ex.file_path}
                                </div>
                              )}
                            </td>

                            <td style={{ padding: '14px 18px' }}>
                              <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '12.5px' }}>
                                {ex.justification}
                              </div>
                              {ex.compensating_controls && (
                                <div style={{ fontSize: '11px', color: '#16A34A', marginTop: '2px' }}>
                                  Control: {ex.compensating_controls}
                                </div>
                              )}
                            </td>

                            <td style={{ padding: '14px 18px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#334155' }}>
                                <User size={13} color="#64748B" />
                                <span>{ex.approver_name || 'SecOps Admin'}</span>
                              </div>
                            </td>

                            <td style={{ padding: '14px 18px' }}>
                              <span style={{ fontSize: '11.5px', color: isExpired ? '#DC2626' : '#64748B', fontWeight: isExpired ? 700 : 500 }}>
                                {ex.expires_at ? new Date(ex.expires_at).toLocaleDateString() : `${ex.expires_in_days || 30} days`}
                              </span>
                            </td>

                            <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                              {isActive && (
                                <button
                                  type="button"
                                  onClick={() => handleRevokeException(ex.id)}
                                  style={{
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    border: '1px solid #FECACA',
                                    backgroundColor: '#FEF2F2',
                                    color: '#DC2626',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Revoke
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Modal: Create Custom Rule ── */}
        {isCreateRuleOpen && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', width: '600px', maxWidth: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Create Custom AST Security Rule</h3>
                <button onClick={() => setIsCreateRuleOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B' }}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateRule} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {formError && (
                  <div style={{ padding: '10px 14px', borderRadius: '6px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '12px' }}>
                    {formError}
                  </div>
                )}

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>Rule Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Detect Unvalidated Subprocess Execution in API Route"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>Rule ID (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. SEC-CUSTOM-001"
                      value={newRuleId}
                      onChange={e => setNewRuleId(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>Severity</label>
                    <select
                      value={newSeverity}
                      onChange={e => setNewSeverity(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', backgroundColor: '#FFFFFF' }}
                    >
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="HIGH">HIGH</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="LOW">LOW</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>CWE Taxonomy</label>
                    <input
                      type="text"
                      value={newCwe}
                      onChange={e => setNewCwe(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>OWASP Category</label>
                    <input
                      type="text"
                      value={newOwasp}
                      onChange={e => setNewOwasp(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>AST Matching Pattern / Regex</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. subprocess\.(Popen|run|call)\(.*shell\s*=\s*True.*\)"
                    value={newPattern}
                    onChange={e => setNewPattern(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontFamily: 'monospace', fontSize: '12px', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>Description & Remediation Guidance</label>
                  <textarea
                    rows={2}
                    placeholder="Explain why this pattern is insecure and how developers should fix it..."
                    value={newDescription}
                    onChange={e => setNewDescription(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '12.5px', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setIsCreateRuleOpen(false)}
                    style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#475569', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingRule}
                    style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', backgroundColor: '#2563EB', color: '#FFFFFF', fontSize: '12.5px', fontWeight: 600, cursor: submittingRule ? 'wait' : 'pointer' }}
                  >
                    {submittingRule ? 'Saving Rule...' : 'Save & Enforce'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Modal: Establish Baseline ── */}
        {isEstablishModalOpen && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', width: '540px', maxWidth: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Establish Approved Security Baseline</h3>
                <button onClick={() => setIsEstablishModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B' }}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleEstablishBaseline} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>Target Repository</label>
                  <select
                    value={selectedRepoId}
                    onChange={e => setSelectedRepoId(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', backgroundColor: '#FFFFFF' }}
                  >
                    {repositories.map(r => (
                      <option key={r.id} value={r.id}>{r.name || r.full_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>Branch</label>
                  <input
                    type="text"
                    value={selectedBranch}
                    onChange={e => setSelectedBranch(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>Baseline Annotation / Audit Note</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Q1 Production Release Snapshot - Approved legacy technical debt"
                    value={baselineNote}
                    onChange={e => setBaselineNote(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '12.5px', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setIsEstablishModalOpen(false)}
                    style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#475569', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingBaseline}
                    style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', backgroundColor: '#2563EB', color: '#FFFFFF', fontSize: '12.5px', fontWeight: 600, cursor: submittingBaseline ? 'wait' : 'pointer' }}
                  >
                    {submittingBaseline ? 'Establishing...' : 'Confirm Baseline'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Modal: Add Risk Exception ── */}
        {isExceptionModalOpen && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', width: '560px', maxWidth: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Add Audited Risk Acceptance Exception</h3>
                <button onClick={() => setIsExceptionModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B' }}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateException} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>Rule Identifier / Flaw ID</label>
                  <input
                    type="text"
                    placeholder="e.g. SAST-006 or semgrep.python.lang.security.deserialization"
                    value={exceptionRuleId}
                    onChange={e => setExceptionRuleId(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>Scope File Path (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. backend/app/legacy_utils.py"
                      value={exceptionFilePath}
                      onChange={e => setExceptionFilePath(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>Expires In (Days)</label>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={exceptionExpiryDays}
                      onChange={e => setExceptionExpiryDays(parseInt(e.target.value, 10) || 30)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>Business Justification (Mandatory for Audit)</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Document business justification and compensating security controls..."
                    value={exceptionJustification}
                    onChange={e => setExceptionJustification(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '12.5px', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setIsExceptionModalOpen(false)}
                    style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#475569', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingException}
                    style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', backgroundColor: '#2563EB', color: '#FFFFFF', fontSize: '12.5px', fontWeight: 600, cursor: submittingException ? 'wait' : 'pointer' }}
                  >
                    {submittingException ? 'Saving...' : 'Authorize Exception'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </KavachSastLayout>
  );
}

export default function SASTRulesPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
        <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px', color: '#2563EB' }} />
        <div>Loading Rules & Policies...</div>
      </div>
    }>
      <SASTRulesPoliciesInner />
    </Suspense>
  );
}
