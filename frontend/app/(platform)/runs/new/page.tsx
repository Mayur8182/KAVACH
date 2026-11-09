'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  FolderGit2,
  GitBranch,
  Code2,
  Layers,
  Box,
  KeyRound,
  Shield,
  Network,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Clock,
  Lock,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';

export default function NewScanWizardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedRepo = searchParams?.get('repo');

  const [step, setStep] = useState<1 | 2>(1);
  const [loadingRepos, setLoadingRepos] = useState<boolean>(true);
  const [repositories, setRepositories] = useState<any[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>('');
  const [selectedRepo, setSelectedRepo] = useState<any>(null);
  const [branch, setBranch] = useState<string>('main');
  const [scope, setScope] = useState<'entire' | 'changed'>('entire');

  const [agents, setAgents] = useState({
    code: true,
    dependencies: true,
    infrastructure: true,
    secrets: true,
    runningApp: true,
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    async function loadRepos() {
      try {
        setLoadingRepos(true);
        const res: any = await api.request<any>('/api/v1/runs/repositories');
        const list = Array.isArray(res) ? res : res?.data || [];
        if (active && list.length > 0) {
          setRepositories(list);
          const matched = preselectedRepo
            ? list.find(
                (r: any) =>
                  (r.fullName || r.name || '').toLowerCase() === preselectedRepo.toLowerCase()
              )
            : null;
          const target = matched || list[0];
          setSelectedRepoId(target.id);
          setSelectedRepo(target);
          if (target.defaultBranch) setBranch(target.defaultBranch);
        }
      } catch (err) {
        console.warn('Failed to load repositories:', err);
      } finally {
        if (active) setLoadingRepos(false);
      }
    }
    loadRepos();
    return () => {
      active = false;
    };
  }, [preselectedRepo]);

  const handleRepoChange = (repoId: string) => {
    setSelectedRepoId(repoId);
    const target = repositories.find((r) => r.id === repoId);
    setSelectedRepo(target || null);
    if (target?.defaultBranch) {
      setBranch(target.defaultBranch);
    }
  };

  const toggleAgent = (key: keyof typeof agents) => {
    setAgents((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleStartScan = async () => {
    setIsSubmitting(true);
    try {
      const activeAgents: string[] = [];
      if (agents.code) activeAgents.push('sast');
      if (agents.dependencies) activeAgents.push('sca');
      if (agents.infrastructure) activeAgents.push('iac', 'container');
      if (agents.secrets) activeAgents.push('secrets');
      if (agents.runningApp) activeAgents.push('api', 'dast');

      // Also include orchestrators
      activeAgents.push('investigation', 'remediation', 'compliance', 'reporting');

      const repoName = selectedRepo?.fullName || selectedRepo?.name || 'JOB-FINDER-NEW';

      const res = await api.request<any>('/api/v1/runs', {
        method: 'POST',
        body: JSON.stringify({
          repository: repoName,
          repository_id: selectedRepo?.id,
          project_id: selectedRepo?.projectId,
          branch: branch,
          agents: activeAgents,
          scope: scope === 'entire' ? 'full' : 'changed',
        }),
      });

      toast.success(`Security scan started for ${repoName}!`);
      const targetId = (res as any)?.data?.runId || (res as any)?.runId;
      if (targetId) {
        router.push(`/runs/${targetId}`);
      } else {
        router.push('/runs');
      }
    } catch (err: any) {
      toast.error(`Scan start failed: ${err.message || 'Server error'}`);
      setIsSubmitting(false);
    }
  };

  const repoDisplayName = selectedRepo?.fullName || selectedRepo?.name || 'JOB-FINDER-NEW';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: '#FFFFFF',
        fontFamily: "var(--font-sans, 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif)",
        padding: '36px 48px',
        maxWidth: '1000px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Breadcrumb */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          color: '#64748B',
          marginBottom: '8px',
        }}
      >
        <Link href="/runs" style={{ color: '#64748B', textDecoration: 'none' }}>
          Security Runs
        </Link>
        <ChevronRight size={12} />
        <span>New Scan</span>
        {step === 2 && (
          <>
            <ChevronRight size={12} />
            <span style={{ color: '#0F172A', fontWeight: 600 }}>Review</span>
          </>
        )}
      </div>

      {/* Main Layout: Left Stepper + Right Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '48px', marginTop: '16px' }}>
        {/* Left Step Navigation (Matching Image 2 Screen 2 & 3) */}
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Step 1 */}
            <div
              onClick={() => setStep(1)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: step === 1 ? '#16A34A' : '#DCFCE7',
                  color: step === 1 ? '#FFFFFF' : '#15803D',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {step > 1 ? '✓' : '1'}
              </div>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: step === 1 ? 600 : 500,
                  color: step === 1 ? '#0F172A' : '#64748B',
                }}
              >
                Configure
              </span>
            </div>

            {/* Step 2 */}
            <div
              onClick={() => setStep(2)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: step === 2 ? '#16A34A' : '#F1F5F9',
                  color: step === 2 ? '#FFFFFF' : '#64748B',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                2
              </div>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: step === 2 ? 600 : 500,
                  color: step === 2 ? '#0F172A' : '#64748B',
                }}
              >
                Review
              </span>
            </div>

            {/* Step 3 (Run) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                opacity: 0.5,
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: '#F1F5F9',
                  color: '#94A3B8',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                3
              </div>
              <span style={{ fontSize: '13px', color: '#94A3B8' }}>Run</span>
            </div>
          </div>
        </div>

        {/* Right Step Content */}
        <div>
          {step === 1 ? (
            /* STEP 1: CONFIGURE (Screen 2) */
            <div>
              <h1
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#0F172A',
                  margin: '0 0 6px 0',
                  letterSpacing: '-0.02em',
                }}
              >
                Set up a security scan
              </h1>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 28px 0' }}>
                Choose what to scan and which security agents to run.
              </p>

              {/* Form Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Repository & Branch Selectors */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        color: '#0F172A',
                        marginBottom: '6px',
                      }}
                    >
                      Repository
                    </label>
                    <select
                      value={selectedRepoId}
                      onChange={(e) => handleRepoChange(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        color: '#0F172A',
                        backgroundColor: '#FFFFFF',
                        outline: 'none',
                      }}
                    >
                      {repositories.length > 0 ? (
                        repositories.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.fullName || r.name}
                          </option>
                        ))
                      ) : (
                        <option value="">JOB-FINDER-NEW</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        color: '#0F172A',
                        marginBottom: '6px',
                      }}
                    >
                      Branch
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        placeholder="main"
                        style={{
                          width: '100%',
                          padding: '9px 12px 9px 30px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          fontSize: '13px',
                          color: '#0F172A',
                          backgroundColor: '#FFFFFF',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                      <GitBranch
                        size={14}
                        color="#64748B"
                        style={{ position: 'absolute', left: '10px', top: '12px' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Scan Scope Radio Buttons */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: '#0F172A',
                      marginBottom: '8px',
                    }}
                  >
                    Scan scope
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div
                      onClick={() => setScope('entire')}
                      style={{
                        border: `1.5px solid ${scope === 'entire' ? '#16A34A' : '#E2E8F0'}`,
                        backgroundColor: scope === 'entire' ? '#F0FDF4' : '#FFFFFF',
                        borderRadius: '8px',
                        padding: '14px 16px',
                        cursor: 'pointer',
                        transition: 'all 120ms ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="radio"
                          name="scanScope"
                          checked={scope === 'entire'}
                          onChange={() => setScope('entire')}
                          style={{ accentColor: '#16A34A' }}
                        />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                          Entire repository
                        </span>
                      </div>
                      <p style={{ fontSize: '11.5px', color: '#64748B', margin: '4px 0 0 22px' }}>
                        Scan all files, code, dependencies and configuration.
                      </p>
                    </div>

                    <div
                      onClick={() => setScope('changed')}
                      style={{
                        border: `1.5px solid ${scope === 'changed' ? '#16A34A' : '#E2E8F0'}`,
                        backgroundColor: scope === 'changed' ? '#F0FDF4' : '#FFFFFF',
                        borderRadius: '8px',
                        padding: '14px 16px',
                        cursor: 'pointer',
                        transition: 'all 120ms ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="radio"
                          name="scanScope"
                          checked={scope === 'changed'}
                          onChange={() => setScope('changed')}
                          style={{ accentColor: '#16A34A' }}
                        />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                          Only changed files
                        </span>
                      </div>
                      <p style={{ fontSize: '11.5px', color: '#64748B', margin: '4px 0 0 22px' }}>
                        Scan only files changed in a commit or PR.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Security Agents Checkboxes (Matching Image 2 Screen 2) */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '10px',
                    }}
                  >
                    <label
                      style={{
                        fontSize: '12.5px',
                        fontWeight: 600,
                        color: '#0F172A',
                      }}
                    >
                      Security agents
                    </label>
                    <span
                      style={{
                        fontSize: '11.5px',
                        color: '#15803D',
                        backgroundColor: '#DCFCE7',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontWeight: 600,
                      }}
                    >
                      Recommended setup
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '12px',
                    }}
                  >
                    {/* Code */}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '12px 14px',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        backgroundColor: agents.code ? '#F8FAFC' : '#FFFFFF',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={agents.code}
                        onChange={() => toggleAgent('code')}
                        style={{ marginTop: '2px', accentColor: '#16A34A' }}
                      />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>Code</div>
                        <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '1px' }}>
                          Finds code issues (e.g. SQL injection)
                        </div>
                      </div>
                    </label>

                    {/* Dependencies */}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '12px 14px',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        backgroundColor: agents.dependencies ? '#F8FAFC' : '#FFFFFF',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={agents.dependencies}
                        onChange={() => toggleAgent('dependencies')}
                        style={{ marginTop: '2px', accentColor: '#16A34A' }}
                      />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>Dependencies</div>
                        <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '1px' }}>
                          Checks third-party packages for risks
                        </div>
                      </div>
                    </label>

                    {/* Infrastructure */}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '12px 14px',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        backgroundColor: agents.infrastructure ? '#F8FAFC' : '#FFFFFF',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={agents.infrastructure}
                        onChange={() => toggleAgent('infrastructure')}
                        style={{ marginTop: '2px', accentColor: '#16A34A' }}
                      />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>Infrastructure</div>
                        <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '1px' }}>
                          Reviews IaC and cloud configuration
                        </div>
                      </div>
                    </label>

                    {/* Secrets */}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '12px 14px',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        backgroundColor: agents.secrets ? '#F8FAFC' : '#FFFFFF',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={agents.secrets}
                        onChange={() => toggleAgent('secrets')}
                        style={{ marginTop: '2px', accentColor: '#16A34A' }}
                      />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>Secrets</div>
                        <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '1px' }}>
                          Detects exposed keys and credentials
                        </div>
                      </div>
                    </label>

                    {/* Running app */}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '12px 14px',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        backgroundColor: agents.runningApp ? '#F8FAFC' : '#FFFFFF',
                        cursor: 'pointer',
                        gridColumn: 'span 2',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={agents.runningApp}
                        onChange={() => toggleAgent('runningApp')}
                        style={{ marginTop: '2px', accentColor: '#16A34A' }}
                      />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>Running app</div>
                        <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '1px' }}>
                          Tests your app for common vulnerabilities
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Continue CTA */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: '#16A34A',
                      color: '#FFFFFF',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      padding: '10px 22px',
                      borderRadius: '7px',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(22, 163, 74, 0.2)',
                      transition: 'background-color 150ms ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#15803D')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#16A34A')}
                  >
                    <span>Continue to review</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* STEP 2: REVIEW (Screen 3) */
            <div>
              <h1
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#0F172A',
                  margin: '0 0 6px 0',
                  letterSpacing: '-0.02em',
                }}
              >
                Review and start scan
              </h1>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 28px 0' }}>
                Confirm the details and start the security scan.
              </p>

              {/* Review Summary Card (Matching Image 2 Screen 3) */}
              <div
                style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  backgroundColor: '#FFFFFF',
                  overflow: 'hidden',
                  marginBottom: '28px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {/* Repository */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '200px 1fr',
                      padding: '16px 20px',
                      borderBottom: '1px solid #F1F5F9',
                      fontSize: '13px',
                    }}
                  >
                    <span style={{ color: '#64748B', fontWeight: 500 }}>Repository</span>
                    <span style={{ color: '#0F172A', fontWeight: 600 }}>{repoDisplayName}</span>
                  </div>

                  {/* Branch */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '200px 1fr',
                      padding: '16px 20px',
                      borderBottom: '1px solid #F1F5F9',
                      fontSize: '13px',
                    }}
                  >
                    <span style={{ color: '#64748B', fontWeight: 500 }}>Branch</span>
                    <span style={{ color: '#0F172A', fontWeight: 600 }}>{branch}</span>
                  </div>

                  {/* Scope */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '200px 1fr',
                      padding: '16px 20px',
                      borderBottom: '1px solid #F1F5F9',
                      fontSize: '13px',
                    }}
                  >
                    <span style={{ color: '#64748B', fontWeight: 500 }}>Scope</span>
                    <span style={{ color: '#0F172A', fontWeight: 600 }}>
                      {scope === 'entire' ? 'Entire repository' : 'Only changed files'}
                    </span>
                  </div>

                  {/* What will be checked */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '200px 1fr',
                      padding: '16px 20px',
                      borderBottom: '1px solid #F1F5F9',
                      fontSize: '13px',
                    }}
                  >
                    <span style={{ color: '#64748B', fontWeight: 500 }}>What will be checked</span>
                    <span style={{ color: '#0F172A', fontWeight: 500 }}>
                      Code, dependencies, infrastructure, secrets and running app (12 agents)
                    </span>
                  </div>

                  {/* Permissions */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '200px 1fr',
                      padding: '16px 20px',
                      borderBottom: '1px solid #F1F5F9',
                      fontSize: '13px',
                    }}
                  >
                    <span style={{ color: '#64748B', fontWeight: 500 }}>Permissions</span>
                    <span style={{ color: '#0F172A', fontWeight: 500 }}>
                      Read-only access. Kavach will only scan and analyze your code. No changes will be made.
                    </span>
                  </div>

                  {/* Estimated duration */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '200px 1fr',
                      padding: '16px 20px',
                      fontSize: '13px',
                    }}
                  >
                    <span style={{ color: '#64748B', fontWeight: 500 }}>Estimated duration</span>
                    <span style={{ color: '#0F172A', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={14} color="#64748B" /> 3 - 8 minutes
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions: Back and Start Scan */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#FFFFFF',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: 600,
                    padding: '9px 18px',
                    borderRadius: '7px',
                    border: '1px solid #CBD5E1',
                    cursor: 'pointer',
                  }}
                >
                  <ArrowLeft size={14} />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={handleStartScan}
                  disabled={isSubmitting}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#16A34A',
                    color: '#FFFFFF',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    padding: '10px 24px',
                    borderRadius: '7px',
                    border: 'none',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 1px 2px rgba(22, 163, 74, 0.2)',
                    opacity: isSubmitting ? 0.8 : 1,
                    transition: 'background-color 150ms ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting) e.currentTarget.style.backgroundColor = '#15803D';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSubmitting) e.currentTarget.style.backgroundColor = '#16A34A';
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Initiating security scan...</span>
                    </>
                  ) : (
                    <>
                      <span>Start security scan</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
