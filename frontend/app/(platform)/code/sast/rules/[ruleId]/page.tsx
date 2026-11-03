'use client';

/**
 * Thing Code — SAST Rule Details (/code/sast/rules/[ruleId])
 * 
 * Production-grade security rule documentation, positive/negative code examples,
 * syntax pattern viewer, and affected finding list.
 * Core Principle: "LLM proposes. Deterministic security systems decide. Runtime evidence proves."
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  BookOpen,
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ExternalLink,
  Code2,
  FileCode2,
  FolderGit2,
  SlidersHorizontal,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { useScope } from '@/context/ScopeContext';

export default function SASTRuleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentProject } = useScope();
  const ruleId = typeof params?.ruleId === 'string' ? params.ruleId : '';

  const [rule, setRule] = useState<any>(null);
  const [affectedFindings, setAffectedFindings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedPattern, setCopiedPattern] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = useCallback(async () => {
    if (!ruleId) return;
    setLoading(true);
    try {
      const projId = currentProject?.id || undefined;
      const [rDetail, fList] = await Promise.allSettled([
        api.sast.ruleDetail(ruleId, projId),
        api.code.findings({ rule_id: ruleId, limit: 25 }),
      ]);

      if (rDetail.status === 'fulfilled' && rDetail.value) {
        setRule(rDetail.value);
      }
      if (fList.status === 'fulfilled' && fList.value?.items) {
        setAffectedFindings(fList.value.items);
      }
    } catch (err: any) {
      console.error('[Rule Detail] Failed to load:', err);
    } finally {
      setLoading(false);
    }
  }, [ruleId, currentProject?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleRule = async () => {
    if (!rule) return;
    setIsUpdating(true);
    try {
      const nextState = !rule.enabled;
      await api.sast.toggleRule(rule.id, nextState, currentProject?.id);
      setRule((prev: any) => ({ ...prev, enabled: nextState }));
      showToast(`Rule is now ${nextState ? 'ENABLED' : 'DISABLED'}.`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to toggle rule.');
    } finally {
      setIsUpdating(false);
    }
  };

  const copyPattern = () => {
    if (rule?.pattern) {
      navigator.clipboard.writeText(rule.pattern);
      setCopiedPattern(true);
      setTimeout(() => setCopiedPattern(false), 2000);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100%', backgroundColor: '#F8FAFC', padding: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '14px', fontWeight: 600 }}>
          <RefreshCw size={18} className="animate-spin" />
          Loading Rule Documentation & AST Definitions...
        </div>
      </div>
    );
  }

  if (!rule) {
    return (
      <div style={{ minHeight: '100%', backgroundColor: '#F8FAFC', padding: '40px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>Rule Not Found</h2>
        <p style={{ fontSize: '13px', color: '#64748B', marginTop: '6px' }}>The requested security rule could not be loaded.</p>
        <Link href="/code/sast/rules" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '16px', color: '#2563EB', fontWeight: 600 }}>
          <ArrowLeft size={14} /> Back to Rules Catalog
        </Link>
      </div>
    );
  }

  const sevColor = rule.severity === 'CRITICAL' ? '#DC2626' : rule.severity === 'HIGH' ? '#EA580C' : rule.severity === 'MEDIUM' ? '#CA8A04' : '#2563EB';
  const sevBg = rule.severity === 'CRITICAL' ? '#FEF2F2' : rule.severity === 'HIGH' ? '#FFF7ED' : rule.severity === 'MEDIUM' ? '#FEFCE8' : '#EFF6FF';

  return (
    <div style={{ minHeight: '100%', backgroundColor: '#F8FAFC', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
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

      {/* Back Link & Header */}
      <div>
        <Link
          href="/code/sast/rules"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#64748B', textDecoration: 'none', marginBottom: '10px', fontWeight: 600 }}
        >
          <ArrowLeft size={14} /> Back to Rules Catalog
        </Link>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span
                style={{
                  backgroundColor: sevBg,
                  color: sevColor,
                  border: `1px solid ${sevColor}40`,
                  padding: '3px 9px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                {rule.severity}
              </span>
              <span style={{ backgroundColor: '#F1F5F9', color: '#475569', padding: '3px 9px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                {rule.category}
              </span>
              {rule.cwe && (
                <span style={{ backgroundColor: '#EFF6FF', color: '#2563EB', padding: '3px 9px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                  {rule.cwe}
                </span>
              )}
              {rule.owasp && (
                <span style={{ backgroundColor: '#F0FDF4', color: '#16A34A', padding: '3px 9px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                  {rule.owasp}
                </span>
              )}
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              {rule.title}
            </h1>
            <div style={{ fontSize: '12.5px', color: '#64748B', fontFamily: 'monospace', marginTop: '4px' }}>
              {rule.rule_id}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleToggleRule}
              disabled={isUpdating}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                backgroundColor: rule.enabled ? '#FEF2F2' : '#EFF6FF',
                color: rule.enabled ? '#DC2626' : '#2563EB',
                border: `1px solid ${rule.enabled ? '#FECACA' : '#BFDBFE'}`,
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {rule.enabled ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
              {rule.enabled ? 'Disable Rule' : 'Enable Rule'}
            </button>
          </div>
        </div>
      </div>

      {/* Description & Overview Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Rule Description Card */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
              Vulnerability Description & Risk Impact
            </h3>
            <p style={{ fontSize: '13.5px', color: '#334155', lineHeight: '1.6', margin: 0 }}>
              {rule.description}
            </p>
          </div>

          {/* AST Pattern Card */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Code2 size={16} color="#2563EB" />
                Semgrep AST Pattern Expression
              </h3>
              <button
                onClick={copyPattern}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {copiedPattern ? <Check size={14} color="#16A34A" /> : <Copy size={14} />}
                {copiedPattern ? 'Copied' : 'Copy Pattern'}
              </button>
            </div>
            <pre
              style={{
                backgroundColor: '#0F172A',
                color: '#F8FAFC',
                padding: '14px 16px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontFamily: 'monospace',
                overflowX: 'auto',
                margin: 0,
              }}
            >
              {rule.pattern || `rules:\n  - id: ${rule.rule_id}\n    pattern: |...\n    message: ${rule.title}\n    severity: ${rule.severity}`}
            </pre>
          </div>

          {/* Code Examples: Vulnerable vs Remediated */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Vulnerable Pattern */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #FECACA', padding: '16px', overflow: 'hidden' }}>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#DC2626', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <XCircle size={15} color="#DC2626" />
                Vulnerable Code Pattern
              </div>
              <pre
                style={{
                  backgroundColor: '#FEF2F2',
                  color: '#991B1B',
                  padding: '12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  overflowX: 'auto',
                  margin: 0,
                  lineHeight: '1.45',
                }}
              >
                {rule.vulnerable_example}
              </pre>
            </div>

            {/* Secure Pattern */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #BBF7D0', padding: '16px', overflow: 'hidden' }}>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#16A34A', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={15} color="#16A34A" />
                Remediated Secure Pattern
              </div>
              <pre
                style={{
                  backgroundColor: '#F0FDF4',
                  color: '#166534',
                  padding: '12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  overflowX: 'auto',
                  margin: 0,
                  lineHeight: '1.45',
                }}
              >
                {rule.secure_example}
              </pre>
            </div>
          </div>
        </div>

        {/* Right Column: Taxonomy, References, and Active Violations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Metadata Card */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '14px' }}>
              Rule Metadata & Taxonomy
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Enforcement Engine</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>{rule.scanner || 'Semgrep AST Engine'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Rule Origin</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>{rule.is_custom ? 'Custom Workspace Rule' : 'Standard Baseline'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Status</span>
                <span style={{ fontWeight: 700, color: rule.enabled ? '#16A34A' : '#64748B' }}>
                  {rule.enabled ? 'ACTIVE & ENFORCED' : 'DISABLED'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Active Violations</span>
                <span style={{ fontWeight: 800, color: (rule.affected_findings_count || 0) > 0 ? '#DC2626' : '#16A34A' }}>
                  {rule.affected_findings_count || affectedFindings.length} findings
                </span>
              </div>
            </div>
          </div>

          {/* References */}
          {rule.references && rule.references.length > 0 && (
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '12px' }}>
                Standards & Advisory References
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {rule.references.map((ref: string, idx: number) => (
                  <a
                    key={idx}
                    href={ref}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      color: '#2563EB',
                      textDecoration: 'none',
                      wordBreak: 'break-all',
                    }}
                  >
                    <ExternalLink size={12} style={{ flexShrink: 0 }} />
                    <span>{ref}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Affected Findings Table */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginBottom: '14px' }}>
          Active Findings Violating This Rule ({affectedFindings.length})
        </h3>
        {affectedFindings.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
            <CheckCircle2 size={24} color="#10B981" style={{ margin: '0 auto 6px' }} />
            <div style={{ fontWeight: 600, color: '#16A34A' }}>Zero Active Violations</div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>No scanned files currently trigger this security rule.</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', fontWeight: 700 }}>
                <th style={{ padding: '10px 14px' }}>FINDING</th>
                <th style={{ padding: '10px 14px' }}>FILE LOCATION</th>
                <th style={{ padding: '10px 14px' }}>REPOSITORY</th>
                <th style={{ padding: '10px 14px' }}>STATUS</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {affectedFindings.map((f) => (
                <tr key={f.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0F172A' }}>
                    {f.title}
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#475569' }}>
                    {f.file_path}:{f.line_number || 1}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#64748B' }}>
                    {f.repository || 'workspace'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: f.status === 'fixed' ? '#16A34A' : '#DC2626' }}>
                      {f.status?.toUpperCase() || 'OPEN'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    <button
                      onClick={() => router.push(`/code/autofix?id=${f.id}`)}
                      style={{
                        padding: '4px 10px',
                        backgroundColor: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        color: '#2563EB',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Sparkles size={11} /> 1-Click AutoFix
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
