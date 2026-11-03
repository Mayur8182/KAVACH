import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import type {
  SecurityContract,
  SecurityContractVersion,
  ContractCompileResponse,
  ContractValidateResponse,
  ContractDependency,
  ContractVerification,
  ContractViolation,
  ContractOverride,
} from '../types/api';
import {
  ShieldIcon,
  RefreshIcon,
} from './Icons';

const DEFAULT_CONTRACT_EXAMPLE = {
  key: "tenant-isolation",
  name: "Tenant Isolation",
  description: "Users may access only resources belonging to their tenant.",
  scope: {
    type: "API",
    resource_type: "INVOICE",
    environment: "PRODUCTION"
  },
  subject: {
    type: "AUTHENTICATED_USER"
  },
  action: {
    type: "READ"
  },
  resource: {
    type: "INVOICE"
  },
  invariant: {
    operator: "EQUALS",
    left: {
      field: "subject.tenant_id"
    },
    right: {
      field: "resource.tenant_id"
    }
  },
  violation: {
    type: "CROSS_TENANT_ACCESS",
    severity: "HIGH",
    description: "Subject attempted to read an invoice belonging to a different tenant."
  },
  evidence: {
    required: [
      {
        type: "AUTHORIZATION_DECISION",
        source: "AUTHORIZATION_ENGINE",
        required: true
      },
      {
        type: "API_RESPONSE",
        source: "API_GATEWAY",
        required: true
      }
    ]
  }
};

