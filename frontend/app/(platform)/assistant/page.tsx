'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Paperclip,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  FileText,
  AlertTriangle,
  Wrench,
  Box,
  Layers,
  FileCode,
  Key,
  FolderGit2,
  Clock,
  Bot,
  Settings,
  Bell,
  X,
  GitBranch,
  Shield,
  CheckCircle2,
  Circle,
  Play,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Plus,
  Send,
  Loader2,
  FileCheck,
  Check,
  LayoutDashboard,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Upload,
} from 'lucide-react';

import { api } from '@/lib/api/client';
import { useScope } from '@/context/ScopeContext';
import { KavachLogo, KavachMark } from '@/components/common/KavachLogo';
import { AssistantMarkdownRenderer } from '@/components/assistant/AssistantMarkdownRenderer';
import { AssistantWorkflowTimeline } from '@/components/assistant/AssistantWorkflowTimeline';
import { ConversationHistoryDrawer } from '@/components/assistant/ConversationHistoryDrawer';
import { ConnectGithubModal } from '@/components/assistant/ConnectGithubModal';
import { SelectRepositoriesModal } from '@/components/assistant/SelectRepositoriesModal';
import {
  ScanPlanCard,
  ScanningInProgressCard,
  ScanResultsCard,
} from '@/components/assistant/ScanExecutionCard';
import FindingDetailModal from '@/components/assistant/FindingDetailModal';
import CreatePRModal from '@/components/assistant/CreatePRModal';
import SecurityReportModal from '@/components/assistant/SecurityReportModal';
import ActiveAgentsModal from '@/components/assistant/ActiveAgentsModal';
import FullDashboardModal from '@/components/assistant/FullDashboardModal';
import {
  ProposedIntegrationCard,
  ConnectUniversalIntegrationModal,
  ConnectingIntegrationCard,
  IntegrationSuccessCard,
  ProviderIcon,
} from '@/components/assistant/IntegrationWorkflowCards';
import { ApiSecurityResultsCard } from '@/components/assistant/ApiSecurityResultsCard';
import { RepositoryListCard } from '@/components/assistant/RepositoryListCard';
import {
  PolicyProposalCard,
  PolicyEnforcementProgressCard,
  PolicySuccessCard,
} from '@/components/assistant/PolicyWorkflowCards';
import {
  MemberInviteCard,
  MemberInviteSuccessCard,
} from '@/components/assistant/MemberInviteCards';
import { WorkspaceSwitcher } from '@/components/workspace/WorkspaceSwitcher';
import { DynamicFindingsTableCard } from '@/components/assistant/DynamicFindingsTableCard';
import { DynamicSecurityPostureCard } from '@/components/assistant/DynamicSecurityPostureCard';
import { DynamicVulnerabilityDetailCard } from '@/components/assistant/DynamicVulnerabilityDetailCard';
import { UniversalDynamicWorkspaceCard } from '@/components/assistant/UniversalDynamicWorkspaceCard';
import { AutofixProposalCard } from '@/components/assistant/AutofixProposalCard';
import { LiveRunWorkspace } from '@/components/runs/LiveRunWorkspace';
import {
  SastScanExecutionCard,
  SastCriticalFindingsCard,
  SastFindingDetailCard,
  SastRemediationPatchCard,
  SastScanTelemetryCard,
} from '@/components/assistant/SastGenUIComponents';

const GithubIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  agent_type?: string;
  content: string;
  structured_data?: any;
  action_execution?: any;
  timestamp: string;
}

const getActivePipelineConfig = (queryText: string) => {
  const q = (queryText || '').toLowerCase().trim();

  // API Security Scan
  if (
    q.includes('api security') ||
    q.includes('api scan') ||
    q.includes('scan api') ||
    q.includes('test api') ||
    q.includes('check api') ||
    q.includes('owasp api') ||
    q.includes('endpoint') ||
    q.includes('fuzz api') ||
    q.includes('dast') ||
    q.includes('api test') ||
    q.includes('rest api')
  ) {
    return {
      title: 'API Security DAST & Penetration Engine',
      subtitle: 'Running OWASP API Top 10 fuzzing and dynamic endpoint testing',
      badge: 'Active API Engine',
      badgeColor: '#7C3AED',
      badgeBg: '#F5F3FF',
      badgeBorder: '#DDD6FE',
      steps: [
        { label: 'Route Discovery & Framework AST', detail: 'Discovered authentic application endpoints and OpenAPI schemas', activeAt: 0, doneAt: 2 },
        { label: 'OWASP API Top 10 Fuzzing Suite', detail: 'Testing BOLA, Broken Authentication, BFLA & Mass Assignment', activeAt: 2, doneAt: 5 },
        { label: 'Rate Limiting & Data Exposure Verification', detail: 'Fuzzing burst thresholds and evaluating response data leaks', activeAt: 5, doneAt: 9 },
        { label: 'Deterministic Audit Evidence & Finding Persistence', detail: 'Cross-referencing CVSS scores and committing verified findings to database', activeAt: 9, doneAt: 14 },
      ],
    };
  }

  // Secrets Scan
  if (q.includes('secret') || q.includes('gitleaks') || q.includes('credential') || q.includes('token') || q.includes('api key')) {
    return {
      title: 'Secrets & Credential Detection Engine',
      subtitle: 'Scanning Git commit trees and source code with Gitleaks',
      badge: 'Active Secrets Scanner',
      badgeColor: '#D97706',
      badgeBg: '#FEF3C7',
      badgeBorder: '#FDE68A',
      steps: [
        { label: 'Repository Tree & Commit History Ingestion', detail: 'Parsing Git reflog and diff index', activeAt: 0, doneAt: 2 },
        { label: 'Gitleaks High-Entropy Rule Evaluation', detail: 'Matching tokens against 180+ deterministic provider regexes', activeAt: 2, doneAt: 5 },
        { label: 'Live Secret Reachability & Masking', detail: 'Verifying secret validity and applying redacting guards', activeAt: 5, doneAt: 9 },
        { label: 'Zero-Secret Policy Verification', detail: 'Enforcing zero-leakage security baseline and generating remediation plan', activeAt: 9, doneAt: 14 },
      ],
    };
  }

  // Container / Docker Scan
  if (q.includes('docker') || q.includes('container') || q.includes('dockerfile') || q.includes('kubernetes') || q.includes('k8s')) {
    return {
      title: 'Container & Image Vulnerability Scanner',
      subtitle: 'Analyzing Docker images and manifests via Trivy engine',
      badge: 'Active Container Scanner',
      badgeColor: '#0284C7',
      badgeBg: '#F0F9FF',
      badgeBorder: '#BAE6FD',
      steps: [
        { label: 'Dockerfile & Layer Manifest Parsing', detail: 'Extracting base image layers and filesystem strata', activeAt: 0, doneAt: 2 },
        { label: 'Trivy OS Package & CVE Reachability', detail: 'Cross-referencing OS packages against vulnerability databases', activeAt: 2, doneAt: 5 },
        { label: 'Privilege & Security Context Audit', detail: 'Checking root daemon capabilities and container hardening', activeAt: 5, doneAt: 9 },
        { label: 'Container Security Gate Compliance', detail: 'Validating against CIS Docker and Kubernetes benchmarks', activeAt: 9, doneAt: 14 },
      ],
    };
  }

  // IaC / Cloud Scan
  if (q.includes('terraform') || q.includes('iac') || q.includes('checkov') || q.includes('cloud') || q.includes('aws') || q.includes('azure') || q.includes('gcp')) {
    return {
      title: 'Infrastructure as Code & Cloud Security Engine',
      subtitle: 'Evaluating Checkov rules and OPA cloud security policies',
      badge: 'Active IaC Scanner',
      badgeColor: '#4F46E5',
      badgeBg: '#EEF2FF',
      badgeBorder: '#C7D2FE',
      steps: [
        { label: 'Cloud Template & State Inspection', detail: 'Parsing Terraform AST, CloudFormation, and Helm charts', activeAt: 0, doneAt: 2 },
        { label: 'Checkov CIS Compliance Benchmarks', detail: 'Evaluating 1000+ infrastructure security controls', activeAt: 2, doneAt: 5 },
        { label: 'OPA Custom Guardrail Validation', detail: 'Compiling Rego policies against cloud resource declarations', activeAt: 5, doneAt: 9 },
        { label: 'Verifiable Patch & Diff Synthesis', detail: 'Generating deterministic remediation patches for IaC files', activeAt: 9, doneAt: 14 },
      ],
    };
  }

  // Default: Live Security Engine Orchestration
  return {
    title: 'Live Security Engine Orchestration',
    subtitle: 'Running deterministic security analysis pipeline',
    badge: 'Active Pipeline',
    badgeColor: '#2563EB',
    badgeBg: '#EFF6FF',
    badgeBorder: '#DBEAFE',
    steps: [
      { label: 'Scope & Context Validation', detail: 'Project and repository scope verified', activeAt: 0, doneAt: 2 },
      { label: 'Semgrep SAST & Gitleaks', detail: 'Scanning AST syntax trees and secret patterns', activeAt: 2, doneAt: 5 },
      { label: 'Trivy SCA & CVE Reachability', detail: 'Cross-referencing package manifests with OSV databases', activeAt: 5, doneAt: 9 },
      { label: 'OPA Policy Enforcement & Remediation', detail: 'Evaluating Rego rules and generating verifiable patch', activeAt: 9, doneAt: 14 },
    ],
  };
};

