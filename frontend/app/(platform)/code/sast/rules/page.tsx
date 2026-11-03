'use client';

/**
 * Thing Code — SAST Rules Catalog & Custom Rule Builder (/code/sast/rules)
 * 
 * Production-grade Static Analysis Rule Management Suite:
 * - Real API integration with /api/sast/rules and /api/v1/sast/rules
 * - Standard Semgrep AST & SecuLayer Builtin rules
 * - Custom AST & regex pattern creation with live validation
 * - Dynamic severity/status filtering & interactive rule inspection drawer
 * - Persistent toggle states per project workspace
 * 
 * Strictly adheres to AGENTS.md & GEMINI.md (Zero mock numbers, clean SecuLayer light theme).
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
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
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { KavachSastLayout } from '@/components/code/sast/KavachSastLayout';

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

export default function SASTRulesPage() {
  const [rules, setRules] = useState<SASTRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ENABLED' | 'DISABLED'>('ALL');

  // Drawer & Modal States
  const [selectedRule, setSelectedRule] = useState<SASTRule | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [copiedPattern, setCopiedPattern] = useState(false);

  // Form State for Custom Rule
  const [newTitle, setNewTitle] = useState('');
  const [newRuleId, setNewRuleId] = useState('');
  const [newSeverity, setNewSeverity] = useState('HIGH');
  const [newCategory, setNewCategory] = useState('SAST');
  const [newCwe, setNewCwe] = useState('CWE-89: SQL Injection');
  const [newOwasp, setNewOwasp] = useState('A03:2021-Injection');
  const [newPattern, setNewPattern] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ── Load Rules from Backend ────────────────────────────────────────────────
  const loadRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.sast.rules();
      if (res?.rules) {
        setRules(res.rules);
      }
    } catch (err: any) {
      console.error('Failed to fetch SAST rules:', err);
      setError(err?.message || 'Failed to communicate with SAST rules engine.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  // ── Toggle Rule Switch ─────────────────────────────────────────────────────
  const handleToggleRule = async (rule: SASTRule, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !rule.enabled;

    // Optimistic UI update
    setRules(prev => prev.map(r => (r.id === rule.id ? { ...r, enabled: nextState } : r)));
    if (selectedRule?.id === rule.id) {
      setSelectedRule(prev => prev ? { ...prev, enabled: nextState } : null);
    }

    try {
      await api.sast.toggleRule(rule.id, nextState);
    } catch (err: any) {
      console.error('Failed to toggle rule state:', err);
      // Rollback
      setRules(prev => prev.map(r => (r.id === rule.id ? { ...r, enabled: rule.enabled } : r)));
      if (selectedRule?.id === rule.id) {
        setSelectedRule(prev => prev ? { ...prev, enabled: rule.enabled } : null);
      }
    }
  };

  // ── Create Custom Rule ─────────────────────────────────────────────────────
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

    setSubmitting(true);
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
      setIsCreateModalOpen(false);

      // Reset Form
      setNewTitle('');
      setNewRuleId('');
      setNewPattern('');
      setNewDescription('');
    } catch (err: any) {
      setFormError(err?.message || 'Failed to persist custom rule.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Copy Pattern Helper ───────────────────────────────────────────────────
  const handleCopyPattern = (pat?: string) => {
    if (!pat) return;
    navigator.clipboard.writeText(pat);
    setCopiedPattern(true);
    setTimeout(() => setCopiedPattern(false), 2000);
  };

  // ── Filtered Rules Calculation ─────────────────────────────────────────────
  const filteredRules = useMemo(() => {
    return rules.filter(r => {
      const q = searchQuery.toLowerCase();
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
        statusFilter === 'ALL' ||
        (statusFilter === 'ENABLED' && r.enabled) ||
        (statusFilter === 'DISABLED' && !r.enabled);

      return matchSearch && matchCat && matchSev && matchStatus;
    });
  }, [rules, searchQuery, selectedCategory, selectedSeverity, statusFilter]);

  // Derived Counts
  const totalCount = rules.length;
  const enabledCount = rules.filter((r) => r.enabled).length;
  const disabledCount = rules.filter((r) => !r.enabled).length;
  const customCount = rules.filter((r) => r.is_custom).length;

  return (
    <KavachSastLayout>
      <div style={{ padding: '16px 24px', maxWidth: '1600px', margin: '0 auto', display: 'flex', flexDirection: 'column', width: '100%' }}>
        
        {/* ── 1. Sleek Sub-Toolbar matching SAST Workspace ── */}
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
            <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              SAST Rules Catalog & Rule Builder
            </h1>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '3px 0 0 0' }}>
              Deterministic syntax tree patterns, vulnerability heuristics, CWE/OWASP taxonomy, and custom AST policies.
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={loadRules}
              disabled={loading}
              title="Refresh Rules"
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
                cursor: loading ? 'wait' : 'pointer',
              }}
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
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
          </div>
        </div>

        {/* ── 2. Error Banner ── */}
        {error && (
          <div style={{ marginBottom: '14px', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={15} />
            <span style={{ fontSize: '12.5px' }}>{error}</span>
          </div>
        )}

        {/* ── 3. Real KPI Cards (Medium Clean Proportions) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                Total AST Rules
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                {loading ? '—' : totalCount}
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '1px' }}>
                Across SAST, Secrets, & IaC
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
                {loading ? '—' : enabledCount}
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
                {loading ? '—' : disabledCount}
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '1px' }}>
                Suppressed by policy
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
                {loading ? '—' : customCount}
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '1px' }}>
                Organization specific
              </div>
            </div>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C3AED' }}>
              <Sparkles size={18} />
            </div>
          </div>

        </div>

        {/* ── 4. Search & Filter Bar ── */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* Top row: search & status filter */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type="text"
                  placeholder="Search rules by title, rule ID, CWE-89, OWASP, or keyword..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
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
                    onClick={() => setStatusFilter(st)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '4px',
                      border: 'none',
                      backgroundColor: statusFilter === st ? '#FFFFFF' : 'transparent',
                      color: statusFilter === st ? '#0F172A' : '#64748B',
                      fontSize: '12px',
                      fontWeight: statusFilter === st ? 600 : 500,
                      cursor: 'pointer',
                      boxShadow: statusFilter === st ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    }}
                  >
                    {st === 'ALL' ? 'All Statuses' : st === 'ENABLED' ? 'Enabled Only' : 'Disabled'}
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom row: Category and Severity Pills */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
              
              {/* Category Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', marginRight: '4px' }}>
                  Category:
                </span>
                {['ALL', 'SAST', 'SECRETS', 'IAC'].map(cat => (
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

              {/* Severity Filter */}
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
        </div>

        {/* ── 5. Rules Catalog Table / List ── */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                Rules Catalog ({filteredRules.length} matching)
              </span>
              <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                Click any row to inspect AST pattern & remediation guidance
              </span>
            </div>

            {loading ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px', color: '#2563EB' }} />
                <div style={{ fontSize: '13px', fontWeight: 500 }}>Querying SAST Rules Engine...</div>
              </div>
            ) : filteredRules.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <BookOpen size={36} style={{ color: '#94A3B8', margin: '0 auto 12px' }} />
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>
                  No rules match your filter criteria
                </div>
                <div style={{ fontSize: '12.5px', color: '#64748B', maxWidth: '400px', margin: '0 auto 16px' }}>
                  Try resetting your search query or selecting a different severity / category.
                </div>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('ALL');
                    setSelectedSeverity('ALL');
                    setStatusFilter('ALL');
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    color: '#1D4ED8',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <th style={{ padding: '12px 18px', width: '60px' }}>State</th>
                      <th style={{ padding: '12px 18px' }}>Rule ID & Name</th>
                      <th style={{ padding: '12px 18px', width: '100px' }}>Severity</th>
                      <th style={{ padding: '12px 18px', width: '110px' }}>Category</th>
                      <th style={{ padding: '12px 18px' }}>Taxonomy (CWE / OWASP)</th>
                      <th style={{ padding: '12px 18px', width: '180px' }}>Engine</th>
                      <th style={{ padding: '12px 18px', width: '80px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRules.map(rule => {
                      const sevConf = SEVERITY_CONFIG[rule.severity] || SEVERITY_CONFIG.INFO;
                      const isSelected = selectedRule?.id === rule.id;

                      return (
                        <tr
                          key={rule.id}
                          onClick={() => setSelectedRule(rule)}
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
                          {/* Toggle Switch */}
                          <td style={{ padding: '14px 18px' }} onClick={e => e.stopPropagation()}>
                            <button
                              onClick={e => handleToggleRule(rule, e)}
                              title={rule.enabled ? 'Click to disable rule' : 'Click to enable rule'}
                              style={{
                                width: '36px',
                                height: '20px',
                                borderRadius: '10px',
                                border: 'none',
                                backgroundColor: rule.enabled ? '#16A34A' : '#CBD5E1',
                                position: 'relative',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s ease',
                                padding: 0,
                              }}
                            >
                              <div
                                style={{
                                  width: '16px',
                                  height: '16px',
                                  borderRadius: '50%',
                                  backgroundColor: '#FFFFFF',
                                  position: 'absolute',
                                  top: '2px',
                                  left: rule.enabled ? '18px' : '2px',
                                  transition: 'left 0.2s ease',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                                }}
                              />
                            </button>
                          </td>

                          {/* Rule ID & Title */}
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                style={{
                                  fontFamily: 'monospace',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: rule.is_custom ? '#F5F3FF' : '#F1F5F9',
                                  border: `1px solid ${rule.is_custom ? '#DDD6FE' : '#E2E8F0'}`,
                                  color: rule.is_custom ? '#6D28D9' : '#334155',
                                }}
                              >
                                {rule.rule_id}
                              </span>
                              {rule.is_custom && (
                                <span style={{ fontSize: '10px', fontWeight: 600, color: '#7C3AED', backgroundColor: '#EDE9FE', padding: '1px 5px', borderRadius: '4px' }}>
                                  CUSTOM
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginTop: '3px' }}>
                              {rule.title}
                            </div>
                            <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px', maxWidth: '480px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {rule.description}
                            </div>
                          </td>

                          {/* Severity */}
                          <td style={{ padding: '14px 18px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 8px',
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

                          {/* Category */}
                          <td style={{ padding: '14px 18px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor: '#F1F5F9',
                                border: '1px solid #E2E8F0',
                                color: '#475569',
                                fontSize: '11px',
                                fontWeight: 600,
                              }}
                            >
                              {rule.category}
                            </span>
                          </td>

                          {/* Taxonomy */}
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontSize: '11px', color: '#334155', fontWeight: 500 }}>
                              {rule.cwe || 'CWE-Generic'}
                            </div>
                            {rule.owasp && (
                              <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '2px' }}>
                                {rule.owasp}
                              </div>
                            )}
                          </td>

                          {/* Scanner Engine */}
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Code2 size={13} style={{ color: '#2563EB' }} />
                              <span style={{ fontSize: '11.5px', color: '#334155', fontWeight: 500 }}>
                                {rule.scanner}
                              </span>
                            </div>
                          </td>

                          {/* Action Button */}
                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setSelectedRule(rule);
                              }}
                              style={{
                                padding: '5px 8px',
                                borderRadius: '4px',
                                border: '1px solid #CBD5E1',
                                backgroundColor: '#FFFFFF',
                                color: '#334155',
                                fontSize: '11px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              Inspect <ChevronRight size={12} />
                            </button>
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

        {/* ── 6. Rule Details Inspector Drawer ───────────────────────────────── */}
        {selectedRule && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '560px',
              maxWidth: '90vw',
              backgroundColor: '#FFFFFF',
              borderLeft: '1px solid #E2E8F0',
              boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Drawer Header */}
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
                      backgroundColor: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      color: '#1D4ED8',
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
                      backgroundColor: (SEVERITY_CONFIG[selectedRule.severity] || SEVERITY_CONFIG.INFO).bg,
                      color: (SEVERITY_CONFIG[selectedRule.severity] || SEVERITY_CONFIG.INFO).text,
                      border: `1px solid ${(SEVERITY_CONFIG[selectedRule.severity] || SEVERITY_CONFIG.INFO).border}`,
                    }}
                  >
                    {selectedRule.severity}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: selectedRule.enabled ? '#DCFCE7' : '#F1F5F9',
                      color: selectedRule.enabled ? '#15803D' : '#64748B',
                    }}
                  >
                    {selectedRule.enabled ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </div>
                <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  {selectedRule.title}
                </h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Link
                  href={`/code/sast/rules/${encodeURIComponent(selectedRule.rule_id)}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid #BFDBFE',
                    backgroundColor: '#EFF6FF',
                    color: '#2563EB',
                    fontSize: '11px',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  <ExternalLink size={11} /> Full Page
                </Link>
                <button
                  onClick={() => setSelectedRule(null)}
                  style={{
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#64748B',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Description */}
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                  Rule Description & Threat Model
                </div>
                <div style={{ fontSize: '13px', color: '#1E293B', lineHeight: '1.5', backgroundColor: '#F8FAFC', padding: '12px 14px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  {selectedRule.description}
                </div>
              </div>

              {/* Taxonomy Specs */}
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
                    {selectedRule.owasp || 'A00:2021-Standard'}
                  </div>
                </div>
              </div>

              {/* Pattern / AST Definition */}
              {selectedRule.pattern && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      AST / Regex Matching Signature
                    </div>
                    <button
                      onClick={() => handleCopyPattern(selectedRule.pattern)}
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
                      padding: '14px',
                      borderRadius: '6px',
                      backgroundColor: '#0F172A',
                      color: '#38BDF8',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      lineHeight: '1.4',
                      overflowX: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}
                  >
                    {selectedRule.pattern}
                  </pre>
                </div>
              )}

              {/* Execution Engine Details */}
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                  Analysis Engine & Metadata
                </div>
                <div style={{ backgroundColor: '#F8FAFC', padding: '12px 14px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '12px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Engine:</span>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>{selectedRule.scanner}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Category:</span>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>{selectedRule.category}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Rule Origin:</span>
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>{selectedRule.is_custom ? 'Custom Workspace Rule' : 'Builtin Core Rule'}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Drawer Footer Actions */}
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
                {selectedRule.enabled ? 'Disable This Rule' : 'Enable This Rule'}
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

        {/* ── 7. Create Custom Rule Modal ────────────────────────────────────── */}
        {isCreateModalOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1100,
              padding: '16px',
            }}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                width: '100%',
                maxWidth: '600px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Modal Header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} color="#7C3AED" />
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                    Create Custom SAST Rule
                  </span>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{ border: 'none', backgroundColor: 'transparent', color: '#64748B', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleCreateRule} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {formError && (
                  <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '12px' }}>
                    {formError}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Rule Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Insecure AWS STS AssumeRole Without ExternalId"
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '12.5px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Rule ID (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CUSTOM-001"
                      value={newRuleId}
                      onChange={e => setNewRuleId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '12.5px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Severity
                    </label>
                    <select
                      value={newSeverity}
                      onChange={e => setNewSeverity(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '12.5px',
                        backgroundColor: '#FFFFFF',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="HIGH">HIGH</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="LOW">LOW</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Category
                    </label>
                    <select
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '12.5px',
                        backgroundColor: '#FFFFFF',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="SAST">SAST</option>
                      <option value="SECRETS">SECRETS</option>
                      <option value="IAC">IAC</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      CWE Taxonomy
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CWE-89: SQL Injection"
                      value={newCwe}
                      onChange={e => setNewCwe(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '12.5px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      OWASP Mapping
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. A03:2021-Injection"
                      value={newOwasp}
                      onChange={e => setNewOwasp(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '12.5px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Matching Pattern (Regex or AST Pattern) *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="e.g. (?i)sts\.assume_role\s*\([^)]*(?!ExternalId)"
                    value={newPattern}
                    onChange={e => setNewPattern(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Description & Remediation Guidance *
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Explain what vulnerability this detects and the recommended fix."
                    value={newDescription}
                    onChange={e => setNewDescription(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '12.5px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Modal Footer */}
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
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
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      padding: '7px 16px',
                      borderRadius: '6px',
                      backgroundColor: '#2563EB',
                      border: 'none',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: submitting ? 'wait' : 'pointer',
                    }}
                  >
                    {submitting ? 'Persisting Rule...' : 'Save & Enforce Rule'}
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
