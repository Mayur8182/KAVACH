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
    // Auto-refresh readiness probe every 15 seconds
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
                {currentTab === 'projects' && 'Projects & Workspaces'}
                {currentTab === 'blueprints' && 'Security Blueprint Engine'}
                {currentTab === 'scanners' && 'Security Scanner Orchestration'}
                {currentTab === 'policies' && 'Policy-as-Code Engine (OPA)'}
                {currentTab === 'diagnostics' && 'System Health & Diagnostics'}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Deterministic AI Security Control Plane &bull; Architecture Foundation
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

          {/* TAB 1: OVERVIEW */}
          {currentTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Golden Rule Callout */}
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
                  Architectural Golden Rule
                </div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  &ldquo;LLM proposes. Deterministic security systems decide. Runtime evidence proves.&rdquo;
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  The control plane establishes an authoritative perimeter around AI coding agents and developers.
                  Tool access, database operations, and deployments are gated by deterministic policies (OPA) and live scanner evidence, never by unverified LLM decisions.
                </p>
              </div>

              {/* Real Subsystems Status Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
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

                <div className="glass-panel" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>Policy Engine</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }}>STEP 5</span>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Open Policy Agent
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Architecture prepared
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>MCP Gateway</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }}>STEP 6</span>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Tool Execution Proxy
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Architecture prepared
                  </div>
                </div>
              </div>

              {/* Real Empty Projects Notice */}
              <EmptyState
                icon={<LayersIcon size={24} />}
                title="No Security Projects Active"
                description="The application foundation is verified. Project entities, scans, and audit logging will be persisted to PostgreSQL in Step 3. No mock data or fake findings are rendered."
                statusBadge="STEP 2 COMPLETED"
                actionLabel="View System Diagnostics"
                onAction={() => setCurrentTab('diagnostics')}
              />
            </div>
          )}

          {/* TAB 2: PROJECTS */}
          {currentTab === 'projects' && (
            <EmptyState
              icon={<LayersIcon size={28} />}
              title="No Projects Configured"
              description="Project management models and database tables will be created in Step 3. Connect a repository or declare an application intent to generate projects."
              statusBadge="NO DATA"
            />
          )}

          {/* TAB 3: BLUEPRINTS */}
          {currentTab === 'blueprints' && (
            <EmptyState
              icon={<CpuIcon size={28} />}
              title="No Security Blueprints Generated"
              description="The Security Blueprint Engine dynamically derives required controls from the application's intent and technology stack. Blueprints will be generated when a project is registered."
              statusBadge="NOT CONFIGURED"
            />
          )}

          {/* TAB 4: SCANNERS */}
          {currentTab === 'scanners' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="glass-panel" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>
                  Security Scanners Orchestration Layer
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Per production rules, scanner results are never simulated. Each scanner will execute its actual CLI/container process in Step 4.
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
                        READY FOR STEP 4
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>{s.type}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{s.ext}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: POLICIES */}
          {currentTab === 'policies' && (
            <EmptyState
              icon={<DatabaseIcon size={28} />}
              title="Open Policy Agent (OPA) Integration"
              description="Rego policy suites will be evaluated by the Policy Engine to make authoritative ALLOW or BLOCK decisions on developer actions and AI tool invocations."
              statusBadge="READY FOR STEP 5"
            />
          )}

          {/* TAB 6: DIAGNOSTICS */}
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

              <div className="glass-panel" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
                  Monorepo Architectural Extension Points
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                  <div style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>backend/app/engines/intent/</div>
                  <div style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>backend/app/engines/blueprint/</div>
                  <div style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>backend/app/engines/scanner/</div>
                  <div style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>backend/app/engines/policy/</div>
                  <div style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>mcp/gateway/</div>
                  <div style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>runtime/evidence/</div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
