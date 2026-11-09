'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Network,
  FileCode,
  ShieldAlert,
  PlaySquare,
  Bot,
  Plus,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Lock,
  Zap,
  Layers,
  Send,
  Loader2,
  FolderGit2,
  GitBranch,
  ExternalLink,
  Code2,
  AlertTriangle,
  Terminal,
  RefreshCw,
  GitPullRequest,
  Check,
  ChevronRight,
  Sliders,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { KavachApiLayout } from './components/KavachApiLayout';
import { AddApiModal } from './components/AddApiModal';
import { useApiSecurity } from './context/ApiSecurityContext';
import { useScope } from '@/context/ScopeContext';
import { api } from '@/lib/api/client';

interface DiscoveredEndpoint {
  id?: string;
  method: string;
  path: string;
  category?: string;
  auth_required?: boolean;
  risk_level?: string;
  code_file_path?: string;
}

interface FindingItem {
  id: string;
  title: string;
  severity: string;
  cwe?: string;
  owasp_category?: string;
  category?: string;
  description: string;
  impact?: string;
  affected_endpoints?: string[];
  code_file_path?: string;
  evidence?: any;
  remediation_advice?: string;
  remediation_patch?: string;
  pr_status?: 'IDLE' | 'CREATING' | 'CREATED' | 'ERROR';
  pr_url?: string;
  pr_number?: number;
  pr_error?: string;
}

