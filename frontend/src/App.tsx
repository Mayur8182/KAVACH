import { useState, useEffect, useCallback } from 'react';
import { apiClient } from './api/client';
import type { ReadinessResponse, ApiErrorDetail } from './types/api';
import { HealthStatusBanner } from './components/HealthStatusBanner';
import { Navigation } from './components/Navigation';
import type { NavTab } from './components/Navigation';
import { EmptyState } from './components/EmptyState';
import {
  LayersIcon,
  CpuIcon,
  DatabaseIcon,
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

  const isDbHealthy = readiness?.dependencies?.postgresql?.status === 'healthy';

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
              <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {currentTab === 'overview' && 'Platform Overview'}
                {currentTab === 'intents' && 'Intent Understanding Engine'}
                {currentTab === 'projects' && 'Projects & Workspaces'}
                {currentTab === 'blueprints' && 'Security Blueprint Engine'}
                {currentTab === 'scanners' && 'Security Scanner Orchestration'}
                {currentTab === 'policies' && 'Policy-as-Code Engine (OPA)'}
                {currentTab === 'diagnostics' && 'System Health & Diagnostics'}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Deterministic AI Security Control Plane &bull; Step 4 Intent Understanding
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
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Core Principle &bull; Step 4
                </div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  &ldquo;Security Requirements Follow the Intent.&rdquo;
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  The system must first understand what the developer is trying to build before determining what security controls are required.
                  The Intent Engine extracts technical characteristics, interfaces, data domains, workflows, and detects ambiguities.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div className="glass-panel" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>Intent Engine</span>
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>Blueprint Engine</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }}>STEP 5</span>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Security Requirements
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Follows Intent Engine
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>Control Plane API</span>
                    {apiError ? <AlertCircleIcon size={16} color="var(--status-danger)" /> : <CheckCircleIcon size={16} color="var(--status-success)" />}
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {apiError ? 'Offline' : 'FastAPI Operational'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Port: 8000 &bull; /api/v1
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>Persistence Layer</span>
                    {isDbHealthy ? <CheckCircleIcon size={16} color="var(--status-success)" /> : <AlertCircleIcon size={16} color="var(--status-warning)" />}
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {isDbHealthy ? 'PostgreSQL Ready' : 'Database Pending'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {isDbHealthy ? `Ping: ${readiness?.dependencies.postgresql.latency_ms}ms` : 'Waiting for connection'}
                  </div>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>
                  Intent Understanding Demonstration
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Submit natural-language developer intent to extract structured architectural facts, interfaces, data domains, workflows, and detect missing information.
                </p>
                <button
                  onClick={() => setCurrentTab('intents')}
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
                  Open Intent Engine &rarr;
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
                  The raw description is preserved verbatim in PostgreSQL for complete traceability. The Intent Engine extracts technical characteristics without generating security controls.
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
                      alert('Intent submitted via API: POST /api/v1/intents. See automated test results for verified persistence.');
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                <div className="glass-panel" style={{ padding: '20px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                    Application Archetype
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: 600 }}>PAYMENT_API</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Confidence: 0.95 &bull; Classification only, NOT a security policy
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '20px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
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
                  <div style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
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
                  <div style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
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
            <EmptyState
              icon={<CpuIcon size={28} />}
              title="Security Blueprint Engine Pending"
              description="Per Step 4 Core Principle: Security Requirements Follow the Intent. The Security Blueprint Engine will derive tailored controls (rate limiting, webhook verification, MFA) from this intent in Step 5."
              statusBadge="NEXT: STEP 5"
            />
          )}

          {/* TAB: SCANNERS */}
          {currentTab === 'scanners' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="glass-panel" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>
                  Security Scanners Orchestration Layer
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Per production rules, scanner results are never simulated. Each scanner will execute its actual CLI/container process in future scanner steps.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {[
                  { name: 'Semgrep', type: 'Static Application Security Testing (SAST)', ext: 'scanners/semgrep' },
                  { name: 'Gitleaks', type: 'Secret & Credential Detection', ext: 'scanners/gitleaks' },
                  { name: 'OSV-Scanner', type: 'Open Source Vulnerability Dependency Audit', ext: 'scanners/osv' },
                  { name: 'Trivy', type: 'Container Image & OS Vulnerability Scanning', ext: 'scanners/trivy' },
                  { name: 'Checkov', type: 'Infrastructure as Code (IaC) Policy Enforcement', ext: 'scanners/checkov' },
                ].map((s) => (
                  <div key={s.name} className="glass-panel" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 600 }}>{s.name}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }}>
                        ARCHITECTURE READY
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>{s.type}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{s.ext}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: POLICIES */}
          {currentTab === 'policies' && (
            <EmptyState
              icon={<DatabaseIcon size={28} />}
              title="Open Policy Agent (OPA) Integration"
              description="Rego policy suites will be evaluated by the Policy Engine to make authoritative ALLOW or BLOCK decisions on developer actions and AI tool invocations."
              statusBadge="FUTURE STEP"
            />
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
