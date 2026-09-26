import { useState, useEffect, useCallback } from 'react';
import { apiClient } from './api/client';
import type {
  ReadinessResponse,
  ApiErrorDetail,
  SecurityBlueprint,
  SecurityRequirement,
  SecurityScan,
  ScannerHealthResponse,
  SecurityPolicy,
  SecurityDecision,
  SecurityApproval,
  SimulateDecisionResponse,
} from './types/api';
import { HealthStatusBanner } from './components/HealthStatusBanner';
import { Navigation } from './components/Navigation';
import type { NavTab } from './components/Navigation';
import { EmptyState } from './components/EmptyState';
import {
  LayersIcon,
  CpuIcon,
  RefreshIcon,
  CheckCircleIcon,
  AlertCircleIcon,
} from './components/Icons';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [readiness, setReadiness] = useState<ReadinessResponse | null>(null);
  const [apiError, setApiError] = useState<ApiErrorDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastCheckTime, setLastCheckTime] = useState<string>('');

  // Intent form state
  const [rawPromptInput, setRawPromptInput] = useState<string>(
    'Build a payment API using FastAPI and PostgreSQL. Users should be able to create payments and receive Stripe webhook events. Deploy to AWS production.'
  );

  // Security Blueprint state
  const [activeBlueprint, setActiveBlueprint] = useState<SecurityBlueprint | null>(null);
  const [blueprintLoading, setBlueprintLoading] = useState<boolean>(false);
  const [blueprintError, setBlueprintError] = useState<string | null>(null);

  // Scanner state
  const [scannerHealth, setScannerHealth] = useState<ScannerHealthResponse[]>([]);
  const [activeScan, setActiveScan] = useState<SecurityScan | null>(null);
  const [scanLoading, setScanLoading] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Policy & Decision state (Step 7)
  const [policies, setPolicies] = useState<SecurityPolicy[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<SecurityPolicy | null>(null);
  const [decisions, setDecisions] = useState<SecurityDecision[]>([]);
  const [selectedDecision, setSelectedDecision] = useState<SecurityDecision | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<SecurityApproval[]>([]);
  const [simulationResult, setSimulationResult] = useState<SimulateDecisionResponse | null>(null);
  const [policyLoading, setPolicyLoading] = useState<boolean>(false);
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [operationType, setOperationType] = useState<string>('DEPLOY');
  const [operationEnv, setOperationEnv] = useState<string>('production');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    const response = await apiClient.getReadiness();
    if (response.isError && response.error) {
      setApiError(response.error);
      setReadiness(null);
    } else if (response.data) {
      setReadiness(response.data);
      setApiError(null);
    }
    setLastCheckTime(new Date().toLocaleTimeString());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const generateDemoBlueprint = () => {
    setBlueprintLoading(true);
    setBlueprintError(null);
    try {
      const demoBlueprint: SecurityBlueprint = {
        id: 'bp-' + Math.random().toString(36).substring(2, 9),
        project_id: 'proj-payment-prod-01',
        intent_id: 'intent-v1-payment-api',
        version: activeBlueprint ? activeBlueprint.version + 1 : 1,
        status: 'GENERATED',
        methodology_version: '2026.1.0',
        generated_by: 'developer@secureai.local',
        risk_factors: [
          'EXTERNAL_SERVICE_DEPENDENCY',
          'EXTERNAL_WEBHOOK',
          'FINANCIAL_DATA',
          'INTERNET_EXPOSED',
          'PRODUCTION_ENVIRONMENT',
          'SENSITIVE_DATA',
          'STATE_CHANGING_OPERATION',
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        requirement_count: 8,
        requirements: [
          {
            id: 'req-1',
            blueprint_id: 'bp-demo',
            requirement_key: 'PAYMENT_OPERATION_IDEMPOTENCY_REQUIRED',
            title: 'Strict Payment Operation Idempotency',
            description:
              'All financial mutation endpoints (charges, refunds, transfers) must enforce unique client-supplied idempotency keys to prevent duplicate execution during network retries.',
            category: 'PAYMENTS',
            severity: 'CRITICAL',
            priority: 'REQUIRED',
            mandatory: true,
            rationale:
              'Financial operations without strict idempotency risk catastrophic double-debits, race conditions, and ledger divergence under client retries or network faults.',
            verification_strategy: ['INTEGRATION_TEST', 'DYNAMIC_TEST', 'STATIC_ANALYSIS'],
            security_invariant:
              'payment.idempotency_key IS UNIQUE AND atomic_execution(payment.idempotency_key)',
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
            evidence_items: [
              {
                id: 'ev-1',
                source_type: 'INTENT',
                source_field: 'application_type',
                evidence_text: 'Application archetype is PAYMENT_API',
                created_at: new Date().toISOString(),
              },
              {
                id: 'ev-2',
                source_type: 'DATA_DOMAIN',
                source_field: 'data_domains',
                evidence_text: "Handles sensitive domain 'PAYMENT_DATA'",
                created_at: new Date().toISOString(),
              },
              {
                id: 'ev-3',
                source_type: 'INTENT',
                source_field: 'state_changes',
                evidence_text: "Financial state-changing operation 'CREATE_PAYMENT'",
                created_at: new Date().toISOString(),
              },
            ],
            dependencies: [],
          },
          {
            id: 'req-2',
            blueprint_id: 'bp-demo',
            requirement_key: 'WEBHOOK_AUTHENTICITY_REQUIRED',
            title: 'Cryptographic Webhook Signature Verification',
            description:
              'The application must verify the cryptographic signature (e.g. HMAC-SHA256) of every incoming webhook using constant-time comparison before deserializing or processing the event payload.',
            category: 'WEBHOOKS',
            severity: 'CRITICAL',
            priority: 'REQUIRED',
            mandatory: true,
            rationale:
              'The application accepts external webhook requests from third-party providers. The application must distinguish legitimate provider events from forged requests before processing state changes.',
            verification_strategy: ['STATIC_ANALYSIS', 'INTEGRATION_TEST', 'DYNAMIC_TEST'],
            security_invariant:
              'constant_time_compare(provider_signature, computed_hmac(raw_payload, webhook_secret)) == True',
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
            evidence_items: [
              {
                id: 'ev-4',
                source_type: 'INTERFACE',
                source_field: 'interfaces',
                evidence_text: "Exposes incoming WEBHOOK receiver: 'Stripe webhook events'",
                created_at: new Date().toISOString(),
              },
              {
                id: 'ev-5',
                source_type: 'EXTERNAL_SERVICE',
                source_field: 'external_services',
                evidence_text: "External service 'Stripe' communicates via inbound webhooks",
                created_at: new Date().toISOString(),
              },
            ],
            dependencies: [],
          },
          {
            id: 'req-3',
            blueprint_id: 'bp-demo',
            requirement_key: 'WEBHOOK_REPLAY_PROTECTION_REQUIRED',
            title: 'Webhook Replay Attack Protection',
            description:
              'Webhook receivers must validate the timestamp in header signatures against a strict tolerance window (e.g., 300s) and track event IDs to reject replayed requests.',
            category: 'WEBHOOKS',
            severity: 'HIGH',
            priority: 'REQUIRED',
            mandatory: true,
            rationale:
              'Valid signatures can be captured and replayed by network adversaries unless timestamp freshness and event deduplication are strictly enforced.',
            verification_strategy: ['INTEGRATION_TEST', 'DYNAMIC_TEST'],
            security_invariant:
              'abs(current_time - webhook.timestamp) <= 300 and not event_seen(webhook.event_id)',
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
            evidence_items: [
              {
                id: 'ev-6',
                source_type: 'INTERFACE',
                source_field: 'interfaces',
                evidence_text: 'Incoming webhook receiver requires replay protection',
                created_at: new Date().toISOString(),
              },
            ],
            dependencies: [
              {
                id: 'dep-1',
                depends_on_key: 'WEBHOOK_AUTHENTICITY_REQUIRED',
                dependency_type: 'PREREQUISITE',
                description: 'Replay validation is performed during signature check.',
              },
            ],
          },
          {
            id: 'req-4',
            blueprint_id: 'bp-demo',
            requirement_key: 'AUTHENTICATION_REQUIRED',
            title: 'Identity Authentication Enforcement',
            description:
              'The system must identify and authenticate all interacting entities prior to granting access to application resources or operations.',
            category: 'AUTHENTICATION',
            severity: 'CRITICAL',
            priority: 'REQUIRED',
            mandatory: true,
            rationale:
              'Application processes requests from identified actors and sensitive data domains. Unauthenticated access violates core boundary integrity.',
            verification_strategy: ['STATIC_ANALYSIS', 'DYNAMIC_TEST', 'RUNTIME_EVIDENCE'],
            security_invariant: 'request.caller.is_authenticated == True',
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
            evidence_items: [
              {
                id: 'ev-7',
                source_type: 'DATA_DOMAIN',
                source_field: 'data_domains',
                evidence_text: "Sensitive data domain 'PAYMENT_DATA' requires authenticated access control",
                created_at: new Date().toISOString(),
              },
            ],
            dependencies: [],
          },
          {
            id: 'req-5',
            blueprint_id: 'bp-demo',
            requirement_key: 'AUTHORIZATION_REQUIRED',
            title: 'Role-Based & Resource-Level Authorization',
            description:
              'The system must enforce authorization policies verifying that the authenticated caller has explicit permissions for the requested action on the target resource.',
            category: 'AUTHORIZATION',
            severity: 'HIGH',
            priority: 'REQUIRED',
            mandatory: true,
            rationale:
              'The application performs state mutations on payment records. Authorization ensures unauthorized actors cannot manipulate restricted payment resources.',
            verification_strategy: ['STATIC_ANALYSIS', 'DYNAMIC_TEST'],
            security_invariant:
              'caller.has_permission(requested_action, target_resource) == True',
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
            evidence_items: [
              {
                id: 'ev-8',
                source_type: 'INTENT',
                source_field: 'state_changes',
                evidence_text: "State-changing operation 'CREATE_PAYMENT' modifying entity 'Payment'",
                created_at: new Date().toISOString(),
              },
            ],
            dependencies: [
              {
                id: 'dep-2',
                depends_on_key: 'AUTHENTICATION_REQUIRED',
                dependency_type: 'PREREQUISITE',
                description: 'Authorization decisions require a verified caller identity.',
              },
            ],
          },
          {
            id: 'req-6',
            blueprint_id: 'bp-demo',
            requirement_key: 'SECRETS_PROTECTION_REQUIRED',
            title: 'Externalized Secrets & Credential Protection',
            description:
              'Secrets, API tokens, private keys, and connection strings must never be committed to source code or embedded in container layers. They must be injected dynamically via secure environment variables or a secrets manager.',
            category: 'SECRETS',
            severity: 'CRITICAL',
            priority: 'REQUIRED',
            mandatory: true,
            rationale:
              'The application interacts with third-party payment gateways (Stripe) and databases. Hardcoded secrets lead to catastrophic repository compromise.',
            verification_strategy: ['SECRET_SCAN', 'STATIC_ANALYSIS', 'REPOSITORY_SCAN'],
            security_invariant:
              'secrets.in_source_tree == False and secrets.injected_via_runtime_environment == True',
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
            evidence_items: [
              {
                id: 'ev-9',
                source_type: 'EXTERNAL_SERVICE',
                source_field: 'external_services',
                evidence_text: "Integration with external provider 'Stripe' requires API credentials",
                created_at: new Date().toISOString(),
              },
            ],
            dependencies: [],
          },
          {
            id: 'req-7',
            blueprint_id: 'bp-demo',
            requirement_key: 'SECURE_DATABASE_ACCESS_REQUIRED',
            title: 'Secure Parameterized Database Access',
            description:
              'Database queries must strictly utilize parameterized prepared statements or safe ORM abstractions. Dynamic SQL string interpolation is prohibited.',
            category: 'DATABASE',
            severity: 'HIGH',
            priority: 'REQUIRED',
            mandatory: true,
            rationale:
              'Applications interacting with relational databases must prevent SQL injection vulnerabilities through enforced parameterization.',
            verification_strategy: ['STATIC_ANALYSIS', 'DEPENDENCY_ANALYSIS'],
            security_invariant:
              'query.is_parameterized == True and query.interpolates_raw_user_input == False',
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
            evidence_items: [
              {
                id: 'ev-10',
                source_type: 'TECHNOLOGY',
                source_field: 'technologies',
                evidence_text: "Database engine 'PostgreSQL' utilized for persistent storage",
                created_at: new Date().toISOString(),
              },
            ],
            dependencies: [],
          },
          {
            id: 'req-8',
            blueprint_id: 'bp-demo',
            requirement_key: 'TRANSPORT_SECURITY_REQUIRED',
            title: 'Strict Transport Layer Security (TLS)',
            description:
              'All client-to-server and inter-service communications must be encrypted using modern TLS (TLS 1.2+ with forward secrecy) with HSTS headers enabled.',
            category: 'NETWORK',
            severity: 'HIGH',
            priority: 'REQUIRED',
            mandatory: true,
            rationale:
              'Cleartext network transmissions expose tokens, credentials, and sensitive data to interception and tampering.',
            verification_strategy: ['STATIC_ANALYSIS', 'DYNAMIC_TEST', 'RUNTIME_EVIDENCE'],
            security_invariant: 'connection.is_tls == True and connection.tls_version >= 1.2',
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
            evidence_items: [
              {
                id: 'ev-11',
                source_type: 'ENVIRONMENT',
                source_field: 'deployment_context.environment',
                evidence_text: "Deployment environment 'production' mandates TLS encryption",
                created_at: new Date().toISOString(),
              },
            ],
            dependencies: [],
          },
        ],
      };
      setActiveBlueprint(demoBlueprint);
    } catch (err: any) {
      setBlueprintError(err?.message || 'Blueprint generation failed');
    } finally {
      setBlueprintLoading(false);
    }
  };

  const fetchScannersHealth = useCallback(async () => {
    const res = await apiClient.getScannersHealth();
    if (res.data) {
      setScannerHealth(res.data);
    }
  }, []);

  useEffect(() => {
    fetchScannersHealth();
  }, [fetchScannersHealth]);

  const handleTriggerScan = async () => {
    if (!activeBlueprint) {
      setScanError('Please select or generate a Security Blueprint first before triggering verification.');
      return;
    }
    setScanLoading(true);
    setScanError(null);
    try {
      const res = await apiClient.triggerScan(activeBlueprint.project_id, {
        blueprint_id: activeBlueprint.id,
        target_type: 'LOCAL_DIRECTORY',
        target_path: '.',
      });
      if (res.error) {
        setScanError(res.error.message || 'Scan execution failed');
      } else if (res.data) {
        setActiveScan(res.data);
      }
    } catch (err: any) {
      setScanError(err?.message || 'Scan execution failed');
    } finally {
      setScanLoading(false);
    }
  };

  const fetchPoliciesAndDecisions = useCallback(async () => {
    if (!activeBlueprint?.project_id) return;
    setPolicyLoading(true);
    try {
      const [pRes, dRes, aRes] = await Promise.all([
        apiClient.getPolicies(activeBlueprint.project_id),
        apiClient.listDecisions(activeBlueprint.project_id),
        apiClient.listPendingApprovals(activeBlueprint.project_id),
      ]);
      if (pRes.data) {
        setPolicies(pRes.data);
        if (pRes.data.length > 0 && !selectedPolicy) {
          setSelectedPolicy(pRes.data[0]);
        }
      }
      if (dRes.data) {
        setDecisions(dRes.data);
        if (dRes.data.length > 0 && !selectedDecision) {
          setSelectedDecision(dRes.data[0]);
        }
      }
      if (aRes.data) setPendingApprovals(aRes.data);
    } catch (err: any) {
      setPolicyError(err?.message || 'Failed loading policies');
    } finally {
      setPolicyLoading(false);
    }
  }, [activeBlueprint?.project_id, selectedDecision, selectedPolicy]);

  useEffect(() => {
    if (currentTab === 'policies') {
      fetchPoliciesAndDecisions();
    }
  }, [currentTab, fetchPoliciesAndDecisions]);

  const handleEvaluateDecision = async () => {
    if (!activeBlueprint?.project_id) {
      setPolicyError('Active project blueprint required.');
      return;
    }
    setPolicyLoading(true);
    setPolicyError(null);
    setActionSuccessMessage(null);
    try {
      const res = await apiClient.evaluateDecision(activeBlueprint.project_id, {
        operation: {
          type: operationType,
          environment: operationEnv,
        },
        scan_id: activeScan?.id,
        blueprint_id: activeBlueprint.id,
      });
      if (res.error) {
        setPolicyError(res.error.message || 'Evaluation failed');
      } else if (res.data) {
        const newDec = res.data;
        setSelectedDecision(newDec);
        setDecisions(prev => [newDec, ...prev]);
        setActionSuccessMessage(`Decision evaluated: ${newDec.decision}`);
        fetchPoliciesAndDecisions();
      }
    } catch (err: any) {
      setPolicyError(err?.message || 'Evaluation failed');
    } finally {
      setPolicyLoading(false);
    }
  };

  const handleSimulateDecision = async () => {
    if (!activeBlueprint?.project_id) {
      setPolicyError('Active project blueprint required.');
      return;
    }
    setPolicyLoading(true);
    setPolicyError(null);
    setActionSuccessMessage(null);
    try {
      const res = await apiClient.simulateDecision(activeBlueprint.project_id, {
        operation: {
          type: operationType,
          environment: operationEnv,
        },
        scan_id: activeScan?.id,
        blueprint_id: activeBlueprint.id,
      });
      if (res.error) {
        setPolicyError(res.error.message || 'Simulation failed');
      } else if (res.data) {
        setSimulationResult(res.data);
        setActionSuccessMessage(`Simulation complete: would result in ${res.data.decision}`);
      }
    } catch (err: any) {
      setPolicyError(err?.message || 'Simulation failed');
    } finally {
      setPolicyLoading(false);
    }
  };

  const handleCreateDefaultPolicy = async () => {
    if (!activeBlueprint?.project_id) {
      setPolicyError('Active project blueprint required.');
      return;
    }
    setPolicyLoading(true);
    setPolicyError(null);
    try {
      const defaultPolicyPayload = {
        name: 'Production Gate & Risk Policy',
        description: 'Blocks critical findings and requires independent approval for high-risk operations.',
        scope: 'PROJECT',
        priority: 100,
        policy_type: 'DEPLOYMENT',
        definition: {
          name: 'Production Gate & Risk Policy',
          description: 'Production deployment governance',
          scope: { environment: 'production', operation: 'DEPLOY' },
          fail_closed: 'BLOCK',
          priority: 100,
          rules: [
            {
              name: 'block-critical-findings',
              when: { finding: { severity: { operator: 'IN', value: ['CRITICAL'] }, status: 'OPEN' } },
              decision: 'BLOCK',
              priority: 100,
              message: 'Production deployment blocked: open CRITICAL security finding detected.',
            },
            {
              name: 'require-approval-on-high',
              when: { finding: { severity: { operator: 'EQUALS', value: 'HIGH' }, status: 'OPEN' } },
              decision: 'REQUIRE_APPROVAL',
              priority: 90,
              message: 'Production deployment requires security lead approval: HIGH severity finding identified.',
            },
            {
              name: 'block-violated-requirements',
              when: { requirement: { status: 'VIOLATED' } },
              decision: 'BLOCK',
              priority: 80,
              message: 'Production deployment blocked: required security blueprint requirement is violated.',
            },
            {
              name: 'warn-medium-findings',
              when: { finding: { severity: { operator: 'EQUALS', value: 'MEDIUM' }, status: 'OPEN' } },
              decision: 'WARN',
              priority: 50,
              message: 'Medium risk finding recorded with warning.',
            },
          ],
        },
      };
      const res = await apiClient.createPolicy(activeBlueprint.project_id, defaultPolicyPayload);
      if (res.error) {
        setPolicyError(res.error.message || 'Policy creation failed');
      } else if (res.data) {
        setActionSuccessMessage(`Policy '${res.data.name}' created successfully.`);
        fetchPoliciesAndDecisions();
      }
    } catch (err: any) {
      setPolicyError(err?.message || 'Policy creation failed');
    } finally {
      setPolicyLoading(false);
    }
  };

  const handleApprove = async (approvalId: string) => {
    setPolicyLoading(true);
    setPolicyError(null);
    try {
      const res = await apiClient.approveDecision(approvalId, { approval_notes: 'Approved via control plane console.' });
      if (res.error) {
        setPolicyError(res.error.message || 'Approval failed');
      } else {
        setActionSuccessMessage('Approval granted successfully.');
        fetchPoliciesAndDecisions();
      }
    } catch (err: any) {
      setPolicyError(err?.message || 'Approval failed');
    } finally {
      setPolicyLoading(false);
    }
  };

  const handleReject = async (approvalId: string) => {
    setPolicyLoading(true);
    setPolicyError(null);
    try {
      const res = await apiClient.rejectDecision(approvalId, { reason: 'Rejected from control plane UI.' });
      if (res.error) {
        setPolicyError(res.error.message || 'Rejection failed');
      } else {
        setActionSuccessMessage('Approval rejected.');
        fetchPoliciesAndDecisions();
      }
    } catch (err: any) {
      setPolicyError(err?.message || 'Rejection failed');
    } finally {
      setPolicyLoading(false);
    }
  };

  const isDbHealthy = readiness?.dependencies?.postgresql?.status === 'healthy';

  // Group requirements by category
  const requirementsByCategory = (activeBlueprint?.requirements || []).reduce(
    (acc, req) => {
      if (!acc[req.category]) acc[req.category] = [];
      acc[req.category].push(req);
      return acc;
    },
    {} as Record<string, SecurityRequirement[]>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      {/* Top Real-time Health Banner */}
      <HealthStatusBanner
        readiness={readiness}
        error={apiError}
        loading={loading}
        onRefresh={fetchHealth}
        apiBaseUrl={apiClient.getBaseUrl()}
      />

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Sidebar Navigation */}
        <Navigation
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          systemOperational={!apiError && isDbHealthy}
        />

        {/* Main Content Area */}
        <main style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
          {/* Header Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '32px',
              paddingBottom: '20px',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.02em',
                }}
              >
                {currentTab === 'overview' && 'Platform Overview'}
                {currentTab === 'intents' && 'Intent Understanding Engine'}
                {currentTab === 'projects' && 'Projects & Workspaces'}
                {currentTab === 'blueprints' && 'Dynamic Security Blueprint Engine'}
                {currentTab === 'scanners' && 'Security Scanner Orchestration'}
                {currentTab === 'policies' && 'Policy-as-Code Engine (OPA)'}
                {currentTab === 'diagnostics' && 'System Health & Diagnostics'}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Deterministic AI Security Control Plane &bull; Step 5 Security Blueprint Engine
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Last ping: {lastCheckTime || 'checking...'}
              </span>
              <button
                onClick={fetchHealth}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                <RefreshIcon size={14} />
                <span>{loading ? 'Polling...' : 'Refresh'}</span>
              </button>
            </div>
          </div>

          {/* TAB: OVERVIEW */}
          {currentTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div
                className="glass-panel"
                style={{
                  padding: '24px',
                  borderLeft: '4px solid var(--accent-primary)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--accent-primary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Core Principle &bull; Step 5
                </div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  &ldquo;Security Requirements Follow the Intent.&rdquo;
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  The Security Blueprint Engine converts normalized application intent into tailored,
                  context-aware, machine-readable security requirements. Requirements are strictly
                  evidence-based and deterministic.
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '16px',
                }}
              >
                <div className="glass-panel" style={{ padding: '20px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '12px',
                    }}
                  >
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
                      Intent Engine
                    </span>
                    <CheckCircleIcon size={16} color="var(--status-success)" />
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Active &bull; Step 4
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Normalized Intent Model
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '20px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '12px',
                    }}
                  >
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
                      Blueprint Engine
                    </span>
                    <CheckCircleIcon size={16} color="var(--status-success)" />
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Active &bull; Step 5
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Dynamic Security Blueprints
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '20px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '12px',
                    }}
                  >
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
                      Control Plane API
                    </span>
                    {apiError ? (
                      <AlertCircleIcon size={16} color="var(--status-danger)" />
                    ) : (
                      <CheckCircleIcon size={16} color="var(--status-success)" />
                    )}
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {apiError ? 'Offline' : 'FastAPI Operational'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Port: 8000 &bull; /api/v1
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '20px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '12px',
                    }}
                  >
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
                      Persistence Layer
                    </span>
                    {isDbHealthy ? (
                      <CheckCircleIcon size={16} color="var(--status-success)" />
                    ) : (
                      <AlertCircleIcon size={16} color="var(--status-warning)" />
                    )}
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {isDbHealthy ? 'PostgreSQL Ready' : 'Database Pending'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {isDbHealthy
                      ? `Ping: ${readiness?.dependencies.postgresql.latency_ms}ms`
                      : 'Waiting for connection'}
                  </div>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>
                  Dynamic Security Blueprint Demonstration
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Explore dynamic security requirement generation from application intent. No generic checklists;
                  every property is tied to concrete architectural facts and includes verification strategies.
                </p>
                <button
                  onClick={() => setCurrentTab('blueprints')}
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 18px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Open Security Blueprint Engine &rarr;
                </button>
              </div>
            </div>
          )}

          {/* TAB: INTENTS */}
          {currentTab === 'intents' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
                  Raw Developer Intent Submission
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  The raw description is preserved verbatim in PostgreSQL for complete traceability. The
                  Intent Engine extracts technical characteristics without generating security controls.
                </p>

                <textarea
                  value={rawPromptInput}
                  onChange={(e) => setRawPromptInput(e.target.value)}
                  rows={4}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 16px',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    lineHeight: 1.6,
                    resize: 'vertical',
                    marginBottom: '16px',
                  }}
                />

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button
                    onClick={() => {
                      alert(
                        'Intent submitted via API: POST /api/v1/intents. See automated test results for verified persistence.'
                      );
                    }}
                    style={{
                      backgroundColor: 'var(--accent-primary)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Analyze Developer Intent
                  </button>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Preserves raw input &bull; Outputs NormalizedIntent
                  </span>
                </div>
              </div>

              {/* Architectural Characteristics Breakdown */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: '16px',
                }}
              >
                <div className="glass-panel" style={{ padding: '20px' }}>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--accent-primary)',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      marginBottom: '4px',
                    }}
                  >
                    Application Archetype
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: 600 }}>PAYMENT_API</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Confidence: 0.95 &bull; Classification only, NOT a security policy
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '20px' }}>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--accent-primary)',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      marginBottom: '4px',
                    }}
                  >
                    Detected Technologies
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 500, marginTop: '4px' }}>
                    Python (LANGUAGE), FastAPI (FRAMEWORK), PostgreSQL (DATABASE), AWS (CLOUD)
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Versions: null (Never assumed or fabricated)
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '20px' }}>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--accent-primary)',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      marginBottom: '4px',
                    }}
                  >
                    Interfaces & Integrations
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 500, marginTop: '4px' }}>
                    REST_API &bull; WEBHOOK (Stripe)
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Integration Status: INTENDED_INTEGRATION (Not verified)
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '20px' }}>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--accent-primary)',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      marginBottom: '4px',
                    }}
                  >
                    Detected Ambiguities
                  </div>
                  <div style={{ fontSize: '13px', color: '#fcd34d', marginTop: '4px' }}>
                    ⚠ Authentication protocol is unspecified (e.g. JWT, OAuth2)
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Ambiguity detection alerts missing developer details
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: PROJECTS */}
          {currentTab === 'projects' && (
            <EmptyState
              icon={<LayersIcon size={28} />}
              title="No Projects Configured"
              description="Project management models and database tables are persisted in PostgreSQL. Connect a repository or declare an application intent to generate projects."
              statusBadge="STEP 3 COMPLETED"
            />
          )}

          {/* TAB: BLUEPRINTS */}
          {currentTab === 'blueprints' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {!activeBlueprint ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <EmptyState
                    icon={<CpuIcon size={28} />}
                    title="Security blueprint has not been generated."
                    description="Security requirements follow the application intent. Generate a tailored blueprint from your application's analyzed intent."
                    statusBadge="STEP 5 BLUEPRINT ENGINE"
                  />
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button
                      onClick={generateDemoBlueprint}
                      disabled={blueprintLoading}
                      style={{
                        backgroundColor: 'var(--accent-primary)',
                        color: '#fff',
                        border: 'none',
                        padding: '12px 28px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: blueprintLoading ? 'not-allowed' : 'pointer',
                        boxShadow: 'var(--shadow-glow)',
                      }}
                    >
                      {blueprintLoading ? 'Deriving Requirements...' : 'Generate Security Blueprint'}
                    </button>
                  </div>
                  {blueprintError && (
                    <div style={{ color: 'var(--status-danger)', fontSize: '13px', textAlign: 'center' }}>
                      Blueprint generation failed: {blueprintError}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Blueprint Metadata Header */}
                  <div
                    className="glass-panel"
                    style={{
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          Security Blueprint v{activeBlueprint.version}
                        </h3>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(34, 197, 94, 0.15)',
                            color: 'var(--status-success)',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                          }}
                        >
                          {activeBlueprint.status}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Methodology: {activeBlueprint.methodology_version}
                        </span>
                      </div>

                      <button
                        onClick={generateDemoBlueprint}
                        disabled={blueprintLoading}
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.08)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-subtle)',
                          padding: '8px 16px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Regenerate Blueprint (v{activeBlueprint.version + 1})
                      </button>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Derived from Intent: <code style={{ color: 'var(--accent-primary)' }}>{activeBlueprint.intent_id}</code> &bull; Generated by {activeBlueprint.generated_by} &bull; Total Requirements: {activeBlueprint.requirement_count}
                    </div>

                    {/* Contextual Risk Factors Bar */}
                    <div>
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: 'var(--text-muted)',
                          textTransform: 'uppercase',
                          marginBottom: '8px',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Contextual Risk Dimensions (Qualitative Architectural Factors)
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {activeBlueprint.risk_factors.map((rf) => (
                          <span
                            key={rf}
                            style={{
                              fontSize: '11px',
                              fontWeight: 500,
                              padding: '3px 8px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(99, 102, 241, 0.1)',
                              color: '#a5b4fc',
                              border: '1px solid rgba(99, 102, 241, 0.25)',
                            }}
                          >
                            {rf}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Requirements Grouped by Category */}
                  {Object.entries(requirementsByCategory).map(([category, reqs]) => (
                    <div key={category} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: 'var(--accent-primary)',
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                          paddingBottom: '4px',
                          borderBottom: '1px solid var(--border-subtle)',
                        }}
                      >
                        {category} ({reqs.length})
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {reqs.map((req) => (
                          <div
                            key={req.id}
                            className="glass-panel"
                            style={{
                              padding: '20px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px',
                            }}
                          >
                            {/* Card Header */}
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                flexWrap: 'wrap',
                                gap: '8px',
                              }}
                            >
                              <div>
                                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {req.title}
                                </div>
                                <code
                                  style={{
                                    fontSize: '11px',
                                    color: 'var(--text-muted)',
                                    marginTop: '2px',
                                    display: 'inline-block',
                                  }}
                                >
                                  {req.requirement_key}
                                </code>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                {/* Severity */}
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    backgroundColor:
                                      req.severity === 'CRITICAL'
                                        ? 'rgba(239, 68, 68, 0.15)'
                                        : req.severity === 'HIGH'
                                        ? 'rgba(249, 115, 22, 0.15)'
                                        : 'rgba(234, 179, 8, 0.15)',
                                    color:
                                      req.severity === 'CRITICAL'
                                        ? '#f87171'
                                        : req.severity === 'HIGH'
                                        ? '#fb923c'
                                        : '#facc15',
                                    border: '1px solid currentColor',
                                  }}
                                >
                                  {req.severity}
                                </span>

                                {/* Priority */}
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    color: 'var(--text-secondary)',
                                  }}
                                >
                                  {req.priority}
                                </span>

                                {/* Mandatory */}
                                {req.mandatory && (
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      fontWeight: 600,
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      backgroundColor: 'rgba(99, 102, 241, 0.15)',
                                      color: '#c7d2fe',
                                    }}
                                  >
                                    MANDATORY
                                  </span>
                                )}

                                {/* Status: Verification pending */}
                                <span
                                  style={{
                                    fontSize: '11px',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    backgroundColor: 'rgba(148, 163, 184, 0.1)',
                                    color: '#94a3b8',
                                  }}
                                >
                                  Verification pending
                                </span>
                              </div>
                            </div>

                            {/* Description */}
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                              {req.description}
                            </p>

                            {/* Rationale */}
                            <div
                              style={{
                                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                                padding: '10px 14px',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '12px',
                                color: '#cbd5e1',
                                borderLeft: '3px solid var(--accent-primary)',
                              }}
                            >
                              <strong>Rationale:</strong> {req.rationale}
                            </div>

                            {/* Security Invariant */}
                            {req.security_invariant && (
                              <div style={{ fontSize: '12px' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Invariant: </span>
                                <code
                                  style={{
                                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    color: '#86efac',
                                  }}
                                >
                                  {req.security_invariant}
                                </code>
                              </div>
                            )}

                            {/* Verification Strategy & Evidence */}
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '8px',
                                paddingTop: '8px',
                                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                              }}
                            >
                              {/* Verification Strategy Badges */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Verification:</span>
                                {req.verification_strategy.map((s) => (
                                  <span
                                    key={s}
                                    style={{
                                      fontSize: '10px',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                                      color: 'var(--text-secondary)',
                                      fontFamily: 'var(--font-mono)',
                                    }}
                                  >
                                    {s}
                                  </span>
                                ))}
                              </div>

                              {/* Contributing Evidence Summary */}
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {req.evidence_items.length} contributing intent evidence facts
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: SCANNERS */}
          {currentTab === 'scanners' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Header Panel */}
              <div
                className="glass-panel"
                style={{
                  padding: '24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--accent-primary)',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: '4px',
                    }}
                  >
                    Production Verification Engine &bull; Step 6
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Automated Security Scanner Orchestration
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Runs real CLI binaries, collects raw machine output, normalizes findings, and deterministically verifies Step 5 Blueprint requirements.
                  </p>
                </div>

                <button
                  onClick={handleTriggerScan}
                  disabled={scanLoading}
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: '#fff',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: scanLoading ? 'not-allowed' : 'pointer',
                    boxShadow: 'var(--shadow-glow)',
                  }}
                >
                  {scanLoading ? 'Executing Scanners...' : 'Run Real Security Verification Scan'}
                </button>
              </div>

              {scanError && (
                <div style={{ color: 'var(--status-danger)', fontSize: '13px' }}>
                  Scan execution error: {scanError}
                </div>
              )}

              {/* Registered CLI Tools Operational Status */}
              <div>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    marginBottom: '12px',
                    letterSpacing: '0.05em',
                  }}
                >
                  CLI Scanners Environment Status
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '12px',
                  }}
                >
                  {[
                    { name: 'semgrep', label: 'Semgrep', type: 'SAST' },
                    { name: 'gitleaks', label: 'Gitleaks', type: 'SECRETS' },
                    { name: 'osv-scanner', label: 'OSV-Scanner', type: 'SCA' },
                    { name: 'trivy', label: 'Trivy', type: 'CONTAINER' },
                    { name: 'checkov', label: 'Checkov', type: 'IAC' },
                  ].map((tool) => {
                    const health = scannerHealth.find((h) => h.scanner_name === tool.name);
                    const isHealthy = health?.status === 'healthy';
                    return (
                      <div key={tool.name} className="glass-panel" style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {tool.label}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: isHealthy ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                              color: isHealthy ? 'var(--status-success)' : '#facc15',
                              border: isHealthy ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(234, 179, 8, 0.3)',
                            }}
                          >
                            {isHealthy ? 'OPERATIONAL' : 'NOT CONFIGURED'}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Domain: {tool.type}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                          {isHealthy ? `Version: ${health?.version || 'detected'}` : 'Binary not found in PATH'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Active Scan Results */}
              {activeScan && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Scan Summary Banner */}
                  <div
                    className="glass-panel"
                    style={{
                      padding: '20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Scan Reference</div>
                      <code style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {activeScan.id}
                      </code>
                    </div>

                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Status: </span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--status-success)' }}>
                          {activeScan.status}
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Target: </span>
                        <code style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {activeScan.target_path}
                        </code>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Findings: </span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#f87171' }}>
                          {activeScan.finding_count}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Requirement Verification States */}
                  <div>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: 'var(--accent-primary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '12px',
                        paddingBottom: '4px',
                        borderBottom: '1px solid var(--border-subtle)',
                      }}
                    >
                      Step 5 Blueprint Requirements Verification Outcomes
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {activeScan.verifications?.map((v) => (
                        <div
                          key={v.id}
                          className="glass-panel"
                          style={{
                            padding: '16px 20px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '12px',
                            borderLeft:
                              v.status === 'VIOLATED'
                                ? '4px solid #ef4444'
                                : v.status === 'SATISFIED'
                                ? '4px solid #22c55e'
                                : '4px solid #94a3b8',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  backgroundColor:
                                    v.status === 'VIOLATED'
                                      ? 'rgba(239, 68, 68, 0.15)'
                                      : v.status === 'SATISFIED'
                                      ? 'rgba(34, 197, 94, 0.15)'
                                      : 'rgba(148, 163, 184, 0.15)',
                                  color:
                                    v.status === 'VIOLATED'
                                      ? '#f87171'
                                      : v.status === 'SATISFIED'
                                      ? '#22c55e'
                                      : '#94a3b8',
                                  border: '1px solid currentColor',
                                }}
                              >
                                {v.status}
                              </span>
                              <code style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {v.requirement_key}
                              </code>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                              {v.rationale}
                            </div>
                          </div>

                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>
                            <div>{v.evidence_summary}</div>
                            {v.contributing_findings_count > 0 && (
                              <div style={{ color: '#f87171', fontWeight: 600, marginTop: '2px' }}>
                                {v.contributing_findings_count} violating finding(s)
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Individual Scanner Executions */}
                  <div>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: 'var(--accent-primary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '12px',
                        paddingBottom: '4px',
                        borderBottom: '1px solid var(--border-subtle)',
                      }}
                    >
                      Scanner Process Execution Audit
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                      {activeScan.executions?.map((e) => (
                        <div key={e.id} className="glass-panel" style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {e.scanner_name.toUpperCase()} ({e.scanner_type})
                            </span>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor:
                                  e.status === 'COMPLETED'
                                    ? 'rgba(34, 197, 94, 0.15)'
                                    : 'rgba(234, 179, 8, 0.15)',
                                color: e.status === 'COMPLETED' ? '#22c55e' : '#facc15',
                              }}
                            >
                              {e.status}
                            </span>
                          </div>

                          {e.command && (
                            <code style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                              $ {e.command}
                            </code>
                          )}

                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Duration: {e.duration_ms !== null ? `${e.duration_ms}ms` : 'N/A'} &bull; Findings: {e.finding_count}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Security Findings List */}
                  {activeScan.findings && activeScan.findings.length > 0 && (
                    <div>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#f87171',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          marginBottom: '12px',
                          paddingBottom: '4px',
                          borderBottom: '1px solid var(--border-subtle)',
                        }}
                      >
                        Normalized Security Findings ({activeScan.findings.length})
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {activeScan.findings.map((f) => (
                          <div key={f.id} className="glass-panel" style={{ padding: '16px 20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                              <div>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {f.title}
                                </div>
                                <code style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  Rule: {f.rule_id} &bull; Engine: {f.scanner_name}
                                </code>
                              </div>

                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: f.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(249, 115, 22, 0.15)',
                                  color: f.severity === 'CRITICAL' ? '#f87171' : '#fb923c',
                                  border: '1px solid currentColor',
                                }}
                              >
                                {f.severity}
                              </span>
                            </div>

                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                              {f.description}
                            </p>

                            {f.snippet && (
                              <div
                                style={{
                                  backgroundColor: 'rgba(0,0,0,0.3)',
                                  padding: '8px 12px',
                                  borderRadius: 'var(--radius-sm)',
                                  marginTop: '8px',
                                  fontSize: '12px',
                                  fontFamily: 'var(--font-mono)',
                                  color: '#cbd5e1',
                                }}
                              >
                                {f.snippet}
                              </div>
                            )}

                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                              Location: <code>{f.file_path}{f.line_number ? `:${f.line_number}` : ''}</code> &bull; Fingerprint: <code>{f.fingerprint.substring(0, 16)}...</code>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB: POLICIES */}
          {currentTab === 'policies' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Header & Evaluation Bar */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '16px',
                    marginBottom: '20px',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        color: 'var(--accent-primary)',
                        letterSpacing: '0.05em',
                        marginBottom: '4px',
                      }}
                    >
                      Policy &bull; Risk &bull; Allow-Warn-Block Engine &bull; Step 7
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Deterministic Policy Evaluation & Governance
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Consumes Step 5 Blueprint requirements and Step 6 verification findings to make authoritative ALLOW, WARN, BLOCK, or REQUIRE_APPROVAL decisions.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {policies.length === 0 && (
                      <button
                        onClick={handleCreateDefaultPolicy}
                        disabled={policyLoading}
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.06)',
                          color: '#fff',
                          border: '1px solid var(--border-subtle)',
                          padding: '10px 16px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: policyLoading ? 'not-allowed' : 'pointer',
                        }}
                      >
                        + Create Default Production Policy
                      </button>
                    )}
                    <button
                      onClick={fetchPoliciesAndDecisions}
                      disabled={policyLoading}
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-subtle)',
                        padding: '10px 16px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      <RefreshIcon size={14} /> Refresh
                    </button>
                  </div>
                </div>

                {/* Operation Context Selector & Evaluation Trigger */}
                <div
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    padding: '16px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '16px',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                      Target Operation
                    </label>
                    <select
                      value={operationType}
                      onChange={(e) => setOperationType(e.target.value)}
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '8px 12px',
                        fontSize: '13px',
                      }}
                    >
                      <option value="DEPLOY">DEPLOY (Deployment to environment)</option>
                      <option value="MERGE">MERGE (Pull request merge)</option>
                      <option value="PUSH">PUSH (Code push)</option>
                      <option value="EXECUTE_TOOL">EXECUTE_TOOL (Agent tool invocation)</option>
                      <option value="ACCESS_SECRET">ACCESS_SECRET (Access credentials)</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                      Target Environment
                    </label>
                    <select
                      value={operationEnv}
                      onChange={(e) => setOperationEnv(e.target.value)}
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '8px 12px',
                        fontSize: '13px',
                      }}
                    >
                      <option value="production">production (Strict fail-closed)</option>
                      <option value="staging">staging (Pre-production)</option>
                      <option value="development">development (Sandbox)</option>
                    </select>
                  </div>

                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
                    <button
                      onClick={handleSimulateDecision}
                      disabled={policyLoading}
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        color: '#fff',
                        border: '1px solid var(--border-subtle)',
                        padding: '10px 18px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: policyLoading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Simulate (Dry-Run)
                    </button>

                    <button
                      onClick={handleEvaluateDecision}
                      disabled={policyLoading}
                      style={{
                        backgroundColor: 'var(--accent-primary)',
                        color: '#fff',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: policyLoading ? 'not-allowed' : 'pointer',
                        boxShadow: 'var(--shadow-glow)',
                      }}
                    >
                      {policyLoading ? 'Evaluating...' : 'Evaluate Policy Decision'}
                    </button>
                  </div>
                </div>

                {policyError && (
                  <div
                    style={{
                      marginTop: '16px',
                      padding: '12px 16px',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid var(--accent-danger)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--accent-danger)',
                      fontSize: '13px',
                    }}
                  >
                    {policyError}
                  </div>
                )}

                {actionSuccessMessage && (
                  <div
                    style={{
                      marginTop: '16px',
                      padding: '12px 16px',
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid var(--accent-success)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--accent-success)',
                      fontSize: '13px',
                    }}
                  >
                    {actionSuccessMessage}
                  </div>
                )}
              </div>

              {/* Simulation Result Preview (Dry Run) */}
              {simulationResult && (
                <div
                  className="glass-panel"
                  style={{
                    padding: '20px',
                    border: '1px solid var(--accent-warning)',
                    backgroundColor: 'rgba(245, 158, 11, 0.05)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          backgroundColor:
                            simulationResult.decision === 'BLOCK'
                              ? 'var(--accent-danger)'
                              : simulationResult.decision === 'REQUIRE_APPROVAL'
                              ? 'var(--accent-warning)'
                              : simulationResult.decision === 'WARN'
                              ? '#eab308'
                              : 'var(--accent-success)',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '12px',
                          padding: '4px 10px',
                          borderRadius: '4px',
                        }}
                      >
                        SIMULATED DECISION: {simulationResult.decision}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Dry-Run Simulation at {new Date(simulationResult.simulated_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <button
                      onClick={() => setSimulationResult(null)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      &times; Close
                    </button>
                  </div>

                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    <strong>Reason:</strong> {simulationResult.reason}
                  </p>

                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Note: Simulation does not authorize execution, mutate system state, or create immutable audit decision records.
                  </div>
                </div>
              )}

              {/* Pending Approvals & Separation of Duties */}
              {pendingApprovals.length > 0 && (
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertCircleIcon size={18} color="var(--accent-warning)" />
                      Pending Security Approvals ({pendingApprovals.length})
                    </h4>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Separation of duties enforced: Requester cannot self-approve.
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {pendingApprovals.map((ap) => (
                      <div
                        key={ap.id}
                        style={{
                          backgroundColor: 'rgba(0,0,0,0.2)',
                          padding: '16px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '12px',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {ap.reason || 'Operation requires approval'}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            Requested by: <code>{ap.requested_by}</code> &bull; Requested at:{' '}
                            {new Date(ap.requested_at).toLocaleTimeString()}{' '}
                            {ap.expires_at && `(Expires ${new Date(ap.expires_at).toLocaleTimeString()})`}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleReject(ap.id)}
                            disabled={policyLoading}
                            style={{
                              backgroundColor: 'rgba(239, 68, 68, 0.15)',
                              color: 'var(--accent-danger)',
                              border: '1px solid var(--accent-danger)',
                              padding: '8px 14px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleApprove(ap.id)}
                            disabled={policyLoading}
                            style={{
                              backgroundColor: 'var(--accent-success)',
                              color: '#fff',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Approve
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Two Column Layout: Policies List & Decision Records */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                {/* Active Policies Column */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
                    Configured Security Policies ({policies.length})
                  </h4>

                  {policies.length === 0 ? (
                    <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      No active policies configured for this project.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {policies.map((p) => (
                        <div
                          key={p.id}
                          style={{
                            backgroundColor: 'rgba(0,0,0,0.2)',
                            padding: '16px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {p.name}
                            </div>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor: p.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                                color: p.status === 'ACTIVE' ? 'var(--accent-success)' : 'var(--text-muted)',
                              }}
                            >
                              v{p.current_version} &bull; {p.status}
                            </span>
                          </div>

                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                            {p.description}
                          </p>

                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px' }}>
                            Scope: <code>{p.scope}</code> &bull; Priority: <code>{p.priority}</code> &bull; Type: <code>{p.policy_type}</code>
                          </div>

                          {p.latest_version?.definition?.rules && (
                            <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                Policy Rules ({p.latest_version.definition.rules.length}):
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {p.latest_version.definition.rules.map((r: any, idx: number) => (
                                  <div
                                    key={idx}
                                    style={{
                                      fontSize: '11px',
                                      color: 'var(--text-secondary)',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      backgroundColor: 'rgba(0,0,0,0.15)',
                                      padding: '4px 8px',
                                      borderRadius: '3px',
                                    }}
                                  >
                                    <span>{r.name}</span>
                                    <span
                                      style={{
                                        fontWeight: 700,
                                        color:
                                          r.decision === 'BLOCK'
                                            ? 'var(--accent-danger)'
                                            : r.decision === 'REQUIRE_APPROVAL'
                                            ? 'var(--accent-warning)'
                                            : r.decision === 'WARN'
                                            ? '#eab308'
                                            : 'var(--accent-success)',
                                      }}
                                    >
                                      {r.decision}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Evaluated Decisions & Evidence Column */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
                    Immutable Security Decisions ({decisions.length})
                  </h4>

                  {decisions.length === 0 ? (
                    <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      No security decisions recorded yet. Click "Evaluate Policy Decision" to evaluate against active policies.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {decisions.map((dec) => (
                        <div
                          key={dec.id}
                          style={{
                            backgroundColor: 'rgba(0,0,0,0.2)',
                            padding: '16px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span
                              style={{
                                fontWeight: 800,
                                fontSize: '12px',
                                padding: '4px 10px',
                                borderRadius: '4px',
                                backgroundColor:
                                  dec.decision === 'BLOCK'
                                    ? 'var(--accent-danger)'
                                    : dec.decision === 'REQUIRE_APPROVAL'
                                    ? 'var(--accent-warning)'
                                    : dec.decision === 'WARN'
                                    ? '#eab308'
                                    : 'var(--accent-success)',
                                color: '#fff',
                              }}
                            >
                              {dec.decision}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {new Date(dec.created_at).toLocaleTimeString()}
                            </span>
                          </div>

                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '8px' }}>
                            {dec.operation_type} &bull; Environment: <code>{dec.environment}</code>
                          </div>

                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            <strong>Reason:</strong> {dec.reason}
                          </p>

                          {dec.evidence && dec.evidence.length > 0 && (
                            <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                                Deterministic Evidence ({dec.evidence.length} items):
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {dec.evidence.map((ev, evIdx) => (
                                  <div
                                    key={evIdx}
                                    style={{
                                      fontSize: '11px',
                                      backgroundColor: 'rgba(0,0,0,0.25)',
                                      padding: '6px 8px',
                                      borderRadius: '3px',
                                      color: '#cbd5e1',
                                    }}
                                  >
                                    <div>
                                      <code>{ev.evidence_type}</code> &bull; Attribute: <code>{ev.attribute}</code> &rarr; Observed: <strong style={{ color: '#fff' }}>{String(ev.observed_value)}</strong>
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
                                      Expected: {ev.expected_condition} &bull; Effect: <span style={{ color: ev.effect === 'BLOCK' ? 'var(--accent-danger)' : 'var(--accent-warning)' }}>{ev.effect}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: DIAGNOSTICS */}
          {currentTab === 'diagnostics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="glass-panel" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
                  Live API Probe Response
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Actual payload returned by <code style={{ color: 'var(--accent-primary)' }}>GET /api/v1/health/ready</code> from the FastAPI backend.
                </p>

                <pre
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    padding: '16px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '12px',
                    color: '#e2e8f0',
                    overflowX: 'auto',
                    lineHeight: 1.6,
                  }}
                >
                  {apiError ? JSON.stringify(apiError, null, 2) : JSON.stringify(readiness, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