export const ContractsView: React.FC = () => {
  const [projectId] = useState<string>('00000000-0000-0000-0000-000000000001');
  const [contracts, setContracts] = useState<SecurityContract[]>([]);
  const [selectedContract, setSelectedContract] = useState<SecurityContract | null>(null);
  const [versions, setVersions] = useState<SecurityContractVersion[]>([]);
  const [dependencies, setDependencies] = useState<ContractDependency[]>([]);
  const [verifications, setVerifications] = useState<ContractVerification[]>([]);
  const [violations, setViolations] = useState<ContractViolation[]>([]);
  const [overrides, setOverrides] = useState<ContractOverride[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'definition' | 'versions' | 'dependencies' | 'verifications' | 'violations' | 'overrides' | 'evaluator'>('definition');

  // Creator state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createContractKey, setCreateContractKey] = useState<string>('tenant-isolation');
  const [createName, setCreateName] = useState<string>('Tenant Isolation');
  const [createDescription, setCreateDescription] = useState<string>('Users may access only resources belonging to their tenant.');
  const [createJsonText, setCreateJsonText] = useState<string>(JSON.stringify(DEFAULT_CONTRACT_EXAMPLE, null, 2));
  const [validationResult, setValidationResult] = useState<ContractValidateResponse | null>(null);
  const [compileResult, setCompileResult] = useState<ContractCompileResponse | null>(null);
  const [creating, setCreating] = useState<boolean>(false);

  // Evaluator state
  const [evalEvidenceText, setEvalEvidenceText] = useState<string>(
    JSON.stringify(
      {
        subject: { tenant_id: "tenant-100", type: "AUTHENTICATED_USER" },
        resource: { tenant_id: "tenant-100", type: "INVOICE" },
        action: { type: "READ" },
        context: { environment: "PRODUCTION" }
      },
      null,
      2
    )
  );
  const [evalResult, setEvalResult] = useState<Record<string, any> | null>(null);
  const [evaluating, setEvaluating] = useState<boolean>(false);

  // Override state
  const [overrideReason, setOverrideReason] = useState<string>('Emergency tenant data migration');
  const [overrideHours, setOverrideHours] = useState<number>(4);

  // Load contracts
  const loadContracts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.listContracts(projectId);
      if (res.data) {
        setContracts(res.data);
        if (res.data.length > 0 && !selectedContract) {
          setSelectedContract(res.data[0]);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load security contracts.');
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedContract]);

  useEffect(() => {
    loadContracts();
  }, [projectId]);

  // Load details of selected contract
  const loadContractDetails = useCallback(async (contractId: string) => {
    try {
      const [verRes, depRes, histRes, violRes, overRes] = await Promise.all([
        apiClient.getContractVersions(contractId),
        apiClient.getContractDependencies(contractId),
        apiClient.getContractVerifications(contractId),
        apiClient.getContractViolations(contractId),
        apiClient.listContractOverrides(contractId),
      ]);
      if (verRes.data) setVersions(verRes.data);
      if (depRes.data) setDependencies(depRes.data);
      if (histRes.data) setVerifications(histRes.data);
      if (violRes.data) setViolations(violRes.data);
      if (overRes.data) setOverrides(overRes.data);
    } catch (err: any) {
      console.error('Failed to load contract details:', err);
    }
  }, []);

  useEffect(() => {
    if (selectedContract) {
      loadContractDetails(selectedContract.id);
    }
  }, [selectedContract, loadContractDetails]);

  // Validate handler
  const handleValidate = async () => {
    try {
      const parsed = JSON.parse(createJsonText);
      const res = await apiClient.validateContract(projectId, { definition: parsed });
      if (res.data) {
        setValidationResult(res.data);
      }
    } catch (err: any) {
      setValidationResult({
        valid: false,
        errors: [{ message: `JSON syntax error: ${err.message}` }],
      });
    }
  };

  // Compile handler
  const handleCompile = async () => {
    try {
      const parsed = JSON.parse(createJsonText);
      const res = await apiClient.compileContract(projectId, { definition: parsed });
      if (res.data) {
        setCompileResult(res.data);
      }
    } catch (err: any) {
      setCompileResult({
        success: false,
        version: 1,
        errors: [{ message: `Compilation error: ${err.message}` }],
      });
    }
  };

  // Create contract handler
  const handleCreateContract = async () => {
    setCreating(true);
    try {
      const parsed = JSON.parse(createJsonText);
      const res = await apiClient.createContract(projectId, {
        contract_key: createContractKey,
        name: createName,
        description: createDescription,
        definition: parsed,
      });
      if (res.data) {
        setShowCreateModal(false);
        await loadContracts();
        setSelectedContract(res.data);
      }
    } catch (err: any) {
      alert(`Contract creation failed: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  // Activate Version handler
  const handleActivateVersion = async (versionId: string) => {
    if (!selectedContract) return;
    try {
      await apiClient.activateContractVersion(selectedContract.id, versionId);
      await loadContracts();
      await loadContractDetails(selectedContract.id);
    } catch (err: any) {
      alert(`Activation failed: ${err.message}`);
    }
  };

  // Test Evaluate handler
  const handleRunEvaluation = async () => {
    if (!selectedContract || !selectedContract.current_version_id) {
      alert('Selected contract has no active version to evaluate.');
      return;
    }
    setEvaluating(true);
    setEvalResult(null);
    try {
      const evidence = JSON.parse(evalEvidenceText);
      const res = await apiClient.evaluateContract(
        selectedContract.id,
        selectedContract.current_version_id,
        evidence
      );
      if (res.data) {
        setEvalResult(res.data);
        await loadContractDetails(selectedContract.id);
      }
    } catch (err: any) {
      alert(`Evaluation failed: ${err.message}`);
    } finally {
      setEvaluating(false);
    }
  };

  // Create Override handler
  const handleCreateOverride = async () => {
    if (!selectedContract) return;
    try {
      await apiClient.createContractOverride(selectedContract.id, {
        reason: overrideReason,
        scope: {},
        expires_in_hours: overrideHours,
      });
      await loadContractDetails(selectedContract.id);
      alert('Security override recorded.');
    } catch (err: any) {
      alert(`Override failed: ${err.message}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="badge badge-success">ACTIVE</span>;
      case 'VALID':
        return <span className="badge badge-info">VALID</span>;
      case 'DRAFT':
        return <span className="badge badge-warning">DRAFT</span>;
      case 'RETIRED':
        return <span className="badge badge-neutral">RETIRED</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  const getVerificationBadge = (vStatus?: string) => {
    switch (vStatus) {
      case 'VERIFIED':
        return <span className="badge badge-success">VERIFIED</span>;
      case 'VIOLATED':
        return <span className="badge badge-error">VIOLATED</span>;
      case 'UNKNOWN':
        return <span className="badge badge-warning">UNKNOWN</span>;
      default:
        return <span className="badge badge-neutral">NOT VERIFIED</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner / Header */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ color: 'var(--accent-primary)', display: 'inline-flex' }}>
              <ShieldIcon size={24} />
            </span>
            <h2 style={{ fontSize: '20px', fontWeight: 600 }}>Security Contract Engine (Step 12)</h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '700px' }}>
            Deterministic security invariants that must remain true across projects, APIs, agents, and deployments.
            Contracts represent security requirements, not scan results. No security scores; explicit deterministic verification only.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={loadContracts} disabled={loading}>
            <RefreshIcon size={14} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            + New Security Contract
          </button>
        </div>
      </div>

      {error && (
        <div className="glass-panel" style={{ padding: '16px', borderLeft: '4px solid var(--accent-error)', color: 'var(--accent-error)' }}>
          {error}
        </div>
      )}

      {/* Main Layout: Left Contracts List, Right Contract Inspector */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
        {/* Left: Contracts List */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
              Declared Invariants ({contracts.length})
            </h3>
          </div>

          {loading && contracts.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Loading contracts...</p>
          ) : contracts.length === 0 ? (
            <div style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
              No contracts found for this project. Declare an invariant to begin.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {contracts.map((c) => {
                const isSelected = selectedContract?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedContract(c)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.1)' : 'var(--bg-tertiary)',
                      border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                        {c.name}
                      </span>
                      {getStatusBadge(c.status)}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'monospace', marginBottom: '6px' }}>
                      {c.contract_key}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <span>Versions: {c.versions_count || 1}</span>
                      <span>{c.current_version_id ? 'v' + (c.current_version?.version || 1) : 'No Active v'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Selected Contract Detail */}
        {selectedContract ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Contract Header Card */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{selectedContract.name}</h3>
                    {getStatusBadge(selectedContract.status)}
                    {getVerificationBadge(verifications.length > 0 ? verifications[0].status : 'NOT_VERIFIED')}
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {selectedContract.description || 'No description provided.'}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Key</div>
                  <code style={{ fontSize: '13px', color: 'var(--accent-primary)' }}>{selectedContract.contract_key}</code>
                </div>
              </div>

              {/* Metadata strip */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', padding: '16px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>Active Version</span>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>
                    {selectedContract.current_version ? `v${selectedContract.current_version.version}` : 'None'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>Definition SHA-256</span>
                  <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                    {selectedContract.current_version?.definition_hash ? `${selectedContract.current_version.definition_hash.slice(0, 12)}...` : 'N/A'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>Evidence Status</span>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>
                    {verifications.length > 0 ? verifications[0].status : 'NOT_VERIFIED'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>Active Overrides</span>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>
                    {overrides.filter(o => o.status === 'ACTIVE').length}
                  </span>
                </div>
              </div>
            </div>

            {/* Sub-navigation tabs */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
              {(['definition', 'versions', 'dependencies', 'verifications', 'violations', 'overrides', 'evaluator'] as const).map(tab => (
                <button
                  key={tab}
                  className={`btn ${activeSubTab === tab ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ textTransform: 'capitalize', fontSize: '12px', padding: '6px 14px' }}
                  onClick={() => setActiveSubTab(tab)}
                >
                  {tab === 'verifications' ? `Verifications (${verifications.length})` :
                   tab === 'violations' ? `Violations (${violations.length})` :
                   tab === 'versions' ? `Versions (${versions.length})` :
                   tab === 'dependencies' ? `Dependencies (${dependencies.length})` :
                   tab === 'overrides' ? `Overrides (${overrides.length})` :
                   tab}
                </button>
              ))}
            </div>

            {/* TAB CONTENT: DEFINITION */}
            {activeSubTab === 'definition' && (
              <div className="glass-panel" style={{ padding: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Canonical Normalized AST</h4>
                <pre
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    padding: '16px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '12px',
                    color: '#e2e8f0',
                    overflowX: 'auto',
                    lineHeight: 1.5,
                  }}
                >
                  {selectedContract.current_version
                    ? JSON.stringify(selectedContract.current_version.normalized_definition, null, 2)
                    : 'No active version compiled.'}
                </pre>
              </div>
            )}

            {/* TAB CONTENT: VERSIONS */}
            {activeSubTab === 'versions' && (
              <div className="glass-panel" style={{ padding: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Immutable Version History</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {versions.map(v => (
                    <div
                      key={v.id}
                      style={{
                        padding: '14px',
                        backgroundColor: 'var(--bg-tertiary)',
                        borderRadius: 'var(--radius-sm)',
                        border: v.status === 'ACTIVE' ? '1px solid var(--accent-success)' : '1px solid var(--border-subtle)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600 }}>Version {v.version}</span>
                          {getStatusBadge(v.status)}
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            Schema: {v.schema_version} | Hash: <code style={{ color: 'var(--accent-primary)' }}>{v.definition_hash.slice(0, 10)}...</code>
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          Created: {new Date(v.created_at).toLocaleString()} by {v.created_by}
                          {v.activated_at && ` | Activated: ${new Date(v.activated_at).toLocaleString()}`}
                        </div>
                      </div>
                      {v.status !== 'ACTIVE' && (
                        <button
                          className="btn btn-secondary"
                          style={{ fontSize: '12px', padding: '6px 12px' }}
                          onClick={() => handleActivateVersion(v.id)}
                        >
                          Activate Version
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT: DEPENDENCIES */}
            {activeSubTab === 'dependencies' && (
              <div className="glass-panel" style={{ padding: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Contract Dependency Graph</h4>
                {dependencies.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No inter-contract dependencies configured.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {dependencies.map(d => (
                      <div key={d.id} style={{ padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                        <span className="badge badge-info">{d.dependency_type}</span> Target Version ID: {d.depends_on_contract_version_id}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: VERIFICATIONS */}
            {activeSubTab === 'verifications' && (
              <div className="glass-panel" style={{ padding: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Evaluation Trace & Historical Verification</h4>
                {verifications.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    No evaluations executed yet. Use the Test Evaluator tab to test invariants against evidence context.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {verifications.map(v => (
                      <div key={v.id} style={{ padding: '14px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {getVerificationBadge(v.status)}
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              Verifier: {v.verifier_type} v{v.verifier_version}
                            </span>
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {new Date(v.evaluated_at).toLocaleString()}
                          </span>
                        </div>
                        <pre style={{ fontSize: '11px', color: '#e2e8f0', backgroundColor: 'var(--bg-primary)', padding: '10px', borderRadius: '4px', overflowX: 'auto' }}>
                          {JSON.stringify(v.evaluation_result, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: VIOLATIONS */}
            {activeSubTab === 'violations' && (
              <div className="glass-panel" style={{ padding: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Detected Invariant Violations</h4>
                {violations.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No violations recorded for this contract.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {violations.map(viol => (
                      <div key={viol.id} style={{ padding: '14px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid var(--accent-error)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent-error)' }}>{viol.violation_type}</span>
                          <span className="badge badge-error">{viol.severity}</span>
                        </div>
                        <p style={{ fontSize: '13px', marginBottom: '8px' }}>{viol.description}</p>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          Status: {viol.status} | Detected: {new Date(viol.detected_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: OVERRIDES */}
            {activeSubTab === 'overrides' && (
              <div className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 600 }}>Security Contract Overrides</h4>
                </div>
                <div style={{ padding: '16px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
                  <h5 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Request Scoped Time-Bounded Override</h5>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px auto', gap: '12px' }}>
                    <input
                      className="input"
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="Justification reason..."
                    />
                    <input
                      type="number"
                      className="input"
                      value={overrideHours}
                      onChange={(e) => setOverrideHours(Number(e.target.value))}
                      placeholder="Hours"
                    />
                    <button className="btn btn-secondary" onClick={handleCreateOverride}>
                      Grant Override
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {overrides.map(o => (
                    <div key={o.id} style={{ padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600 }}>{o.reason}</span>
                        <span className="badge badge-warning">{o.status}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Expires: {new Date(o.expires_at).toLocaleString()} | Actor: {o.actor_id}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT: TEST EVALUATOR */}
            {activeSubTab === 'evaluator' && (
              <div className="glass-panel" style={{ padding: '20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Deterministic Contract Evaluator</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Execute invariant against test evidence context without arbitrary code execution. Evaluator enforces three-valued logic (TRUE, FALSE, UNKNOWN).
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                      Evidence Context Payload (JSON)
                    </span>
                    <textarea
                      rows={12}
                      className="input"
                      style={{ fontFamily: 'monospace', fontSize: '12px', width: '100%' }}
                      value={evalEvidenceText}
                      onChange={(e) => setEvalEvidenceText(e.target.value)}
                    />
                    <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-primary"
                        onClick={handleRunEvaluation}
                        disabled={evaluating}
                      >
                        {evaluating ? 'Evaluating...' : 'Evaluate Invariant'}
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setEvalEvidenceText(JSON.stringify({
                            subject: { tenant_id: "tenant-1" },
                            resource: { tenant_id: "tenant-2" }
                          }, null, 2));
                        }}
                      >
                        Load Cross-Tenant Case
                      </button>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                      Evaluation Result & Trace
                    </span>
                    {evalResult ? (
                      <pre
                        style={{
                          backgroundColor: 'var(--bg-primary)',
                          padding: '14px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '12px',
                          color: '#e2e8f0',
                          height: '240px',
                          overflowY: 'auto',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        {JSON.stringify(evalResult, null, 2)}
                      </pre>
                    ) : (
                      <div
                        style={{
                          height: '240px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'var(--bg-tertiary)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-secondary)',
                          fontSize: '12px',
                        }}
                      >
                        Click "Evaluate Invariant" to view trace
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Select a contract from the list to view its specification and evaluation history.
          </div>
        )}
      </div>

      {/* CREATE CONTRACT MODAL */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '24px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '800px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Create New Security Contract</h3>
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Contract Key (Slug)
                </label>
                <input
                  className="input"
                  value={createContractKey}
                  onChange={(e) => setCreateContractKey(e.target.value)}
                  placeholder="e.g. tenant-isolation"
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Name
                </label>
                <input
                  className="input"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Tenant Isolation"
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Description
              </label>
              <input
                className="input"
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                placeholder="Description of the security invariant..."
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Structured Contract Definition (DSL JSON)
              </label>
              <textarea
                rows={12}
                className="input"
                style={{ fontFamily: 'monospace', fontSize: '12px', width: '100%' }}
                value={createJsonText}
                onChange={(e) => setCreateJsonText(e.target.value)}
              />
            </div>

            {/* Validation / Compile Results */}
            {validationResult && (
              <div
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: validationResult.valid ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: validationResult.valid ? '1px solid var(--accent-success)' : '1px solid var(--accent-error)',
                  fontSize: '12px',
                }}
              >
                <strong>{validationResult.valid ? 'Syntax & Schema: VALID' : 'Validation FAILED:'}</strong>
                {validationResult.errors?.map((err, i) => (
                  <div key={i} style={{ color: 'var(--accent-error)', marginTop: '4px' }}>
                    {err.path ? `[${err.path}] ` : ''}{err.message}
                  </div>
                ))}
              </div>
            )}

            {compileResult && (
              <div
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: compileResult.success ? 'rgba(56, 189, 248, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: compileResult.success ? '1px solid var(--accent-primary)' : '1px solid var(--accent-error)',
                  fontSize: '12px',
                }}
              >
                <div><strong>Compiled Hash (SHA-256):</strong> {compileResult.definition_hash}</div>
                <div><strong>Version:</strong> {compileResult.version}</div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <button className="btn btn-secondary" onClick={handleValidate}>
                Validate Syntax
              </button>
              <button className="btn btn-secondary" onClick={handleCompile}>
                Test Compile
              </button>
              <button className="btn btn-primary" onClick={handleCreateContract} disabled={creating}>
                {creating ? 'Creating...' : 'Create Contract'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
