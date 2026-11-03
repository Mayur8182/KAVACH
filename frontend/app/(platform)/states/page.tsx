'use client';

import React, { useState } from 'react';
import {
  Shield,
  Activity,
  Terminal,
  Lock,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Search,
  Filter,
  Check,
  X,
  FileCode,
  Key,
  ExternalLink,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard, SkeletonTable } from '@/components/ui/PageSkeleton';
import { MultiStagePipeline } from '@/components/ui/MultiStagePipeline';
import { NetworkStatusBanner } from '@/components/ui/NetworkStatusBanner';
import { ErrorState } from '@/components/ui/ErrorState';
import { PermissionState } from '@/components/ui/PermissionState';
import { SessionExpiredDialog } from '@/components/ui/SessionExpiredDialog';
import { ScanStatusBadge } from '@/components/security/ScanStatusBadge';
import { VulnerabilityStatusBadge } from '@/components/security/VulnerabilityStatusBadge';
import { RuntimeStatusBadge } from '@/components/security/RuntimeStatusBadge';
import { AgentExecutionStatusBadge } from '@/components/security/AgentExecutionStatusBadge';
import { ConnectionStatusBadge } from '@/components/security/ConnectionStatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { UploadProgress } from '@/components/ui/UploadProgress';

export default function GlobalUIStateShowcasePage() {
  const [activeTab, setActiveTab] = useState<'all' | 'loaders' | 'network' | 'security' | 'agent' | 'forms'>('all');
  const [simulationActive, setSimulationActive] = useState<boolean>(true);
  const [showSessionModal, setShowSessionModal] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  // Form field mock states
  const [apiHost, setApiHost] = useState('https://telemetry-gateway.kavach.corp:8443');
  const [cidrRange, setCidrRange] = useState('192.168.1.300/32');
  const [webhookKey, setWebhookKey] = useState('');

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 bg-[#F8FAFC] min-h-screen font-sans text-slate-900">
      {/* ─────────────────────────────────────────────────────────────────────────
          PAGE HEADER & SIMULATION TOGGLE
         ───────────────────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                DESIGN SYSTEM SPECIFICATION v4.18
              </span>
              <span className="text-[10px] font-mono text-slate-400">• STRICT AUDIT GRADE • STITCH SENTINEL</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Global UI State Management Matrix
            </h1>
            <p className="text-[13.5px] text-slate-600 mt-1 max-w-3xl leading-relaxed">
              Enterprise status specifications, failure boundaries, AI reasoning states, and telemetry feedback systems for Kavach SecOps suite across 15 standard categories.
            </p>
          </div>

          {/* Interactive State Preview Switch */}
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 self-start xl:self-auto">
            <div className="text-right">
              <div className="text-[12.5px] font-bold text-slate-900">Interactive State Preview</div>
              <div className="text-[10px] font-mono text-slate-400">SIMULATE FAILURES & LOADS</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={simulationActive}
                onChange={(e) => setSimulationActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
            </label>
          </div>
        </div>

        {/* Category Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-4">
          {[
            { id: 'all', label: 'All States (15 Categories)' },
            { id: 'loaders', label: 'Loaders & Skeletons' },
            { id: 'network', label: 'System Degraded & Network' },
            { id: 'security', label: 'Security & Access Control' },
            { id: 'agent', label: 'AI Agent Reasoning' },
            { id: 'forms', label: 'Forms & Toasts' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 text-[12.5px] font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <div className="ml-auto text-[11px] font-mono text-slate-400 hidden sm:block">
            ACTIVE SPEC: KAVACH-SENTINEL-CORE
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────
          SECTION D: NETWORK STATUS & DEGRADED STATES
         ───────────────────────────────────────────────────────────────────────── */}
      {(activeTab === 'all' || activeTab === 'network') && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              <h2 className="text-[16px] font-bold text-slate-900">
                Network Boundary & Connectivity States
              </h2>
            </div>
            <span className="text-[10px] font-mono text-slate-400">CATEGORY B • FAILOVER & BACKOFF</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <NetworkStatusBanner forceOffline={simulationActive} bufferedEventsCount={42} />
            <NetworkStatusBanner forceSlow={simulationActive} />
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          SECTION A: EMPTY STATES WITH ACTION CTAS
         ───────────────────────────────────────────────────────────────────────── */}
      {(activeTab === 'all' || activeTab === 'security') && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              <h2 className="text-[16px] font-bold text-slate-900">
                Empty States with Action Workflows
              </h2>
            </div>
            <span className="text-[10px] font-mono text-slate-400">CATEGORY A • ZERO-INCIDENT BASELINES</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <EmptyState
              variant="no_vulnerabilities"
              metadataLeft="LAST SCAN: 2m 14s AGO"
              metadataRight="SIGNATURE DB: v2025.10.31-REV4"
              primaryAction={{
                label: 'Run On-Demand Heuristic Scan',
                onClick: () => alert('Initiating deterministic AST scan...'),
              }}
              secondaryAction={{
                label: 'Adjust Sensitivity Threshold',
                onClick: () => alert('Opening policy sensitivity config...'),
              }}
            />

            <EmptyState
              variant="no_policies"
              metadataLeft="TARGET: K8S-INGRESS-CONTROLLER"
              metadataRight="ENGINE: CILIUM eBPF KERNEL"
              primaryAction={{
                label: 'Deploy Recommended Baseline Rules',
                onClick: () => alert('Deploying baseline OPA Rego rules...'),
              }}
              secondaryAction={{
                label: 'Import Custom Policy',
                onClick: () => alert('Opening policy importer...'),
              }}
            />
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          SECTION B: SKELETON LOADERS & SHIMMER TELEMETRY
         ───────────────────────────────────────────────────────────────────────── */}
      {(activeTab === 'all' || activeTab === 'loaders') && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              <h2 className="text-[16px] font-bold text-slate-900">
                Skeleton Loaders & Shimmer Telemetry States
              </h2>
            </div>
            <span className="text-[10px] font-mono text-slate-400">CATEGORY A.3 • SHIMMER TAXONOMY</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <SkeletonCard title="Ingress Network Load Metric" />
            <div className="lg:col-span-2">
              <SkeletonTable rows={4} title="Live Firewall Telemetry Stream" />
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          SECTION C: MULTI-STAGE PIPELINE SCAN TRACKER
         ───────────────────────────────────────────────────────────────────────── */}
      {(activeTab === 'all' || activeTab === 'security' || activeTab === 'loaders') && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              <h2 className="text-[16px] font-bold text-slate-900">
                Multi-Stage Security Scan Pipeline Tracker
              </h2>
            </div>
            <span className="text-[10px] font-mono text-slate-400">CATEGORY I • DETERMINISTIC PIPELINE</span>
          </div>

          <MultiStagePipeline
            pipelineId="#SC-89214"
            target="k8s.gcr.io/kavach/auth-broker:v2.19.4-distroless"
            triggerInfo="GitLab-CI #99104"
          />
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          SECTION E: PERMISSION DENIED & ROLE-RESTRICTED STATE
         ───────────────────────────────────────────────────────────────────────── */}
      {(activeTab === 'all' || activeTab === 'security') && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              <h2 className="text-[16px] font-bold text-slate-900">
                Permission Denied & Role-Restricted States
              </h2>
            </div>
            <span className="text-[10px] font-mono text-slate-400">CATEGORY C • CAP_SYS_ADMIN GOVERNANCE</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <PermissionState
              requiredTier="SecOps Tier 3"
              userRole="SecOps Analyst L1"
              targetResource="Production Firewall Rule Revocation (Cluster ID: us-east-k8s-core)"
              missingCapability="CAP_SYS_ADMIN"
              auditTrailId="AUD-9912"
            />

            <ErrorState
              type="500_server_error"
              title="Kafka Event Ingestion Stream Disruption"
              message="Broker broker-03.us-east.kavach.internal:9092 encountered socket reset. Retrying attempt 3 of 5."
              errorCode="ERR_KAFKA_SOCK_RST"
              onRetry={() => alert('Retrying broker socket sync...')}
            />
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          SECTION F: AI AGENT REASONING & TOOL EXECUTION STATUSES
         ───────────────────────────────────────────────────────────────────────── */}
      {(activeTab === 'all' || activeTab === 'agent') && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              <h2 className="text-[16px] font-bold text-slate-900">
                AI Autonomous SecOps Agent Reasoning & Tool Calls
              </h2>
            </div>
            <span className="text-[10px] font-mono text-slate-400">CATEGORY K • AUTONOMOUS TELEMETRY</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <AgentExecutionStatusBadge
              state="THINKING"
              agentName="Kavach-SecLLM-v3"
              thoughtSnippet="Analyzing lateral movement vectors in container audit logs across eBPF socket events..."
            />

            <AgentExecutionStatusBadge
              state="EXECUTING_TOOL"
              agentName="Remediation Agent"
              thoughtSnippet="Quarantine approved by policy. Invoking kernel isolation syscall."
              toolCallName="sandbox_remediation.isolate_host"
              toolArgs='ip="10.244.0.18", policy="zero-trust-quarantine"'
              stdoutPreview="[OK] eBPF egress drop rules injected into pod veth_9921b"
            />

            <AgentExecutionStatusBadge
              state="COMPLETED"
              agentName="Threat Intel Agent"
              thoughtSnippet="Binary digest successfully cross-referenced against global CVE intelligence."
              verificationNote="Artifact sha256 validated against VirusTotal & MITRE ATT&CK T1059.001"
            />
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          SECTION G: FORM FIELD VALIDATION STATES
         ───────────────────────────────────────────────────────────────────────── */}
      {(activeTab === 'all' || activeTab === 'forms') && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              <h2 className="text-[16px] font-bold text-slate-900">
                Form Input & Validation States
              </h2>
            </div>
            <span className="text-[10px] font-mono text-slate-400">CATEGORY D • INLINE VALIDATION</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Field 1: Valid State */}
              <div>
                <label className="block text-[12px] font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>API Endpoint Hostname</span>
                  <span className="text-emerald-700 font-mono text-[10px]">VALID</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={apiHost}
                    onChange={(e) => setApiHost(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 text-[13px] border border-emerald-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-emerald-50/20 text-slate-900 font-mono"
                  />
                  <CheckCircle2 size={16} className="absolute right-2.5 top-2.5 text-emerald-600" />
                </div>
                <p className="text-[11.5px] text-emerald-700 mt-1.5">
                  Endpoint reachable and TLS 1.3 certificate verified (Expires in 312 days).
                </p>
              </div>

              {/* Field 2: Invalid State */}
              <div>
                <label className="block text-[12px] font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>CIDR Ingress Range</span>
                  <span className="text-rose-700 font-mono text-[10px]">ERROR</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={cidrRange}
                    onChange={(e) => setCidrRange(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 text-[13px] border border-rose-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 bg-rose-50/20 text-slate-900 font-mono"
                  />
                  <AlertTriangle size={16} className="absolute right-2.5 top-2.5 text-rose-600" />
                </div>
                <p className="text-[11.5px] text-rose-600 mt-1.5">
                  Invalid IPv4 address octet (300 exceeds 255). Please specify a valid CIDR block.
                </p>
              </div>

              {/* Field 3: Required / Pristine with Tooltip */}
              <div>
                <label className="block text-[12px] font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>
                    SOC Escalation PagerDuty Key <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-slate-400 font-mono text-[10px]">REQUIRED</span>
                </label>
                <input
                  type="text"
                  value={webhookKey}
                  onChange={(e) => setWebhookKey(e.target.value)}
                  placeholder="sk_live_sec_..."
                  className="w-full px-3 py-2 text-[13px] border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 font-mono"
                />
                <p className="text-[11.5px] text-slate-500 mt-1.5">
                  Mandatory for severity SEV-1 emergency on-call paging notifications.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          SECTION H & J: STATUS BADGES TAXONOMY & MODAL PREVIEWS
         ───────────────────────────────────────────────────────────────────────── */}
      {(activeTab === 'all' || activeTab === 'security') && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              <h2 className="text-[16px] font-bold text-slate-900">
                Security Badges & Dialog Triggers
              </h2>
            </div>
            <span className="text-[10px] font-mono text-slate-400">CATEGORY I & J • STATUS MATRICES</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
            <div>
              <div className="text-[12px] font-mono text-slate-400 mb-3 uppercase tracking-wide">
                Security Scan Lifecycle Badges:
              </div>
              <div className="flex flex-wrap gap-2.5">
                <ScanStatusBadge status="QUEUED" />
                <ScanStatusBadge status="RUNNING" />
                <ScanStatusBadge status="COMPLETED" findingsCount={0} />
                <ScanStatusBadge status="COMPLETED_WITH_FINDINGS" findingsCount={7} />
                <ScanStatusBadge status="FAILED" />
                <ScanStatusBadge status="AWAITING_APPROVAL" />
              </div>
            </div>

            <div>
              <div className="text-[12px] font-mono text-slate-400 mb-3 uppercase tracking-wide">
                Vulnerability Lifecycle Badges:
              </div>
              <div className="flex flex-wrap gap-2.5">
                <VulnerabilityStatusBadge status="INVESTIGATING" />
                <VulnerabilityStatusBadge status="CONFIRMED" />
                <VulnerabilityStatusBadge status="FIXED" />
                <VulnerabilityStatusBadge status="VERIFIED" />
                <VulnerabilityStatusBadge status="FALSE_POSITIVE" />
                <VulnerabilityStatusBadge status="ACCEPTED_RISK" />
              </div>
            </div>

            <div>
              <div className="text-[12px] font-mono text-slate-400 mb-3 uppercase tracking-wide">
                Runtime Daemon & Integration Health:
              </div>
              <div className="flex flex-wrap gap-2.5">
                <RuntimeStatusBadge status="HEALTHY" />
                <RuntimeStatusBadge status="DEGRADED" />
                <RuntimeStatusBadge status="OFFLINE" />
                <ConnectionStatusBadge status="CONNECTED" provider="GitHub" />
                <ConnectionStatusBadge status="DISCONNECTED" provider="AWS Cloud" />
              </div>
            </div>

            {/* Modal Dialog Triggers */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setShowSessionModal(true)}
                className="px-4 py-2 bg-slate-900 text-white text-[12.5px] font-semibold rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Lock size={14} />
                <span>Trigger Session Expired Dialog</span>
              </button>

              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                className="px-4 py-2 bg-rose-600 text-white text-[12.5px] font-semibold rounded-lg hover:bg-rose-700 transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <AlertTriangle size={14} />
                <span>Trigger Destructive Confirmation Dialog</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Interactive Modals */}
      <SessionExpiredDialog
        isOpen={showSessionModal}
        userEmail="security-lead@kavach.corp"
        onReauthenticate={async () => {
          await new Promise((r) => setTimeout(r, 600));
          setShowSessionModal(false);
          return { success: true };
        }}
        onClose={() => setShowSessionModal(false)}
      />

      <ConfirmDialog
        isOpen={showConfirmModal}
        title="Quarantine Kubernetes Host Worker 02"
        description="This will inject iptables drop rules isolating the node from cluster networking. All running pods will be terminated."
        requiresConfirmationWord="QUARANTINE"
        confirmLabel="Execute Quarantine"
        onConfirm={() => {
          setShowConfirmModal(false);
          alert('Host quarantined successfully.');
        }}
        onCancel={() => setShowConfirmModal(false)}
      />
    </div>
  );
}
