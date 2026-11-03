'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Play,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Database,
  Cpu,
  Key,
  Layers,
  Code2,
  FileCode,
  Server,
  Globe,
  Radio,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  CheckSquare,
  Square,
  Sliders,
  Sparkles,
  Info,
  Check,
  RefreshCw,
} from 'lucide-react';
import { KavachApiLayout } from '../components/KavachApiLayout';
import { useApiSecurity } from '../context/ApiSecurityContext';
import { api } from '@/lib/api/client';
import { toast } from '@/lib/toast';

interface TestCategoryItem {
  id: string;
  name: string;
  description: string;
  owaspTag: string;
  recommended: boolean;
  icon: any;
}

const ALL_CATEGORIES: TestCategoryItem[] = [
  {
    id: 'auth',
    name: 'Authentication Testing',
    description: 'Broken authentication, weak tokens, JWT manipulation, session fixation',
    owaspTag: 'API2:2023',
    recommended: true,
    icon: Lock,
  },
  {
    id: 'authz',
    name: 'Authorization Testing (BOLA/IDOR)',
    description: 'Broken object level authorization, tenant isolation bypass, privilege escalation',
    owaspTag: 'API1:2023',
    recommended: true,
    icon: ShieldAlert,
  },
  {
    id: 'rate_limit',
    name: 'Rate Limiting & Abuse',
    description: 'Resource exhaustion, algorithmic complexity, unrestricted endpoint access',
    owaspTag: 'API4:2023',
    recommended: true,
    icon: Cpu,
  },
  {
    id: 'injection',
    name: 'Injection Testing',
    description: 'SQLi, NoSQL injection, command execution, template injection in payload parameters',
    owaspTag: 'API8:2023',
    recommended: true,
    icon: Database,
  },
  {
    id: 'data_exposure',
    name: 'Excessive Data Exposure',
    description: 'PII leakage, internal object leaks, unredacted tokens, mass assignment',
    owaspTag: 'API3:2023',
    recommended: true,
    icon: Shield,
  },
  {
    id: 'business_logic',
    name: 'Business Logic Flaws',
    description: 'Order tampering, price manipulation, multi-step transaction race conditions',
    owaspTag: 'API6:2023',
    recommended: true,
    icon: Layers,
  },
  {
    id: 'misconfig',
    name: 'Security Misconfiguration',
    description: 'Permissive CORS, debug headers, exposed stack traces, default credentials',
    owaspTag: 'API7:2023',
    recommended: true,
    icon: Sliders,
  },
  {
    id: 'graphql',
    name: 'GraphQL Security',
    description: 'Introspection abuse, circular nested queries, batch query amplification',
    owaspTag: 'API5:2023',
    recommended: false,
    icon: Code2,
  },
  {
    id: 'websocket',
    name: 'WebSocket Security',
    description: 'Cross-site WebSocket hijacking, unauthenticated handshake, message flooding',
    owaspTag: 'API9:2023',
    recommended: false,
    icon: Radio,
  },
  {
    id: 'grpc',
    name: 'gRPC / Protobuf Security',
    description: 'Method-level authorization interceptors, unbounded protobuf message size, type validation',
    owaspTag: 'API1:2023',
    recommended: true,
    icon: Server,
  },
  {
    id: 'ssrf_advanced',
    name: 'SSRF & Cloud Metadata Probes',
    description: 'Cloud metadata exfiltration (169.254.169.254), private loopback probing, out-of-band checks',
    owaspTag: 'API8:2023',
    recommended: true,
    icon: Globe,
  },
  {
    id: 'mfa_revocation',
    name: 'MFA Step-Up & Session Revocation',
    description: 'Sensitive transaction step-up MFA challenge, revoked token reuse, session invalidation',
    owaspTag: 'API2:2023',
    recommended: true,
    icon: Key,
  },
  {
    id: 'otp_password_reset',
    name: 'OTP & Password Reset Protection',
    description: 'OTP brute-force throttling, email dispatch abuse prevention, token entropy validation',
    owaspTag: 'API4:2023',
    recommended: true,
    icon: ShieldAlert,
  },
  {
    id: 'input_file_upload',
    name: 'File Upload & Encoding Validation',
    description: 'Unsafe extension bypass, SVG script sanitization, double-encoding normalization',
    owaspTag: 'API8:2023',
    recommended: true,
    icon: FileCode,
  },
  {
    id: 'supply_chain',
    name: 'Dependency & Supply Chain',
    description: 'Known CVEs in API dependencies, vulnerable middleware components',
    owaspTag: 'API10:2023',
    recommended: true,
    icon: Layers,
  },
];