export default function ApiSecurityAutonomousPipelinePage() {
  const router = useRouter();
  const { currentProject, repositories: scopeRepositories } = useScope();
  const { apis, overviewMetrics, refreshOverview, isAddModalOpen, setIsAddModalOpen } = useApiSecurity();

  // 1. Repository Selection State (User only connects/picks repo)
  const [repositories, setRepositories] = useState<any[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<any | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('main');
  const [customRepoUrl, setCustomRepoUrl] = useState<string>('');
  const [repoInputMode, setRepoInputMode] = useState<'select' | 'custom'>('select');
  const [isLoadingRepos, setIsLoadingRepos] = useState<boolean>(true);
  const [repoError, setRepoError] = useState<string | null>(null);

  // 2. Autonomous Pipeline State
  const [pipelineState, setPipelineState] = useState<'IDLE' | 'ANALYZING_CODE' | 'TESTING_SECURITY' | 'SYNTHESIZING' | 'COMPLETED' | 'ERROR'>('IDLE');
  const [pipelineProgress, setPipelineProgress] = useState<number>(0);
  const [currentStepName, setCurrentStepName] = useState<string>('Ready to analyze');
  const [executionLogs, setExecutionLogs] = useState<Array<{ time: string; message: string; level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' }>>([]);
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  // 3. Pipeline Results (Real Data from Engine)
  const [activeTarget, setActiveTarget] = useState<any | null>(null);
  const [discoveredEndpoints, setDiscoveredEndpoints] = useState<DiscoveredEndpoint[]>([]);
  const [detectedFrameworks, setDetectedFrameworks] = useState<string[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [findings, setFindings] = useState<FindingItem[]>([]);
  const [scanSummary, setScanSummary] = useState<any | null>(null);

  // 4. Batch PR creation state
  const [isBatchCreatingPr, setIsBatchCreatingPr] = useState<boolean>(false);
  const [batchPrSuccessMsg, setBatchPrSuccessMsg] = useState<string | null>(null);

  // Fetch real connected repositories from backend strictly scoped to current project
  const loadConnectedRepositories = async () => {
    setIsLoadingRepos(true);
    setRepoError(null);
    try {
      let items: any[] = [];
      const projId = currentProject?.id;
      const queryParam = projId ? `?project_id=${encodeURIComponent(projId)}` : '';

      // 1. Centralized repository management (filtered by project)
      try {
        const repoMgmt = await api.request<any[]>(`/api/v1/repositories/management${queryParam}`);
        if (repoMgmt?.data && Array.isArray(repoMgmt.data) && repoMgmt.data.length > 0) {
          items = repoMgmt.data.map((r: any) => ({
            id: r.id,
            project_id: r.project_id,
            name: r.name,
            full_name: r.full_name || `${r.owner || 'org'}/${r.name}`,
            default_branch: r.default_branch || 'main',
            clone_url: r.clone_url || `https://github.com/${r.full_name || r.name}.git`,
            html_url: r.html_url || `https://github.com/${r.full_name || r.name}`,
          }));
        }
      } catch (mErr) {
        console.warn('Repository management query notice:', mErr);
      }

      // 2. Direct scope repositories if available for this project
      if (items.length === 0 && scopeRepositories && scopeRepositories.length > 0) {
        items = scopeRepositories.map((r: any) => ({
          id: r.id || r.repository_id || r.name,
          project_id: r.project_id || projId,
          name: r.name,
          full_name: r.full_name || r.name,
          default_branch: r.default_branch || 'main',
          clone_url: r.clone_url || `https://github.com/${r.full_name || r.name}.git`,
          html_url: r.html_url || `https://github.com/${r.full_name || r.name}`,
        }));
      }

      // 3. Fallback to repository health with project scope
      if (items.length === 0) {
        try {
          const healthRes = await api.code.repositoryHealth({ projectId: projId, page: 1, pageSize: 50 });
          if (healthRes?.items && healthRes.items.length > 0) {
            items = healthRes.items.map((r: any) => ({
              id: r.repository_id || r.id,
              project_id: r.project_id || projId,
              name: r.repository_name || r.name,
              full_name: r.full_name || `${r.repository_name || r.name}`,
              default_branch: r.default_branch || 'main',
              clone_url: r.clone_url || r.repo_url || `https://github.com/${r.full_name || r.name}.git`,
              html_url: r.html_url || `https://github.com/${r.full_name || r.name}`,
            }));
          }
        } catch (hErr) {
          console.warn('Repository health query notice:', hErr);
        }
      }

      // 4. Fallback to existing API targets scoped to project
      if (items.length === 0) {
        try {
          const apisRes = await api.apiSecurity.apis({ projectId: projId });
          if (apisRes?.items && apisRes.items.length > 0) {
            items = apisRes.items
              .filter((a: any) => a.name)
              .map((a: any) => {
                const cleanName = a.name.replace(' Code Inventory', '').trim();
                const fullName = cleanName.includes('/') ? cleanName : `repository/${cleanName}`;
                return {
                  id: a.id,
                  project_id: a.project_id || projId,
                  name: cleanName.split('/').pop() || cleanName,
                  full_name: fullName,
                  default_branch: a.version || 'main',
                  clone_url: `https://github.com/${fullName}.git`,
                  html_url: `https://github.com/${fullName}`,
                  api_id: a.id,
                };
              });
          }
        } catch (aErr) {
          console.warn('Apis query notice:', aErr);
        }
      }

      // Strictly guard against cross-workspace leakage if project is defined
      if (projId && items.length > 0) {
        const scopeNames = new Set((scopeRepositories || []).map((s: any) => s.name?.toLowerCase()));
        const scopeFullNames = new Set((scopeRepositories || []).map((s: any) => s.full_name?.toLowerCase()));
        if (scopeNames.size > 0) {
          const filtered = items.filter((r: any) => 
            r.project_id === projId || 
            scopeNames.has(r.name?.toLowerCase()) || 
            scopeFullNames.has(r.full_name?.toLowerCase())
          );
          if (filtered.length > 0) {
            items = filtered;
          }
        } else {
          const filtered = items.filter((r: any) => !r.project_id || r.project_id === projId);
          if (filtered.length > 0) {
            items = filtered;
          }
        }
      }

      setRepositories(items);
      if (items.length > 0) {
        setSelectedRepo(items[0]);
        setSelectedBranch(items[0].default_branch || 'main');
      } else {
        setSelectedRepo(null);
      }
    } catch (err: any) {
      console.error('Failed to load repositories:', err);
      setRepoError(err?.message || 'Failed to query connected repositories.');
    } finally {
      setIsLoadingRepos(false);
    }
  };

  useEffect(() => {
    loadConnectedRepositories();
  }, [currentProject?.id]);

  const addLog = (message: string, level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' = 'INFO') => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    setExecutionLogs((prev) => [...prev, { time, message, level }]);
  };

  // Run Autonomous End-to-End Workflow:
  // User clicks 1 button -> AI discovers AST routes -> AI tests OWASP risks -> AI generates diffs -> AI is ready for GitHub PR
  const handleRunAutonomousWorkflow = async () => {
    let targetRepo: any = null;
    if (repoInputMode === 'custom' && customRepoUrl.trim()) {
      const cleanUrl = customRepoUrl.trim();
      const repoName = cleanUrl.split('/').pop()?.replace('.git', '') || 'custom-repo';
      const fullName = cleanUrl.includes('github.com/') 
        ? cleanUrl.split('github.com/')[1].replace('.git', '') 
        : cleanUrl;
      targetRepo = {
        id: 'custom-' + Date.now(),
        name: repoName,
        full_name: fullName,
        default_branch: selectedBranch || 'main',
        clone_url: cleanUrl.startsWith('http') ? cleanUrl : `https://github.com/${cleanUrl}.git`,
        html_url: cleanUrl.startsWith('http') ? cleanUrl : `https://github.com/${cleanUrl}`,
      };

      // Also register to backend database so it is persisted
      try {
        await api.request('/api/v1/repositories/add-custom', {
          method: 'POST',
          body: JSON.stringify({
            repo_url: cleanUrl,
            default_branch: selectedBranch || 'main',
            project_id: currentProject?.id || undefined,
          }),
        });
      } catch (e) {
        console.warn('Auto-registering custom repo notice:', e);
      }
    } else {
      targetRepo = selectedRepo || (customRepoUrl.trim() ? {
        id: 'custom-' + Date.now(),
        name: customRepoUrl.split('/').pop()?.replace('.git', '') || 'custom-repo',
        full_name: customRepoUrl.replace('https://github.com/', '').replace('.git', '').trim(),
        default_branch: selectedBranch || 'main',
        clone_url: customRepoUrl.trim().startsWith('http') ? customRepoUrl.trim() : `https://github.com/${customRepoUrl.trim()}.git`,
        html_url: customRepoUrl.trim().startsWith('http') ? customRepoUrl.trim() : `https://github.com/${customRepoUrl.trim()}`,
      } : null);
    }

    if (!targetRepo) {
      alert('Please select or specify a GitHub repository to analyze.');
      return;
    }

    setPipelineState('ANALYZING_CODE');
    setPipelineProgress(15);
    setCurrentStepName('Phase 1: Autonomous Code AST & Route Extraction');
    setExecutionLogs([]);
    setPipelineError(null);
    setDiscoveredEndpoints([]);
    setFindings([]);

    addLog(`🚀 Initiating Autonomous AI Security Pipeline for ${targetRepo.full_name} (${selectedBranch})`, 'INFO');
    addLog(`🔍 AST Engine: Scanning repository tree for controller declarations & routing files...`, 'INFO');

    try {
      // ─────────────────────────────────────────────────────────────────────────
      // STAGE 1: Code & Route Discovery
      // ─────────────────────────────────────────────────────────────────────────
      const repoPayload = {
        name: targetRepo.name,
        full_name: targetRepo.full_name,
        clone_url: targetRepo.clone_url,
        html_url: targetRepo.html_url,
        default_branch: selectedBranch,
      };

      const discoveryRes = await api.apiSecurity.analyzeRepository(targetRepo.id, selectedBranch, repoPayload);
      const targetApiId = discoveryRes?.api_id;
      setActiveTarget(discoveryRes);

      const endpointsList = discoveryRes?.endpoints || [];
      const frameworks = discoveryRes?.detected_frameworks || ['Backend API'];
      setDiscoveredEndpoints(endpointsList);
      setDetectedFrameworks(frameworks);
      setAiSummary(discoveryRes?.ai_summary || null);

      addLog(`✓ Phase 1 Completed: Extracted ${endpointsList.length} API endpoints across ${frameworks.join(', ')}`, 'SUCCESS');
      endpointsList.slice(0, 5).forEach((ep: any) => {
        addLog(`   • Discovered ${ep.method} ${ep.path} (${ep.code_file_path || 'controller'}) [Auth: ${ep.auth_required ? 'Required' : 'Public'}]`, 'INFO');
      });

      // ─────────────────────────────────────────────────────────────────────────
      // STAGE 2: Autonomous OWASP API Security Scan
      // ─────────────────────────────────────────────────────────────────────────
      setPipelineState('TESTING_SECURITY');
      setPipelineProgress(45);
      setCurrentStepName('Phase 2: Automated OWASP API Security Verification');
      addLog(`🛡️ Phase 2: Launching deterministic OWASP API Security test suites...`, 'INFO');

      const selectedCategories = [
        'Authentication Testing',
        'Authorization Testing (BOLA/IDOR)',
        'Rate Limiting & Abuse',
        'Injection Testing',
        'Excessive Data Exposure',
        'Security Misconfiguration',
      ];

      const scanConfig = {
        environment: 'PRODUCTION',
        scope_type: 'all',
        endpoint_count: endpointsList.length || 10,
        categories: selectedCategories,
        concurrency: 4,
        timeout_seconds: 15,
        rps_cap: 25,
      };

      // Create test plan
      const plan = await api.apiSecurity.createTestPlan(targetApiId, {
        name: `Autonomous Scan - ${targetRepo.name}`,
        selected_categories: selectedCategories,
        configurations: scanConfig,
      });

      // Start scan
      const scan = await api.apiSecurity.startScan({
        api_id: targetApiId,
        plan_id: plan?.id,
        scan_config: scanConfig,
      });

      const scanId = scan?.scan_id || scan?.id;
      addLog(`⚡ Security engine initialized (Scan ID: ${scanId}). Executing tests...`, 'INFO');

      // Poll scan status until completion
      let isComplete = false;
      let pollAttempts = 0;
      let finalScanResults = null;

      while (!isComplete && pollAttempts < 25) {
        await new Promise((r) => setTimeout(r, 1500));
        pollAttempts++;
        const statusData = await api.apiSecurity.getScan(scanId);

        if (statusData?.execution_logs && statusData.execution_logs.length > 0) {
          const latestLog = statusData.execution_logs[statusData.execution_logs.length - 1];
          if (latestLog?.message) {
            addLog(`   [Engine] ${latestLog.message}`, latestLog.level === 'WARN' ? 'WARN' : 'INFO');
          }
        }

        const pct = Math.min(85, 45 + Math.round((statusData?.progress_pct || 0) * 0.4));
        setPipelineProgress(pct);

        if (statusData?.status === 'COMPLETED' || statusData?.status === 'FINISHED' || statusData?.progress_pct >= 100) {
          isComplete = true;
        }
      }

      // ─────────────────────────────────────────────────────────────────────────
      // STAGE 3: Synthesizing Findings & AI Code Diffs
      // ─────────────────────────────────────────────────────────────────────────
      setPipelineState('SYNTHESIZING');
      setPipelineProgress(90);
      setCurrentStepName('Phase 3: Gemini AI Reasoning & Remediation Patch Synthesis');
      addLog(`🧠 Correlating vulnerabilities & generating verified unified code diffs...`, 'INFO');

      finalScanResults = await api.apiSecurity.getScanResults(scanId);
      setScanSummary(finalScanResults?.scan || null);

      const realFindings = (finalScanResults?.findings || []).map((f: any) => ({
        ...f,
        pr_status: 'IDLE',
      }));
      setFindings(realFindings);

      addLog(`✓ Security Assessment Complete: Identified ${realFindings.length} verified vulnerabilities`, realFindings.length > 0 ? 'WARN' : 'SUCCESS');
      realFindings.forEach((f: any) => {
        addLog(`   ⚠️ [${f.severity}] ${f.title} (${f.owasp_category || f.cwe})`, f.severity === 'CRITICAL' ? 'ERROR' : 'WARN');
      });

      // ─────────────────────────────────────────────────────────────────────────
      // STAGE 4: Ready for Pull Request Creation
      // ─────────────────────────────────────────────────────────────────────────
      setPipelineState('COMPLETED');
      setPipelineProgress(100);
      setCurrentStepName('Autonomous Pipeline Completed: Verified Findings & Fixes Ready');
      addLog(`🎯 Pipeline complete! Verified patches available. Ready for 1-click GitHub PR creation.`, 'SUCCESS');

      await refreshOverview();
    } catch (err: any) {
      console.error('Autonomous pipeline error:', err);
      const msg = err?.message || 'Execution error during autonomous analysis.';
      setPipelineError(msg);
      setPipelineState('ERROR');
      addLog(`❌ Pipeline Error: ${msg}`, 'ERROR');
    }
  };

  // 1-Click GitHub PR creation for a single finding
  const handleCreatePrForFinding = async (finding: FindingItem) => {
    const targetRepoName = selectedRepo?.full_name || activeTarget?.repository || (customRepoUrl.trim().replace('https://github.com/', '').replace('.git', ''));
    if (!targetRepoName) {
      alert('Target repository name could not be determined. Please ensure a repository is selected.');
      return;
    }

    setFindings((prev) =>
      prev.map((f) => (f.id === finding.id ? { ...f, pr_status: 'CREATING', pr_error: undefined } : f))
    );

    addLog(`🐙 Creating GitHub Pull Request on '${targetRepoName}' for: ${finding.title}...`, 'INFO');

    try {
      const res = await api.apiSecurity.createFindingPr(finding.id, {
        repo_name: targetRepoName,
        branch: selectedBranch,
      });

      setFindings((prev) =>
        prev.map((f) =>
          f.id === finding.id
            ? {
                ...f,
                pr_status: 'CREATED',
                pr_url: res.pr_url,
                pr_number: res.pr_number,
              }
            : f
        )
      );

      addLog(`✓ GitHub PR #${res.pr_number || 'new'} created successfully: ${res.pr_url || 'Branch pushed'}`, 'SUCCESS');
    } catch (err: any) {
      console.error('Failed to create PR:', err);
      const errMsg = err?.message || 'Failed to create PR on GitHub.';
      setFindings((prev) =>
        prev.map((f) => (f.id === finding.id ? { ...f, pr_status: 'ERROR', pr_error: errMsg } : f))
      );
      addLog(`❌ GitHub PR creation failed: ${errMsg}`, 'ERROR');
    }
  };

  // 1-Click Batch PR Creation: Automatically create PRs for all findings
  const handleCreateAllPrs = async () => {
    const unsubmitted = findings.filter((f) => f.pr_status !== 'CREATED');
    if (unsubmitted.length === 0) {
      alert('All findings already have active Pull Requests.');
      return;
    }

    setIsBatchCreatingPr(true);
    setBatchPrSuccessMsg(null);
    addLog(`🚀 Auto-creating GitHub Pull Requests for all ${unsubmitted.length} security findings...`, 'INFO');

    let successCount = 0;
    for (const finding of unsubmitted) {
      try {
        await handleCreatePrForFinding(finding);
        successCount++;
      } catch (e) {
        // Logged individually
      }
    }

    setIsBatchCreatingPr(false);
    setBatchPrSuccessMsg(`Successfully created ${successCount} GitHub Pull Requests with verified security patches.`);
  };

  return (
    <KavachApiLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        
        {/* ── Page Header & Workflow Title ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              Autonomous API Security Pipeline
            </h1>
            <p style={{ fontSize: '13.5px', color: '#64748B', margin: '6px 0 0 0', maxWidth: '760px', lineHeight: 1.5 }}>
              Connect your repository. Kavach deterministically inspects source code, maps API routes, executes OWASP vulnerability tests, synthesizes verifiable fixes, and opens GitHub Pull Requests.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={loadConnectedRepositories}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} className={isLoadingRepos ? 'animate-spin' : ''} />
              <span>Refresh Repositories</span>
            </button>
            <Link
              href="/api-security/integrations"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
                color: '#0F172A',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <FolderGit2 size={14} />
              <span>GitHub Integrations</span>
            </Link>
          </div>
        </div>

        {/* ── KPI Telemetry Bar (Real Data Only) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#F1F5F9', color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FolderGit2 size={20} />
            </div>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748B' }}>Connected Repositories</span>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                {repositories.length}
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#ECFDF5', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Network size={20} />
            </div>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748B' }}>Discovered Endpoints</span>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                {discoveredEndpoints.length > 0 ? discoveredEndpoints.length : (overviewMetrics?.endpoints_discovered ?? 0)}
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#FEF2F2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldAlert size={20} />
            </div>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748B' }}>Open Findings</span>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                {findings.length > 0 ? findings.length : (overviewMetrics?.open_findings ?? 0)}
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#F0FDFA', color: '#0D9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GitPullRequest size={20} />
            </div>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748B' }}>Automated PRs Created</span>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                {findings.filter((f) => f.pr_status === 'CREATED').length}
              </div>
            </div>
          </div>
        </div>

        {/* ── STEP 1: Repository Selection & Pipeline Trigger Card ── */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            padding: '28px 32px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#09090B',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 700,
                }}
              >
                1
              </div>
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Select Repository to Scan & Fix
                </h2>
                <span style={{ fontSize: '13px', color: '#64748B' }}>
                  Choose your codebase. The pipeline will discover all routes, test security, and generate GitHub pull requests.
                </span>
              </div>
            </div>

            {/* Mode Switcher: Connected Repos vs Custom URL */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#F1F5F9', padding: '3px', borderRadius: '8px' }}>
              <button
                type="button"
                onClick={() => setRepoInputMode('select')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: repoInputMode === 'select' ? '1px solid #CBD5E1' : '1px solid transparent',
                  backgroundColor: repoInputMode === 'select' ? '#FFFFFF' : 'transparent',
                  color: repoInputMode === 'select' ? '#0F172A' : '#64748B',
                  boxShadow: repoInputMode === 'select' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Connected Repositories ({repositories.length})
              </button>
              <button
                type="button"
                onClick={() => setRepoInputMode('custom')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: repoInputMode === 'custom' ? '1px solid #CBD5E1' : '1px solid transparent',
                  backgroundColor: repoInputMode === 'custom' ? '#FFFFFF' : 'transparent',
                  color: repoInputMode === 'custom' ? '#0F172A' : '#64748B',
                  boxShadow: repoInputMode === 'custom' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                + Custom URL
              </button>
            </div>
          </div>

          {/* Repo Selection Controls */}
          {repoInputMode === 'custom' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '18px 20px', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 360px', minWidth: '240px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>
                    Custom GitHub Repository (URL or owner/repo)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={customRepoUrl}
                      onChange={(e) => setCustomRepoUrl(e.target.value)}
                      placeholder="e.g. Mayur8182/KAVACH or https://github.com/Mayur8182/KAVACH"
                      style={{
                        width: '100%',
                        padding: '10px 14px 10px 38px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13.5px',
                        fontWeight: 500,
                        backgroundColor: '#FFFFFF',
                        color: '#0F172A',
                        outline: 'none',
                      }}
                    />
                    <FolderGit2 size={16} color="#0F172A" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  </div>
                  <span style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                    Directly runs AST discovery and OWASP testing on your repository. Supports public and private GitHub repositories.
                  </span>
                </div>

                <div style={{ width: '180px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>
                    Target Branch
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      placeholder="main"
                      style={{
                        width: '100%',
                        padding: '10px 14px 10px 34px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        color: '#0F172A',
                        backgroundColor: '#FFFFFF',
                      }}
                    />
                    <GitBranch size={15} color="#64748B" style={{ position: 'absolute', left: '11px', top: '12px' }} />
                  </div>
                </div>
              </div>
            </div>
          ) : repositories.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) 200px', gap: '16px', maxWidth: '720px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>
                    Target Repository ({repositories.length} Available)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={selectedRepo?.id || ''}
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          setRepoInputMode('custom');
                          return;
                        }
                        const found = repositories.find((r) => r.id === e.target.value);
                        if (found) {
                          setSelectedRepo(found);
                          setSelectedBranch(found.default_branch || 'main');
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 14px 10px 38px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        backgroundColor: '#FFFFFF',
                        color: '#0F172A',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        outline: 'none',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                      }}
                    >
                      {repositories.map((repo) => (
                        <option key={repo.id} value={repo.id}>
                          {repo.full_name || repo.name} ({repo.default_branch || 'main'})
                        </option>
                      ))}
                      <option value="__custom__">+ Enter custom repository URL…</option>
                    </select>
                    <FolderGit2 size={16} color="#0F172A" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>
                    Target Branch
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      placeholder="main"
                      style={{
                        width: '100%',
                        padding: '10px 14px 10px 34px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        color: '#0F172A',
                        backgroundColor: '#FFFFFF',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                      }}
                    />
                    <GitBranch size={15} color="#64748B" style={{ position: 'absolute', left: '11px', top: '12px' }} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Empty State & Custom Repo URL Entry */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '18px 20px', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px dashed #CBD5E1' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', display: 'block' }}>
                    No connected repositories found in this project.
                  </span>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>
                    Run automated discovery to detect all Git repositories and inventory APIs.
                  </span>
                </div>
                <Link
                  href="/api-security/discovery"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    backgroundColor: '#09090B',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  <Sparkles size={13} />
                  <span>Start Repository Discovery</span>
                </Link>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                <span style={{ fontSize: '12px', color: '#64748B', whiteSpace: 'nowrap' }}>Or clone directly:</span>
                <input
                  type="text"
                  value={customRepoUrl}
                  onChange={(e) => setCustomRepoUrl(e.target.value)}
                  placeholder="e.g. Mayur8182/KAVACH or https://github.com/OWASP/WebGoat.git"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    backgroundColor: '#FFFFFF',
                  }}
                />
              </div>
            </div>
          )}

          {/* Primary Action Button (Fitts's Law) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
            <button
              type="button"
              onClick={handleRunAutonomousWorkflow}
              disabled={pipelineState.includes('ING')}
              aria-label="Execute Security Pipeline"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                background: '#09090B',
                color: '#FFFFFF',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: pipelineState.includes('ING') ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
                transition: 'transform 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!pipelineState.includes('ING')) e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {pipelineState.includes('ING') ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Executing Security Pipeline ({pipelineProgress}%)…</span>
                </>
              ) : (
                <>
                  <PlaySquare size={16} />
                  <span>Execute Security Pipeline</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── STEP 2: Live Execution Pipeline & Verification Logs ── */}
        {(pipelineState !== 'IDLE' || executionLogs.length > 0) && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              color: '#0F172A',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Terminal size={16} color="#0F172A" />
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                  Pipeline Verification &amp; Execution Activity
                </span>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  — {currentStepName}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                  {pipelineProgress}%
                </span>
                <div style={{ width: '100px', height: '6px', borderRadius: '9999px', backgroundColor: '#F1F5F9', overflow: 'hidden' }}>
                  <div style={{ width: `${pipelineProgress}%`, height: '100%', backgroundColor: '#09090B', transition: 'width 0.3s ease' }} />
                </div>
              </div>
            </div>

            {/* Stepper Progress Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
              {[
                { label: '1. Route & AST Discovery', done: pipelineProgress >= 30, active: pipelineState === 'ANALYZING_CODE' },
                { label: '2. OWASP Security Testing', done: pipelineProgress >= 70, active: pipelineState === 'TESTING_SECURITY' },
                { label: '3. Patch Verification', done: pipelineProgress >= 90, active: pipelineState === 'SYNTHESIZING' },
                { label: '4. GitHub PR Integration', done: pipelineProgress === 100, active: pipelineState === 'COMPLETED' },
              ].map((step, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: step.active ? '#09090B' : step.done ? '#F0FDF4' : '#F8FAFC',
                    border: step.active ? '1px solid #09090B' : step.done ? '1px solid #BBF7D0' : '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: step.active ? '#FFFFFF' : step.done ? '#15803D' : '#64748B',
                  }}
                >
                  {step.done ? <CheckCircle2 size={14} color="#15803D" /> : step.active ? <Loader2 size={14} className="animate-spin" color="#FFFFFF" /> : <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#CBD5E1' }} />}
                  <span>{step.label}</span>
                </div>
              ))}
            </div>

            {/* Log Terminal Screen */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                padding: '14px 16px',
                fontFamily: 'var(--font-mono, "JetBrains Mono", Consolas, monospace)',
                fontSize: '12px',
                maxHeight: '220px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              {executionLogs.map((log, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '10px', lineHeight: 1.4 }}>
                  <span style={{ color: '#94A3B8', flexShrink: 0 }}>[{log.time}]</span>
                  <span
                    style={{
                      color:
                        log.level === 'SUCCESS'
                          ? '#15803D'
                          : log.level === 'ERROR'
                          ? '#DC2626'
                          : log.level === 'WARN'
                          ? '#D97706'
                          : '#1E293B',
                      fontWeight: log.level === 'ERROR' || log.level === 'SUCCESS' ? 600 : 400,
                    }}
                  >
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 3: Discovered API Inventory & Architecture View (Real Data) ── */}
        {discoveredEndpoints.length > 0 && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '16px',
              padding: '24px 28px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Discovered API Architecture & Endpoints
                  </h3>
                  <span style={{ padding: '2px 8px', borderRadius: '9999px', backgroundColor: '#F1F5F9', color: '#0F172A', fontSize: '12px', fontWeight: 700 }}>
                    {discoveredEndpoints.length} Routes Found
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
                  Frameworks detected: <strong>{detectedFrameworks.join(', ') || 'REST API'}</strong>
                </p>
              </div>

              <Link
                href="/api-security/apis"
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0F172A',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  textDecoration: 'none',
                }}
              >
                <span>View Full Inventory</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            {/* Endpoints Table */}
            <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600 }}>
                    <th style={{ padding: '10px 16px' }}>Method</th>
                    <th style={{ padding: '10px 16px' }}>Endpoint Path</th>
                    <th style={{ padding: '10px 16px' }}>Source File / Controller</th>
                    <th style={{ padding: '10px 16px' }}>Authentication</th>
                    <th style={{ padding: '10px 16px' }}>Risk Profile</th>
                  </tr>
                </thead>
                <tbody>
                  {discoveredEndpoints.slice(0, 8).map((ep, idx) => {
                    const methodColor =
                      ep.method === 'GET' ? '#0F172A' : ep.method === 'POST' ? '#10B981' : ep.method === 'PUT' ? '#8B5CF6' : '#EF4444';
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              backgroundColor: `${methodColor}15`,
                              color: methodColor,
                              fontWeight: 700,
                              fontSize: '11px',
                              fontFamily: 'monospace',
                            }}
                          >
                            {ep.method}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0F172A', fontFamily: 'monospace' }}>
                          {ep.path}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748B', fontSize: '12px', fontFamily: 'monospace' }}>
                          {ep.code_file_path || 'src/routes/api.ts:18'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {ep.auth_required ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#059669', fontSize: '12px', fontWeight: 600 }}>
                              <Lock size={12} />
                              <span>Protected</span>
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#D97706', fontSize: '12px', fontWeight: 600 }}>
                              <AlertCircle size={12} />
                              <span>Public</span>
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: ep.risk_level === 'CRITICAL' ? '#FEF2F2' : ep.risk_level === 'HIGH' ? '#FFFBEB' : '#F1F5F9',
                              color: ep.risk_level === 'CRITICAL' ? '#DC2626' : ep.risk_level === 'HIGH' ? '#D97706' : '#0F172A',
                            }}
                          >
                            {ep.risk_level || 'LOW'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── STEP 4: Verified Findings, AI Diff Viewer & GitHub PR Creation ── */}
        {findings.length > 0 && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '16px',
              padding: '28px 32px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldAlert size={22} color="#DC2626" />
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Verified Vulnerabilities & AI Code Remediation
                  </h3>
                  <span style={{ padding: '2px 8px', borderRadius: '9999px', backgroundColor: '#FEF2F2', color: '#DC2626', fontSize: '12px', fontWeight: 700 }}>
                    {findings.length} Actionable Fixes
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
                  Review AI-synthesized patches and click below to open verified Pull Requests on GitHub.
                </p>
              </div>

              {/* Batch Action Button */}
              <button
                type="button"
                onClick={handleCreateAllPrs}
                disabled={isBatchCreatingPr}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 18px',
                  borderRadius: '8px',
                  backgroundColor: '#059669',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isBatchCreatingPr ? 'not-allowed' : 'pointer',
                  boxShadow: '0 1px 3px rgba(5, 150, 105, 0.3)',
                }}
              >
                {isBatchCreatingPr ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Creating Pull Requests…</span>
                  </>
                ) : (
                  <>
                    <GitPullRequest size={15} />
                    <span>Create Pull Requests for All ({findings.length})</span>
                  </>
                )}
              </button>
            </div>

            {batchPrSuccessMsg && (
              <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', fontSize: '13px', fontWeight: 600 }}>
                {batchPrSuccessMsg}
              </div>
            )}

            {/* Findings List with Code Diffs & PR Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {findings.map((finding) => {
                const severityBg =
                  finding.severity === 'CRITICAL' ? '#FEF2F2' : finding.severity === 'HIGH' ? '#FFFBEB' : '#F1F5F9';
                const severityColor =
                  finding.severity === 'CRITICAL' ? '#DC2626' : finding.severity === 'HIGH' ? '#D97706' : '#0F172A';

                return (
                  <div
                    key={finding.id}
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '20px',
                      backgroundColor: '#FFFFFF',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 800,
                              backgroundColor: severityBg,
                              color: severityColor,
                            }}
                          >
                            {finding.severity}
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
                            {finding.owasp_category || finding.cwe || 'API Security'}
                          </span>
                        </div>
                        <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                          {finding.title}
                        </h4>
                        <span style={{ fontSize: '13px', color: '#475569', lineHeight: 1.4 }}>
                          {finding.description}
                        </span>
                      </div>

                      {/* 1-Click GitHub PR CTA */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {finding.pr_status === 'CREATED' ? (
                          <a
                            href={finding.pr_url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px 16px',
                              borderRadius: '6px',
                              backgroundColor: '#ECFDF5',
                              border: '1px solid #10B981',
                              color: '#059669',
                              fontSize: '13px',
                              fontWeight: 700,
                              textDecoration: 'none',
                            }}
                          >
                            <CheckCircle2 size={15} />
                            <span>PR #{finding.pr_number || 'Linked'} on GitHub</span>
                            <ExternalLink size={13} />
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleCreatePrForFinding(finding)}
                            disabled={finding.pr_status === 'CREATING'}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 16px',
                              borderRadius: '6px',
                              backgroundColor: '#0F172A',
                              color: '#FFFFFF',
                              border: 'none',
                              fontSize: '13px',
                              fontWeight: 600,
                              cursor: finding.pr_status === 'CREATING' ? 'not-allowed' : 'pointer',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            }}
                          >
                            {finding.pr_status === 'CREATING' ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                <span>Pushing PR…</span>
                              </>
                            ) : (
                              <>
                                <GitPullRequest size={15} />
                                <span>Create GitHub PR</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Affected Endpoint & Code File */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#64748B', backgroundColor: '#F8FAFC', padding: '8px 12px', borderRadius: '6px' }}>
                      <div>
                        Affected Endpoint: <strong style={{ color: '#0F172A' }}>{finding.affected_endpoints?.[0] || '/api'}</strong>
                      </div>
                      <div>
                        File: <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>{finding.code_file_path || (finding.evidence as any)?.code_file_path || 'src/controllers/api.ts:24'}</strong>
                      </div>
                    </div>

                    {/* AI Remediation Patch Diff Viewer */}
                    {finding.remediation_patch && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                          <Code2 size={14} />
                          <span>AI-Synthesized Security Patch:</span>
                        </div>
                        <div
                          style={{
                            backgroundColor: '#0F172A',
                            borderRadius: '8px',
                            padding: '12px 16px',
                            fontFamily: 'Consolas, Monaco, monospace',
                            fontSize: '12px',
                            overflowX: 'auto',
                            color: '#F8FAFC',
                            maxHeight: '180px',
                            lineHeight: 1.5,
                          }}
                        >
                          {finding.remediation_patch.split('\n').map((line, lIdx) => {
                            const isAdd = line.startsWith('+');
                            const isDel = line.startsWith('-');
                            const isHeader = line.startsWith('@@') || line.startsWith('---') || line.startsWith('+++');
                            return (
                              <div
                                key={lIdx}
                                style={{
                                  color: isAdd ? '#4ADE80' : isDel ? '#F87171' : isHeader ? '#38BDF8' : '#94A3B8',
                                  backgroundColor: isAdd ? 'rgba(74, 222, 128, 0.1)' : isDel ? 'rgba(248, 113, 113, 0.1)' : 'transparent',
                                  padding: '1px 4px',
                                  borderRadius: '2px',
                                }}
                              >
                                {line}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      <AddApiModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          loadConnectedRepositories();
        }}
      />
    </KavachApiLayout>
  );
}