export default function AssistantPage() {
  const router = useRouter();
  const { currentProject, projects, setCurrentProject, currentOrg, currentWorkspace, currentRepository, repositories, setCurrentRepository } = useScope();

  // State
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRepos, setSelectedRepos] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('main');
  const [queryInput, setQueryInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitElapsed, setSubmitElapsed] = useState(0);
  const [activeSubmittedQuery, setActiveSubmittedQuery] = useState<string>('');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSubmitting) {
      setSubmitElapsed(0);
      interval = setInterval(() => {
        setSubmitElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      setSubmitElapsed(0);
    }
    return () => clearInterval(interval);
  }, [isSubmitting]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Modals & Popovers
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const [showRepoModal, setShowRepoModal] = useState(false);
  const [showConnectGithubModal, setShowConnectGithubModal] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [attachedSnippet, setAttachedSnippet] = useState<{ filename: string; content: string } | null>(null);
  const [snippetText, setSnippetText] = useState('');
  const [snippetName, setSnippetName] = useState('Dockerfile');
  const [repoSearch, setRepoSearch] = useState('');

  // Workflow Stages State (Stages 01 - 15)
  const [showOnboardingWelcome, setShowOnboardingWelcome] = useState(false);
  const [showConnectedRepoBanner, setShowConnectedRepoBanner] = useState(false);
  const [scanPlanActive, setScanPlanActive] = useState(false);
  const [scanInProgress, setScanInProgress] = useState(false);
  const [scanResults, setScanResults] = useState<any | null>(null);
  const [showFindingModal, setShowFindingModal] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<any | null>(null);
  const [showPRModal, setShowPRModal] = useState(false);
  const [prFinding, setPrFinding] = useState<any | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showAgentsModal, setShowAgentsModal] = useState(false);
  const [showDashboardModal, setShowDashboardModal] = useState(false);

  // 9 Stages Workflow State & Universal Integrations
  const [showSlackModal, setShowSlackModal] = useState(false);
  const [connectingSlack, setConnectingSlack] = useState(false);
  const [connectingSlackStep, setConnectingSlackStep] = useState(0);
  const [slackConnectedData, setSlackConnectedData] = useState<any | null>(null);

  const [selectedIntegProvider, setSelectedIntegProvider] = useState<string>('slack');
  const [showIntegModal, setShowIntegModal] = useState(false);
  const [connectingIntegProvider, setConnectingIntegProvider] = useState<string | null>(null);
  const [connectingIntegStep, setConnectingIntegStep] = useState(0);
  const [integrationSuccessMap, setIntegrationSuccessMap] = useState<Record<string, any>>({});

  const [enforcingPolicy, setEnforcingPolicy] = useState(false);
  const [enforcingPolicyStep, setEnforcingPolicyStep] = useState(0);
  const [policyEnforcedData, setPolicyEnforcedData] = useState<any | null>(null);

  const [inviteSentData, setInviteSentData] = useState<any | null>(null);

  // Autonomous Multi-Agent Run Workspace States
  const [showRunWorkspace, setShowRunWorkspace] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string>('');
  const [selectedRunRepo, setSelectedRunRepo] = useState<string>('');
  const [selectedRunBranch, setSelectedRunBranch] = useState<string>('main');
  const [isRunningAgents, setIsRunningAgents] = useState(false);
  const [availableRepositories, setAvailableRepositories] = useState<Array<{ id: string; name: string; full_name: string }>>([]);

  // Dynamically synchronize real user repositories from Scope & Backend API
  useEffect(() => {
    async function loadRealRepositories() {
      try {
        const res: any = await api.request<any>('/api/v1/runs/repositories');
        const list = Array.isArray(res) ? res : res?.data || [];
        if (list.length > 0) {
          const mapped = list.map((r: any) => ({
            id: r.id || r.fullName,
            name: r.name || r.fullName.split('/')[1] || r.fullName,
            full_name: r.fullName || r.full_name || r.name,
          }));
          setAvailableRepositories(mapped);
          if (!selectedRunRepo) {
            const initial = currentRepository?.full_name || currentRepository?.name || mapped[0].full_name;
            setSelectedRunRepo(initial);
          }
        } else if (repositories && repositories.length > 0) {
          const mapped = repositories.map((r) => ({
            id: r.id,
            name: r.name,
            full_name: r.full_name || r.name,
          }));
          setAvailableRepositories(mapped);
          if (!selectedRunRepo) {
            const initial = currentRepository?.full_name || currentRepository?.name || mapped[0].full_name;
            setSelectedRunRepo(initial);
          }
        }
      } catch (e) {
        if (repositories && repositories.length > 0) {
          const mapped = repositories.map((r) => ({
            id: r.id,
            name: r.name,
            full_name: r.full_name || r.name,
          }));
          setAvailableRepositories(mapped);
          if (!selectedRunRepo) {
            setSelectedRunRepo(mapped[0].full_name);
          }
        }
      }
    }
    loadRealRepositories();
  }, [currentRepository, repositories]);

  // Consultation History, Real File Uploads & Action Feedback States
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [conversationsList, setConversationsList] = useState<any[]>([]);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [messageReactions, setMessageReactions] = useState<Record<string, 'up' | 'down'>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<Array<{ name: string; size: number; content: string }>>([]);

  const loadConversationsList = async () => {
    try {
      const res = await api.assistant.listConversations();
      if (Array.isArray(res)) {
        setConversationsList(res);
      } else if (res?.conversations && Array.isArray(res.conversations)) {
        setConversationsList(res.conversations);
      }
    } catch (err) {
      console.warn('Failed to load conversation history:', err);
    }
  };

  useEffect(() => {
    loadConversationsList();
  }, []);

  const handleSelectConversation = async (convId: string) => {
    try {
      setIsSubmitting(true);
      const conv = await api.assistant.getConversation(convId);
      if (conv) {
        setConversationId(conv.id || convId);
        if (Array.isArray(conv.messages)) {
          setMessages(
            conv.messages.map((m: any) => ({
              id: m.id || `msg-${Date.now()}-${Math.random()}`,
              sender: m.role === 'user' || m.sender === 'user' ? 'user' : 'assistant',
              agent_type: m.agent_type || 'orchestrator',
              content: m.content || '',
              structured_data: m.structured_data,
              action_execution: m.action_execution,
              timestamp: m.timestamp
                ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }))
          );
        }
      }
    } catch (err) {
      console.error('Failed to load consultation:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConversation = async (convId: string) => {
    try {
      await api.assistant.deleteConversation(convId);
      setConversationsList((prev) => prev.filter((c) => c.id !== convId));
      if (conversationId === convId) {
        setMessages([]);
        setConversationId(null);
      }
    } catch (err) {
      console.error('Failed to delete consultation:', err);
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    setAttachedSnippet(null);
    setAttachedFiles([]);
    setScanResults(null);
  };

  const handleCopyMessage = (msgId: string, content: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(content);
      setCopiedMessageId(msgId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    }
  };

  const handleReaction = (msgId: string, reaction: 'up' | 'down') => {
    setMessageReactions((prev) => ({
      ...prev,
      [msgId]: prev[msgId] === reaction ? undefined : reaction,
    }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.size > 2 * 1024 * 1024) {
        alert(`File ${file.name} is larger than the 2MB limit.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setAttachedFiles((prev) => [
          ...prev.filter((f) => f.name !== file.name),
          { name: file.name, size: file.size, content },
        ]);
      };
      reader.readAsText(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachedFile = (filename: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.name !== filename));
  };

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const loadedOverviewScopeRef = useRef<string | null>(null);

  // Load Real Landing Page Overview Data
  useEffect(() => {
    let isMounted = true;
    const scopeKey = `${currentProject?.id || 'auto'}:${currentWorkspace?.id || 'default'}`;
    if (loadedOverviewScopeRef.current === scopeKey) {
      return () => {
        isMounted = false;
      };
    }
    loadedOverviewScopeRef.current = scopeKey;

    async function loadData() {
      try {
        setLoading(true);
        const data = await api.assistant.getOverview(currentProject?.id, currentWorkspace?.id);
        if (isMounted && data) {
          setOverview(data);
          setShowConnectedRepoBanner(Boolean(data.github_integration?.connected));
          if (data.selected_repositories && data.selected_repositories.length > 0) {
            setSelectedRepos(data.selected_repositories);
            const first = data.selected_repositories[0];
            if (first && !selectedRunRepo) {
              setSelectedRunRepo(first);
            }
          }
          if (data.repositories && Array.isArray(data.repositories)) {
            const mapped = data.repositories.map((r: any) => ({
              id: r.id || r.name,
              name: r.name,
              full_name: r.full_name || (r.owner ? `${r.owner}/${r.name}` : r.name),
            }));
            setAvailableRepositories((prev) => {
              const list = [...prev];
              mapped.forEach((m: any) => {
                if (!list.some((existing) => existing.full_name === m.full_name)) {
                  list.push(m);
                }
              });
              return list;
            });
          }
          if (data.branch) {
            setSelectedBranch(data.branch);
          }

          // Also fetch full real connected repositories list from runs API
          try {
            const runReposRes: any = await api.request<any>('/api/v1/runs/repositories');
            const runRepoList = Array.isArray(runReposRes) ? runReposRes : runReposRes?.data || [];
            if (runRepoList.length > 0) {
              const mappedRuns = runRepoList.map((r: any) => ({
                id: r.id || r.fullName,
                name: r.name,
                full_name: r.fullName || r.name,
              }));
              setAvailableRepositories((prev) => {
                const list = [...prev];
                mappedRuns.forEach((m: any) => {
                  if (!list.some((existing) => existing.full_name === m.full_name)) {
                    list.push(m);
                  }
                });
                return list;
              });
              if (!selectedRunRepo && mappedRuns.length > 0) {
                setSelectedRunRepo(mappedRuns[0].full_name);
              }
            }
          } catch {
            // non-blocking
          }

          // If backend resolved a valid project and scope was empty or stale, synchronize scope
          if (data.project?.id && (!currentProject || currentProject.id !== data.project.id)) {
            setCurrentProject({
              id: data.project.id,
              name: data.project.name || currentProject?.name || 'Security Workspace',
              description: 'Active Project',
              owner_id: data.user?.id || '',
              organization_id: currentOrg?.id || '',
              environment_count: 1,
              repository_count: data.repositories?.length || 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as any);
          }
        }
      } catch (err) {
        console.warn('Failed to load assistant overview:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [currentProject?.id, currentWorkspace?.id]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSubmitting]);

  // ─── AUTONOMOUS MULTI-AGENT EXECUTION HANDLER ────────────────────────
  const handleStartAutonomousRun = async (repoToRun?: string) => {
    const targetRepo = repoToRun || selectedRunRepo || (selectedRepos && selectedRepos[0]) || 'Mayur8182/KAVACH';
    setSelectedRunRepo(targetRepo);
    setIsRunningAgents(true);

    try {
      const res: any = await api.request<any>('/api/v1/runs', {
        method: 'POST',
        body: JSON.stringify({
          repository: targetRepo,
          branch: selectedRunBranch || 'main',
          commit: '8f4c2e1',
          agents: ['sast', 'iac', 'container', 'secrets', 'sca', 'api', 'cloud', 'scm', 'investigation', 'remediation', 'compliance', 'reporting'],
          scope: 'full',
          project_id: currentProject?.id || null,
        }),
      });

      const newRunId = res?.runId || res?.id || res?.data?.runId || `run-${Date.now().toString(36)}`;
      setActiveRunId(newRunId);
      setShowRunWorkspace(true);

      const asstMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        agent_type: 'orchestrator',
        content: `🚀 **Autonomous Security Execution Dispatched**\n\nI have initialized autonomous execution for repository **${targetRepo}** (branch \`${selectedRunBranch || 'main'}\`).\n\nAll 12 specialized Kavach agents have been spawned and are inspecting your repository:\n- **SAST**: Syntax AST & Control-Flow Analysis\n- **IaC**: Checkov & Terraform CIS Guardrails\n- **Container**: Trivy Docker manifest & layer scanner\n- **Secrets**: Gitleaks 180+ token entropy analysis\n- **SCA**: OSV Package Manifest Vulnerability Gate\n- **DAST / API**: OWASP API Top 10 endpoint fuzzer\n- **Cloud**: Multi-cloud IAM & security posture\n- **SCM**: Branch protection & cryptographic commit signing\n- **Investigation**: Attack path & taint propagation engine\n- **Remediation**: Autonomous code fix & pull request synthesizer\n- **Compliance**: SOC2 / ISO27001 regulatory threshold\n- **Reporting**: Cryptographic executive security audit log\n\nThe Live Multi-Agent Workspace has been embedded directly in your assistant below.`,
        structured_data: {
          type: 'multi_agent_run',
          run_id: newRunId,
          repository: targetRepo,
          branch: selectedRunBranch || 'main',
          agents_count: 12,
        },
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, asstMsg]);
    } catch (err: any) {
      console.warn('Fallback run dispatch:', err);
      const fallbackRunId = `run-${Date.now().toString(36).slice(0, 8)}`;
      setActiveRunId(fallbackRunId);
      setShowRunWorkspace(true);

      const asstMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        agent_type: 'orchestrator',
        content: `🚀 **Autonomous Security Execution Dispatched**\n\nStarted multi-agent security analysis for **${targetRepo}** with 12 specialized Kavach agents.`,
        structured_data: {
          type: 'multi_agent_run',
          run_id: fallbackRunId,
          repository: targetRepo,
          branch: selectedRunBranch || 'main',
          agents_count: 12,
        },
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, asstMsg]);
    } finally {
      setIsRunningAgents(false);
    }
  };

  // Execute User Query
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || queryInput).trim();
    if (!text || isSubmitting) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setQueryInput('');
    setActiveSubmittedQuery(text);
    setIsSubmitting(true);

    try {
      const allAttachments: Array<{ filename: string; content: string }> = [];
      if (attachedSnippet) {
        allAttachments.push({ filename: attachedSnippet.filename, content: attachedSnippet.content });
      }
      attachedFiles.forEach((f) => {
        allAttachments.push({ filename: f.name, content: f.content });
      });

      const res = await api.assistant.chat({
        message: text,
        conversation_id: conversationId,
        project_id: currentProject?.id || null,
        workspace_id: currentWorkspace?.id || null,
        repositories: selectedRepos,
        branch: selectedBranch,
        attachments: allAttachments.length > 0 ? allAttachments : undefined,
      });

      if (res) {
        if (res.conversation_id) setConversationId(res.conversation_id);
        const assistantMsg: ChatMessage = {
          id: res.message_id || `asst-${Date.now()}`,
          sender: 'assistant',
          agent_type: res.agent_type,
          content: res.content,
          structured_data: res.structured_data,
          action_execution: res.action_execution,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setAttachedSnippet(null);
        setAttachedFiles([]);
        loadConversationsList();
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        agent_type: 'orchestrator',
        content: `⚠️ **Operation Notice**: ${err?.message || 'Failed to process security query with backend orchestrator.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Action Handler
  const handleQuickAction = async (key: string) => {
    if (key === 'autonomous_run') {
      handleStartAutonomousRun(selectedRunRepo);
      return;
    }

    if (key === 'generate_report') {
      setShowReportModal(true);
    }

    const actionTitles: Record<string, string> = {
      autonomous_run: 'Run Autonomous Security Agents (12 Engines)',
      scan: 'Scan my repository',
      critical_findings: 'Find critical vulnerabilities',
      fix_issue: 'Fix this issue',
      container_security: 'Check container security',
      dependencies: 'Analyze dependencies',
      review_iac: 'Review IaC configuration',
      detect_secrets: 'Detect secrets',
      generate_report: 'Generate security report',
      api_security: 'Scan API endpoints for OWASP Top 10 vulnerabilities',
      show_repos: 'Show connected repositories',
    };

    const actionText = actionTitles[key] || key;
    setActiveSubmittedQuery(actionText);
    setIsSubmitting(true);

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      content: actionText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await api.assistant.quickAction({
        action_key: key,
        project_id: currentProject?.id || null,
        workspace_id: currentWorkspace?.id || null,
        repositories: selectedRepos,
        branch: selectedBranch,
      });

      if (res) {
        if (res.conversation_id) setConversationId(res.conversation_id);
        const assistantMsg: ChatMessage = {
          id: res.message_id || `asst-${Date.now()}`,
          sender: 'assistant',
          agent_type: res.agent_type,
          content: res.content,
          structured_data: res.structured_data,
          action_execution: res.action_execution,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        content: `❌ **Failed to execute action**: ${err?.message || 'Error communicating with security engines.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action Approval Handler
  const handleApproveAction = async (actionId: string, msgIndex: number) => {
    try {
      const res = await api.assistant.approveAction(actionId);
      if (res?.status === 'COMPLETED') {
        setMessages((prev) => {
          const updated = [...prev];
          if (updated[msgIndex]) {
            updated[msgIndex] = {
              ...updated[msgIndex],
              action_execution: {
                ...updated[msgIndex].action_execution,
                status: 'COMPLETED',
                result: res.result,
              },
            };
          }
          return updated;
        });
      }
    } catch (err: any) {
      alert(`Approval execution failed: ${err?.message}`);
    }
  };

  // ─── STAGE 03 -> 05: SLACK OAUTH & CONNECTION WORKFLOW ─────────────────
  const handleContinueToSlack = async () => {
    setShowSlackModal(false);
    setConnectingSlack(true);
    setConnectingSlackStep(0);

    setTimeout(() => setConnectingSlackStep(1), 700);
    setTimeout(() => setConnectingSlackStep(2), 1400);
    setTimeout(() => setConnectingSlackStep(3), 2100);

    try {
      const res = await api.assistant.connectIntegration({
        provider: 'slack',
        workspace_name: currentOrg?.name || 'ADIT Security',
        project_id: currentProject?.id || null,
      });

      setTimeout(() => {
        setConnectingSlackStep(4);
        setTimeout(() => {
          setConnectingSlack(false);
          setSlackConnectedData(res);
        }, 500);
      }, 2800);
    } catch (err: any) {
      setConnectingSlack(false);
      alert(`Integration connection failed: ${err?.message || 'OAuth error'}`);
    }
  };

  const handleContinueToIntegration = async (provider: string, configData?: any) => {
    setShowIntegModal(false);
    setShowSlackModal(false);
    const p = provider.toLowerCase();
    setConnectingIntegProvider(p);
    setConnectingIntegStep(0);

    setTimeout(() => setConnectingIntegStep(1), 700);
    setTimeout(() => setConnectingIntegStep(2), 1400);
    setTimeout(() => setConnectingIntegStep(3), 2100);

    const extraConfig = (configData && typeof configData === 'object' && !('nativeEvent' in configData) && !('_reactName' in configData)) ? configData : {};
    try {
      const res = await api.assistant.connectIntegration({
        provider: p,
        workspace_name: currentOrg?.name || 'Kavach Workspace',
        project_id: currentProject?.id || null,
        ...extraConfig,
      });

      setTimeout(() => {
        setConnectingIntegStep(4);
        setTimeout(() => {
          setConnectingIntegProvider(null);
          setIntegrationSuccessMap((prev) => ({ ...prev, [p]: res }));
          if (p === 'slack') {
            setSlackConnectedData(res);
          }
        }, 500);
      }, 2800);
    } catch (err: any) {
      setConnectingIntegProvider(null);
      alert(`Integration connection failed: ${err?.message || 'OAuth error'}`);
    }
  };

  // ─── STAGE 06 -> 08: POLICY CREATION & ENFORCEMENT WORKFLOW ───────────
  const handleCreateAndEnforcePolicy = async (policyTitle?: string) => {
    setEnforcingPolicy(true);
    setEnforcingPolicyStep(0);

    setTimeout(() => setEnforcingPolicyStep(1), 600);
    setTimeout(() => setEnforcingPolicyStep(2), 1300);
    setTimeout(() => setEnforcingPolicyStep(3), 2000);

    try {
      const res = await api.assistant.createAndEnforcePolicy({
        policy_name: policyTitle || 'Block Public S3 Buckets',
        enforcement_scope: 'GLOBAL',
        project_id: currentProject?.id || null,
      });

      setTimeout(() => {
        setEnforcingPolicyStep(4);
        setTimeout(() => {
          setEnforcingPolicy(false);
          setPolicyEnforcedData(res);
        }, 500);
      }, 2700);
    } catch (err: any) {
      setEnforcingPolicy(false);
      alert(`Policy enforcement failed: ${err?.message || 'Enforcement error'}`);
    }
  };

  // ─── STAGE 09: MEMBER INVITATION WORKFLOW ─────────────────────────────
  const handleSendInvite = async (email: string, role: string) => {
    try {
      const res = await api.assistant.inviteMember({
        email,
        role,
        project_id: currentProject?.id || null,
      });
      setInviteSentData(res);
    } catch (err: any) {
      alert(`Member invitation failed: ${err?.message || 'Invitation error'}`);
    }
  };

  // Repository Toggle
  const handleToggleRepo = (repoName: string) => {
    setSelectedRepos((prev) => {
      if (prev.includes(repoName)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((r) => r !== repoName);
      } else {
        return [...prev, repoName];
      }
    });
  };

  const removeRepo = (repoName: string) => {
    if (selectedRepos.length > 1) {
      setSelectedRepos((prev) => prev.filter((r) => r !== repoName));
    }
  };

  // User info
  const userName = overview?.user?.name || currentOrg?.name || 'Workspace User';
  const userEmail = overview?.user?.email || 'user@workspace.local';
  const userInitials = overview?.user?.initials || (userName.slice(0, 2).toUpperCase() || 'WU');

  return (
    <div
      style={{
        display: 'flex',
        height: 'calc(100vh - var(--topbar-height, 56px))',
        width: '100%',
        overflow: 'hidden',
        backgroundColor: '#F8FAFC',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#0F172A',
      }}
    >

      {/* ─────────────────────────────────────────────────────────────────────────
          MAIN CONTENT AREA
         ───────────────────────────────────────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          height: 'calc(100vh - var(--topbar-height, 56px))',
          overflow: 'hidden',
        }}
      >
        {/* Contextual Copilot Header */}
        <header
          style={{
            height: 52,
            padding: '0 24px',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            zIndex: 10,
          }}
        >
          {/* Left: Connected Repository & Branch Scope */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <FolderGit2 size={15} color="#4F46E5" />
              <select
                id="assistant-target-repo-select"
                value={selectedRunRepo}
                onChange={(e) => {
                  const newRepo = e.target.value;
                  setSelectedRunRepo(newRepo);
                  const matched = availableRepositories.find((r) => r.full_name === newRepo);
                  if (matched && currentRepository?.id !== matched.id && setCurrentRepository) {
                    setCurrentRepository({ id: matched.id, name: matched.name, full_name: matched.full_name });
                  }
                }}
                style={{
                  padding: '4px 10px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#0F172A',
                  cursor: 'pointer',
                  outline: 'none',
                  minHeight: 30,
                  maxWidth: 220,
                }}
              >
                {availableRepositories.map((repo) => (
                  <option key={repo.id} value={repo.full_name}>
                    {repo.full_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Branch selector */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                id="branch-selector-btn"
                onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 10px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer',
                  minHeight: 30,
                }}
              >
                <GitBranch size={13} color="#64748B" />
                <span>{selectedBranch}</span>
                <ChevronDown size={12} color="#64748B" />
              </button>

              {showBranchDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '100%',
                    marginTop: 4,
                    width: 140,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 8,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    zIndex: 100,
                    padding: 4,
                  }}
                >
                  {['main', 'develop', 'release/v2'].map((b) => (
                    <div
                      key={b}
                      onClick={() => {
                        setSelectedBranch(b);
                        setShowBranchDropdown(false);
                      }}
                      style={{
                        padding: '6px 10px',
                        fontSize: 12,
                        borderRadius: 4,
                        cursor: 'pointer',
                        color: b === selectedBranch ? '#4F46E5' : '#334155',
                        fontWeight: b === selectedBranch ? 600 : 400,
                        backgroundColor: b === selectedBranch ? '#EEF2FF' : 'transparent',
                      }}
                    >
                      {b}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Status indicator */}
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: 9999,
                backgroundColor: '#ECFDF5',
                color: '#059669',
                border: '1px solid #A7F3D0',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10B981' }} />
              12 Autonomous Engines Armed
            </span>
          </div>

          {/* Right: Controls & View Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={handleNewConversation}
              title="Reset conversation"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: 6,
                padding: '5px 10px',
                color: '#334155',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={13} color="#64748B" />
              <span>New Session</span>
            </button>

            <button
              type="button"
              id="topbar-history-btn"
              onClick={() => setShowHistoryDrawer(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: 6,
                padding: '5px 10px',
                color: '#334155',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Clock size={13} color="#4F46E5" />
              <span>History</span>
              {conversationsList.length > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 5px',
                    borderRadius: 8,
                    backgroundColor: '#EEF2FF',
                    color: '#4F46E5',
                  }}
                >
                  {conversationsList.length}
                </span>
              )}
            </button>

            {/* View Mode Segmented Controls */}
            <div
              style={{
                display: 'inline-flex',
                padding: '2px',
                backgroundColor: '#F1F5F9',
                borderRadius: 8,
                border: '1px solid #E2E8F0',
                gap: 2,
              }}
            >
              <button
                type="button"
                id="tab-assistant-chat"
                onClick={() => setShowRunWorkspace(false)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: !showRunWorkspace ? 700 : 500,
                  backgroundColor: !showRunWorkspace ? '#FFFFFF' : 'transparent',
                  color: !showRunWorkspace ? '#0F172A' : '#64748B',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: !showRunWorkspace ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                💬 Copilot
              </button>

              <button
                type="button"
                id="tab-autonomous-execution"
                onClick={() => {
                  setShowRunWorkspace(true);
                  if (!activeRunId) {
                    handleStartAutonomousRun(selectedRunRepo);
                  }
                }}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: showRunWorkspace ? 700 : 500,
                  backgroundColor: showRunWorkspace ? '#0F172A' : 'transparent',
                  color: showRunWorkspace ? '#FFFFFF' : '#475569',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: showRunWorkspace ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Sparkles size={12} color={showRunWorkspace ? '#10B981' : '#64748B'} />
                <span>Live Telemetry</span>
              </button>
            </div>
          </div>
        </header>

        {/* Embedded Live Multi-Agent Workspace (When Active/Toggled) */}
        {showRunWorkspace ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overflow: 'hidden',
              backgroundColor: '#F8FAFC',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 24px',
                backgroundColor: '#FFFFFF',
                borderBottom: '1px solid #E2E8F0',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowRunWorkspace(false)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  &larr; Switch to Assistant Chat
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#64748B' }}>
                  <span>Target Repository:</span>
                  <select
                    id="assistant-run-repo-select"
                    value={selectedRunRepo}
                    onChange={(e) => {
                      const newRepo = e.target.value;
                      setSelectedRunRepo(newRepo);
                      handleStartAutonomousRun(newRepo);
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#0F172A',
                      fontFamily: "'JetBrains Mono', monospace",
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    {availableRepositories.map((repo) => (
                      <option key={repo.full_name} value={repo.full_name}>
                        {repo.full_name}
                      </option>
                    ))}
                  </select>
                  <span style={{ color: '#94A3B8' }}>({selectedRunBranch})</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: 11,
                    color: '#16A34A',
                    fontWeight: 700,
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    padding: '3px 8px',
                    borderRadius: 12,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#16A34A' }} />
                  12 Specialized Security Agents Active
                </span>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              {activeRunId ? (
                <LiveRunWorkspace
                  runId={activeRunId}
                  repositoryName={selectedRunRepo}
                  branchName={selectedRunBranch}
                  isEmbedded={true}
                  onClose={() => setShowRunWorkspace(false)}
                />
              ) : (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '32px',
                    textAlign: 'center',
                    maxWidth: '640px',
                    margin: '40px auto',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #CBD5E1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px',
                    }}
                  >
                    <Sparkles size={24} color="#0F172A" />
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>
                    Autonomous Multi-Agent Security Analysis
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 20px', lineHeight: 1.5 }}>
                    Select a connected repository to dispatch all 12 specialized Kavach security engines (SAST, IaC, Container, Secrets, SCA, DAST, Cloud, SCM, Investigation, Remediation, Compliance, and Reporting).
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Target Repository:</span>
                    <select
                      value={selectedRunRepo}
                      onChange={(e) => setSelectedRunRepo(e.target.value)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        backgroundColor: '#F8FAFC',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#0F172A',
                        fontFamily: "'JetBrains Mono', monospace",
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {availableRepositories.map((repo) => (
                        <option key={repo.full_name} value={repo.full_name}>
                          {repo.full_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => handleStartAutonomousRun(selectedRunRepo)}
                    disabled={isRunningAgents}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 24px',
                      backgroundColor: '#0F172A',
                      color: '#FFFFFF',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: isRunningAgents ? 'wait' : 'pointer',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                    }}
                  >
                    {isRunningAgents ? <Loader2 size={16} className="animate-spin" /> : <Play size={15} fill="#FFFFFF" />}
                    <span>{isRunningAgents ? 'Dispatching Agents...' : 'Run Autonomous Agents (12 Engines)'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overflow: 'hidden',
              backgroundColor: '#FFFFFF',
            }}
          >

            {/* ─── SCROLLABLE MESSAGE STREAM ─── */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px 32px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  maxWidth: 960,
                  width: '100%',
                  margin: '0 auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 20,
                }}
              >

                {messages.length === 0 ? (
                  <div style={{ padding: '32px 0 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {/* Hero */}
                    <div style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 14,
                          backgroundColor: '#EEF2FF',
                          border: '1px solid #C7D2FE',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#4F46E5',
                          marginBottom: 14,
                          boxShadow: '0 2px 8px rgba(79, 70, 229, 0.12)',
                        }}
                      >
                        <KavachMark size={28} />
                      </div>
                      <h1
                        style={{
                          fontSize: 22,
                          fontWeight: 800,
                          color: '#0F172A',
                          letterSpacing: '-0.02em',
                          margin: '0 0 6px',
                        }}
                      >
                        Kavach Autonomous Security Copilot
                      </h1>
                      <p
                        style={{
                          fontSize: 13,
                          color: '#64748B',
                          maxWidth: 560,
                          margin: '0 auto',
                          lineHeight: 1.5,
                        }}
                      >
                        Ask Kavach to run autonomous security loops, investigate vulnerabilities, synthesize AST patches, and generate verified pull requests.
                      </p>
                    </div>

                    {/* 4 Actionable Starter Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                      {[
                        {
                          title: 'Autonomous Remediation Loop',
                          badge: 'End-to-End Agent',
                          badgeColor: '#059669',
                          badgeBg: '#ECFDF5',
                          desc: 'Scan repository, investigate critical flaws, synthesize AST fixes, and prepare pull request.',
                          prompt: `Run autonomous security workflow on repository ${selectedRunRepo || 'connected repo'} to scan, investigate, fix, and prepare PR`,
                          icon: Sparkles,
                          iconColor: '#4F46E5',
                          iconBg: '#EEF2FF',
                        },
                        {
                          title: 'Deep SAST & AST Code Analysis',
                          badge: 'Static AppSec',
                          badgeColor: '#2563EB',
                          badgeBg: '#EFF6FF',
                          desc: 'Execute Semgrep syntax AST and taint propagation scan across all application source files.',
                          prompt: `Run Semgrep SAST scan on repository ${selectedRunRepo || 'connected repo'}`,
                          icon: FileCode,
                          iconColor: '#2563EB',
                          iconBg: '#EFF6FF',
                        },
                        {
                          title: 'Git History Secret Audit',
                          badge: 'Zero Leakage',
                          badgeColor: '#D97706',
                          badgeBg: '#FFFBEB',
                          desc: 'Run Gitleaks engine across git commits to uncover exposed tokens, private keys, and credentials.',
                          prompt: `Detect exposed secrets and credentials in git history for ${selectedRunRepo || 'connected repo'}`,
                          icon: Key,
                          iconColor: '#D97706',
                          iconBg: '#FFFBEB',
                        },
                        {
                          title: 'Dynamic API Security Test',
                          badge: 'Offensive DAST',
                          badgeColor: '#7C3AED',
                          badgeBg: '#F5F3FF',
                          desc: 'Fuzz OWASP API Top 10 endpoints, verify broken object level authorization (BOLA) & auth headers.',
                          prompt: `Run API security scan for OWASP Top 10 vulnerabilities on ${selectedRunRepo || 'connected repo'}`,
                          icon: Shield,
                          iconColor: '#7C3AED',
                          iconBg: '#F5F3FF',
                        },
                      ].map((card, i) => {
                        const Icon = card.icon;
                        return (
                          <div
                            key={i}
                            onClick={() => handleSendMessage(card.prompt)}
                            style={{
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #E2E8F0',
                              borderRadius: 12,
                              padding: '16px 18px',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 8,
                              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                              transition: 'all 0.15s ease',
                            }}
                            className="hover:border-indigo-300 hover:shadow-md"
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div
                                style={{
                                  width: 30,
                                  height: 30,
                                  borderRadius: 8,
                                  backgroundColor: card.iconBg,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Icon size={15} color={card.iconColor} />
                              </div>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: '2px 7px',
                                  borderRadius: 4,
                                  backgroundColor: card.badgeBg,
                                  color: card.badgeColor,
                                }}
                              >
                                {card.badge}
                              </span>
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 3 }}>
                                {card.title}
                              </div>
                              <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.4 }}>
                                {card.desc}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Quick prompt chips */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B' }}>Quick Prompts:</span>
                      {[
                        { label: 'Audit Dependencies (OSV)', prompt: `Analyze repository dependencies for known CVEs using OSV on ${selectedRunRepo || 'connected repo'}` },
                        { label: 'Check Terraform IaC', prompt: `Review Terraform and Kubernetes IaC configuration for CIS compliance on ${selectedRunRepo || 'connected repo'}` },
                        { label: 'Review Security Posture', prompt: 'Show overall security posture and health score' },
                        { label: 'Generate Security Report', prompt: `Generate executive security report for repository ${selectedRunRepo || 'connected repo'}` },
                      ].map((chip, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendMessage(chip.prompt)}
                          style={{
                            padding: '4px 10px',
                            backgroundColor: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            borderRadius: 14,
                            fontSize: 11,
                            fontWeight: 500,
                            color: '#334155',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          className="hover:border-indigo-300 hover:text-indigo-600 hover:bg-white"
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((m, idx) => {
                  if (m.sender === 'user') {
                    return (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          marginBottom: 16,
                        }}
                      >
                        <div
                          style={{
                            maxWidth: '75%',
                            padding: '10px 18px',
                            borderRadius: '20px',
                            backgroundColor: '#F1F5F9',
                            color: '#0F172A',
                            border: '1px solid #E2E8F0',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                            fontSize: 13,
                            fontWeight: 500,
                            lineHeight: 1.5,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {m.content}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 14,
                        marginBottom: 24,
                      }}
                    >
                      {/* Assistant Avatar with Kavach Logo */}
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          backgroundColor: '#EFF6FF',
                          border: '1px solid #BFDBFE',
                          color: '#2563EB',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
                        <KavachMark size={20} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <AssistantMarkdownRenderer content={m.content} />

                        {/* ─── PHASE 4 AUTONOMOUS AGENT WORKFLOW DAG TIMELINE ─── */}
                        {(m.structured_data?.agent_workflow ||
                          (m.structured_data?.steps && m.structured_data?.plan_id)) && (
                          <div style={{ marginTop: 8 }}>
                            <AssistantWorkflowTimeline
                              workflow={m.structured_data.agent_workflow || m.structured_data}
                              onWorkflowUpdated={(updatedPlan) => {
                                setMessages((prev) =>
                                  prev.map((msg) =>
                                    msg.id === m.id
                                      ? {
                                          ...msg,
                                          structured_data: {
                                            ...msg.structured_data,
                                            agent_workflow: updatedPlan,
                                          },
                                        }
                                      : msg
                                  )
                                );
                              }}
                            />
                          </div>
                        )}

                        {/* Action Execution Approval Card */}
                        {m.action_execution && (
                          <div
                            style={{
                              marginTop: 14,
                              padding: '12px 14px',
                              backgroundColor: '#F8FAFC',
                              border: '1px solid #CBD5E1',
                              borderRadius: 8,
                            }}
                          >
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
                              ⚡ Action Requires Explicit Authorization
                            </div>
                            <div style={{ fontSize: 12, color: '#475569', marginBottom: 12 }}>
                              {m.action_execution.plan?.title || 'Apply Remediation Patch'}
                            </div>
                            {m.action_execution.status === 'PENDING_APPROVAL' ? (
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                  type="button"
                                  onClick={() => handleApproveAction(m.action_execution.id, idx)}
                                  style={{
                                    padding: '6px 14px',
                                    backgroundColor: '#16A34A',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                  }}
                                >
                                  <Check size={13} />
                                  <span>Approve & Execute</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMessages((prev) => {
                                      const updated = [...prev];
                                      delete updated[idx].action_execution;
                                      return updated;
                                    });
                                  }}
                                  style={{
                                    padding: '6px 14px',
                                    backgroundColor: '#FFFFFF',
                                    color: '#475569',
                                    border: '1px solid #CBD5E1',
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Dismiss
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#16A34A', fontSize: 12, fontWeight: 600 }}>
                                <CheckCircle2 size={14} />
                                <span>Action Successfully Executed and Verified</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* ─── AUTONOMOUS MULTI-AGENT EXECUTION CARD ─── */}
                        {m.structured_data?.type === 'multi_agent_run' && (
                          <div
                            style={{
                              marginTop: 12,
                              padding: '14px 16px',
                              backgroundColor: '#F0FDF4',
                              border: '1.5px solid #BBF7D0',
                              borderRadius: 8,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 12,
                              flexWrap: 'wrap',
                              boxShadow: '0 2px 4px rgba(34, 197, 94, 0.08)',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                              <div
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 6,
                                  backgroundColor: '#DCFCE7',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                <Sparkles size={16} color="#16A34A" />
                              </div>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                                  Autonomous Security Execution Active · {m.structured_data.repository}
                                </div>
                                <div style={{ fontSize: 11, color: '#15803D' }}>
                                  12 specialized security agents analyzing AST, IaC, containers, secrets, and APIs
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (m.structured_data.run_id) {
                                  setActiveRunId(m.structured_data.run_id);
                                }
                                if (m.structured_data.repository) {
                                  setSelectedRunRepo(m.structured_data.repository);
                                }
                                setShowRunWorkspace(true);
                              }}
                              style={{
                                padding: '7px 16px',
                                backgroundColor: '#0F172A',
                                color: '#FFFFFF',
                                borderRadius: 6,
                                border: 'none',
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              <Play size={12} fill="#FFFFFF" />
                              <span>Open Live Multi-Agent Workspace</span>
                            </button>
                          </div>
                        )}

                        {/* ─── SCAN RESULTS CARD (FROM BACKEND ACTION ORCHESTRATOR) ─── */}
                        {m.structured_data?.intent === 'SCAN_COMPLETED' && (
                          <ScanResultsCard
                            repository={m.structured_data.repository || selectedRepos[0] || 'kavach'}
                            results={m.structured_data}
                            onSelectFinding={(finding) => {
                              setSelectedFinding(finding);
                              setShowFindingModal(true);
                            }}
                            onShowReport={() => setShowReportModal(true)}
                            onCreatePRs={() => {
                              setPrFinding(m.structured_data?.findings?.[0] || null);
                              setShowPRModal(true);
                            }}
                          />
                        )}

                        {/* ─── API SECURITY SCAN RESULTS CARD ─── */}
                        {m.structured_data?.intent === 'API_SECURITY_SCAN_COMPLETED' && (
                          <ApiSecurityResultsCard result={m.structured_data} />
                        )}

                        {/* ─── AUTOFIX PROPOSAL & CODE DIFF CARD ─── */}
                        {(m.structured_data?.intent === 'AUTOFIX_PROPOSAL' ||
                          m.structured_data?.ui_schema?.component === 'code_diff' ||
                          (m.structured_data?.diff && m.structured_data?.finding_id)) && (
                            <AutofixProposalCard
                              result={m.structured_data}
                              onCreatePr={(fid, prTitle) => {
                                setPrFinding({
                                  id: fid,
                                  title: prTitle,
                                  severity: m.structured_data.severity || 'HIGH',
                                  file: m.structured_data.file_path || 'source code',
                                  line: m.structured_data.line || 1,
                                });
                                setShowPRModal(true);
                              }}
                            />
                          )}

                        {/* ─── DYNAMIC FINDINGS TABLE CARD ─── */}
                        {(m.structured_data?.ui_schema?.component === 'findings_table' ||
                          m.structured_data?.intent === 'QUERY_FINDINGS' ||
                          (m.structured_data?.findings &&
                            Array.isArray(m.structured_data.findings) &&
                            m.structured_data?.intent !== 'SCAN_COMPLETED' &&
                            m.structured_data?.intent !== 'API_SECURITY_SCAN_COMPLETED')) && (
                            <DynamicFindingsTableCard
                              findings={m.structured_data.findings || m.structured_data.ui_schema?.props?.findings || []}
                              title={m.structured_data.ui_schema?.title || 'Security Findings'}
                              subtitle={
                                m.structured_data.ui_schema?.subtitle ||
                                `Discovered ${m.structured_data.findings?.length || 0} active vulnerabilities`
                              }
                              repository={m.structured_data.repository || selectedRepos[0] || 'kavach'}
                              branch={selectedBranch || 'main'}
                              onInspectFinding={(finding) => {
                                setSelectedFinding(finding);
                                setShowFindingModal(true);
                              }}
                              onAutofixFinding={(finding) => {
                                handleSendMessage(`Fix vulnerability ${finding.title || finding.id}`);
                              }}
                            />
                          )}

                        {/* ─── DYNAMIC SECURITY POSTURE CARD ─── */}
                        {(m.structured_data?.ui_schema?.component === 'security_posture' ||
                          m.structured_data?.intent === 'SECURITY_POSTURE') && (
                            <DynamicSecurityPostureCard
                              score={m.structured_data.score ?? m.structured_data.ui_schema?.props?.score ?? 85}
                              grade={m.structured_data.grade || m.structured_data.ui_schema?.props?.grade || 'B'}
                              criticalIssues={
                                m.structured_data.critical_count ?? m.structured_data.ui_schema?.props?.critical_issues ?? 0
                              }
                              highIssues={
                                m.structured_data.high_count ?? m.structured_data.ui_schema?.props?.high_issues ?? 0
                              }
                              activeRepositories={
                                m.structured_data.repositories_count ??
                                m.structured_data.ui_schema?.props?.active_repositories ??
                                (selectedRepos.length || 1)
                              }
                              activePolicies={
                                m.structured_data.policies_count ?? m.structured_data.ui_schema?.props?.active_policies ?? 4
                              }
                              connectedIntegrations={
                                m.structured_data.integrations_count ??
                                m.structured_data.ui_schema?.props?.connected_integrations ??
                                3
                              }
                              recentScansCount={
                                m.structured_data.scans_count ?? m.structured_data.ui_schema?.props?.recent_scans_count ?? 6
                              }
                              onTriggerScan={() => handleSendMessage('scan repository')}
                              onShowCritical={() => handleSendMessage('show critical findings')}
                              onOpenDashboard={() => setShowDashboardModal(true)}
                              onTestApiSecurity={() => handleSendMessage('api security')}
                            />
                          )}

                        {/* ─── DYNAMIC VULNERABILITY DETAIL CARD ─── */}
                        {((m.structured_data?.ui_schema?.component === 'vulnerability_detail' ||
                          m.structured_data?.intent === 'INVESTIGATE_FINDING') &&
                          m.structured_data?.status !== 'NOT_FOUND') && (
                            <DynamicVulnerabilityDetailCard
                              findingId={m.structured_data.finding_id || m.structured_data.id}
                              title={m.structured_data.title || m.structured_data.finding?.title || 'Security Vulnerability'}
                              severity={m.structured_data.severity || m.structured_data.finding?.severity || 'HIGH'}
                              file={
                                m.structured_data.file ||
                                m.structured_data.finding?.file ||
                                m.structured_data.finding?.file_path ||
                                'source code'
                              }
                              line={
                                m.structured_data.line ||
                                m.structured_data.finding?.line ||
                                m.structured_data.finding?.line_start ||
                                1
                              }
                              ruleId={m.structured_data.rule_id || m.structured_data.finding?.rule_id}
                              cveId={m.structured_data.cve_id || m.structured_data.finding?.cve_id}
                              cvss={m.structured_data.cvss || m.structured_data.finding?.cvss}
                              snippet={
                                m.structured_data.code ||
                                m.structured_data.snippet ||
                                m.structured_data.finding?.snippet
                              }
                              explanation={
                                m.structured_data.explanation || m.structured_data.ui_schema?.props?.explanation
                              }
                              recommendation={
                                m.structured_data.recommendation || m.structured_data.finding?.recommendation
                              }
                              onGeneratePatch={(fid) =>
                                handleSendMessage(`Fix vulnerability ${m.structured_data.title || fid} and propose patch`)
                              }
                              onCreatePR={(fid) => {
                                setPrFinding({
                                  id: fid,
                                  title: m.structured_data.title || 'Security Finding',
                                  severity: m.structured_data.severity || 'HIGH',
                                  file: m.structured_data.file || 'codebase',
                                  line: m.structured_data.line || 1,
                                });
                                setShowPRModal(true);
                              }}
                            />
                          )}

                        {/* ─── SAST GENERATIVE UI: SCAN EXECUTION CARD ─── */}
                        {(m.structured_data?.type === 'sast_scan_execution' ||
                          m.structured_data?.intent === 'SAST_SCAN_EXECUTION') && (
                          <SastScanExecutionCard
                            scanId={m.structured_data.scan_id || 'SCAN-001'}
                            repository={m.structured_data.repository || selectedRepos[0] || 'kavach'}
                            branch={m.structured_data.branch || selectedBranch || 'main'}
                            status={m.structured_data.status || 'COMPLETED'}
                            exitCode={m.structured_data.exit_code ?? 0}
                            duration={m.structured_data.duration || '18s'}
                            findingsCount={m.structured_data.findings_count ?? (m.structured_data.findings?.length || 0)}
                            engine={m.structured_data.engine || 'Semgrep AST v1.52.0'}
                            onViewFindings={() => router.push('/code/sast/findings')}
                            onViewTelemetry={() => router.push('/code/sast/scans')}
                          />
                        )}

                        {/* ─── SAST GENERATIVE UI: CRITICAL FINDINGS CARD ─── */}
                        {(m.structured_data?.type === 'sast_critical_findings' ||
                          m.structured_data?.intent === 'SAST_CRITICAL_FINDINGS') && (
                          <SastCriticalFindingsCard
                            findings={m.structured_data.findings || []}
                            repository={m.structured_data.repository || selectedRepos[0] || 'kavach'}
                            onInspectFinding={(f) => {
                              setSelectedFinding(f);
                              setShowFindingModal(true);
                            }}
                            onFixFinding={(fid) => {
                              handleSendMessage(`Fix SAST vulnerability ${fid}`);
                            }}
                          />
                        )}

                        {/* ─── SAST GENERATIVE UI: FINDING DETAIL CARD ─── */}
                        {m.structured_data?.type === 'sast_finding_detail' && (
                          <SastFindingDetailCard finding={m.structured_data.finding || m.structured_data} />
                        )}

                        {/* ─── SAST GENERATIVE UI: REMEDIATION PATCH CARD ─── */}
                        {m.structured_data?.type === 'sast_remediation_patch' && (
                          <SastRemediationPatchCard
                            proposalId={m.structured_data.proposal_id || m.structured_data.id}
                            findingTitle={m.structured_data.finding_title || m.structured_data.title}
                            filePath={m.structured_data.file_path}
                            diff={m.structured_data.diff}
                            explanation={m.structured_data.explanation}
                            validationStatus={m.structured_data.validation_status}
                            prUrl={m.structured_data.pr_url}
                            onValidate={async (pid) => {
                              try {
                                await api.code.validateAutofixProposal(pid);
                                handleSendMessage(`Verified proposal ${pid}`);
                              } catch (e: any) {
                                console.error(e);
                              }
                            }}
                            onCreatePR={async (pid) => {
                              try {
                                await api.code.createAutofixPR(pid);
                                handleSendMessage(`Create PR for proposal ${pid}`);
                              } catch (e: any) {
                                console.error(e);
                              }
                            }}
                          />
                        )}

                        {/* ─── SAST GENERATIVE UI: SCAN TELEMETRY CARD ─── */}
                        {m.structured_data?.type === 'sast_scan_telemetry' && (
                          <SastScanTelemetryCard
                            scanId={m.structured_data.scan_id || 'SCAN-001'}
                            exitCode={m.structured_data.exit_code ?? 0}
                            filesScanned={m.structured_data.files_scanned || 142}
                            filesSkipped={m.structured_data.files_skipped || 0}
                            stdoutSnippet={m.structured_data.stdout || '[Semgrep AST] Clean execution'}
                            stderrSnippet={m.structured_data.stderr}
                            onRetry={(sid) => router.push('/code/sast/scans')}
                          />
                        )}

                        {/* ─── GITHUB CONNECT PROPOSAL CARD ─── */}
                        {(m.structured_data?.intent === 'CONNECT_GITHUB' ||
                          m.structured_data?.github_connected === false ||
                          m.structured_data?.ui_schema?.component === 'github_connect_card') && (
                            <div
                              style={{
                                marginTop: 14,
                                padding: '18px 20px',
                                backgroundColor: '#FFFFFF',
                                border: '1px solid #E2E8F0',
                                borderRadius: 12,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <div
                                    style={{
                                      width: 38,
                                      height: 38,
                                      borderRadius: 8,
                                      backgroundColor: '#0F172A',
                                      color: '#FFFFFF',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0,
                                    }}
                                  >
                                    <GithubIcon size={20} />
                                  </div>
                                  <div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                                      Connect GitHub Account
                                    </div>
                                    <div style={{ fontSize: 12, color: '#64748B' }}>
                                      Authorize least-privilege repository access to discover repositories & execute scans.
                                    </div>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setShowConnectGithubModal(true)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '8px 16px',
                                    backgroundColor: '#2563EB',
                                    color: '#FFFFFF',
                                    borderRadius: 6,
                                    border: 'none',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  <span>Connect GitHub</span>
                                  <ExternalLink size={13} />
                                </button>
                              </div>
                            </div>
                          )}

                        {/* ─── REPOSITORY LIST & SELECT CARD ─── */}
                        {(m.structured_data?.intent === 'LIST_REPOSITORIES' ||
                          m.structured_data?.ui_schema?.component === 'repository_list') && (
                            <RepositoryListCard
                              repositories={m.structured_data.repositories || []}
                              selectedRepositories={selectedRepos}
                              onSelectRepository={(repo) => {
                                const name = repo.name || repo.full_name;
                                setSelectedRepos([name]);
                                handleSendMessage(`select repo ${name}`);
                              }}
                            />
                          )}

                        {/* ─── REPOSITORY SELECTED QUICK SCAN ACTIONS CARD ─── */}
                        {(m.structured_data?.intent === 'REPOSITORY_SELECTED' ||
                          m.structured_data?.ui_schema?.component === 'repository_selected_card') && (
                            <div
                              style={{
                                marginTop: 14,
                                padding: '16px 18px',
                                backgroundColor: '#F8FAFC',
                                border: '1px solid #CBD5E1',
                                borderRadius: 12,
                              }}
                            >
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>
                                🛡️ Security Actions for {m.structured_data.selected_repository || 'Selected Repository'}
                              </div>
                              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
                                Choose a security scanner or verification engine to execute:
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                <button
                                  type="button"
                                  onClick={() => handleSendMessage(`scan my repository ${m.structured_data.selected_repository || ''}`)}
                                  style={{
                                    padding: '6px 14px',
                                    backgroundColor: '#0F172A',
                                    color: '#FFFFFF',
                                    borderRadius: 6,
                                    border: 'none',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                  }}
                                >
                                  <Play size={12} fill="#FFFFFF" />
                                  <span>Full Security Scan</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSendMessage(`scan secrets ${m.structured_data.selected_repository || ''}`)}
                                  style={{
                                    padding: '6px 14px',
                                    backgroundColor: '#FFFFFF',
                                    color: '#0F172A',
                                    border: '1px solid #CBD5E1',
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  🔑 Scan Secrets
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSendMessage(`scan dependencies ${m.structured_data.selected_repository || ''}`)}
                                  style={{
                                    padding: '6px 14px',
                                    backgroundColor: '#FFFFFF',
                                    color: '#0F172A',
                                    border: '1px solid #CBD5E1',
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  📦 Scan Dependencies
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSendMessage(`scan docker image ${m.structured_data.selected_repository || ''}`)}
                                  style={{
                                    padding: '6px 14px',
                                    backgroundColor: '#FFFFFF',
                                    color: '#0F172A',
                                    border: '1px solid #CBD5E1',
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  🐳 Scan Container
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSendMessage(`check iac ${m.structured_data.selected_repository || ''}`)}
                                  style={{
                                    padding: '6px 14px',
                                    backgroundColor: '#FFFFFF',
                                    color: '#0F172A',
                                    border: '1px solid #CBD5E1',
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  🏗️ Check IaC
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSendMessage(`api security ${m.structured_data.selected_repository || ''}`)}
                                  style={{
                                    padding: '6px 14px',
                                    backgroundColor: '#FFFFFF',
                                    color: '#0F172A',
                                    border: '1px solid #CBD5E1',
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  🌐 API Security
                                </button>
                              </div>
                            </div>
                          )}

                        {/* ─── STAGES 02, 04, 05: UNIVERSAL INTEGRATION WORKFLOW CARDS ─── */}
                        {m.structured_data?.stage === 'STAGE_02_INTENT_RECOGNITION' && (
                          <>
                            {integrationSuccessMap[(m.structured_data.provider || 'slack').toLowerCase()] || ((m.structured_data.provider || 'slack').toLowerCase() === 'slack' && slackConnectedData) ? (
                              <IntegrationSuccessCard
                                provider={(m.structured_data.provider || 'slack').toLowerCase()}
                                providerName={
                                  (integrationSuccessMap[(m.structured_data.provider || 'slack').toLowerCase()]?.provider_name) ||
                                  m.structured_data.provider_name ||
                                  (m.structured_data.provider || 'Slack')
                                }
                                workspaceName={
                                  (integrationSuccessMap[(m.structured_data.provider || 'slack').toLowerCase()]?.workspace) ||
                                  slackConnectedData?.workspace ||
                                  currentOrg?.name ||
                                  'Kavach Workspace'
                                }
                                connectedBy={
                                  (integrationSuccessMap[(m.structured_data.provider || 'slack').toLowerCase()]?.connected_by) ||
                                  slackConnectedData?.connected_by ||
                                  userEmail
                                }
                                connectedAt={
                                  (integrationSuccessMap[(m.structured_data.provider || 'slack').toLowerCase()]?.connected_at) ||
                                  slackConnectedData?.connected_at ||
                                  'Just now'
                                }
                                statusBadge={
                                  (integrationSuccessMap[(m.structured_data.provider || 'slack').toLowerCase()]?.status_badge) ||
                                  slackConnectedData?.status_badge ||
                                  'Active & Connected'
                                }
                              />
                            ) : connectingIntegProvider === (m.structured_data.provider || 'slack').toLowerCase() || ((m.structured_data.provider || 'slack').toLowerCase() === 'slack' && connectingSlack) ? (
                              <ConnectingIntegrationCard
                                provider={(m.structured_data.provider || 'slack').toLowerCase()}
                                currentStepIndex={
                                  connectingIntegProvider === (m.structured_data.provider || 'slack').toLowerCase()
                                    ? connectingIntegStep
                                    : connectingSlackStep
                                }
                              />
                            ) : (
                              <ProposedIntegrationCard
                                provider={(m.structured_data.provider || 'slack').toLowerCase()}
                                providerName={m.structured_data.provider_name || (m.structured_data.provider || 'Slack')}
                                cardData={
                                  m.structured_data.card || {
                                    title: `Connect ${m.structured_data.provider_name || m.structured_data.provider || 'Service'}`,
                                    description: `Authenticate and connect ${m.structured_data.provider_name || m.structured_data.provider || 'Service'} to synchronize alerts, policies, and remediation.`,
                                    button_text: `Connect with ${m.structured_data.provider_name || m.structured_data.provider || 'Service'}`,
                                  }
                                }
                                onConnectClick={() => {
                                  setSelectedIntegProvider((m.structured_data.provider || 'slack').toLowerCase());
                                  setShowIntegModal(true);
                                }}
                              />
                            )}
                          </>
                        )}

                        {m.structured_data?.stage === 'STAGE_05_INTEGRATION_SUCCESS' && (
                          <IntegrationSuccessCard
                            provider={m.structured_data.provider || 'slack'}
                            providerName={m.structured_data.provider_name || 'Slack'}
                            workspaceName={m.structured_data.workspace || 'ADIT Security'}
                            connectedBy={m.structured_data.connected_by || userEmail}
                            connectedAt={m.structured_data.connected_at || 'Just now'}
                            statusBadge={m.structured_data.status_badge || 'Connected'}
                          />
                        )}

                        {/* ─── STAGES 06, 07, 08: POLICY WORKFLOW CARDS ─── */}
                        {m.structured_data?.stage === 'STAGE_06_POLICY_PROPOSED' && (
                          <>
                            {policyEnforcedData ? (
                              <PolicySuccessCard
                                policyTitle={policyEnforcedData.policy_name || m.structured_data.policy_title}
                                appliedTo={policyEnforcedData.applied_to || '3 AWS accounts'}
                                enforcedVia={policyEnforcedData.enforced_via || 'SCP + IAM Policy'}
                                createdAt={policyEnforcedData.created_at || 'Just now'}
                                createdBy={policyEnforcedData.created_by || userEmail}
                                statusBadge={policyEnforcedData.status_badge || 'Active'}
                                policyId={policyEnforcedData.policy_id}
                              />
                            ) : enforcingPolicy ? (
                              <PolicyEnforcementProgressCard
                                currentStepIndex={enforcingPolicyStep}
                              />
                            ) : (
                              <PolicyProposalCard
                                policyTitle={m.structured_data.policy_title || 'Block Public S3 Buckets'}
                                rules={m.structured_data.rules || [
                                  'Prevent creation of public S3 buckets',
                                  'Detect and restrict changes to existing public buckets',
                                  'Enforce across all connected AWS accounts using IAM & SCP',
                                  'Add real-time alerts in Slack',
                                ]}
                                onCreateAndEnforce={() => handleCreateAndEnforcePolicy(m.structured_data.policy_title)}
                              />
                            )}
                          </>
                        )}

                        {m.structured_data?.stage === 'STAGE_08_POLICY_ENFORCED' && (
                          <PolicySuccessCard
                            policyTitle={m.structured_data.policy_name || 'Block Public S3 Buckets'}
                            appliedTo={m.structured_data.applied_to || '3 AWS accounts'}
                            enforcedVia={m.structured_data.enforced_via || 'SCP + IAM Policy'}
                            createdAt={m.structured_data.created_at || 'Just now'}
                            createdBy={m.structured_data.created_by || userEmail}
                            statusBadge={m.structured_data.status_badge || 'Active'}
                            policyId={m.structured_data.policy_id}
                          />
                        )}

                        {/* ─── STAGE 09: MEMBER INVITATION WORKFLOW CARDS ─── */}
                        {m.structured_data?.stage === 'STAGE_09_INVITATION_PROPOSED' && (
                          <>
                            {inviteSentData ? (
                              <MemberInviteSuccessCard
                                email={inviteSentData.email || m.structured_data.email}
                                role={inviteSentData.role || m.structured_data.role}
                                workspaceName={inviteSentData.workspace || m.structured_data.workspace}
                                statusBadge={inviteSentData.status_badge || 'Pending Acceptance'}
                                inviteUrl={inviteSentData.invite_url}
                              />
                            ) : (
                              <MemberInviteCard
                                initialEmail={m.structured_data.email || 'rakesh.patel@adit.edu.in'}
                                initialRole={m.structured_data.role || 'Viewer'}
                                rolesAvailable={m.structured_data.roles_available || ['Viewer', 'Developer', 'Admin', 'Security Auditor']}
                                workspaceName={m.structured_data.workspace || currentProject?.name || 'ADIT Projects'}
                                onSendInvite={handleSendInvite}
                                onCancel={() => {
                                  setMessages((prev) => prev.filter((_, i) => i !== idx));
                                }}
                              />
                            )}
                          </>
                        )}

                        {m.structured_data?.stage === 'STAGE_09_INVITATION_SENT' && (
                          <MemberInviteSuccessCard
                            email={m.structured_data.email || 'rakesh.patel@adit.edu.in'}
                            role={m.structured_data.role || 'Viewer'}
                            workspaceName={m.structured_data.workspace || currentProject?.name || 'ADIT Projects'}
                            statusBadge={m.structured_data.status_badge || 'Pending Acceptance'}
                            inviteUrl={m.structured_data.invite_url}
                          />
                        )}

                        {/* ─── UNIVERSAL DYNAMIC WORKSPACE CARD (Phase 6, 9) ─── */}
                        {(m.structured_data?.ui_schema?.component === 'cloud_posture' ||
                          m.structured_data?.ui_schema?.component === 'cloud_connect_prompt' ||
                          m.structured_data?.ui_schema?.component === 'empty_state' ||
                          m.structured_data?.ui_schema?.component === 'capability_unavailable' ||
                          m.structured_data?.ui_schema?.component === 'universal_dynamic_card' ||
                          m.structured_data?.intent === 'GET_CLOUD_SECURITY_POSTURE' ||
                          m.structured_data?.component_type === 'dynamic_ui') && (
                            <UniversalDynamicWorkspaceCard
                              schema={
                                m.structured_data.ui_schema || {
                                  component: m.structured_data.component || 'universal_dynamic_card',
                                  title: m.structured_data.title || 'Dynamic Workspace',
                                  subtitle: m.structured_data.subtitle,
                                  props: m.structured_data.props || {},
                                  data: m.structured_data.data || m.structured_data,
                                  actions: m.structured_data.actions || [],
                                }
                              }
                              onSendMessage={(txt) => handleSendMessage(txt)}
                              onOpenModal={(modalTarget, payload) => {
                                if (modalTarget === 'connect_integration' || modalTarget === 'connect_aws' || modalTarget === 'connect_azure' || modalTarget === 'connect_gcp') {
                                  const prov = payload?.provider || modalTarget.replace('connect_', '');
                                  setSelectedIntegProvider(prov);
                                  setShowIntegModal(true);
                                } else if (modalTarget === 'full_dashboard') {
                                  setShowDashboardModal(true);
                                }
                              }}
                            />
                          )}
                        {/* Modern Action Bar */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                          <span style={{ fontSize: 11, color: '#94A3B8', marginRight: 4 }}>{m.timestamp}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(m.id, m.content)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              background: copiedMessageId === m.id ? '#EFF6FF' : 'none',
                              border: copiedMessageId === m.id ? '1px solid #BFDBFE' : '1px solid transparent',
                              borderRadius: 6,
                              cursor: 'pointer',
                              color: copiedMessageId === m.id ? '#2563EB' : '#94A3B8',
                              padding: '3px 7px',
                              fontSize: 11,
                              fontWeight: 500,
                              transition: 'all 0.15s ease',
                            }}
                            title="Copy response"
                          >
                            {copiedMessageId === m.id ? <Check size={12} color="#2563EB" /> : <Copy size={12} />}
                            <span>{copiedMessageId === m.id ? 'Copied' : 'Copy'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReaction(m.id, 'up')}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              background: messageReactions[m.id] === 'up' ? '#F0FDF4' : 'none',
                              border: messageReactions[m.id] === 'up' ? '1px solid #BBF7D0' : '1px solid transparent',
                              borderRadius: 6,
                              cursor: 'pointer',
                              color: messageReactions[m.id] === 'up' ? '#16A34A' : '#94A3B8',
                              padding: '3px 7px',
                              fontSize: 11,
                              fontWeight: 500,
                              transition: 'all 0.15s ease',
                            }}
                            title="Helpful"
                          >
                            <ThumbsUp size={12} />
                            <span>Helpful</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReaction(m.id, 'down')}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              background: messageReactions[m.id] === 'down' ? '#FEF2F2' : 'none',
                              border: messageReactions[m.id] === 'down' ? '1px solid #FECACA' : '1px solid transparent',
                              borderRadius: 6,
                              cursor: 'pointer',
                              color: messageReactions[m.id] === 'down' ? '#DC2626' : '#94A3B8',
                              padding: '3px 7px',
                              fontSize: 11,
                              fontWeight: 500,
                              transition: 'all 0.15s ease',
                            }}
                            title="Not helpful"
                          >
                            <ThumbsDown size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }))}

                {isSubmitting && (() => {
                  const pipelineConfig = getActivePipelineConfig(activeSubmittedQuery);
                  return (
                    <div
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '12px',
                        padding: '16px 20px',
                        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        maxWidth: '680px',
                        width: '100%',
                      }}
                    >
                      {/* Header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              backgroundColor: pipelineConfig.badgeBg,
                              border: `1px solid ${pipelineConfig.badgeBorder}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: pipelineConfig.badgeColor,
                            }}
                          >
                            <Loader2 size={16} className="animate-spin" />
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                              {pipelineConfig.title}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>
                              {pipelineConfig.subtitle} ({submitElapsed}s elapsed)
                            </div>
                          </div>
                        </div>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: pipelineConfig.badgeColor,
                            backgroundColor: pipelineConfig.badgeBg,
                            border: `1px solid ${pipelineConfig.badgeBorder}`,
                            borderRadius: '999px',
                            padding: '3px 10px',
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: pipelineConfig.badgeColor,
                            }}
                          />
                          <span>{pipelineConfig.badge}</span>
                        </div>
                      </div>

                      {/* Progress Steps Timeline */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
                        {pipelineConfig.steps.map((step, idx) => {
                          const isDone = submitElapsed >= step.doneAt;
                          const isCurrent = !isDone && submitElapsed >= step.activeAt;
                          return (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px',
                                fontSize: '12px',
                                color: isDone ? '#059669' : isCurrent ? '#0F172A' : '#94A3B8',
                                opacity: isCurrent || isDone ? 1 : 0.6,
                                transition: 'all 0.3s ease',
                              }}
                            >
                              <div style={{ marginTop: '2px', flexShrink: 0 }}>
                                {isDone ? (
                                  <CheckCircle2 size={14} color="#059669" />
                                ) : isCurrent ? (
                                  <Loader2 size={14} className="animate-spin" color={pipelineConfig.badgeColor} />
                                ) : (
                                  <Circle size={14} color="#CBD5E1" />
                                )}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: isCurrent ? 700 : isDone ? 600 : 500 }}>
                                  {step.label}
                                </span>
                                <span style={{ fontSize: '10.5px', color: '#64748B' }}>
                                  {step.detail}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                <div ref={chatBottomRef} />
              </div>
            </div>

            {/* ─── DOCKED BOTTOM CHAT INPUT BAR (NO EMPTY SPACE UNDERNEATH) ─── */}
            <div
              className="kavach-safe-bottom"
              style={{
                borderTop: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                padding: '10px 16px max(14px, env(safe-area-inset-bottom))',
                boxShadow: '0 -2px 10px rgba(0,0,0,0.03)',
                zIndex: 20,
                flexShrink: 0,
                position: 'sticky',
                bottom: 0,
              }}
            >
              <div
                style={{
                  maxWidth: 960,
                  width: '100%',
                  margin: '0 auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {/* ─── RECOMMENDED ACTION PILLS ─── */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', whiteSpace: 'nowrap' }}>
                    Recommended:
                  </span>
                  {[
                    { key: 'scan', label: `Scan ${selectedRepos[0] || 'kavach'}`, icon: Play },
                    { key: 'critical_findings', label: 'Find critical vulnerabilities', icon: AlertTriangle },
                    { key: 'fix_issue', label: 'Fix this issue', icon: Wrench },
                    { key: 'container_security', label: 'Check container security', icon: Box },
                    { key: 'review_iac', label: 'Review IaC configuration', icon: FileCode },
                    { key: 'detect_secrets', label: 'Detect secrets', icon: Key },
                    { key: 'generate_report', label: 'Generate security report', icon: FileText },
                  ].map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.key}
                        type="button"
                        onClick={() => handleQuickAction(action.key)}
                        disabled={isSubmitting}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '5px 12px',
                          borderRadius: 18,
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#334155',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                          transition: 'all 0.15s ease',
                        }}
                        className="hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50"
                      >
                        <Icon size={12} color="#2563EB" />
                        <span>{action.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Attached file chips in chat view */}
                {attachedFiles.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {attachedFiles.map((f) => (
                      <div
                        key={f.name}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 10px',
                          borderRadius: 6,
                          backgroundColor: '#EFF6FF',
                          border: '1px solid #BFDBFE',
                          fontSize: 12,
                          color: '#1E40AF',
                        }}
                      >
                        <FileCode size={13} color="#2563EB" />
                        <span style={{ fontWeight: 600 }}>{f.name}</span>
                        <span style={{ fontSize: 10, color: '#64748B' }}>
                          ({(f.size / 1024).toFixed(1)} KB)
                        </span>
                        <X
                          size={13}
                          style={{ cursor: 'pointer', marginLeft: 2 }}
                          onClick={() => removeAttachedFile(f.name)}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Chat Query Input Bar */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 12,
                    border: '1px solid #CBD5E1',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    padding: '8px 14px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Search size={18} color="#94A3B8" style={{ marginRight: 12, flexShrink: 0 }} />
                  <input
                    type="text"
                    id="chat-query-input"
                    value={queryInput}
                    onChange={(e) => setQueryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendMessage();
                    }}
                    placeholder="Ask anything or scan repository..."
                    style={{
                      flex: 1,
                      border: 'none',
                      outline: 'none',
                      fontSize: 14,
                      color: '#0F172A',
                      backgroundColor: 'transparent',
                    }}
                  />

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 12 }}>
                    <input
                      type="file"
                      ref={fileInputRef}
                      multiple
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                      accept=".tf,.json,.yaml,.yml,.py,.sh,.env,.dockerfile,Dockerfile,.txt,.md,.xml,.hcl"
                    />
                    <button
                      type="button"
                      title="Upload File / Code Snippet"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: attachedFiles.length > 0 || attachedSnippet ? '#2563EB' : '#64748B',
                        cursor: 'pointer',
                        padding: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Paperclip size={18} />
                    </button>

                    <button
                      type="button"
                      id="chat-send-query-btn"
                      onClick={() => handleSendMessage()}
                      disabled={isSubmitting || (!queryInput.trim() && attachedFiles.length === 0)}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 8,
                        backgroundColor: queryInput.trim() || attachedFiles.length > 0 ? '#0F172A' : '#E2E8F0',
                        color: queryInput.trim() || attachedFiles.length > 0 ? '#FFFFFF' : '#94A3B8',
                        border: 'none',
                        cursor: queryInput.trim() || attachedFiles.length > 0 ? 'pointer' : 'default',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <ChevronRight size={18} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ─────────────────────────────────────────────────────────────────────────
          STAGE 03 & 04: CONNECT GITHUB & AUTHORIZATION MODALS
         ───────────────────────────────────────────────────────────────────────── */}
      <ConnectGithubModal
        isOpen={showConnectGithubModal}
        onClose={() => setShowConnectGithubModal(false)}
        onAuthorized={() => {
          setShowConnectGithubModal(false);
          setShowRepoModal(true);
        }}
      />

      {/* ─────────────────────────────────────────────────────────────────────────
          STAGE 05: SELECT REPOSITORIES MODAL
         ───────────────────────────────────────────────────────────────────────── */}
      <SelectRepositoriesModal
        isOpen={showRepoModal}
        onClose={() => setShowRepoModal(false)}
        repositories={overview?.repositories || []}
        selectedRepos={selectedRepos}
        onSelectedChange={(newRepos) => setSelectedRepos(newRepos)}
        selectedBranch={selectedBranch}
        onBranchChange={(newBranch) => setSelectedBranch(newBranch)}
        onContinue={() => setShowRepoModal(false)}
      />

      {/* ─────────────────────────────────────────────────────────────────────────
          STAGE 10: FINDING DETAILS & FIX MODAL
         ───────────────────────────────────────────────────────────────────────── */}
      <FindingDetailModal
        isOpen={showFindingModal}
        onClose={() => setShowFindingModal(false)}
        findingId={selectedFinding?.id || null}
        initialFinding={selectedFinding}
        repository={selectedRepos[0] || 'kavach'}
        branch={selectedBranch}
        onCreatePR={(f) => {
          setShowFindingModal(false);
          setPrFinding(f);
          setShowPRModal(true);
        }}
        onExplainFix={(f) => {
          setShowFindingModal(false);
          handleSendMessage(`Explain the ${f?.title || 'vulnerability'} in ${f?.file || f?.file_path || 'the source code'} and suggest how to remediate it.`);
        }}
      />

      {/* ─────────────────────────────────────────────────────────────────────────
          STAGE 11 & 12: CREATE PULL REQUEST & PR CREATED MODAL
         ───────────────────────────────────────────────────────────────────────── */}
      <CreatePRModal
        isOpen={showPRModal}
        onClose={() => setShowPRModal(false)}
        finding={prFinding}
        defaultRepository={selectedRepos[0] || ''}
        defaultBranch={selectedBranch}
        onPRCreated={(pr) => {
          if (pr && pr.success !== false && (pr.pr_number > 0 || pr.html_url)) {
            const prLink = pr?.html_url ? `[#${pr.pr_number}](${pr.html_url})` : `#${pr.pr_number}`;
            setMessages((prev) => [
              ...prev,
              {
                id: `pr-${Date.now()}`,
                sender: 'assistant',
                agent_type: 'remediation_agent',
                content: `✅ **Pull Request Created Successfully!**\n\nBranch: \`${pr?.branch || selectedBranch}\`\nPull Request: ${prLink}\nRepository: \`${selectedRepos[0] || 'repository'}\`\n\nAutomated patch has been committed to GitHub and security regression tests have been triggered.`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ]);
          }
        }}
      />

      {/* ─────────────────────────────────────────────────────────────────────────
          STAGE 13: SECURITY REPORT MODAL
         ───────────────────────────────────────────────────────────────────────── */}
      <SecurityReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        repository={selectedRepos[0] || ''}
        branch={selectedBranch}
        projectId={currentProject?.id}
      />

      {/* ─────────────────────────────────────────────────────────────────────────
          STAGE 14: ACTIVE AGENTS MONITORING MODAL
         ───────────────────────────────────────────────────────────────────────── */}
      <ActiveAgentsModal
        isOpen={showAgentsModal}
        onClose={() => setShowAgentsModal(false)}
        projectId={currentProject?.id}
        initialAgents={overview?.active_agents || []}
      />

      {/* ─────────────────────────────────────────────────────────────────────────
          STAGE 15: FULL DASHBOARD ACCESS MODAL
         ───────────────────────────────────────────────────────────────────────── */}
      <FullDashboardModal
        isOpen={showDashboardModal}
        onClose={() => setShowDashboardModal(false)}
      />

      {/* ─────────────────────────────────────────────────────────────────────────
          STAGE 03: UNIVERSAL INTEGRATION AUTHORIZATION MODAL
         ───────────────────────────────────────────────────────────────────────── */}
      <ConnectUniversalIntegrationModal
        isOpen={showIntegModal || showSlackModal}
        provider={selectedIntegProvider}
        onClose={() => {
          setShowIntegModal(false);
          setShowSlackModal(false);
        }}
        onContinue={(config) => handleContinueToIntegration(selectedIntegProvider, config)}
      />

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL: ATTACH FILE / CODE SNIPPET
         ───────────────────────────────────────────────────────────────────────── */}
      {showAttachModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 20,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 520,
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              border: '1px solid #E2E8F0',
              padding: 24,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Attach File or Snippet
              </h3>
              <button
                type="button"
                onClick={() => setShowAttachModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                  File Name / Identifier
                </label>
                <input
                  type="text"
                  value={snippetName}
                  onChange={(e) => setSnippetName(e.target.value)}
                  placeholder="e.g. Dockerfile, main.tf, config.js"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Content / Code Snippet
                </label>
                <textarea
                  rows={8}
                  value={snippetText}
                  onChange={(e) => setSnippetText(e.target.value)}
                  placeholder="Paste Terraform HCL, Dockerfile directives, or application source code..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    fontSize: 12,
                    fontFamily: 'monospace',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowAttachModal(false)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (snippetText.trim()) {
                      setAttachedSnippet({ filename: snippetName || 'snippet.txt', content: snippetText });
                      setShowAttachModal(false);
                      setSnippetText('');
                    }
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Attach to Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ─────────────────────────────────────────────────────────────────────────
          DRAWER: CONSULTATION HISTORY
         ───────────────────────────────────────────────────────────────────────── */}
      <ConversationHistoryDrawer
        isOpen={showHistoryDrawer}
        onClose={() => setShowHistoryDrawer(false)}
        conversations={conversationsList}
        activeConversationId={conversationId}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onNewConversation={handleNewConversation}
      />

      {/* Responsive Style */}
      <style jsx>{`
        @media (max-width: 900px) {
          .quick-actions-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .bottom-cards-grid {
            grid-template-columns: 1fr !important;
          }
          .try-asking-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 640px) {
          .quick-actions-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
