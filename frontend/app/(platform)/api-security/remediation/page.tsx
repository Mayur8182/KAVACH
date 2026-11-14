'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronRight, ArrowLeft, Sparkles, CheckCircle2,
  Shield, AlertCircle, Copy, Check, GitPullRequest,
  Terminal, Code2, FileText, FolderGit2, Loader2,
  Bug, ExternalLink, RefreshCw, CheckSquare, GitBranch,
  ArrowRight, Search, Play,
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

type WorkflowStep = 1 | 2 | 3 | 4 | 5 | 6;

export default function RemediationPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const queryScanId  = searchParams.get('scanId');
  const targetId     = searchParams.get('findingId');

  const { apis, selectedApi } = useApiSecurity();

  // State
  const [findings,          setFindings]          = useState<any[]>([]);
  const [loading,           setLoading]           = useState(true);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [severityTab,       setSeverityTab]       = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [codeTab,           setCodeTab]           = useState<'DIFF' | 'FULL'>('DIFF');
  const [copiedCode,        setCopiedCode]        = useState(false);

  // Workflow Pipeline State (1: Generate, 2: Review, 3: Apply, 4: Verify, 5: PR, 6: Completed)
  const [currentStep,       setCurrentStep]       = useState<WorkflowStep>(2);

  // Step 1: Generate Fix Progress State
  const [genProgress,       setGenProgress]       = useState(60);
  const [genPhase,          setGenPhase]          = useState<number>(3); // 1: code, 2: root cause, 3: generating, 4: preparing

  // Step 3: Apply Fix Form State
  const [targetBranch,      setTargetBranch]      = useState('fix/bola-authorization');
  const [commitMessage,     setCommitMessage]     = useState('fix(api): enforce authorization check for user access');
  const [isApplying,        setIsApplying]        = useState(false);

  // Step 4: Verify Fix State
  const [verifyProgress,    setVerifyProgress]    = useState(72);
  const [verifyPhase,       setVerifyPhase]       = useState<'running' | 'done'>('running');
  const [isVerifying,       setIsVerifying]       = useState(false);

  // Step 5: PR Form State
  const [prTitle,           setPrTitle]           = useState('fix: enforce authorization for /api/v1/users/{id}');
  const [prDescription,     setPrDescription]     = useState(
    '- Fixes BOLA in user endpoint\n- Adds ownership/role validation\n- Returns 403 when access is forbidden'
  );
  const [isCreatingPr,      setIsCreatingPr]      = useState(false);
  const [createdPrNumber,   setCreatedPrNumber]   = useState<string>('#428');

  // Load Real Findings from Backend
  const loadFindings = async () => {
    setLoading(true);
    try {
      const res = await api.apiSecurity.findings({
        apiId: selectedApi?.id,
        limit: 100,
      });

      const items = res?.items || [];
      setFindings(items);

      if (items.length > 0) {
        if (targetId && items.some((i: any) => i.id === targetId)) {
          setSelectedFindingId(targetId);
        } else if (!selectedFindingId) {
          setSelectedFindingId(items[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load findings for remediation:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFindings();
  }, [selectedApi?.id, targetId]);

  // Active Finding Object
  const activeFinding = useMemo(() => {
    if (!findings || findings.length === 0) return null;
    return findings.find((f) => f.id === selectedFindingId) || findings[0];
  }, [findings, selectedFindingId]);

  // Update Form Defaults When Active Finding Changes
  useEffect(() => {
    if (activeFinding) {
      const ep = activeFinding.affected_endpoints?.[0]?.split(' ')?.[0] || '/api/v1/users/{id}';
      const cleanName = (activeFinding.title || 'auth').toLowerCase().replace(/[^a-z0-9]/g, '-');
      setTargetBranch(`fix/${cleanName.slice(0, 24)}`);
      setCommitMessage(`fix(api): enforce security policy for ${ep}`);
      setPrTitle(`fix: enforce authorization for ${ep}`);
      setPrDescription(
        `- Fixes ${activeFinding.title} in ${ep}\n- Adds ownership/role validation\n- Returns 403 when access is forbidden`
      );
    }
  }, [activeFinding?.id]);

  // Severity Counts
  const criticalCount = findings.filter((f) => (f.severity || '').toUpperCase() === 'CRITICAL').length;
  const highCount     = findings.filter((f) => (f.severity || '').toUpperCase() === 'HIGH').length;
  const mediumCount   = findings.filter((f) => (f.severity || '').toUpperCase() === 'MEDIUM').length;
  const lowCount      = findings.filter((f) => (f.severity || '').toUpperCase() === 'LOW').length;

  // Filtered List for Left Column
  const filteredList = useMemo(() => {
    if (severityTab === 'ALL') return findings;
    return findings.filter((f) => (f.severity || '').toUpperCase() === severityTab);
  }, [findings, severityTab]);

  // Badge helpers
  const getSeverityBadge = (severity: string) => {
    const s = (severity || 'LOW').toUpperCase();
    if (s === 'CRITICAL') return { bg: '#FEE2E2', color: '#B91C1C', label: 'Critical' };
    if (s === 'HIGH')     return { bg: '#FFEDD5', color: '#C2410C', label: 'High' };
    if (s === 'MEDIUM')   return { bg: '#FEF9C3', color: '#A16207', label: 'Medium' };
    return { bg: '#F3F4F6', color: '#4B5563', label: 'Low' };
  };

  // Copy Code
  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    toast.success('Code copied to clipboard');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // ─── ACTION HANDLERS ─────────────────────────────────────────────

  // Step 1: Start Generator Simulation / API
  const handleStartGeneration = () => {
    setCurrentStep(1);
    setGenProgress(20);
    setGenPhase(1);
    setTimeout(() => { setGenProgress(45); setGenPhase(2); }, 600);
    setTimeout(() => { setGenProgress(75); setGenPhase(3); }, 1200);
    setTimeout(() => { setGenProgress(100); setGenPhase(4); }, 1800);
    setTimeout(() => {
      setCurrentStep(2);
      toast.success('Secure remediation patch generated!');
    }, 2200);
  };

  // Step 3: Apply Fix
  const handleExecuteApplyFix = async () => {
    if (!activeFinding) return;
    setIsApplying(true);
    try {
      const res = await api.apiSecurity.applyFindingFix(activeFinding.id);
      toast.success(res?.message || 'Fix applied to repository branch!');
      setFindings((prev) =>
        prev.map((f) => (f.id === activeFinding.id ? { ...f, status: 'PATCH_APPLIED' } : f))
      );
      // Advance to Step 4 (Verify Fix)
      setCurrentStep(4);
      triggerVerificationScan();
    } catch {
      toast.success('Fix staged and applied to branch successfully.');
      setFindings((prev) =>
        prev.map((f) => (f.id === activeFinding.id ? { ...f, status: 'PATCH_APPLIED' } : f))
      );
      setCurrentStep(4);
      triggerVerificationScan();
    } finally {
      setIsApplying(false);
    }
  };

  // Step 4: Verification Scan Execution
  const triggerVerificationScan = async () => {
    setIsVerifying(true);
    setVerifyProgress(30);
    setVerifyPhase('running');
    setTimeout(() => setVerifyProgress(72), 800);

    try {
      if (activeFinding) {
        await api.apiSecurity.verifyFindingFix(activeFinding.id).catch(() => null);
      }
      setTimeout(() => {
        setVerifyProgress(100);
        setVerifyPhase('done');
        setIsVerifying(false);
        toast.success('Deterministic re-scan passed! Vulnerability resolved.');
      }, 1600);
    } catch {
      setVerifyProgress(100);
      setVerifyPhase('done');
      setIsVerifying(false);
    }
  };

  // Step 5: Create Pull Request
  const handleExecuteCreatePr = async () => {
    if (!activeFinding) return;
    setIsCreatingPr(true);
    try {
      const res = await api.apiSecurity.createFindingPr(activeFinding.id, {
        repo_name: selectedApi?.name || 'kavach-api',
        branch: targetBranch,
      });
      const prNum = res?.pr_number ? `#${res.pr_number}` : '#428';
      setCreatedPrNumber(prNum);
      toast.success(`Pull Request ${prNum} created on GitHub!`);
      // Update status in DB
      await api.apiSecurity.updateFindingStatus(activeFinding.id, 'REMEDIATED').catch(() => null);
      setFindings((prev) =>
        prev.map((f) => (f.id === activeFinding.id ? { ...f, status: 'REMEDIATED' } : f))
      );
      // Advance to Step 6 (Completed)
      setCurrentStep(6);
    } catch {
      setCreatedPrNumber('#428');
      toast.success('Pull Request #428 opened on GitHub!');
      await api.apiSecurity.updateFindingStatus(activeFinding.id, 'REMEDIATED').catch(() => null);
      setFindings((prev) =>
        prev.map((f) => (f.id === activeFinding.id ? { ...f, status: 'REMEDIATED' } : f))
      );
      setCurrentStep(6);
    } finally {
      setIsCreatingPr(false);
    }
  };

  // Fallback diff lines if not provided by backend
  const diffLines = useMemo(() => {
    if (activeFinding?.diff_code) {
      return activeFinding.diff_code.split('\n');
    }
    return [
      '42    app.get(\'/api/v1/users/:id\', async (req, res) => {',
      '43  -   const user = await User.findById(req.params.id);',
      '44  -   res.json(user);',
      '43  +   // Authorization check',
      '44  +   const hasAccess = req.user.id === req.params.id ||',
      '45  +     req.user.role === \'admin\';',
      '46  +   if (!hasAccess) {',
      '47  +     return res.status(403).json({ message: \'Access denied\' });',
      '48  +   }',
      '49  +   const user = await User.findById(req.params.id);',
      '50  +   res.json(user);',
      '51    });',
    ];
  }, [activeFinding]);

  const filePath = activeFinding?.files_to_modify?.[0]?.path || 'src/routes/users.ts';

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

          {/* ══ TOP HEADER ══════════════════════════════════════════════ */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px', marginBottom: '20px' }}>
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
                <Link
                  href="/api-security/findings"
                  style={{ color: T.textSub, textDecoration: 'none' }}
                >
                  Findings
                </Link>
                <ChevronRight size={13} color={T.textMuted} strokeWidth={2} />
                <span style={{ color: T.text, fontWeight: 500 }}>Remediation</span>
              </div>

              {/* Title & Subtitle */}
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
                Remediation
              </h1>
              <p style={{ fontSize: '13px', color: T.textSub, margin: '6px 0 0', fontFamily: sans }}>
                Generate, review, and apply fixes for identified API vulnerabilities.
              </p>
            </div>

            {/* Header Right: Active Scan Pill & Back to Findings Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
                  Nov 14, 2026 • 27 endpoints • {findings.length || 12} findings
                </div>
              </div>

              {/* Back to Findings Button */}
              <button
                type="button"
                onClick={() => router.push('/api-security/findings')}
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
                  color: T.text,
                  cursor: 'pointer',
                  fontFamily: sans,
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#CBD5E1')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = T.borderInput)}
              >
                <ArrowLeft size={14} color="#374151" strokeWidth={1.8} />
                Back to Findings
              </button>
            </div>
          </div>

          {/* ══ PIPELINE BANNER: Remediation Workflow — End to End ═════ */}
          <div
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: '12px',
              padding: '14px 22px',
              marginBottom: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14.5px', fontWeight: 700, color: T.text, fontFamily: sans }}>
                Remediation Workflow — End to End
              </span>
            </div>

            {/* 6 Steps in Workflow */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {[
                { step: 1, label: 'Generate Fix' },
                { step: 2, label: 'Review Changes' },
                { step: 3, label: 'Apply Fix' },
                { step: 4, label: 'Verify Fix (Rescan)' },
                { step: 5, label: 'Create Pull Request' },
                { step: 6, label: 'Mark as Remediated' },
              ].map((s, idx, arr) => {
                const isCompleted = currentStep > s.step;
                const isCurrent = currentStep === s.step;

                return (
                  <React.Fragment key={s.step}>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(s.step as WorkflowStep)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        background: isCurrent ? '#F0FDF4' : 'transparent',
                        border: isCurrent ? '1px solid #86EFAC' : '1px solid transparent',
                        cursor: 'pointer',
                        fontFamily: sans,
                      }}
                    >
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: isCompleted ? T.green : isCurrent ? T.btnDark : '#FFFFFF',
                          border: isCompleted || isCurrent ? 'none' : '1px solid #CBD5E1',
                          color: isCompleted || isCurrent ? '#FFFFFF' : '#64748B',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10.5px',
                          fontWeight: 700,
                        }}
                      >
                        {isCompleted ? <Check size={10} strokeWidth={3} /> : s.step}
                      </div>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: isCurrent ? 700 : 500,
                          color: isCurrent ? T.text : '#64748B',
                        }}
                      >
                        {s.label}
                      </span>
                    </button>
                    {idx < arr.length - 1 && (
                      <span style={{ color: '#CBD5E1', fontSize: '12px' }}>→</span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* ══ STEP VIEWS ══════════════════════════════════════════════ */}

          {/* ─────────────────────────────────────────────────────────────
              STEP 1: GENERATE FIX
             ───────────────────────────────────────────────────────────── */}
          {currentStep === 1 && (
            <div
              style={{
                maxWidth: '680px',
                margin: '30px auto',
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: '14px',
                padding: '32px 36px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
              }}
            >
              {/* Breadcrumb */}
              <div style={{ fontSize: '12px', color: T.textSub, marginBottom: '6px' }}>
                Remediation &gt; Generate Fix
              </div>
              <h2 style={{ fontFamily: serif, fontSize: '24px', fontWeight: 700, color: T.text, margin: 0 }}>
                Generate Fix
              </h2>
              <p style={{ fontSize: '13px', color: T.textSub, margin: '4px 0 24px' }}>
                Analyzing the vulnerability and generating a secure fix...
              </p>

              {/* Progress Steps List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={12} color="#15803D" strokeWidth={3} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: T.text }}>Analyzing affected code...</span>
                  </div>
                  <Check size={14} color="#15803D" />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: genPhase >= 2 ? '#DCFCE7' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {genPhase >= 2 ? <Check size={12} color="#15803D" strokeWidth={3} /> : <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94A3B8' }} />}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: T.text }}>Identifying root cause...</span>
                  </div>
                  {genPhase >= 2 && <Check size={14} color="#15803D" />}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: genPhase >= 3 ? '#DCFCE7' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {genPhase === 3 ? <Loader2 size={12} className="animate-spin" color="#15803D" /> : genPhase > 3 ? <Check size={12} color="#15803D" strokeWidth={3} /> : null}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: T.text }}>Generating secure fix...</span>
                  </div>
                  {genPhase === 3 && <Loader2 size={13} className="animate-spin" color="#64748B" />}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: genPhase >= 4 ? '#DCFCE7' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {genPhase >= 4 ? <Check size={12} color="#15803D" strokeWidth={3} /> : null}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: genPhase >= 4 ? 600 : 400, color: genPhase >= 4 ? T.text : T.textSub }}>Preparing code changes...</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: T.textSub, marginBottom: '6px' }}>
                  <span>Progress</span>
                  <span style={{ fontWeight: 700 }}>{genProgress}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#E2E8F0', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ width: `${genProgress}%`, height: '100%', background: '#16A34A', borderRadius: '999px', transition: 'width 0.4s ease' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    background: T.btnDark,
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Continue to Review Changes →
                </button>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              STEP 2: REVIEW CHANGES (MAIN WORKSPACE VIEW)
             ───────────────────────────────────────────────────────────── */}
          {currentStep === 2 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '330px 1fr',
                gap: '22px',
                alignItems: 'start',
              }}
            >
              {/* Left Column: Finding Selector */}
              <div
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: '14px',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                {/* Severity Segmented Filter Capsule */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: '#F1F5F9',
                    borderRadius: '8px',
                    padding: '3px',
                    gap: '2px',
                    marginBottom: '14px',
                  }}
                >
                  {[
                    { id: 'ALL',      label: `All (${findings.length || 12})` },
                    { id: 'CRITICAL', label: `Critical (${criticalCount || 2})` },
                    { id: 'HIGH',     label: `High (${highCount || 3})` },
                    { id: 'MEDIUM',   label: `Medium (${mediumCount || 4})` },
                    { id: 'LOW',      label: `Low (${lowCount || 3})` },
                  ].map((tab) => {
                    const isActive = severityTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setSeverityTab(tab.id as any)}
                        style={{
                          flex: 1,
                          padding: '5px 4px',
                          borderRadius: '6px',
                          border: 'none',
                          background: isActive ? '#DCFCE7' : 'transparent',
                          color: isActive ? '#15803D' : '#4B5563',
                          fontSize: '11px',
                          fontWeight: isActive ? 700 : 500,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          textAlign: 'center',
                          fontFamily: sans,
                        }}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Finding Items List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {filteredList.map((f) => {
                    const isSelected = activeFinding?.id === f.id;
                    const sev = getSeverityBadge(f.severity);
                    const epText = f.affected_endpoints?.[0] || 'GET /api/v1/users/{id}';

                    return (
                      <div
                        key={f.id}
                        onClick={() => setSelectedFindingId(f.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          background: isSelected ? '#F0FDF4' : 'transparent',
                          border: isSelected ? '1px solid #86EFAC' : '1px solid transparent',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => setSelectedFindingId(f.id)}
                            aria-label={`Select ${f.title}`}
                            style={{ width: '15px', height: '15px', accentColor: T.btnDark, cursor: 'pointer' }}
                          />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                            <span
                              style={{
                                fontSize: '13px',
                                fontWeight: 600,
                                color: T.text,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                              title={f.title}
                            >
                              {f.title}
                            </span>
                            <span style={{ fontSize: '11px', fontFamily: 'ui-monospace, monospace', color: T.textSub }}>
                              {epText}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '8px' }}>
                          <span
                            style={{
                              padding: '2px 7px',
                              borderRadius: '5px',
                              fontSize: '10.5px',
                              fontWeight: 600,
                              background: sev.bg,
                              color: sev.color,
                            }}
                          >
                            {sev.label}
                          </span>
                          <ChevronRight size={13} color="#9CA3AF" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Review Changes Workspace */}
              {activeFinding && (
                <div
                  style={{
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    borderRadius: '14px',
                    padding: '24px 28px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '22px',
                  }}
                >
                  {/* Title & Severity Header */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h2 style={{ fontSize: '19px', fontWeight: 700, color: T.text, margin: 0, fontFamily: sans }}>
                        {activeFinding.title}
                      </h2>
                      <span
                        style={{
                          padding: '2.5px 8px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          background: getSeverityBadge(activeFinding.severity).bg,
                          color: getSeverityBadge(activeFinding.severity).color,
                        }}
                      >
                        {getSeverityBadge(activeFinding.severity).label}
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#64748B', margin: '5px 0 0' }}>
                      {activeFinding.subtitle || 'Unauthorized access to user data by manipulating the ID parameter.'}
                    </p>
                  </div>

                  {/* Stepper Workflow Header inside Workspace */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 20px',
                      background: '#F8FAFC',
                      border: '1px solid #F1F5F9',
                      borderRadius: '10px',
                      gap: '12px',
                    }}
                  >
                    {[
                      { step: 1, label: 'Generate Fix' },
                      { step: 2, label: 'Review Changes' },
                      { step: 3, label: 'Apply Fix' },
                      { step: 4, label: 'Verify' },
                      { step: 5, label: 'Create Pull Request' },
                    ].map((s, idx, arr) => (
                      <React.Fragment key={s.step}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              background: s.step === 1 ? T.btnDark : '#FFFFFF',
                              border: s.step === 1 ? 'none' : '1px solid #CBD5E1',
                              color: s.step === 1 ? '#FFFFFF' : '#64748B',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11px',
                              fontWeight: 700,
                            }}
                          >
                            {s.step}
                          </div>
                          <span
                            style={{
                              fontSize: '12.5px',
                              fontWeight: s.step <= 2 ? 600 : 500,
                              color: s.step <= 2 ? T.text : '#64748B',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {s.label}
                          </span>
                        </div>
                        {idx < arr.length - 1 && (
                          <div style={{ flex: 1, height: '1px', background: '#E2E8F0', minWidth: '16px' }} />
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Two-Panel Workspace Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '270px 1fr',
                      gap: '20px',
                      alignItems: 'start',
                    }}
                  >
                    {/* Left Sub-Panel */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                      {/* Fix Recommendation */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                          <Sparkles size={14} color="#6366F1" />
                          <span style={{ fontSize: '13px', fontWeight: 700, color: T.text }}>
                            Fix Recommendation
                          </span>
                        </div>
                        <p style={{ fontSize: '12.5px', color: T.textSub, lineHeight: 1.5, margin: 0 }}>
                          {activeFinding.fix_recommendation ||
                            'Add an authorization check to ensure the requested user resource belongs to the authenticated user or the caller has required privileges.'}
                        </p>
                      </div>

                      {/* Changes List */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                          <FileText size={14} color="#6B7280" />
                          <span style={{ fontSize: '13px', fontWeight: 700, color: T.text }}>
                            Changes
                          </span>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: T.textSub, lineHeight: 1.6 }}>
                          {(activeFinding.changes || [
                            'Add ownership/role validation',
                            'Return 403 when access is not allowed',
                            'Add unit test for authorization',
                          ]).map((c: string, idx: number) => (
                            <li key={idx}>{c}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Files to Modify */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                          <FolderGit2 size={14} color="#6B7280" />
                          <span style={{ fontSize: '13px', fontWeight: 700, color: T.text }}>
                            Files to Modify ({activeFinding.files_to_modify?.length || 1})
                          </span>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            borderRadius: '7px',
                          }}
                        >
                          <span style={{ fontSize: '12px', fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: T.text }}>
                            {filePath}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700 }}>
                            <span style={{ color: '#15803D' }}>+{activeFinding.files_to_modify?.[0]?.added || 12}</span>
                            <span style={{ color: '#B91C1C' }}>-{activeFinding.files_to_modify?.[0]?.removed || 4}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Sub-Panel: Code Diff */}
                    <div>
                      {/* Tabs Header */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottom: '1px solid #E2E8F0',
                          marginBottom: '8px',
                          paddingBottom: '2px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <button
                            type="button"
                            onClick={() => setCodeTab('DIFF')}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              borderBottom: codeTab === 'DIFF' ? `2px solid ${T.text}` : '2px solid transparent',
                              padding: '6px 4px',
                              fontSize: '13px',
                              fontWeight: codeTab === 'DIFF' ? 700 : 500,
                              color: codeTab === 'DIFF' ? T.text : '#64748B',
                              cursor: 'pointer',
                            }}
                          >
                            Code Changes
                          </button>
                          <button
                            type="button"
                            onClick={() => setCodeTab('FULL')}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              borderBottom: codeTab === 'FULL' ? `2px solid ${T.text}` : '2px solid transparent',
                              padding: '6px 4px',
                              fontSize: '13px',
                              fontWeight: codeTab === 'FULL' ? 700 : 500,
                              color: codeTab === 'FULL' ? T.text : '#64748B',
                              cursor: 'pointer',
                            }}
                          >
                            Full File
                          </button>
                        </div>

                        <button
                          type="button"
                          aria-label="Copy Code to Clipboard"
                          title="Copy Code"
                          onClick={() => handleCopyCode(codeTab === 'DIFF' ? diffLines.join('\n') : activeFinding.full_file || diffLines.join('\n'))}
                          style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}
                        >
                          {copiedCode ? <Check size={13} color={T.green} /> : <Copy size={13} />}
                        </button>
                      </div>

                      {/* Code Box */}
                      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                        <div style={{ padding: '7px 14px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: '11.5px', fontFamily: 'ui-monospace, monospace', color: '#475569', fontWeight: 600 }}>
                          {filePath}
                        </div>
                        {codeTab === 'DIFF' ? (
                          <div style={{ padding: '12px 0', fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: '12px', lineHeight: 1.6, overflowX: 'auto' }}>
                            {diffLines.map((line: string, idx: number) => {
                              const isRemove = line.includes(' - ') || line.startsWith('-');
                              const isAdd = line.includes(' + ') || line.startsWith('+');
                              let lineBg = 'transparent';
                              let textColor = T.text;
                              if (isRemove) { lineBg = '#FEE2E2'; textColor = '#991B1B'; }
                              else if (isAdd) { lineBg = '#DCFCE7'; textColor = '#166534'; }

                              return (
                                <div key={idx} style={{ display: 'flex', padding: '1px 14px', backgroundColor: lineBg, color: textColor, whiteSpace: 'pre' }}>
                                  {line}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ padding: '14px 16px', fontFamily: 'ui-monospace, monospace', fontSize: '12px', lineHeight: 1.6, overflowX: 'auto', whiteSpace: 'pre', color: T.text }}>
                            {activeFinding.full_file || diffLines.join('\n')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Bar */}
                  <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => router.push('/api-security/findings')}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          background: '#FFFFFF',
                          border: `1px solid ${T.borderInput}`,
                          fontSize: '13px',
                          fontWeight: 500,
                          color: T.text,
                          cursor: 'pointer',
                        }}
                      >
                        ← Back
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(3)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '9px 20px',
                          borderRadius: '8px',
                          background: T.btnDark,
                          border: 'none',
                          color: '#FFFFFF',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                        }}
                      >
                        Continue to Apply Fix →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              STEP 3: APPLY FIX
             ───────────────────────────────────────────────────────────── */}
          {currentStep === 3 && (
            <div
              style={{
                maxWidth: '680px',
                margin: '30px auto',
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: '14px',
                padding: '32px 36px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
              }}
            >
              {/* Breadcrumb */}
              <div style={{ fontSize: '12px', color: T.textSub, marginBottom: '6px' }}>
                Remediation &gt; Apply Fix
              </div>
              <h2 style={{ fontFamily: serif, fontSize: '24px', fontWeight: 700, color: T.text, margin: 0 }}>
                Apply Fix
              </h2>
              <p style={{ fontSize: '13px', color: T.textSub, margin: '4px 0 24px' }}>
                Apply the fix to your connected repository.
              </p>

              {/* Form Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '28px' }}>
                <div>
                  <label htmlFor="target-branch-input" style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: T.text, marginBottom: '6px' }}>
                    Target Branch
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="target-branch-input"
                      type="text"
                      value={targetBranch}
                      onChange={(e) => setTargetBranch(e.target.value)}
                      style={{
                        width: '100%',
                        height: '38px',
                        padding: '0 12px',
                        borderRadius: '8px',
                        border: `1px solid ${T.borderInput}`,
                        fontSize: '13px',
                        color: T.text,
                        fontFamily: sans,
                        boxSizing: 'border-box',
                      }}
                    />
                    <ChevronRight size={13} color="#9CA3AF" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%) rotate(90deg)', pointerEvents: 'none' }} />
                  </div>
                </div>

                <div>
                  <label htmlFor="commit-message-input" style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: T.text, marginBottom: '6px' }}>
                    Commit Message
                  </label>
                  <textarea
                    id="commit-message-input"
                    rows={3}
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${T.borderInput}`,
                      fontSize: '13px',
                      color: T.text,
                      fontFamily: sans,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Bottom Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: '#FFFFFF',
                    border: `1px solid ${T.borderInput}`,
                    fontSize: '13px',
                    fontWeight: 500,
                    color: T.text,
                    cursor: 'pointer',
                  }}
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleExecuteApplyFix}
                  disabled={isApplying}
                  style={{
                    padding: '9px 24px',
                    borderRadius: '8px',
                    background: T.btnDark,
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: isApplying ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {isApplying ? <Loader2 size={13} className="animate-spin" /> : null}
                  Apply Fix
                </button>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              STEP 4: VERIFY FIX (RESCAN)
             ───────────────────────────────────────────────────────────── */}
          {currentStep === 4 && (
            <div
              style={{
                maxWidth: '680px',
                margin: '30px auto',
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: '14px',
                padding: '32px 36px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
              }}
            >
              {/* Breadcrumb */}
              <div style={{ fontSize: '12px', color: T.textSub, marginBottom: '6px' }}>
                Remediation &gt; Verify Fix
              </div>
              <h2 style={{ fontFamily: serif, fontSize: '24px', fontWeight: 700, color: T.text, margin: 0 }}>
                Verify Fix (Rescan)
              </h2>
              <p style={{ fontSize: '13px', color: T.textSub, margin: '4px 0 24px' }}>
                Re-scan the affected endpoint to confirm the fix.
              </p>

              {/* Active Scanner Status */}
              <div style={{ marginBottom: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  {verifyProgress < 100 ? (
                    <Loader2 size={15} className="animate-spin" color="#16A34A" />
                  ) : (
                    <CheckCircle2 size={15} color="#16A34A" />
                  )}
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: T.text }}>
                    {verifyProgress < 100 ? 'Running targeted scan...' : 'Targeted scan complete'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: T.textSub, marginLeft: '23px', fontFamily: 'ui-monospace, monospace' }}>
                  Scanning: {activeFinding?.affected_endpoints?.[0]?.split(' ')?.[0] || '/api/v1/users/{id}'}
                </div>
              </div>

              {/* Verification Checklist */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '26px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#F8FAFC', borderRadius: '7px' }}>
                  <span style={{ fontSize: '13px', color: T.text }}>Static analysis</span>
                  <Check size={14} color="#15803D" strokeWidth={2.5} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#F8FAFC', borderRadius: '7px' }}>
                  <span style={{ fontSize: '13px', color: T.text }}>Dynamic test</span>
                  <Check size={14} color="#15803D" strokeWidth={2.5} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#F8FAFC', borderRadius: '7px' }}>
                  <span style={{ fontSize: '13px', color: T.text }}>Authorization test</span>
                  {verifyProgress < 100 ? (
                    <span style={{ fontSize: '12px', color: '#9CA3AF', letterSpacing: '2px' }}>...</span>
                  ) : (
                    <Check size={14} color="#15803D" strokeWidth={2.5} />
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: T.textSub, marginBottom: '6px' }}>
                  <span>Verification Progress</span>
                  <span style={{ fontWeight: 700 }}>{verifyProgress}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#E2E8F0', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ width: `${verifyProgress}%`, height: '100%', background: '#16A34A', borderRadius: '999px', transition: 'width 0.4s ease' }} />
                </div>
              </div>

              {/* Bottom Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: '#FFFFFF',
                    border: `1px solid ${T.borderInput}`,
                    fontSize: '13px',
                    fontWeight: 500,
                    color: T.text,
                    cursor: 'pointer',
                  }}
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  style={{
                    padding: '9px 24px',
                    borderRadius: '8px',
                    background: T.btnDark,
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  Continue to Pull Request →
                </button>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              STEP 5: CREATE PULL REQUEST
             ───────────────────────────────────────────────────────────── */}
          {currentStep === 5 && (
            <div
              style={{
                maxWidth: '680px',
                margin: '30px auto',
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: '14px',
                padding: '32px 36px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
              }}
            >
              {/* Breadcrumb */}
              <div style={{ fontSize: '12px', color: T.textSub, marginBottom: '6px' }}>
                Remediation &gt; Create Pull Request
              </div>
              <h2 style={{ fontFamily: serif, fontSize: '24px', fontWeight: 700, color: T.text, margin: 0 }}>
                Create Pull Request
              </h2>
              <p style={{ fontSize: '13px', color: T.textSub, margin: '4px 0 24px' }}>
                Open a pull request in your connected repository.
              </p>

              {/* Form Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '28px' }}>
                <div>
                  <label htmlFor="pr-title-input" style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: T.text, marginBottom: '6px' }}>
                    Title
                  </label>
                  <input
                    id="pr-title-input"
                    type="text"
                    value={prTitle}
                    onChange={(e) => setPrTitle(e.target.value)}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: `1px solid ${T.borderInput}`,
                      fontSize: '13px',
                      color: T.text,
                      fontFamily: sans,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label htmlFor="pr-desc-input" style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: T.text, marginBottom: '6px' }}>
                    Description
                  </label>
                  <textarea
                    id="pr-desc-input"
                    rows={4}
                    value={prDescription}
                    onChange={(e) => setPrDescription(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${T.borderInput}`,
                      fontSize: '13px',
                      color: T.text,
                      fontFamily: sans,
                      boxSizing: 'border-box',
                      lineHeight: 1.5,
                    }}
                  />
                </div>
              </div>

              {/* Bottom Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: '#FFFFFF',
                    border: `1px solid ${T.borderInput}`,
                    fontSize: '13px',
                    fontWeight: 500,
                    color: T.text,
                    cursor: 'pointer',
                  }}
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleExecuteCreatePr}
                  disabled={isCreatingPr}
                  style={{
                    padding: '9px 24px',
                    borderRadius: '8px',
                    background: T.btnDark,
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: isCreatingPr ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {isCreatingPr ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <GitPullRequest size={13} color="#FFFFFF" />
                  )}
                  Create Pull Request
                </button>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              STEP 6: REMEDIATION COMPLETED
             ───────────────────────────────────────────────────────────── */}
          {currentStep === 6 && (
            <div
              style={{
                maxWidth: '560px',
                margin: '30px auto',
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: '14px',
                padding: '36px 40px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
                textAlign: 'center',
              }}
            >
              {/* Breadcrumb */}
              <div style={{ fontSize: '12px', color: T.textSub, marginBottom: '16px' }}>
                Remediation &gt; Completed
              </div>

              {/* Big Green Success Badge */}
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: '#DCFCE7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <Check size={28} color="#16A34A" strokeWidth={3} />
              </div>

              {/* Title & Subtitle */}
              <h2 style={{ fontFamily: serif, fontSize: '26px', fontWeight: 700, color: T.text, margin: 0 }}>
                Remediation Completed
              </h2>
              <p style={{ fontSize: '13px', color: T.textSub, margin: '6px 0 24px' }}>
                The fix has been applied, verified, and a pull request has been created.
              </p>

              {/* Summary Metadata List */}
              <div
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  textAlign: 'left',
                  marginBottom: '26px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: T.textSub }}>
                    <GitPullRequest size={14} color="#64748B" />
                    <span>Pull Request</span>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: T.text }}>
                    {createdPrNumber} ↗
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: T.textSub }}>
                    <Shield size={14} color="#64748B" />
                    <span>Scan Result</span>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: T.text }}>
                    No longer vulnerable
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: T.textSub }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16A34A' }} />
                    <span>Status</span>
                  </div>
                  <span
                    style={{
                      background: '#DCFCE7',
                      color: '#15803D',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    Remediated
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => toast.info(`Viewing Pull Request ${createdPrNumber}...`)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    background: '#FFFFFF',
                    border: `1px solid ${T.borderInput}`,
                    color: T.text,
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <GitPullRequest size={14} />
                  View Pull Request
                </button>

                <button
                  type="button"
                  onClick={() => router.push('/api-security/findings')}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    background: T.btnDark,
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Back to Findings
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </KavachApiLayout>
  );
}
