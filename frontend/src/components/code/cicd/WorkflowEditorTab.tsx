'use client';

/**
 * WorkflowEditorTab — Pixel-perfect implementation of media_1790776541488.png
 * 
 * Three-column layout:
 * 1. Left: Pipeline Configuration (provider select) + Pipeline Steps (8 reorderable steps)
 * 2. Center: Workflow YAML Editor with line numbers, template selector, copy, and syntax view
 * 3. Right: Configuration Details & Variables form with real DB persistence (Save Pipeline)
 */

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api/client';
import {
  CICDWorkflowConfigResponse,
  CICDWorkflowStepItem,
  CICDWorkflowSaveRequest,
} from '@/types/api/cicd';
import {
  GitBranch,
  Cpu,
  Package,
  FlaskConical,
  Box,
  Shield,
  Rocket,
  CheckCircle2,
  MoreVertical,
  Plus,
  ChevronDown,
  Copy,
  Check,
  Save,
  RotateCw,
  Sliders,
  Variable,
  AlertCircle,
  ExternalLink,
  Code2,
  Trash2,
  FileCode,
  Triangle,
} from 'lucide-react';

const GithubIcon = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

interface WorkflowEditorTabProps {
  repositoryId: string;
  projectId?: string;
  onViewRuns?: () => void;
  onRunPipeline?: () => void;
}

