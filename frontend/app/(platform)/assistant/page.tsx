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
  const { currentProject, projects, setCurrentProject, currentOrg, currentWorkspace } = useScope();

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

  // Load Real Landing Page Overview Data
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const data = await api.assistant.getOverview(currentProject?.id, currentWorkspace?.id);
        if (isMounted && data) {
          setOverview(data);
          setShowConnectedRepoBanner(Boolean(data.github_integration?.connected));
          if (data.selected_repositories && data.selected_repositories.length > 0) {
            setSelectedRepos(data.selected_repositories);
          }
          if (data.branch) {
            setSelectedBranch(data.branch);
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

  // Execute User Query
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || queryInput).trim();
    if (!text || isSubmitting) return;

    // Natural Language Intent Detection for Real Visual Flow
    const lower = text.toLowerCase();
    if (lower.includes('report') || lower.includes('compliance')) {
      setShowReportModal(true);
    } else if (lower.includes('agent') || lower.includes('orchestrator')) {
      setShowAgentsModal(true);
    }

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
    if (key === 'generate_report') {
      setShowReportModal(true);
    }

    const actionTitles: Record<string, string> = {
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
        height: '100vh',
        width: '100%',
        overflow: 'hidden',
        backgroundColor: '#F8FAFC',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#0F172A',
      }}
    >
      {/* ─────────────────────────────────────────────────────────────────────────
          LEFT SIDEBAR (Matches Reference Image Exactly)
         ───────────────────────────────────────────────────────────────────────── */}
      <aside
        style={{
          width: '260px',
          minWidth: '260px',
          height: '100vh',
          overflowY: 'auto',
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flexShrink: 0,
          padding: '16px 14px',
          boxSizing: 'border-box',
          position: 'sticky',
          top: 0,
          alignSelf: 'flex-start',
        }}
      >
        {/* Top: Logo + Workspace Selector + Navigation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Logo */}
          <div style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <KavachLogo size={24} showText={true} />
          </div>

          {/* Workspace Switcher Component (Screens 01 & 02) */}
          <WorkspaceSwitcher />

          {/* Navigation Items */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* Search / Ask (Active) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '9px 12px',
                borderRadius: 8,
                backgroundColor: '#EFF6FF',
                color: '#2563EB',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onClick={() => {
                setMessages([]);
                setQueryInput('');
              }}
            >
              <Search size={16} color="#2563EB" />
              <span>Search / Ask</span>
            </div>

            {/* Repositories */}
            <Link
              href="/code/repositories"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '9px 12px',
                borderRadius: 8,
                color: '#475569',
                fontSize: 13,
                fontWeight: 500,
                textDecoration: 'none',
              }}
              className="hover:bg-slate-50"
            >
              <FolderGit2 size={16} color="#64748B" />
              <span>Repositories</span>
            </Link>

            {/* Scans */}
            <Link
              href="/scans"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '9px 12px',
                borderRadius: 8,
                color: '#475569',
                fontSize: 13,
                fontWeight: 500,
                textDecoration: 'none',
              }}
              className="hover:bg-slate-50"
            >
              <Clock size={16} color="#64748B" />
              <span>Scans</span>
            </Link>

            {/* Findings */}
            <Link
              href="/findings"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '9px 12px',
                borderRadius: 8,
                color: '#475569',
                fontSize: 13,
                fontWeight: 500,
                textDecoration: 'none',
              }}
              className="hover:bg-slate-50"
            >
              <AlertTriangle size={16} color="#64748B" />
              <span>Findings</span>
            </Link>

            {/* Agents (Stage 14 Modal Trigger) */}
            <div
              onClick={() => setShowAgentsModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '9px 12px',
                borderRadius: 8,
                color: '#475569',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
              className="hover:bg-slate-50"
            >
              <Bot size={16} color="#64748B" />
              <span>Agents</span>
            </div>

            {/* Reports (Stage 13 Modal Trigger) */}
            <div
              onClick={() => setShowReportModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '9px 12px',
                borderRadius: 8,
                color: '#475569',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
              className="hover:bg-slate-50"
            >
              <FileText size={16} color="#64748B" />
              <span>Reports</span>
            </div>

            {/* Settings */}
            <Link
              href="/settings"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '9px 12px',
                borderRadius: 8,
                color: '#475569',
                fontSize: 13,
                fontWeight: 500,
                textDecoration: 'none',
              }}
              className="hover:bg-slate-50"
            >
              <Settings size={16} color="#64748B" />
              <span>Settings</span>
            </Link>
          </nav>

          {/* Explore Full Dashboard Navigation Link (Stage 15 Modal Trigger) */}
          <div style={{ marginTop: 8, paddingTop: 14, borderTop: '1px solid #F1F5F9' }}>
            <div
              id="sidebar-full-dashboard-btn"
              onClick={() => setShowDashboardModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 8,
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                color: '#0F172A',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <LayoutDashboard size={15} color="#2563EB" />
                <span>Explore Full Dashboard</span>
              </div>
              <ArrowRight size={13} color="#64748B" />
            </div>
          </div>
        </div>

        {/* Bottom Profile (Matches Reference Image) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 8px',
            borderTop: '1px solid #F1F5F9',
            marginTop: 'auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {userInitials[0] || 'M'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#0F172A',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {userName}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: '#64748B',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {userEmail}
              </span>
            </div>
          </div>
          <ChevronDown size={14} color="#64748B" />
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────────────────
          MAIN CONTENT AREA
         ───────────────────────────────────────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        {/* Top Header Bar */}
        <header
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '0 32px',
            gap: 16,
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
          }}
        >
          {/* Quick Consultation History Toggle */}
          <button
            type="button"
            id="topbar-history-btn"
            onClick={() => setShowHistoryDrawer(true)}
            style={{
              padding: '6px 12px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: 6,
              color: '#334155',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Clock size={13} color="#2563EB" />
            <span>Consultations</span>
            {conversationsList.length > 0 && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: 10,
                  backgroundColor: '#EFF6FF',
                  color: '#2563EB',
                }}
              >
                {conversationsList.length}
              </span>
            )}
          </button>

          {/* Quick Toggle to Full Dashboard (Stage 15 Modal Trigger) */}
          <button
            type="button"
            id="topbar-full-dashboard-btn"
            onClick={() => setShowDashboardModal(true)}
            style={{
              padding: '6px 14px',
              backgroundColor: '#F1F5F9',
              border: '1px solid #E2E8F0',
              borderRadius: 6,
              color: '#334155',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <LayoutDashboard size={13} color="#2563EB" />
            <span>Explore Full Dashboard</span>
          </button>

          {/* Notification Bell */}
          <button
            type="button"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              position: 'relative',
              padding: 4,
            }}
          >
            <Bell size={18} />
            <span
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#EF4444',
                border: '1.5px solid #FFFFFF',
              }}
            />
          </button>

          {/* User Avatar */}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {userInitials[0] || 'M'}
          </div>
        </header>

        {/* ─── PERMANENT FIXED REPOSITORY & BRANCH BAR (ALWAYS VISIBLE ACROSS ALL VIEWS) ─── */}
        <div
          id="assistant-selected-repositories-bar"
          style={{
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            padding: '10px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            zIndex: 10,
            position: 'sticky',
            top: 0,
            flexShrink: 0,
          }}
        >
          {/* Left: Selected Repositories Chips & Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
              Selected Repositories
            </span>

            {selectedRepos.map((repo) => (
              <div
                key={repo}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 10px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#0F172A',
                }}
              >
                <GithubIcon size={14} />
                <span>{repo}</span>
                <X
                  size={13}
                  style={{ cursor: 'pointer', color: '#64748B' }}
                  onClick={() => removeRepo(repo)}
                />
              </div>
            ))}

            <button
              type="button"
              id="add-repository-btn"
              onClick={() => setShowRepoModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '5px 12px',
                backgroundColor: '#FFFFFF',
                border: '1px dashed #CBD5E1',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              <Plus size={13} />
              <span>Add repository</span>
            </button>

            <button
              type="button"
              id="connect-github-btn"
              onClick={() => setShowConnectGithubModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 12px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <GithubIcon size={13} />
              <span>Connect GitHub</span>
            </button>

            {overview?.github_integration?.connected && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 9999,
                  backgroundColor: '#DCFCE7',
                  color: '#16A34A',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <CheckCircle2 size={11} />
                <span>Connected</span>
              </span>
            )}
          </div>

          {/* Right: Branch Selector & Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {messages.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setShowHistoryDrawer(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: 6,
                    padding: '5px 10px',
                    color: '#475569',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Clock size={12} color="#64748B" />
                  <span>History</span>
                  {conversationsList.length > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '0 5px', borderRadius: 6, backgroundColor: '#EFF6FF', color: '#2563EB' }}>
                      {conversationsList.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleNewConversation}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563EB',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <RotateCcw size={12} />
                  <span>New Chat</span>
                </button>
              </>
            )}

            {/* Branch selector */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                id="branch-selector-btn"
                onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                <GitBranch size={14} color="#64748B" />
                <span>{selectedBranch}</span>
                <ChevronDown size={13} color="#64748B" />
              </button>

              {showBranchDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    marginTop: 6,
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
                        color: b === selectedBranch ? '#2563EB' : '#334155',
                        fontWeight: b === selectedBranch ? 600 : 400,
                        backgroundColor: b === selectedBranch ? '#EFF6FF' : 'transparent',
                      }}
                    >
                      {b}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Active Conversation Layout or Initial Home Dashboard */}
        {messages.length > 0 ? (
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

              {messages.map((m, idx) => {
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
            })}

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
          style={{
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            padding: '12px 32px 18px',
            boxShadow: '0 -2px 10px rgba(0,0,0,0.03)',
            zIndex: 20,
            flexShrink: 0,
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
    ) : (
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            maxWidth: 960,
            width: '100%',
            margin: '0 auto',
            padding: '40px 24px 40px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: 28,
          }}
        >
          <>
            {/* ─────────────────────────────────────────────────────────────────
                STAGE 01: ONBOARDING COMPLETE BANNER (Dismissable / First Run)
               ───────────────────────────────────────────────────────────────── */}
          {showOnboardingWelcome && (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 16,
                padding: '24px 28px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    backgroundColor: '#EEF2FF',
                    color: '#4F46E5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                >
                  🎉
                </div>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Welcome to Kavach!
                  </h3>
                  <p style={{ fontSize: 13, color: '#64748B', margin: '3px 0 12px' }}>
                    Your account and workspace are ready. Let's secure your code, infrastructure, and cloud with AI-powered assistance.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px 20px' }}>
                    {['Account created', 'Workspace configured', 'Security environment ready', 'You can now start using Kavach'].map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#334155' }}>
                        <CheckCircle2 size={15} color="#16A34A" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                <button
                  onClick={() => setShowOnboardingWelcome(false)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>Continue to Kavach</span>
                  <ArrowRight size={13} />
                </button>
                <button
                  onClick={() => setShowOnboardingWelcome(false)}
                  style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: 11, cursor: 'pointer' }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────
              STAGE 06: REPOSITORIES CONNECTED BANNER (Matches Reference Image)
             ───────────────────────────────────────────────────────────────── */}
          {showConnectedRepoBanner && selectedRepos.length > 0 && (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 12,
                padding: '16px 20px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    backgroundColor: '#DCFCE7',
                    color: '#16A34A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                      Repositories Connected
                    </h4>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: 9999,
                        backgroundColor: '#DCFCE7',
                        color: '#16A34A',
                      }}
                    >
                      Connected
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                    Your GitHub account is connected and {selectedRepos.length} repositories are ready for continuous analysis.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => setShowRepoModal(true)}
                  style={{
                    padding: '7px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#475569',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  Add more repositories
                </button>

                <button
                  id="start-security-scan-btn"
                  onClick={() => {
                    setScanPlanActive(true);
                    setScanInProgress(false);
                    setScanResults(null);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#FFFFFF',
                    backgroundColor: '#0F172A',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  <Play size={12} fill="#FFFFFF" />
                  <span>Start a Security Scan</span>
                </button>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────
              HERO TITLE SECTION (Matches Reference Image)
             ───────────────────────────────────────────────────────────────── */}
          {/* ─────────────────────────────────────────────────────────────────
              HERO TITLE SECTION (Matches Reference Image Stage 01)
             ───────────────────────────────────────────────────────────────── */}
          <div style={{ textAlign: 'center', marginTop: messages.length === 0 ? 16 : 0, marginBottom: 8 }}>
            <h1
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: '#0F172A',
                letterSpacing: '-0.025em',
                margin: '0 0 8px',
              }}
            >
              What would you like to do?
            </h1>
            <p
              style={{
                fontSize: 15,
                color: '#64748B',
                margin: 0,
              }}
            >
              Ask Kavach to analyze, secure, or manage your systems.
            </p>
          </div>

          {/* Attached file chips in landing view */}
          {attachedFiles.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: -10 }}>
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

          {/* ─────────────────────────────────────────────────────────────────
              SEARCH / CHAT INPUT BOX (Matches Reference Image Stage 01)
             ───────────────────────────────────────────────────────────────── */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: 12,
              padding: '10px 16px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
            }}
          >
            <Search size={18} color="#94A3B8" style={{ marginRight: 12, flexShrink: 0 }} />
            <input
              type="text"
              id="kavach-query-input"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              placeholder="Connect my Slack using my credentials or scan repository..."
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
              {attachedSnippet && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '3px 8px',
                    borderRadius: 6,
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    fontSize: 11,
                    color: '#2563EB',
                  }}
                >
                  <FileText size={12} />
                  <span>{attachedSnippet.filename}</span>
                  <X
                    size={12}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setAttachedSnippet(null)}
                  />
                </div>
              )}

              {/* Attach File / Code Upload */}
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
                id="attach-file-btn"
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

              {/* Send Action Button */}
              <button
                type="button"
                id="send-query-btn"
                onClick={() => handleSendMessage()}
                disabled={isSubmitting || (!queryInput.trim() && attachedFiles.length === 0)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  backgroundColor: queryInput.trim() || attachedFiles.length > 0 ? '#0F172A' : '#E2E8F0',
                  color: queryInput.trim() || attachedFiles.length > 0 ? '#FFFFFF' : '#94A3B8',
                  border: 'none',
                  cursor: queryInput.trim() ? 'pointer' : 'default',
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

          {/* ─────────────────────────────────────────────────────────────────
              STAGE 01: TRY ASKING SUGGESTIONS (Exact Match to Reference Image)
             ───────────────────────────────────────────────────────────────── */}
          {messages.length === 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>
                Try asking
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  'Scan repository kavach',
                  'Run API security scan',
                  'Connect Jira to sync vulnerabilities',
                  'Show connected repositories',
                  'Create a policy to block public S3 buckets',
                  'Invite a member with email mayur@adit.edu.in',
                ].map((suggestion, i) => (
                  <div
                    key={i}
                    id={`suggestion-chip-${i}`}
                    onClick={() => {
                      setQueryInput(suggestion);
                      handleSendMessage(suggestion);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: 10,
                      cursor: 'pointer',
                      fontSize: 13,
                      color: '#334155',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                      transition: 'all 0.15s ease',
                    }}
                    className="hover:border-slate-400 hover:bg-slate-50"
                  >
                    <Search size={15} color="#64748B" />
                    <span>{suggestion}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────
              STAGES 07, 08, 09: SCAN EXECUTION PIPELINE CARDS
             ───────────────────────────────────────────────────────────────── */}
          {scanPlanActive && (
            <ScanPlanCard
              repository={selectedRepos[0] || 'kavach'}
              branch={selectedBranch}
              onRunScan={() => {
                setScanPlanActive(false);
                setScanInProgress(true);
              }}
              onCancel={() => setScanPlanActive(false)}
            />
          )}

          {scanInProgress && (
            <ScanningInProgressCard
              repository={selectedRepos[0] || 'kavach'}
              branch={selectedBranch}
              projectId={currentProject?.id}
              workspaceId={currentWorkspace?.id}
              onStop={() => setScanInProgress(false)}
              onFinished={(res) => {
                setScanInProgress(false);
                setScanResults(res);
              }}
            />
          )}

          {scanResults && (
            <ScanResultsCard
              repository={selectedRepos[0] || 'kavach'}
              results={scanResults}
              onSelectFinding={(finding) => {
                setSelectedFinding(finding);
                setShowFindingModal(true);
              }}
              onShowReport={() => setShowReportModal(true)}
              onCreatePRs={() => {
                setPrFinding(scanResults?.findings?.[0] || null);
                setShowPRModal(true);
              }}
            />
          )}

          {/* ─────────────────────────────────────────────────────────────────
              8 QUICK ACTION PILLS (Matches Reference Image Exactly)
             ───────────────────────────────────────────────────────────────── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 12,
            }}
            className="quick-actions-grid"
          >
            {/* Pill 1 */}
            <button
              type="button"
              onClick={() => handleQuickAction('scan')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '11px 16px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <FileText size={16} color="#64748B" />
              <span>Scan my repository</span>
            </button>

            {/* Pill 2 */}
            <button
              type="button"
              onClick={() => handleQuickAction('critical_findings')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '11px 16px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <AlertTriangle size={16} color="#EF4444" />
              <span>Find critical vulnerabilities</span>
            </button>

            {/* Pill 3 */}
            <button
              type="button"
              onClick={() => handleQuickAction('fix_issue')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '11px 16px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <Wrench size={16} color="#64748B" />
              <span>Fix this issue</span>
            </button>

            {/* Pill 4 */}
            <button
              type="button"
              onClick={() => handleQuickAction('container_security')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '11px 16px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <Box size={16} color="#64748B" />
              <span>Check container security</span>
            </button>

            {/* Pill 5 */}
            <button
              type="button"
              onClick={() => handleQuickAction('dependencies')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '11px 16px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <Layers size={16} color="#64748B" />
              <span>Analyze dependencies</span>
            </button>

            {/* Pill 6 */}
            <button
              type="button"
              onClick={() => handleQuickAction('review_iac')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '11px 16px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <FileCode size={16} color="#64748B" />
              <span>Review IaC configuration</span>
            </button>

            {/* Pill 7 */}
            <button
              type="button"
              onClick={() => handleQuickAction('detect_secrets')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '11px 16px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <Key size={16} color="#64748B" />
              <span>Detect secrets</span>
            </button>

            {/* Pill 8 */}
            <button
              type="button"
              onClick={() => handleQuickAction('generate_report')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '11px 16px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <FileText size={16} color="#64748B" />
              <span>Generate security report</span>
            </button>
          </div>

          {/* ─────────────────────────────────────────────────────────────────
              "TRY ASKING" SECTION (Matches Reference Image)
             ───────────────────────────────────────────────────────────────── */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>
              Try asking
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 12,
              }}
              className="try-asking-grid"
            >
              {[
                'Show critical vulnerabilities in my repository',
                'Analyze my Terraform configuration',
                'Check if my Dockerfile is secure',
                'Compare this scan with previous scan',
                'Find exposed secrets',
                'Generate a security report for this repository',
              ].map((question) => (
                <div
                  key={question}
                  onClick={() => handleSendMessage(question)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '11px 16px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 8,
                    fontSize: 13,
                    color: '#334155',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  }}
                  className="hover:border-blue-400"
                >
                  <Search size={14} color="#64748B" style={{ flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {question}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────────
              3 BOTTOM SUMMARY CARDS (Matches Reference Image Exactly)
             ───────────────────────────────────────────────────────────────── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 18,
            }}
            className="bottom-cards-grid"
          >
            {/* Card 1: Recent Scans */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                padding: '18px 20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16,
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Recent Scans</span>
                <Link
                  href="/scans"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#2563EB',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  <span>View all</span>
                  <ArrowRight size={12} />
                </Link>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {(overview?.recent_scans || []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#94A3B8', fontSize: 12 }}>
                    No recent scans found. Run a scan from the prompt or quick actions above.
                  </div>
                ) : (
                  (overview?.recent_scans || []).map((scan: any, i: number) => {
                    let badgeBg = '#FEF2F2';
                    let badgeText = '#DC2626';
                    if (scan.badge_type === 'high') {
                      badgeBg = '#FFF7ED';
                      badgeText = '#EA580C';
                    } else if (scan.badge_type === 'medium') {
                      badgeBg = '#FEFCE8';
                      badgeText = '#D97706';
                    } else if (scan.badge_type === 'success') {
                      badgeBg = '#F0FDF4';
                      badgeText = '#16A34A';
                    }

                    return (
                      <div
                        key={scan.id || i}
                        onClick={() => {
                          setScanPlanActive(true);
                          setScanInProgress(false);
                          setScanResults(null);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          padding: '4px 6px',
                          borderRadius: 6,
                          transition: 'background-color 0.15s',
                        }}
                        className="hover:bg-slate-50"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <GithubIcon size={16} />
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
                              {scan.repository}
                            </span>
                            <span style={{ fontSize: 11, color: '#64748B', lineHeight: 1.2, marginTop: 2 }}>
                              {scan.branch} • {scan.issues_count} issues
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 6,
                              backgroundColor: badgeBg,
                              color: badgeText,
                            }}
                          >
                            {scan.badge}
                          </span>
                          <span style={{ fontSize: 11, color: '#94A3B8', width: 62, textAlign: 'right' }}>
                            {scan.time_ago}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Card 2: Latest Findings */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                padding: '18px 20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16,
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Latest Findings</span>
                <Link
                  href="/findings"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#2563EB',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  <span>View all</span>
                  <ArrowRight size={12} />
                </Link>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {(overview?.latest_findings || []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#94A3B8', fontSize: 12 }}>
                    No active vulnerabilities found. Your repositories are currently clean.
                  </div>
                ) : (
                  (overview?.latest_findings || []).map((find: any, i: number) => {
                    let badgeBg = '#FEF2F2';
                    let badgeText = '#DC2626';
                    let iconColor = '#EF4444';

                    if (find.severity === 'High') {
                      badgeBg = '#FFF7ED';
                      badgeText = '#EA580C';
                      iconColor = '#F97316';
                    } else if (find.severity === 'Medium') {
                      badgeBg = '#FEFCE8';
                      badgeText = '#D97706';
                      iconColor = '#F59E0B';
                    } else if (find.severity === 'Low') {
                      badgeBg = '#F1F5F9';
                      badgeText = '#475569';
                      iconColor = '#64748B';
                    }

                    return (
                      <div
                        key={find.id || i}
                        onClick={() => {
                          setSelectedFinding(find);
                          setShowFindingModal(true);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          padding: '4px 6px',
                          borderRadius: 6,
                          transition: 'background-color 0.15s',
                        }}
                        className="hover:bg-slate-50"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <AlertTriangle size={15} color={iconColor} style={{ flexShrink: 0 }} />
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: '#0F172A',
                                lineHeight: 1.2,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {find.title}
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                color: '#64748B',
                                lineHeight: 1.2,
                                marginTop: 2,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {find.location}
                            </span>
                          </div>
                        </div>

                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 6,
                            backgroundColor: badgeBg,
                            color: badgeText,
                            flexShrink: 0,
                            marginLeft: 8,
                          }}
                        >
                          {find.severity}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Card 3: Active Agents */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                padding: '18px 20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16,
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Active Agents</span>
                <button
                  type="button"
                  id="view-all-agents-btn"
                  onClick={() => setShowAgentsModal(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#2563EB',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  <span>View all</span>
                  <ArrowRight size={12} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {(overview?.active_agents || []).map((ag: any) => {
                  let badgeBg = '#F1F5F9';
                  let badgeText = '#475569';
                  let showGreenDot = false;

                  if (ag.status === 'Running') {
                    badgeBg = '#DCFCE7';
                    badgeText = '#15803D';
                    showGreenDot = true;
                  } else if (ag.status === 'In progress') {
                    badgeBg = '#FEF3C7';
                    badgeText = '#B45309';
                  }

                  return (
                    <div
                      key={ag.key}
                      onClick={() => setShowAgentsModal(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        padding: '4px 6px',
                        borderRadius: 6,
                        transition: 'background-color 0.15s',
                      }}
                      className="hover:bg-slate-50"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            backgroundColor: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {ag.key === 'sast_agent' && <Shield size={14} color="#16A34A" />}
                          {ag.key === 'iac_agent' && <FileCode size={14} color="#D97706" />}
                          {ag.key === 'container_agent' && <Box size={14} color="#64748B" />}
                          {ag.key === 'secrets_agent' && <Key size={14} color="#64748B" />}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
                            {ag.name}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: '#64748B',
                              lineHeight: 1.2,
                              marginTop: 2,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {ag.detail}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 6,
                            backgroundColor: badgeBg,
                            color: badgeText,
                          }}
                        >
                          {ag.status}
                        </span>
                        {showGreenDot && (
                          <div
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              backgroundColor: '#16A34A',
                            }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          </>
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