export default function SecurityAnalysisPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryApiId = searchParams.get('apiId');

  const { apis, selectedApi, setSelectedApi } = useApiSecurity();
  const activeApi = (queryApiId ? apis.find((a) => a.id === queryApiId) : null) || selectedApi || apis[0];

  // Guided Flow Step: 1 = Scope, 2 = Test Categories, 3 = Review & Pre-flight, 4 = Run Analysis
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Scope selection
  const [scopeType, setScopeType] = useState<'all' | 'selected'>('all');
  const [environment, setEnvironment] = useState<'staging' | 'production' | 'development'>('staging');
  const [selectedEndpoints, setSelectedEndpoints] = useState<string[]>([]);
  const [availableEndpoints, setAvailableEndpoints] = useState<any[]>([]);

  // Category selection (all recommended checked by default)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    ALL_CATEGORIES.map((c) => c.id)
  );

  // Scan execution state
  const [isStartingScan, setIsStartingScan] = useState(false);
  const [prechecksPassed, setPrechecksPassed] = useState(true);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isValidatingTarget, setIsValidatingTarget] = useState(false);
  const [targetValidation, setTargetValidation] = useState<{
    valid: boolean;
    reachable: boolean;
    statusCode: number | null;
    message: string;
  } | null>(null);

  // Load endpoints for active API
  useEffect(() => {
    if (activeApi?.id) {
      api.apiSecurity.getEndpoints(activeApi.id)
        .then((res: any) => {
          const list = res?.endpoints || res?.items || res || [];
          setAvailableEndpoints(list);
          setSelectedEndpoints(list.map((e: any) => e.id));
        })
        .catch(() => {
          setAvailableEndpoints([]);
        });
    }
  }, [activeApi?.id]);

  // Pre-flight reachability & SSRF check with retry capability
  const handleValidateTarget = async () => {
    if (!activeApi?.base_url) return;
    setIsValidatingTarget(true);
    try {
      const res = await api.apiSecurity.validateTarget({ base_url: activeApi.base_url, environment });
      setTargetValidation({
        valid: res?.valid ?? true,
        reachable: res?.reachable ?? false,
        statusCode: res?.status_code ?? null,
        message: res?.message || (res?.reachable ? 'Target reached successfully.' : 'Target unreachable.'),
      });
      setPrechecksPassed(res?.valid !== false);
    } catch (err: any) {
      setTargetValidation({
        valid: false,
        reachable: false,
        statusCode: null,
        message: err?.message || 'Pre-flight check failed. Please verify host accessibility.',
      });
      setPrechecksPassed(false);
    } finally {
      setIsValidatingTarget(false);
    }
  };

  useEffect(() => {
    handleValidateTarget();
  }, [activeApi?.base_url, environment]);

  // Load test plan preview dynamically whenever selections change
  useEffect(() => {
    if (activeApi?.id && selectedCategoryIds.length > 0) {
      setIsLoadingPreview(true);
      const selectedNames = ALL_CATEGORIES.filter((c) => selectedCategoryIds.includes(c.id)).map((c) => c.name);
      api.apiSecurity.previewTestPlan(activeApi.id, {
        name: `Preview Plan - ${environment}`,
        selected_categories: selectedNames,
        configurations: {
          environment,
          scope_type: scopeType,
          selected_endpoint_ids: selectedEndpoints,
          categories: selectedCategoryIds,
        },
      })
        .then((prev: any) => {
          setPreviewData(prev);
        })
        .catch((err) => {
          console.warn('Preview generation notice:', err);
        })
        .finally(() => {
          setIsLoadingPreview(false);
        });
    } else {
      setPreviewData(null);
    }
  }, [activeApi?.id, selectedCategoryIds, scopeType, selectedEndpoints, environment]);

  const toggleCategory = (id: string) => {
    if (selectedCategoryIds.includes(id)) {
      setSelectedCategoryIds(selectedCategoryIds.filter((c) => c !== id));
    } else {
      setSelectedCategoryIds([...selectedCategoryIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedCategoryIds.length === ALL_CATEGORIES.length) {
      setSelectedCategoryIds([]);
    } else {
      setSelectedCategoryIds(ALL_CATEGORIES.map((c) => c.id));
    }
  };

  const handleSelectRecommended = () => {
    setSelectedCategoryIds(ALL_CATEGORIES.filter((c) => c.recommended).map((c) => c.id));
  };

  const handleRunAnalysis = async () => {
    if (!activeApi) {
      alert('Please select or discover an API target first.');
      return;
    }

    if (selectedCategoryIds.length === 0) {
      alert('Please select at least one test category to run.');
      return;
    }

    setIsStartingScan(true);
    try {
      // 1. Create real test plan
      const selectedNames = ALL_CATEGORIES.filter((c) => selectedCategoryIds.includes(c.id)).map((c) => c.name);
      const scanConfig = {
        environment,
        scope_type: scopeType,
        selected_endpoint_ids: scopeType === 'all' ? [] : selectedEndpoints,
        endpoint_count: scopeType === 'all' ? (availableEndpoints.length || 8) : selectedEndpoints.length,
        categories: selectedNames,
        concurrency: 5,
        timeout_seconds: 15,
        rps_cap: 25,
      };

      const plan = await api.apiSecurity.createTestPlan(activeApi.id, {
        name: `Security Scan Plan - ${environment.toUpperCase()} (${new Date().toLocaleDateString()})`,
        selected_categories: selectedNames,
        configurations: scanConfig,
      });

      // 2. Launch real scan execution
      const scan = await api.apiSecurity.startScan({
        api_id: activeApi.id,
        plan_id: plan?.id,
        scan_config: scanConfig,
      });

      const targetScanId = scan?.scan_id || scan?.id || 'latest';
      toast.success('Security analysis suite started successfully!');
      router.push(`/api-security/scans/${targetScanId}`);
    } catch (err: any) {
      console.error('Failed to trigger scan:', err);
      toast.error(err?.message || 'Failed to start security scan. Please check target configuration.');
    } finally {
      setIsStartingScan(false);
    }
  };

  return (
    <KavachApiLayout
      activeApiId={activeApi?.id}
      subnavTabs={[
        { id: 'wizard', label: 'Guided Security Analysis', href: `/api-security/analysis?apiId=${activeApi?.id || ''}`, active: true },
        { id: 'schedule', label: 'Schedule Automated Scans', href: `/api-security/analysis/schedule?apiId=${activeApi?.id || ''}`, active: false },
      ]}
      headerAction={
        <button
          type="button"
          onClick={handleRunAnalysis}
          disabled={isStartingScan || selectedCategoryIds.length === 0}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#2563EB',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            padding: '7px 18px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: isStartingScan ? 'not-allowed' : 'pointer',
            boxShadow: '0 1px 3px rgba(37, 99, 235, 0.25)',
          }}
        >
          {isStartingScan ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>Starting Security Engine...</span>
            </>
          ) : (
            <>
              <Play size={13} fill="#FFFFFF" />
              <span>Run Analysis ({selectedCategoryIds.length} Categories)</span>
            </>
          )}
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1240px', margin: '0 auto' }}>
        
        {/* Top Back Navigation to API Inventory */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => router.push('/api-security/apis')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '6px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#334155',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              transition: 'all 0.15s ease',
            }}
          >
            <ArrowLeft size={14} />
            <span>Back to API Inventory</span>
          </button>
        </div>

        {/* Page Title & Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Configure Security Analysis
            </h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
              Define testing scope, configure automated test suites, and launch deterministic API risk analysis.
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Target API:</span>
            <span style={{ 
              fontSize: '12px', 
              fontWeight: 600, 
              color: '#0F172A', 
              backgroundColor: '#F1F5F9', 
              padding: '4px 10px', 
              borderRadius: '6px',
              border: '1px solid #E2E8F0'
            }}>
              {activeApi?.name || (apis.length > 0 ? apis[0].name : 'No Target Configured')}
            </span>
          </div>
        </div>

        {/* Guided 4-Step Stepper */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '14px 28px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          {[
            { step: 1, label: '1. Select Scope', desc: `${scopeType === 'all' ? (availableEndpoints.length || 'All') : selectedEndpoints.length} Routes • ${environment}` },
            { step: 2, label: '2. Test Categories', desc: `${selectedCategoryIds.length} Suites Enabled` },
            { step: 3, label: '3. Review & Pre-flight', desc: targetValidation?.reachable ? 'Reachable & Ready' : targetValidation === null ? 'Checking Target...' : 'Target Unreachable' },
            { step: 4, label: '4. Run Analysis', desc: 'Launch & Monitor' },
          ].map((item, idx) => {
            const isCompleted = currentStep > item.step;
            const isCurrent = currentStep === item.step;
            return (
              <React.Fragment key={item.step}>
                <div
                  onClick={() => setCurrentStep(item.step as any)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: isCompleted ? '#047857' : isCurrent ? '#2563EB' : '#F1F5F9',
                      color: isCompleted || isCurrent ? '#FFFFFF' : '#334155',
                      fontSize: '12px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: isCurrent ? '2px solid #BFDBFE' : 'none',
                    }}
                  >
                    {isCompleted ? <Check size={14} /> : item.step}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: isCurrent ? '#0F172A' : '#64748B' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: '11px', color: '#475569' }}>{item.desc}</div>
                  </div>
                </div>

                {idx < 3 && (
                  <div
                    style={{
                      flex: 1,
                      height: '1px',
                      backgroundColor: isCompleted ? '#10B981' : '#E2E8F0',
                      margin: '0 20px',
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Main 3-Column Configuration Grid (Screen 6 Reference) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '300px 1fr 320px',
            gap: '20px',
            alignItems: 'start',
          }}
        >
          {/* Column 1: Select Scope */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            <div>
              <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>
                1. Select Scope
              </h2>
              <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                Choose which APIs and environment to test against.
              </p>
            </div>

            {/* Scope Radios */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label
                onClick={() => setScopeType('all')}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${scopeType === 'all' ? '#2563EB' : '#E2E8F0'}`,
                  backgroundColor: scopeType === 'all' ? '#EFF6FF' : '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <input
                  type="radio"
                  name="scope"
                  checked={scopeType === 'all'}
                  onChange={() => setScopeType('all')}
                  style={{ marginTop: '2px', accentColor: '#2563EB' }}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                    All discovered APIs
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                    Run comprehensive tests across the complete discovered attack surface ({availableEndpoints.length || 8} endpoints).
                  </div>
                </div>
              </label>

              <label
                onClick={() => setScopeType('selected')}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${scopeType === 'selected' ? '#2563EB' : '#E2E8F0'}`,
                  backgroundColor: scopeType === 'selected' ? '#EFF6FF' : '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <input
                  type="radio"
                  name="scope"
                  checked={scopeType === 'selected'}
                  onChange={() => setScopeType('selected')}
                  style={{ marginTop: '2px', accentColor: '#2563EB' }}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                    Selected APIs
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                    Target specific high-criticality services or endpoints only.
                  </div>
                </div>
              </label>
            </div>

            {/* Environment Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="environment-select" style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                Select Environment
              </label>
              <select
                id="environment-select"
                aria-label="Select Target Environment"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  fontSize: '13px',
                  color: '#0F172A',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="staging">Staging (api-staging.internal)</option>
                <option value="development">Development (localhost:8000)</option>
                <option value="production">Production (api.prod.gateway)</option>
              </select>
              <span style={{ fontSize: '11px', color: '#475569' }}>
                Isolated fuzzing container will target this environment without rate throttling.
              </span>
            </div>

            {/* Base URL info */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: '6px',
                padding: '10px 12px',
                border: '1px solid #E2E8F0',
              }}
            >
              <div style={{ fontSize: '11px', color: '#64748B' }}>Base Target URL:</div>
              <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#0F172A', fontWeight: 600, marginTop: '2px' }}>
                {activeApi?.base_url || 'https://api-staging.kavach.corp/v1'}
              </div>
            </div>
          </div>

          {/* Column 2: Select Test Categories */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>
                  2. Select Test Categories
                </h2>
                <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                  Choose which OWASP API Security Top 10 vulnerabilities to analyze.
                </p>
              </div>

              {/* Quick Actions */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#2563EB',
                    background: 'none',
                    border: '1px solid #BFDBFE',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    cursor: 'pointer',
                  }}
                >
                  {selectedCategoryIds.length === ALL_CATEGORIES.length ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  type="button"
                  onClick={handleSelectRecommended}
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#047857',
                    background: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    cursor: 'pointer',
                  }}
                >
                  Recommended
                </button>
              </div>
            </div>

            {/* Test Categories List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {ALL_CATEGORIES.map((cat) => {
                const isChecked = selectedCategoryIds.includes(cat.id);
                const Icon = cat.icon;

                return (
                  <div
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: isChecked ? '#F8FAFC' : '#FFFFFF',
                      border: `1px solid ${isChecked ? '#BFDBFE' : '#E2E8F0'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ color: isChecked ? '#2563EB' : '#CBD5E1', display: 'flex', alignItems: 'center' }}>
                        {isChecked ? <CheckSquare size={17} /> : <Square size={17} />}
                      </div>

                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          backgroundColor: isChecked ? '#EFF6FF' : '#F1F5F9',
                          color: isChecked ? '#2563EB' : '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon size={14} />
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                            {cat.name}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              fontFamily: 'monospace',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              backgroundColor: '#F1F5F9',
                              color: '#475569',
                            }}
                          >
                            {cat.owaspTag}
                          </span>
                          {cat.recommended && (
                            <span
                              style={{
                                padding: '1px 5px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 600,
                                backgroundColor: '#ECFDF5',
                                color: '#047857',
                              }}
                            >
                              Recommended
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                          {cat.description}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 3: Pre-requisite Checks & Review */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Pre-requisite Checks Card */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div>
                <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>
                  Pre-requisite Checks
                </h2>
                <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                  Automated checks verified before initiating test runner.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* 1. Target Reachability & SSRF check */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '10px',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: targetValidation?.valid === false ? '#FEF2F2' : targetValidation?.reachable ? '#F0FDF4' : '#FFFBEB',
                    border: `1px solid ${targetValidation?.valid === false ? '#FECACA' : targetValidation?.reachable ? '#BBF7D0' : '#FDE68A'}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    {isValidatingTarget || targetValidation === null ? (
                      <Loader2 size={16} color="#2563EB" className="animate-spin" style={{ marginTop: '2px', flexShrink: 0 }} />
                    ) : targetValidation.valid === false ? (
                      <AlertCircle size={16} color="#DC2626" style={{ marginTop: '2px', flexShrink: 0 }} />
                    ) : targetValidation.reachable ? (
                      <CheckCircle2 size={16} color="#10B981" style={{ marginTop: '2px', flexShrink: 0 }} />
                    ) : (
                      <AlertCircle size={16} color="#D97706" style={{ marginTop: '2px', flexShrink: 0 }} />
                    )}
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: targetValidation?.valid === false ? '#991B1B' : targetValidation?.reachable ? '#166534' : '#92400E' }}>
                        {isValidatingTarget || targetValidation === null
                          ? 'Checking Target Reachability...'
                          : targetValidation.valid === false
                          ? 'Target Blocked (SSRF Safeguard)'
                          : targetValidation.reachable
                          ? `Target Reachable (${targetValidation.statusCode || 200} OK)`
                          : 'Target Unreachable / Offline'}
                      </div>
                      <div style={{ fontSize: '11px', color: targetValidation?.valid === false ? '#DC2626' : targetValidation?.reachable ? '#15803D' : '#B45309', marginTop: '2px' }}>
                        {targetValidation?.message || (activeApi?.base_url ? `Target URL: ${activeApi.base_url}` : 'No target selected')}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleValidateTarget}
                    disabled={isValidatingTarget}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#475569',
                      cursor: isValidatingTarget ? 'not-allowed' : 'pointer',
                      flexShrink: 0,
                    }}
                    title="Retry pre-flight reachability check"
                  >
                    <RefreshCw size={11} className={isValidatingTarget ? 'animate-spin' : ''} />
                    <span>Retry</span>
                  </button>
                </div>

                {/* 2. API Inventory Schema */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '10px',
                    borderRadius: '6px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #F1F5F9',
                  }}
                >
                  <CheckCircle2 size={16} color="#10B981" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                      API Inventory & Schema
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>
                      {availableEndpoints.length > 0
                        ? `${availableEndpoints.length} endpoints discovered in active inventory`
                        : 'Default fallback endpoints mapped for testing'}
                    </div>
                  </div>
                </div>

                {/* 3. Selected Scope & Categories */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '10px',
                    borderRadius: '6px',
                    backgroundColor: selectedCategoryIds.length === 0 ? '#FFFBEB' : '#F8FAFC',
                    border: `1px solid ${selectedCategoryIds.length === 0 ? '#FDE68A' : '#F1F5F9'}`,
                  }}
                >
                  {selectedCategoryIds.length === 0 ? (
                    <AlertCircle size={16} color="#D97706" style={{ marginTop: '2px', flexShrink: 0 }} />
                  ) : (
                    <CheckCircle2 size={16} color="#10B981" style={{ marginTop: '2px', flexShrink: 0 }} />
                  )}
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                      Test Scope Configuration
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>
                      {selectedCategoryIds.length === 0
                        ? 'Select at least one vulnerability category'
                        : `${selectedCategoryIds.length} OWASP categories enabled (${scopeType === 'all' ? 'All endpoints' : `${selectedEndpoints.length} endpoints`})`}
                    </div>
                  </div>
                </div>

                {/* 4. AI & Deterministic Engine */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '10px',
                    borderRadius: '6px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #F1F5F9',
                  }}
                >
                  {isLoadingPreview ? (
                    <Loader2 size={16} color="#2563EB" className="animate-spin" style={{ marginTop: '2px', flexShrink: 0 }} />
                  ) : (
                    <CheckCircle2 size={16} color="#10B981" style={{ marginTop: '2px', flexShrink: 0 }} />
                  )}
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                      Deterministic Engine & Gemini AI
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>
                      {isLoadingPreview
                        ? 'Generating contextual test mutations...'
                        : previewData
                        ? `${previewData.total_test_cases} test cases planned (${previewData.ai_cases_count} AI-assisted)`
                        : 'Rule engines loaded & ready'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Analysis Summary Card */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '18px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                Execution Summary
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                  <span>Scope:</span>
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>
                    {scopeType === 'all' ? `All Routes (${availableEndpoints.length || 'All'})` : `Selected Routes (${selectedEndpoints.length})`}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                  <span>Environment:</span>
                  <span style={{ fontWeight: 600, color: '#2563EB', textTransform: 'capitalize' }}>
                    {environment}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                  <span>Active Test Suites:</span>
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>
                    {selectedCategoryIds.length} of {ALL_CATEGORIES.length}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                  <span>Planned Test Cases:</span>
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>
                    {previewData?.total_test_cases ?? (isLoadingPreview ? 'Planning...' : 0)} tests
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                  <span>Estimated Duration:</span>
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>
                    {previewData?.total_test_cases ? `~${Math.max(2, Math.round(previewData.total_test_cases * 0.4))}s` : '~30s'}
                  </span>
                </div>
              </div>

              <div style={{ height: '1px', backgroundColor: '#F1F5F9', margin: '4px 0' }} />

              <button
                type="button"
                onClick={handleRunAnalysis}
                disabled={isStartingScan || selectedCategoryIds.length === 0}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isStartingScan ? 'not-allowed' : 'pointer',
                  boxShadow: '0 1px 2px rgba(37, 99, 235, 0.25)',
                }}
              >
                {isStartingScan ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Launching Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Play size={14} fill="#FFFFFF" />
                    <span>Run Security Analysis</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Test Plan Preview Section */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} color="#7C3AED" />
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Test Execution Plan Preview
                </h3>
                {isLoadingPreview && <Loader2 size={14} color="#7C3AED" className="animate-spin" />}
              </div>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0 0' }}>
                Contextual execution plan compiled from selected endpoints, HTTP methods, authorization contexts, and OWASP categories.
              </p>
            </div>

            {/* Plan metrics pill group */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 9px',
                  borderRadius: '12px',
                  backgroundColor: '#EFF6FF',
                  color: '#2563EB',
                  border: '1px solid #DBEAFE',
                }}
              >
                {previewData?.total_test_cases || 0} Total Test Cases
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 9px',
                  borderRadius: '12px',
                  backgroundColor: '#F0FDF4',
                  color: '#16A34A',
                  border: '1px solid #BBF7D0',
                }}
              >
                {previewData?.deterministic_cases_count || 0} Deterministic
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 9px',
                  borderRadius: '12px',
                  backgroundColor: '#FAF5FF',
                  color: '#7C3AED',
                  border: '1px solid #E9D5FF',
                }}
              >
                {previewData?.ai_cases_count || 0} Gemini AI Assisted
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 9px',
                  borderRadius: '12px',
                  backgroundColor: '#F1F5F9',
                  color: '#475569',
                }}
              >
                {previewData?.target_endpoints_count || 0} Target Routes
              </span>
            </div>
          </div>

          {/* Test cases table */}
          {isLoadingPreview ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
              <Loader2 size={24} className="animate-spin" style={{ color: '#2563EB', margin: '0 auto 8px auto' }} />
              <div>Generating test mutations and security plan...</div>
            </div>
          ) : previewData?.preview_test_cases && previewData.preview_test_cases.length > 0 ? (
            <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: 600 }}>
                    <th style={{ padding: '10px 14px' }}>Test Identifier</th>
                    <th style={{ padding: '10px 14px' }}>Target Route</th>
                    <th style={{ padding: '10px 14px' }}>Category & OWASP</th>
                    <th style={{ padding: '10px 14px' }}>Objective & Mutation</th>
                    <th style={{ padding: '10px 14px' }}>Engine Source</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.preview_test_cases.map((tc: any, idx: number) => {
                    const method = tc.method || tc.http_method || 'GET';
                    const methodColor =
                      method === 'GET' ? '#2563EB' : method === 'POST' ? '#16A34A' : method === 'PUT' ? '#D97706' : method === 'DELETE' ? '#DC2626' : '#475569';
                    const isAi = tc.is_ai_generated || tc.engine === 'ai';

                    return (
                      <tr key={tc.id || idx} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap' }}>
                          {tc.id || `TC-${idx + 1}`}
                        </td>
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 700,
                              fontSize: '10px',
                              backgroundColor: `${methodColor}15`,
                              color: methodColor,
                              marginRight: '6px',
                              fontFamily: 'monospace',
                            }}
                          >
                            {method}
                          </span>
                          <span style={{ fontFamily: 'monospace', color: '#1E293B', fontWeight: 500 }}>
                            {tc.endpoint || tc.endpoint_path || '/api'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 600, color: '#0F172A' }}>{tc.category}</div>
                          <div style={{ fontSize: '10px', color: '#64748B', fontFamily: 'monospace' }}>{tc.owasp || 'API Security Top 10'}</div>
                        </td>
                        <td style={{ padding: '10px 14px', maxWidth: '380px' }}>
                          <div style={{ fontWeight: 500, color: '#1E293B' }}>{tc.name || tc.objective}</div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{tc.objective}</div>
                        </td>
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 7px',
                              borderRadius: '10px',
                              fontSize: '10px',
                              fontWeight: 600,
                              backgroundColor: isAi ? '#FAF5FF' : '#EFF6FF',
                              color: isAi ? '#7C3AED' : '#2563EB',
                              border: `1px solid ${isAi ? '#E9D5FF' : '#DBEAFE'}`,
                            }}
                          >
                            {isAi && <Sparkles size={10} />}
                            {isAi ? 'Gemini AI' : 'Deterministic'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
              Select one or more test categories above to generate your execution plan.
            </div>
          )}
        </div>



      </div>
    </KavachApiLayout>
  );
}