export function WorkflowEditorTab({
  repositoryId,
  projectId,
  onViewRuns,
  onRunPipeline,
}: WorkflowEditorTabProps) {
  const [config, setConfig] = useState<CICDWorkflowConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states (matching screenshot media_1790776541488.png)
  const [pipelineName, setPipelineName] = useState('CI/CD Pipeline');
  const [description, setDescription] = useState('Build, test, scan and deploy the frontend application');
  const [triggerEvents, setTriggerEvents] = useState({
    push_to_main: true,
    pull_request: true,
    schedule: false,
    manual_trigger: false,
  });
  const [nodeVersion, setNodeVersion] = useState('20');
  const [buildCommand, setBuildCommand] = useState('npm run build');
  const [testCommand, setTestCommand] = useState('npm test -- --coverage');
  const [deploymentTarget, setDeploymentTarget] = useState('Vercel');
  const [deployToProduction, setDeployToProduction] = useState(true);
  const [yamlContent, setYamlContent] = useState('');
  const [steps, setSteps] = useState<CICDWorkflowStepItem[]>([]);

  // Right panel subtab: 'Details' | 'Variables'
  const [activeSideTab, setActiveSideTab] = useState<'Details' | 'Variables'>('Details');

  // UI state
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [addStepModalOpen, setAddStepModalOpen] = useState(false);
  const [newStepName, setNewStepName] = useState('');
  const [newStepCommand, setNewStepCommand] = useState('');

  // 1. Fetch live workflow config from backend
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.cicd.workflowConfig({ repositoryId })
      .then((res) => {
        if (!cancelled) {
          setConfig(res);
          setPipelineName(res.name || 'CI/CD Pipeline');
          setDescription(res.description || 'Build, test, scan and deploy the frontend application');
          if (res.trigger_events) {
            setTriggerEvents({
              push_to_main: res.trigger_events.push_to_main ?? true,
              pull_request: res.trigger_events.pull_request ?? true,
              schedule: res.trigger_events.schedule ?? false,
              manual_trigger: res.trigger_events.manual_trigger ?? false,
            });
          }
          setNodeVersion(res.node_version || '20');
          setBuildCommand(res.build_command || 'npm run build');
          setTestCommand(res.test_command || 'npm test -- --coverage');
          setDeploymentTarget(res.deployment_target || 'Vercel');
          setDeployToProduction(res.deploy_to_production ?? true);
          setYamlContent(res.workflow_yaml || '');
          setSteps(res.steps || []);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Failed to load workflow configuration');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [repositoryId]);

  // Handle Save
  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const payload: CICDWorkflowSaveRequest = {
        repository_id: repositoryId,
        name: pipelineName,
        description,
        trigger_events: triggerEvents,
        node_version: nodeVersion,
        build_command: buildCommand,
        test_command: testCommand,
        deployment_target: deploymentTarget,
        deploy_to_production: deployToProduction,
        workflow_yaml: yamlContent,
        steps,
      };
      await api.cicd.saveWorkflowConfig(payload);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert('Failed to save pipeline: ' + (err?.message || 'Network error'));
    } finally {
      setSaving(false);
    }
  };

  const handleCopyYaml = () => {
    navigator.clipboard.writeText(yamlContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSelectTemplate = (slug: string) => {
    setTemplateMenuOpen(false);
    if (slug === 'nextjs-ci') {
      setYamlContent(`name: Next.js Production Pipeline
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test -- --coverage
      - run: npm run build
      - name: SecuLayer SAST Gate
        run: npm run sast
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: \${{ secrets.VERCEL_TOKEN }}
`);
    } else if (slug === 'docker-build') {
      setYamlContent(`name: Docker Container Security Pipeline
on:
  push:
    branches: [ main ]
jobs:
  container:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t frontend-app:latest .
      - name: Trivy Vulnerability Scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'frontend-app:latest'
          format: 'table'
          exit-code: '1'
          severity: 'CRITICAL,HIGH'
`);
    }
  };

  const handleAddStep = () => {
    if (!newStepName.trim()) return;
    const newStep: CICDWorkflowStepItem = {
      id: `step-${Date.now()}`,
      name: newStepName.trim(),
      action_or_command: newStepCommand.trim() || 'npm test',
      icon: 'box',
      status: 'Success',
      order: steps.length + 1,
    };
    setSteps([...steps, newStep]);
    setNewStepName('');
    setNewStepCommand('');
    setAddStepModalOpen(false);
  };

  const handleDeleteStep = (id: string) => {
    setSteps(steps.filter(s => s.id !== id));
  };

  // Helper icon renderer
  const renderStepIcon = (iconName: string) => {
    switch (iconName) {
      case 'git-branch': return <GitBranch size={16} color="#6366F1" />;
      case 'github': return <GithubIcon size={16} color="#0F172A" />;
      case 'cpu': return <Cpu size={16} color="#16A34A" />;
      case 'box': return <Package size={16} color="#2563EB" />;
      case 'flask': return <FlaskConical size={16} color="#8B5CF6" />;
      case 'cube': return <Box size={16} color="#3B82F6" />;
      case 'shield': return <Shield size={16} color="#0284C7" />;
      case 'rocket': return <Rocket size={16} color="#3B82F6" />;
      default: return <Box size={16} color="#64748B" />;
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
        <RotateCw size={24} style={{ animation: 'spin 1s linear infinite', color: '#2563EB', marginBottom: '12px' }} />
        <span style={{ fontSize: '14px', color: '#64748B', fontWeight: 500 }}>Loading workflow editor...</span>
      </div>
    );
  }

  // Generate line numbers array from yamlContent
  const lines = yamlContent.split('\n');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '290px 1fr 340px', gap: '20px', alignItems: 'start', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      
      {/* ========================================================================= */}
      {/* 1. LEFT COLUMN: Pipeline Configuration & Steps */}
      {/* ========================================================================= */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Pipeline Configuration Card */}
        <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginBottom: '12px' }}>
            Pipeline Configuration
          </h3>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
            background: '#F8FAFC',
            cursor: 'pointer',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <GithubIcon size={18} color="#0F172A" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>GitHub Actions</span>
            </div>
            <ChevronDown size={16} color="#64748B" />
          </div>
        </div>

        {/* Pipeline Steps Card */}
        <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
              Pipeline Steps
            </h3>
            <button
              onClick={() => setAddStepModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'transparent',
                border: 'none',
                color: '#2563EB',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              <Plus size={13} /> Add Step
            </button>
          </div>

          {/* List of 8 Steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {steps.map((step, idx) => (
              <div
                key={step.id || idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  background: '#FFFFFF',
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Drag handle & Icon & Text */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', cursor: 'grab', color: '#94A3B8' }}>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      <span style={{ width: '2px', height: '2px', background: '#94A3B8', borderRadius: '50%' }} />
                      <span style={{ width: '2px', height: '2px', background: '#94A3B8', borderRadius: '50%' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      <span style={{ width: '2px', height: '2px', background: '#94A3B8', borderRadius: '50%' }} />
                      <span style={{ width: '2px', height: '2px', background: '#94A3B8', borderRadius: '50%' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      <span style={{ width: '2px', height: '2px', background: '#94A3B8', borderRadius: '50%' }} />
                      <span style={{ width: '2px', height: '2px', background: '#94A3B8', borderRadius: '50%' }} />
                    </div>
                  </div>

                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {renderStepIcon(step.icon)}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {step.name}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {step.action_or_command}
                    </span>
                  </div>
                </div>

                {/* Status check & 3-dots */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <CheckCircle2 size={16} color="#16A34A" />
                  <button
                    onClick={() => handleDeleteStep(step.id)}
                    title="Remove step"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: '#94A3B8' }}
                  >
                    <MoreVertical size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CENTER COLUMN: Workflow File Editor */}
      {/* ========================================================================= */}
      <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
        {/* Editor Header */}
        <div style={{
          padding: '12px 18px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#F8FAFC',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>Workflow File</span>
            <span style={{ fontSize: '12px', color: '#64748B', fontFamily: 'monospace' }}>.github/workflows/ci-cd.yml</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
            {/* Change Template dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setTemplateMenuOpen(!templateMenuOpen)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Change Template <ChevronDown size={13} />
              </button>

              {templateMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '4px',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  zIndex: 50,
                  width: '200px',
                  overflow: 'hidden',
                }}>
                  <div
                    onClick={() => handleSelectTemplate('nextjs-ci')}
                    style={{ padding: '8px 12px', fontSize: '12px', cursor: 'pointer', color: '#0F172A', borderBottom: '1px solid #F1F5F9' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
                  >
                    Next.js CI/CD Pipeline
                  </div>
                  <div
                    onClick={() => handleSelectTemplate('docker-build')}
                    style={{ padding: '8px 12px', fontSize: '12px', cursor: 'pointer', color: '#0F172A' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
                  >
                    Docker Container Security
                  </div>
                </div>
              )}
            </div>

            {/* YAML Pill */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#475569',
              fontSize: '12px',
              fontWeight: 500,
            }}>
              YAML <ChevronDown size={13} />
            </div>

            {/* Copy button */}
            <button
              onClick={handleCopyYaml}
              title="Copy YAML"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: copied ? '#16A34A' : '#475569',
                cursor: 'pointer',
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        {/* Editor Body with Line Numbers */}
        <div style={{ display: 'flex', minHeight: '620px', background: '#FAFAFA' }}>
          {/* Line Numbers Column */}
          <div style={{
            padding: '16px 12px',
            background: '#F8FAFC',
            borderRight: '1px solid #E2E8F0',
            textAlign: 'right',
            userSelect: 'none',
            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
            fontSize: '12px',
            lineHeight: '21px',
            color: '#94A3B8',
            minWidth: '44px',
          }}>
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>

          {/* Code Textarea */}
          <textarea
            value={yamlContent}
            onChange={(e) => setYamlContent(e.target.value)}
            spellCheck={false}
            style={{
              flex: 1,
              padding: '16px',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              fontSize: '12px',
              lineHeight: '21px',
              color: '#0F172A',
              resize: 'none',
              whiteSpace: 'pre',
              overflowWrap: 'normal',
              overflowX: 'auto',
            }}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. RIGHT COLUMN: Details & Variables Drawer */}
      {/* ========================================================================= */}
      <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '18px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
        {/* Drawer Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', marginBottom: '18px' }}>
          <button
            onClick={() => setActiveSideTab('Details')}
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: 600,
              background: 'transparent',
              border: 'none',
              borderBottom: activeSideTab === 'Details' ? '2px solid #2563EB' : '2px solid transparent',
              color: activeSideTab === 'Details' ? '#2563EB' : '#64748B',
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            Details
          </button>
          <button
            onClick={() => setActiveSideTab('Variables')}
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: 600,
              background: 'transparent',
              border: 'none',
              borderBottom: activeSideTab === 'Variables' ? '2px solid #2563EB' : '2px solid transparent',
              color: activeSideTab === 'Variables' ? '#2563EB' : '#64748B',
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            Variables
          </button>
        </div>

        {activeSideTab === 'Details' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Name */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Name
              </label>
              <input
                type="text"
                value={pipelineName}
                onChange={(e) => setPipelineName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  color: '#0F172A',
                  outline: 'none',
                }}
              />
            </div>

            {/* Description */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12px',
                  color: '#0F172A',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Trigger Events */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                Trigger Events
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#0F172A', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={triggerEvents.push_to_main}
                    onChange={(e) => setTriggerEvents({ ...triggerEvents, push_to_main: e.target.checked })}
                    style={{ accentColor: '#2563EB' }}
                  />
                  Push to main
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#0F172A', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={triggerEvents.pull_request}
                    onChange={(e) => setTriggerEvents({ ...triggerEvents, pull_request: e.target.checked })}
                    style={{ accentColor: '#2563EB' }}
                  />
                  Pull request
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#0F172A', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={triggerEvents.schedule}
                    onChange={(e) => setTriggerEvents({ ...triggerEvents, schedule: e.target.checked })}
                    style={{ accentColor: '#2563EB' }}
                  />
                  Schedule
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#0F172A', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={triggerEvents.manual_trigger}
                    onChange={(e) => setTriggerEvents({ ...triggerEvents, manual_trigger: e.target.checked })}
                    style={{ accentColor: '#2563EB' }}
                  />
                  Manual trigger
                </label>
              </div>
            </div>

            {/* Node Version */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Node Version
              </label>
              <select
                value={nodeVersion}
                onChange={(e) => setNodeVersion(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  color: '#0F172A',
                  background: '#FFFFFF',
                  outline: 'none',
                }}
              >
                <option value="16">16</option>
                <option value="18">18</option>
                <option value="20">20</option>
                <option value="22">22</option>
              </select>
            </div>

            {/* Build Command */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Build Command
              </label>
              <input
                type="text"
                value={buildCommand}
                onChange={(e) => setBuildCommand(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  color: '#0F172A',
                  outline: 'none',
                }}
              />
            </div>

            {/* Test Command */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Test Command
              </label>
              <input
                type="text"
                value={testCommand}
                onChange={(e) => setTestCommand(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  color: '#0F172A',
                  outline: 'none',
                }}
              />
            </div>

            {/* Deployment */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Deployment
              </label>
              <select
                value={deploymentTarget}
                onChange={(e) => setDeploymentTarget(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  color: '#0F172A',
                  background: '#FFFFFF',
                  outline: 'none',
                }}
              >
                <option value="Vercel">▲ Vercel</option>
                <option value="AWS">AWS ECS / S3</option>
                <option value="Docker">Docker Registry</option>
                <option value="None">None (CI only)</option>
              </select>
            </div>

            {/* Environment */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                  Environment
                </label>
                <span style={{ fontSize: '11px', color: '#2563EB', cursor: 'pointer', fontWeight: 500 }}>
                  Manage
                </span>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#0F172A', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={deployToProduction}
                  onChange={(e) => setDeployToProduction(e.target.checked)}
                  style={{ accentColor: '#2563EB' }}
                />
                Deploy to production
              </label>
            </div>

            {/* Feedback alert */}
            {saveSuccess && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '6px',
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                color: '#065F46',
                fontSize: '12px',
                fontWeight: 500,
              }}>
                <CheckCircle2 size={14} color="#059669" />
                Pipeline configuration saved!
              </div>
            )}

            {/* Bottom Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#334155',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                style={{
                  flex: 1.4,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#2563EB',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {saving ? <RotateCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
                {saving ? 'Saving...' : 'Save Pipeline'}
              </button>
            </div>
          </div>
        ) : (
          /* Variables Subtab */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <span style={{ fontSize: '12px', color: '#64748B' }}>
              Environment variables and repository secrets injected into workflow runner:
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Variable</div>
                <div style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 600, color: '#0F172A' }}>NODE_ENV = production</div>
              </div>
              <div style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Secret</div>
                <div style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 600, color: '#0F172A' }}>VERCEL_TOKEN = ••••••••••••</div>
              </div>
              <div style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Secret</div>
                <div style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 600, color: '#0F172A' }}>VERCEL_ORG_ID = ••••••••••••</div>
              </div>
              <div style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Secret</div>
                <div style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 600, color: '#0F172A' }}>VERCEL_PROJECT_ID = ••••••••••••</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Step Modal */}
      {addStepModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            padding: '24px',
            width: '400px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', marginBottom: '16px' }}>
              Add Pipeline Step
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#475569', marginBottom: '4px' }}>
                  Step Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lint Application"
                  value={newStepName}
                  onChange={(e) => setNewStepName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#475569', marginBottom: '4px' }}>
                  Command or Action
                </label>
                <input
                  type="text"
                  placeholder="e.g. npm run lint"
                  value={newStepCommand}
                  onChange={(e) => setNewStepCommand(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', fontFamily: 'monospace' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setAddStepModalOpen(false)}
                style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', fontSize: '13px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddStep}
                style={{ padding: '8px 14px', borderRadius: '6px', border: 'none', background: '#2563EB', color: '#FFFFFF', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Add Step
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
