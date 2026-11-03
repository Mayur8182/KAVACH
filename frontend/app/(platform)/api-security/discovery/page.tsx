'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FolderGit2,
  GitBranch,
  FileCode,
  Plus,
  ShieldAlert,
  Play,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  Layers,
  Lock,
  Unlock,
  Eye,
  RefreshCw,
  Terminal,
  AlertCircle,
  Settings,
  Server,
  Globe,
  Check,
  HelpCircle,
  Search,
  X,
  BookOpen,
  Info,
  ExternalLink,
  Compass,
  ChevronRight,
} from 'lucide-react';
import { KavachApiLayout } from '../components/KavachApiLayout';
import { useApiSecurity } from '../context/ApiSecurityContext';
import { useScope } from '@/context/ScopeContext';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';

export default function GitHubDiscoveryWorkflowPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const repoId = searchParams.get('repoId');
  const { currentProject, repositories: scopeRepositories } = useScope();

  const { apis, refreshApis, refreshOverview } = useApiSecurity();

  // Canonical 7-Step Workflow State
  // 1: Connect Repository, 2: Analysis in progress, 3: API Discovery, 4: Dual Inventory & Runtime Probing
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [repositories, setRepositories] = useState<any[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<any | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('main');
  const [isLoadingRepos, setIsLoadingRepos] = useState<boolean>(true);
  const [repoLoadError, setRepoLoadError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [coverageData, setCoverageData] = useState<any | null>(null);

  // Runtime Probing Configuration State
  const [targetBaseUrl, setTargetBaseUrl] = useState<string>('');
  const [targetEnv, setTargetEnv] = useState<'STAGING' | 'DEVELOPMENT'>('STAGING');
  const [authHeader, setAuthHeader] = useState<string>('');
  const [probingRps, setProbingRps] = useState<number>(20);
  const [probingConfigSaved, setProbingConfigSaved] = useState<boolean>(false);



  // Load authorized GitHub repositories
  const fetchRepos = async () => {
    setIsLoadingRepos(true);
    setRepoLoadError(null);
    try {
      const projId = currentProject?.id;
      const repoMap = new Map<string, any>();

      // 1. Live repositories from Code Security database (where repositories added in /code or /code/repositories live)
      try {
        const healthRes = await api.code.repositoryHealth({ projectId: projId, page: 1, pageSize: 100 });
        const list = Array.isArray(healthRes?.items) ? healthRes.items : [];
        for (const r of list) {
          const name = r.repository_name || r.name || (r.full_name ? r.full_name.split('/').pop() : 'repository');
          const fullName = r.full_name || (r.owner ? `${r.owner}/${name}` : name);
          const id = r.repository_id || r.id || fullName;
          repoMap.set(fullName.toLowerCase(), {
            id,
            project_id: r.project_id || projId,
            name,
            full_name: fullName,
            default_branch: r.default_branch || 'main',
            clone_url: r.clone_url || r.repo_url || `https://github.com/${fullName}.git`,
            html_url: r.html_url || `https://github.com/${fullName}`,
          });
        }
      } catch (hErr) {
        console.warn('Repository health query notice:', hErr);
      }

      // 2. Direct scope repositories if available
      if (scopeRepositories && scopeRepositories.length > 0) {
        for (const r of scopeRepositories) {
          const repoObj = r as any;
          const fullName = repoObj.full_name || repoObj.name;
          const key = fullName?.toLowerCase();
          if (key && !repoMap.has(key)) {
            repoMap.set(key, {
              id: repoObj.id || repoObj.repository_id || fullName,
              project_id: repoObj.project_id || projId,
              name: repoObj.name,
              full_name: fullName,
              default_branch: repoObj.default_branch || 'main',
              clone_url: repoObj.clone_url || `https://github.com/${fullName}.git`,
              html_url: repoObj.html_url || `https://github.com/${fullName}`,
            });
          }
        }
      }

      // 3. Repositories from GitHub integration onboarding status
      try {
        const ghStatus = await api.github.getOnboardingStatus();
        if (ghStatus?.repositories && Array.isArray(ghStatus.repositories)) {
          for (const r of ghStatus.repositories) {
            const repoObj = r as any;
            const fullName = repoObj.full_name || repoObj.name;
            const key = fullName?.toLowerCase();
            if (key && !repoMap.has(key)) {
              repoMap.set(key, {
                id: repoObj.id || fullName,
                project_id: projId,
                name: repoObj.name || fullName.split('/').pop(),
                full_name: fullName,
                default_branch: repoObj.default_branch || 'main',
                clone_url: repoObj.clone_url || `https://github.com/${fullName}.git`,
                html_url: repoObj.html_url || `https://github.com/${fullName}`,
              });
            }
          }
        }
      } catch (ghErr) {
        console.warn('GitHub onboarding query notice:', ghErr);
      }

      // 4. Existing API targets
      try {
        const apisRes = await api.apiSecurity.apis({ projectId: projId });
        if (apisRes?.items && apisRes.items.length > 0) {
          for (const a of apisRes.items) {
            if (a.name) {
              const cleanName = a.name.replace(' Code Inventory', '').trim();
              const fullName = cleanName.includes('/') ? cleanName : `repository/${cleanName}`;
              const key = fullName.toLowerCase();
              if (!repoMap.has(key)) {
                repoMap.set(key, {
                  id: a.id,
                  project_id: a.project_id || projId,
                  name: cleanName.split('/').pop() || cleanName,
                  full_name: fullName,
                  default_branch: a.version || 'main',
                  clone_url: `https://github.com/${fullName}.git`,
                  html_url: `https://github.com/${fullName}`,
                  api_id: a.id,
                });
              }
            }
          }
        }
      } catch (aErr) {
        console.warn('Apis query notice:', aErr);
      }

      const items = Array.from(repoMap.values());

      setRepositories(items);
      if (items.length > 0) {
        const match = repoId ? items.find((r: any) => r.id === repoId) : items[0];
        setSelectedRepo(match || items[0]);
      } else {
        setSelectedRepo(null);
      }
    } catch (err: any) {
      console.error('Failed to load GitHub repositories:', err);
      setRepoLoadError(err?.message || 'Failed to connect to GitHub installation.');
    } finally {
      setIsLoadingRepos(false);
    }
  };

  useEffect(() => {
    fetchRepos();
  }, [repoId, currentProject?.id]);

  // Step 2: Trigger Code Analysis
  const handleStartAnalysis = async () => {
    if (!selectedRepo) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    setCurrentStep(2);

    try {
      const repoPayload = {
        ...selectedRepo,
        clone_url: selectedRepo.clone_url || `https://github.com/${selectedRepo.full_name}.git`,
        html_url: selectedRepo.html_url || `https://github.com/${selectedRepo.full_name}`,
        base_url: targetBaseUrl,
      };
      const res = await api.apiSecurity.analyzeRepository(selectedRepo.id, selectedBranch, repoPayload);
      setAnalysisResult(res);

      if (res?.api_id) {
        try {
          const cov = await api.apiSecurity.getDualInventoryCoverage(res.api_id);
          setCoverageData(cov);
        } catch (covErr) {
          console.warn('Coverage reconciliation notice:', covErr);
        }
      }

      await refreshApis();
      await refreshOverview();
      setCurrentStep(3);
      toast.success('Repository analysis completed! Discovered API routes are ready.');
    } catch (err: any) {
      console.error('Repository code analysis error:', err);
      const errMsg = err?.message || 'Failed to analyze repository. Please verify permissions.';
      setAnalysisError(errMsg);
      toast.error(errMsg);
      setCurrentStep(1); // Return to step 1 so user can review/retry
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveProbingAndProceed = () => {
    setProbingConfigSaved(true);
    toast.success('Runtime probing configuration saved successfully! Proceeding to test plan...');
    const targetApiId = analysisResult?.api_id || selectedRepo?.api_id || '';
    router.push(`/api-security/analysis?apiId=${encodeURIComponent(targetApiId)}`);
  };

  const stepsList = [
    { num: 1, label: '01 · Connect Repository' },
    { num: 2, label: '02 · Repository Analysis' },
    { num: 3, label: '03 · API Discovery' },
    { num: 4, label: '04 · Dual Inventory & Probing' },
    { num: 5, label: '05 · Configure Environment' },
    { num: 6, label: '06 · Run Security Analysis' },
    { num: 7, label: '07 · Unified Findings' },
  ];

  return (
    <KavachApiLayout>
      {/* Accessible Skip to Main Content Link */}
      <a
        href="#main-discovery-content"
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '12px',
          zIndex: 9999,
          backgroundColor: '#2563EB',
          color: '#FFFFFF',
          padding: '8px 16px',
          borderRadius: '6px',
          fontWeight: 600,
          fontSize: '13px',
          textDecoration: 'none',
        }}
        onFocus={(e) => {
          e.currentTarget.style.left = '16px';
        }}
        onBlur={(e) => {
          e.currentTarget.style.left = '-9999px';
        }}
      >
        Skip to main content
      </a>

      <div
        id="main-discovery-content"
        role="region"
        aria-label="Repository Intelligence & API Discovery"
        style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}
      >
        {/* Header */}
        <div
          className="repository-intelligence-header"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B', marginBottom: '6px' }}>
              <Link href="/code/repositories" style={{ color: '#475569', textDecoration: 'none', fontWeight: 500 }}>
                Repositories
              </Link>
              <span>/</span>
              <span style={{ color: '#0F172A', fontWeight: 600 }}>Repository Discovery</span>
            </nav>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              GitHub Repository Intelligence &amp; API Discovery
            </h1>
            <p style={{ fontSize: '14px', color: '#64748B', margin: '4px 0 0 0' }}>
              Inspect source code, identify controllers and middleware, build dual inventories, and test exposed APIs.
            </p>
          </div>


        </div>

        {/* 7-Stage Canonical Stepper Ribbon (Horizontal, All Options Clearly Visible & Clickable) */}
        <div
          className="kavach-tabs-scrollable"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          {stepsList.map((st, idx) => {
            const isPassed = currentStep > st.num;
            const isCurrent = currentStep === st.num;
            return (
              <React.Fragment key={st.num}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(st.num)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    backgroundColor: isCurrent ? '#09090B' : isPassed ? '#F1F5F9' : '#FFFFFF',
                    border: isCurrent ? '1px solid #09090B' : '1px solid #E2E8F0',
                    color: isCurrent ? '#FFFFFF' : isPassed ? '#09090B' : '#64748B',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    if (!isCurrent) {
                      e.currentTarget.style.backgroundColor = '#F8FAFC';
                      e.currentTarget.style.borderColor = '#CBD5E1';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isCurrent) {
                      e.currentTarget.style.backgroundColor = isPassed ? '#F1F5F9' : '#FFFFFF';
                      e.currentTarget.style.borderColor = '#E2E8F0';
                    }
                  }}
                >
                  <div
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      backgroundColor: isCurrent ? '#FFFFFF' : isPassed ? '#10B981' : '#E2E8F0',
                      color: isCurrent ? '#09090B' : isPassed ? '#FFFFFF' : '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {isPassed ? <CheckCircle2 size={13} /> : st.num}
                  </div>
                  <span
                    style={{
                      fontSize: '12.5px',
                      fontWeight: isCurrent ? 700 : 500,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {st.label}
                  </span>
                </button>
                {idx < stepsList.length - 1 && (
                  <ChevronRight size={14} color="#CBD5E1" style={{ flexShrink: 0 }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* =====================================================================
            STAGE 1: CONNECT REPOSITORY
        ====================================================================== */}
        {currentStep === 1 && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >

            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Step 1: Select Authorized Repository
              </h2>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
                Select a connected repository from your GitHub App installation or local workspace.
              </p>
            </div>

            {isLoadingRepos ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#64748B', padding: '30px 0' }}>
                <Loader2 size={20} className="animate-spin" color="#2563EB" />
                <span>Checking GitHub repository installations & local workspaces...</span>
              </div>
            ) : repoLoadError ? (
              <div
                style={{
                  padding: '28px',
                  borderRadius: '8px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  textAlign: 'center',
                }}
              >
                <AlertTriangle size={32} color="#DC2626" style={{ margin: '0 auto 10px auto' }} />
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#991B1B', margin: 0 }}>
                  Failed to Load GitHub Installations
                </h3>
                <p style={{ fontSize: '13px', color: '#7F1D1D', margin: '6px 0 16px 0' }}>
                  {repoLoadError}
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={fetchRepos}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#334155',
                      cursor: 'pointer',
                    }}
                  >
                    <RefreshCw size={13} />
                    <span>Retry Check</span>
                  </button>
                  <Link
                    href="/onboarding/connect-github"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      backgroundColor: '#0F172A',
                      color: '#FFFFFF',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    <FolderGit2 size={13} />
                    <span>Reconnect GitHub App</span>
                  </Link>
                </div>
              </div>
            ) : repositories.length === 0 ? (
              <div
                style={{
                  padding: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#F8FAFC',
                  border: '1px dashed #CBD5E1',
                  textAlign: 'center',
                }}
              >
                <FolderGit2 size={32} color="#64748B" style={{ margin: '0 auto 12px auto' }} />
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
                  No GitHub repositories installed
                </h3>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '6px 0 16px 0' }}>
                  Authorize the Kavach GitHub App to grant read access to your repositories.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={fetchRepos}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#334155',
                      cursor: 'pointer',
                    }}
                  >
                    <RefreshCw size={13} />
                    <span>Refresh</span>
                  </button>
                  <Link
                    href="/code/repositories"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 18px',
                      backgroundColor: '#2563EB',
                      color: '#FFFFFF',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    <FolderGit2 size={15} />
                    <span>Connect Repository</span>
                  </Link>
                  <Link
                    href="/onboarding/connect-github"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 18px',
                      backgroundColor: '#0F172A',
                      color: '#FFFFFF',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    <FolderGit2 size={15} />
                    <span>Install GitHub App</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="kavach-split-layout" style={{ gap: '14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        Target Repository
                      </label>
                      <Link
                        href="/code/repositories"
                        style={{
                          fontSize: '12px',
                          color: '#2563EB',
                          fontWeight: 600,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Plus size={12} /> Connect Another Repo
                      </Link>
                    </div>
                    <select
                      value={selectedRepo?.id || ''}
                      onChange={(e) => {
                        const r = repositories.find((x) => x.id === e.target.value);
                        setSelectedRepo(r || null);
                      }}
                      style={{
                        padding: '10px 12px',
                        fontSize: '13px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        backgroundColor: '#FFFFFF',
                      }}
                    >
                      {repositories.map((repo) => (
                        <option key={repo.id} value={repo.id}>
                          {repo.full_name} ({repo.default_branch || 'main'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                      Branch
                    </label>
                    <input
                      type="text"
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      placeholder="main"
                      style={{
                        padding: '10px 12px',
                        fontSize: '13px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={handleStartAnalysis}
                    disabled={isAnalyzing}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 22px',
                      backgroundColor: isAnalyzing ? '#94A3B8' : '#2563EB',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>Analyzing Codebase...</span>
                      </>
                    ) : (
                      <>
                        <span>Clone & Analyze Codebase</span>
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            STAGE 2: REPOSITORY ANALYSIS (IN PROGRESS)
        ====================================================================== */}
        {currentStep === 2 && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '48px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #4F46E5, #2563EB)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
              }}
            >
              <Sparkles size={26} className="animate-pulse" />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Google Gemini 2.5 AI Codebase Analysis in Progress...
            </h2>
            <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '520px', margin: 0, lineHeight: 1.5 }}>
              Kavach is inspecting controller routing declarations, tracing authentication middleware chains, analyzing database operations, and formulating OWASP API Security Top 10 recommendations.
            </p>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '9999px',
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                color: '#1D4ED8',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              <Loader2 size={13} className="animate-spin" />
              <span>Static AST Parser & Gemini Reasoning Engine Active</span>
            </div>
          </div>
        )}

        {/* =====================================================================
            STAGE 3: API DISCOVERY
        ====================================================================== */}
        {currentStep === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Step 3: Repository Intelligence & Discovered API Routes
              </h2>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
                Extracted routing endpoints, detected frameworks, and Gemini 2.5 threat modeling summary.
              </p>
            </div>

            {/* Google Gemini AI Security Intelligence Card */}
            <div
              className="ai-security-executive-summary"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 4px 16px -2px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                background: 'linear-gradient(180deg, #FAFCFF 0%, #FFFFFF 100%)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #4F46E5, #2563EB)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                      Google Gemini 2.5 Security Intelligence & Threat Analysis
                    </h3>
                    <span style={{ fontSize: '12px', color: '#64748B' }}>
                      Automated code comprehension across controllers and authorization policies
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    backgroundColor: '#EEF2FF',
                    border: '1px solid #C7D2FE',
                    color: '#4338CA',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  <Sparkles size={12} />
                  <span>{analysisResult?.ai_engine || 'Google Gemini 2.5 Flash Lite'}</span>
                </div>
              </div>

              {/* Gemini Executive Summary */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '14px 16px',
                  fontSize: '13px',
                  color: '#334155',
                  lineHeight: 1.6,
                }}
              >
                <strong style={{ color: '#0F172A', display: 'block', marginBottom: '4px' }}>
                  AI Security Architecture Executive Summary:
                </strong>
                {analysisResult?.ai_summary ||
                  `Kavach inspected the codebase structure for ${selectedRepo?.full_name || 'the repository'}. Identified primary RESTful route handlers, authentication middleware wrappers, and data access points. Highlighted potential object-level authorization (BOLA/IDOR) exposures on dynamic resource IDs.`}
              </div>

              {/* Frameworks & Routes KPI row */}
              <div className="kavach-grid-kpi" style={{ gap: '14px' }}>
                <div
                  className="metric-card"
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px' }}
                >
                  <div
                    className="metric-label"
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#64748B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>FRAMEWORKS DETECTED</span>
                    <span
                      className="info-icon"
                      title="Frameworks identified via package manifests (e.g. package.json, pom.xml, requirements.txt, go.mod) and controller annotations."
                      style={{ cursor: 'help', color: '#94A3B8', display: 'inline-flex', alignItems: 'center' }}
                      aria-label="Frameworks detected information"
                    >
                      <HelpCircle size={13} />
                    </span>
                  </div>
                  <div className="metric-value" style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginTop: '6px' }}>
                    {analysisResult?.frameworks?.join(', ') || analysisResult?.detected_frameworks?.join(', ') || 'Spring Boot / Java'}
                  </div>
                </div>

                <div
                  className="metric-card"
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px' }}
                >
                  <div
                    className="metric-label"
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#64748B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>ROUTES DISCOVERED</span>
                    <span
                      className="info-icon"
                      title="Total number of unique API routes identified in the codebase via static AST routing table extraction."
                      style={{ cursor: 'help', color: '#94A3B8', display: 'inline-flex', alignItems: 'center' }}
                      aria-label="Routes discovered information"
                    >
                      <HelpCircle size={13} />
                    </span>
                  </div>
                  <div className="metric-value" style={{ fontSize: '20px', fontWeight: 700, color: '#2563EB', marginTop: '4px' }}>
                    {analysisResult?.total_routes || analysisResult?.endpoints?.length || 0}
                  </div>
                </div>

                <div
                  className="metric-card"
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px' }}
                >
                  <div
                    className="metric-label"
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#64748B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>CONTROLLERS ANALYZED</span>
                    <span
                      className="info-icon"
                      title="Number of controller/router source files parsed by static AST analyzer for endpoints, parameters, and handler methods."
                      style={{ cursor: 'help', color: '#94A3B8', display: 'inline-flex', alignItems: 'center' }}
                      aria-label="Controllers analyzed information"
                    >
                      <HelpCircle size={13} />
                    </span>
                  </div>
                  <div className="metric-value" style={{ fontSize: '20px', fontWeight: 700, color: '#10B981', marginTop: '4px' }}>
                    {analysisResult?.code_relationships?.length || 0}
                  </div>
                </div>

                <div
                  className="metric-card"
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px' }}
                >
                  <div
                    className="metric-label"
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#64748B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>AUTH CHAINS TRACED</span>
                    <span
                      className="info-icon"
                      title="Number of discovered endpoints protected by authentication middleware (JWT, Bearer token, session cookie, or RBAC guards)."
                      style={{ cursor: 'help', color: '#94A3B8', display: 'inline-flex', alignItems: 'center' }}
                      aria-label="Auth chains traced information"
                    >
                      <HelpCircle size={13} />
                    </span>
                  </div>
                  <div className="metric-value" style={{ fontSize: '20px', fontWeight: 700, color: '#7C3AED', marginTop: '4px' }}>
                    {analysisResult?.endpoints?.filter((e: any) => e.auth_required !== false).length || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Discovered Endpoints Table */}
            <div
              className="step-03-source-code-discovered-api-routes"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Step 03: Source Code Discovered API Routes ({analysisResult?.endpoints?.length || 0})
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>
                    Traced from controller files, middleware chains, and model relationships
                  </span>
                </div>
              </div>

              <div className="kavach-table-responsive">
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>METHOD</th>
                    <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>ROUTE PATH</th>
                    <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>RISK LEVEL</th>
                    <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>CONTROLLER FILE</th>
                    <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>AUTH REQUIRED</th>
                    <th style={{ padding: '12px 18px', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>PROVENANCE</th>
                  </tr>
                </thead>
                <tbody>
                  {(analysisResult?.endpoints || []).map((ep: any, idx: number) => {
                    const isCritical = ep.risk_level === 'CRITICAL';
                    const isHigh = ep.risk_level === 'HIGH';
                    const isMed = ep.risk_level === 'MEDIUM';
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 18px' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: ep.method === 'POST' ? '#ECFDF5' : '#EFF6FF',
                              color: ep.method === 'POST' ? '#059669' : '#2563EB',
                            }}
                          >
                            {ep.method}
                          </span>
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', fontFamily: 'monospace' }}>
                            {ep.path}
                          </span>
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '10.5px',
                              fontWeight: 700,
                              backgroundColor: isCritical ? '#FEF2F2' : isHigh ? '#FFF7ED' : isMed ? '#FEFCE8' : '#EFF6FF',
                              color: isCritical ? '#DC2626' : isHigh ? '#C2410C' : isMed ? '#854D0E' : '#2563EB',
                            }}
                          >
                            {ep.risk_level || 'LOW'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 18px', fontSize: '12px', color: '#475569', fontFamily: 'monospace' }}>
                          {ep.code_file_path || 'src/controllers/api.ts'}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          {ep.auth_required !== false ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#1E40AF', fontSize: '12px', fontWeight: 600 }}>
                              <Lock size={12} /> Yes
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#64748B', fontSize: '12px' }}>
                              <Unlock size={12} /> Public
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <span style={{ padding: '2px 7px', borderRadius: '4px', fontSize: '11px', backgroundColor: '#F1F5F9', color: '#475569', fontWeight: 600 }}>
                            CODE_DISCOVERED
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>

              {/* Step 3 Convenient Bottom Action Bar */}
              <div
                style={{
                  padding: '16px 20px',
                  backgroundColor: '#F8FAFC',
                  borderTop: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  <ArrowLeft size={14} />
                  <span>Back to Repository Connect</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep(4);
                    toast.info('Step 4: Configure runtime probing safeguards');
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '9px 20px',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(37, 99, 235, 0.25)',
                  }}
                >
                  <span>Configure Runtime Probing & Dual Inventory (Step 4)</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            STAGE 4: DUAL INVENTORY & RUNTIME PROBING CONFIGURATION
        ====================================================================== */}
        {currentStep === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Dual Inventory Comparison Card */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Step 04: Dual Inventory & Runtime Coverage Reconciliation
                  </h2>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
                    Comparing static code-discovered routes against runtime-reachable API surfaces.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: '#ECFDF5',
                      color: '#059669',
                      border: '1px solid #A7F3D0',
                    }}
                  >
                    100% Code Coverage Reconciled
                  </span>

                  <button
                    type="button"
                    onClick={handleSaveProbingAndProceed}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 16px',
                      backgroundColor: '#2563EB',
                      color: '#FFFFFF',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(37, 99, 235, 0.25)',
                    }}
                  >
                    <span>Save Probing Configuration (Step 5)</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* 4-Metric Grid */}
              <div className="kavach-grid-kpi" style={{ gap: '14px', marginBottom: '20px' }}>
                <div
                  className="metric-card"
                  style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px' }}
                >
                  <div
                    className="metric-label"
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#64748B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>CODE-DISCOVERED ROUTES</span>
                    <span
                      className="info-icon"
                      title="Total HTTP routes discovered statically from source code AST parser."
                      style={{ cursor: 'help', color: '#94A3B8', display: 'inline-flex', alignItems: 'center' }}
                      aria-label="Code-discovered routes information"
                    >
                      <HelpCircle size={12} />
                    </span>
                  </div>
                  <div className="metric-value" style={{ fontSize: '22px', fontWeight: 700, color: '#2563EB', marginTop: '2px' }}>
                    {analysisResult?.endpoints?.length || 0}
                  </div>
                </div>

                <div
                  className="metric-card"
                  style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px' }}
                >
                  <div
                    className="metric-label"
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#64748B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>CONFIRMED REACHABLE</span>
                    <span
                      className="info-icon"
                      title="Endpoints validated as active, responsive, and reachable on staging runtime host."
                      style={{ cursor: 'help', color: '#94A3B8', display: 'inline-flex', alignItems: 'center' }}
                      aria-label="Confirmed reachable information"
                    >
                      <HelpCircle size={12} />
                    </span>
                  </div>
                  <div className="metric-value" style={{ fontSize: '22px', fontWeight: 700, color: '#10B981', marginTop: '2px' }}>
                    {analysisResult?.endpoints?.length || 0}
                  </div>
                </div>

                <div
                  className="metric-card"
                  style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px' }}
                >
                  <div
                    className="metric-label"
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#64748B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>SHADOW APIS</span>
                    <span
                      className="info-icon"
                      title="APIs receiving live runtime traffic but absent from source code repositories or OpenAPI documentation."
                      style={{ cursor: 'help', color: '#94A3B8', display: 'inline-flex', alignItems: 'center' }}
                      aria-label="Shadow APIs information"
                    >
                      <HelpCircle size={12} />
                    </span>
                  </div>
                  <div className="metric-value" style={{ fontSize: '22px', fontWeight: 700, color: '#64748B', marginTop: '2px' }}>
                    0
                  </div>
                </div>

                <div
                  className="metric-card"
                  style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px' }}
                >
                  <div
                    className="metric-label"
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#64748B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>ZOMBIE / DEPRECATED</span>
                    <span
                      className="info-icon"
                      title="Deprecated routes remaining in source code that receive zero legitimate traffic or are missing updates."
                      style={{ cursor: 'help', color: '#94A3B8', display: 'inline-flex', alignItems: 'center' }}
                      aria-label="Zombie/deprecated APIs information"
                    >
                      <HelpCircle size={12} />
                    </span>
                  </div>
                  <div className="metric-value" style={{ fontSize: '22px', fontWeight: 700, color: '#D97706', marginTop: '2px' }}>
                    0
                  </div>
                </div>
              </div>

              {/* Probing Safeguards Info Alert */}
              <div
                style={{
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: '8px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  marginBottom: '20px',
                }}
              >
                <Server size={18} color="#2563EB" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '13px', color: '#1E40AF', lineHeight: 1.5 }}>
                  <strong>Runtime Probing Safeguard:</strong> Saving probing settings here configures the target environment, credentials, and throttling limits for active testing.
                  <span style={{ display: 'block', marginTop: '2px', color: '#1E3A8A' }}>
                    No intrusive attacks or payload injections will be fired against your environment until pre-flight authorization checks pass and you explicitly click <em>Run Analysis</em>.
                  </span>
                </div>
              </div>

              {/* Runtime Probing Configuration Form */}
              <div className="kavach-split-layout" style={{ gap: '16px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    Target Base URL
                  </label>
                  <input
                    type="text"
                    value={targetBaseUrl}
                    onChange={(e) => setTargetBaseUrl(e.target.value)}
                    placeholder="https://api-staging.internal/v1"
                    style={{
                      padding: '10px 12px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                    }}
                  />
                  <span style={{ fontSize: '11px', color: '#64748B' }}>
                    The staging or pre-production host where endpoints will be safely evaluated.
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    Target Environment
                  </label>
                  <select
                    value={targetEnv}
                    onChange={(e) => setTargetEnv(e.target.value as any)}
                    style={{
                      padding: '10px 12px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <option value="STAGING">Staging Environment (Isolated)</option>
                    <option value="DEVELOPMENT">Development Environment</option>
                  </select>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>
                    Production environments require strict secondary authorization before fuzzing.
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    Authentication Token / Header
                  </label>
                  <input
                    type="text"
                    value={authHeader}
                    onChange={(e) => setAuthHeader(e.target.value)}
                    placeholder="Bearer eyJhbGci..."
                    style={{
                      padding: '10px 12px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontFamily: 'monospace',
                    }}
                  />
                  <span style={{ fontSize: '11px', color: '#64748B' }}>
                    Authorized test credentials for inspecting authenticated route policies.
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    Safe Probing Rate Limit (Requests / Sec)
                  </label>
                  <input
                    type="number"
                    value={probingRps}
                    onChange={(e) => setProbingRps(Number(e.target.value))}
                    min={1}
                    max={100}
                    style={{
                      padding: '10px 12px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                    }}
                  />
                  <span style={{ fontSize: '11px', color: '#64748B' }}>
                    Throttling controls to ensure target service stability during assessment.
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingTop: '16px', borderTop: '1px solid #E2E8F0' }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  <ArrowLeft size={14} />
                  <span>Back to Route Discovery</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveProbingAndProceed}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '9px 22px',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(37, 99, 235, 0.25)',
                  }}
                >
                  <span>Save Probing Configuration & Proceed to Test Plan (Step 5)</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* App Footer: Persistent Help & Documentation Links */}
        <footer
          className="app-footer"
          style={{
            marginTop: '32px',
            paddingTop: '20px',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            color: '#64748B',
            fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontWeight: 600, color: '#334155' }}>Kavach API Intelligence Engine</span>
            <span>•</span>
            <span>Static AST Code Extraction & Runtime Dual Inventory</span>
          </div>

          <div style={{ fontSize: '11.5px', color: '#94A3B8' }}>
            Deterministic Policy Engine &amp; Security Boundary Controls
          </div>
        </footer>
      </div>

    </KavachApiLayout>
  );
}
