import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import type { Agent, AgentCredential, Role, Permission } from '../types/api';
import {
  CheckCircleIcon,
  AlertCircleIcon,
  RefreshIcon,
} from './Icons';

interface AgentsViewProps {
  projectId?: string;
  projectName?: string;
}

export const AgentsView: React.FC<AgentsViewProps> = ({
  projectId = '00000000-0000-0000-0000-000000000001',
  projectName = 'Default Production Project',
}) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [credentials, setCredentials] = useState<AgentCredential[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New Agent Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newType, setNewType] = useState<string>('CODING_AGENT');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newTrustLevel, setNewTrustLevel] = useState<string>('STANDARD');
  const [newInitialRole, setNewInitialRole] = useState<string>('CodingAssistant');

  // New Credential One-Time Display State
  const [newlyCreatedSecret, setNewlyCreatedSecret] = useState<string | null>(null);
  const [credName, setCredName] = useState<string>('Primary Access Key');

  // Role Assignment State
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [roleEnvScope, setRoleEnvScope] = useState<string>('DEVELOPMENT');

  const fetchAgentsAndRoles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [agentsRes, rolesRes, permsRes] = await Promise.all([
        apiClient.listProjectAgents(projectId),
        apiClient.listRoles(),
        apiClient.listPermissions(),
      ]);

      if (agentsRes.data) {
        setAgents(agentsRes.data);
        if (selectedAgent) {
          const updated = agentsRes.data.find((a) => a.id === selectedAgent.id);
          if (updated) setSelectedAgent(updated);
        }
      }
      if (rolesRes.data) setRoles(rolesRes.data);
      if (permsRes.data) setPermissions(permsRes.data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load agents or roles');
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedAgent]);

  useEffect(() => {
    fetchAgentsAndRoles();
  }, [projectId]);

  const selectAgent = async (agent: Agent) => {
    setSelectedAgent(agent);
    setNewlyCreatedSecret(null);
    try {
      const credsRes = await apiClient.getAgentCredentials(agent.id);
      if (credsRes.data) {
        setCredentials(credsRes.data);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load credentials for agent');
    }
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.createAgent(projectId, {
        name: newName.trim(),
        agent_type: newType,
        description: newDescription.trim() || undefined,
        status: 'ACTIVE',
        trust_level: newTrustLevel,
        initial_role: newInitialRole,
      });

      if (res.data) {
        setSuccessMessage(`Agent '${res.data.name}' registered successfully.`);
        setShowCreateModal(false);
        setNewName('');
        setNewDescription('');
        await fetchAgentsAndRoles();
        selectAgent(res.data);
      } else if (res.error) {
        setError(res.error.message);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to register agent');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusTransition = async (agentId: string, action: 'activate' | 'suspend' | 'revoke') => {
    setLoading(true);
    setError(null);
    try {
      let res;
      if (action === 'activate') res = await apiClient.activateAgent(agentId);
      else if (action === 'suspend') res = await apiClient.suspendAgent(agentId);
      else res = await apiClient.revokeAgent(agentId);

      if (res.data) {
        setSuccessMessage(`Agent status transitioned to ${res.data.status}.`);
        await fetchAgentsAndRoles();
        if (selectedAgent?.id === agentId) {
          selectAgent(res.data);
        }
      } else if (res.error) {
        setError(res.error.message);
      }
    } catch (e: any) {
      setError(e?.message || `Failed to transition agent to ${action}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCredential = async () => {
    if (!selectedAgent) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.createAgentCredential(selectedAgent.id, credName, 90);
      if (res.data) {
        setNewlyCreatedSecret(res.data.raw_secret);
        setSuccessMessage('Agent API Credential issued. Displaying secret ONCE.');
        const credsRes = await apiClient.getAgentCredentials(selectedAgent.id);
        if (credsRes.data) setCredentials(credsRes.data);
      } else if (res.error) {
        setError(res.error.message);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to issue credential');
    } finally {
      setLoading(false);
    }
  };

  const handleRotateCredential = async (credId: string) => {
    if (!selectedAgent) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.rotateAgentCredential(selectedAgent.id, credId);
      if (res.data) {
        setNewlyCreatedSecret(res.data.raw_secret);
        setSuccessMessage('Credential rotated. Previous key revoked immediately.');
        const credsRes = await apiClient.getAgentCredentials(selectedAgent.id);
        if (credsRes.data) setCredentials(credsRes.data);
      } else if (res.error) {
        setError(res.error.message);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to rotate credential');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeCredential = async (credId: string) => {
    if (!selectedAgent) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.revokeAgentCredential(selectedAgent.id, credId, 'User revoked via UI');
      if (res.data) {
        setSuccessMessage('Credential permanently revoked. Any live sessions terminated.');
        const credsRes = await apiClient.getAgentCredentials(selectedAgent.id);
        if (credsRes.data) setCredentials(credsRes.data);
      } else if (res.error) {
        setError(res.error.message);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to revoke credential');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async () => {
    if (!selectedAgent || !selectedRoleId) return;
    setLoading(true);
    setError(null);
    try {
      const scope = {
        project_id: projectId,
        environment: roleEnvScope,
      };
      const res = await apiClient.assignAgentRole(selectedAgent.id, selectedRoleId, scope);
      if (res.data) {
        setSuccessMessage('Role assigned with scoped environment parameters.');
        await fetchAgentsAndRoles();
        const updated = await apiClient.getAgent(selectedAgent.id);
        if (updated.data) selectAgent(updated.data);
      } else if (res.error) {
        setError(res.error.message);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to assign role');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRole = async (roleId: string) => {
    if (!selectedAgent) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.removeAgentRole(selectedAgent.id, roleId);
      if (res.data) {
        setSuccessMessage('Role removed from agent.');
        await fetchAgentsAndRoles();
        const updated = await apiClient.getAgent(selectedAgent.id);
        if (updated.data) selectAgent(updated.data);
      } else if (res.error) {
        setError(res.error.message);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to remove role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '8px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            AI Agent Identity & Authorization
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
            Project Scope: <strong style={{ color: 'var(--accent-primary)' }}>{projectName}</strong>. Manage cryptographic agent credentials, roles, and deterministic permission scopes.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={fetchAgentsAndRoles}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            <RefreshIcon size={14} /> Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: 'var(--accent-primary)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              color: '#fff',
              fontWeight: 500,
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            + Register New Agent
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: 'var(--radius-sm)', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
          <AlertCircleIcon size={16} />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid #22c55e', borderRadius: 'var(--radius-sm)', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
          <CheckCircleIcon size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* One-Time Secret Display Warning Banner (Section 50) */}
      {newlyCreatedSecret && (
        <div style={{
          padding: '16px 20px',
          backgroundColor: 'rgba(234, 179, 8, 0.12)',
          border: '1px solid #eab308',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#eab308', fontWeight: 600 }}>
            <AlertCircleIcon size={18} />
            <span>CRITICAL: Agent Secret Token Generated</span>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)' }}>
            This secret will <strong>only be displayed once</strong>. Store it securely in your agent runtime or CI secrets vault. It cannot be recovered from the database.
          </p>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: 'var(--bg-primary)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px dashed #eab308',
            fontFamily: 'monospace',
            fontSize: '14px',
            color: 'var(--accent-primary)',
          }}>
            <span style={{ userSelect: 'all', flex: 1, wordBreak: 'break-all' }}>{newlyCreatedSecret}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(newlyCreatedSecret);
                setSuccessMessage('Secret copied to clipboard!');
              }}
              style={{
                padding: '6px 12px',
                backgroundColor: 'var(--accent-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Split Panel: Agent List & Agent Details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '20px', alignItems: 'start' }}>
        {/* Left: Registered Agents Table */}
        <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Registered Agents ({agents.length})
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Project Scoped</span>
          </div>

          {agents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
              No agents registered for this project. Click '+ Register New Agent' to add an AI agent principal.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {agents.map((agent) => {
                const isSelected = selectedAgent?.id === agent.id;
                let statusColor = '#22c55e';
                if (agent.status === 'SUSPENDED') statusColor = '#eab308';
                else if (agent.status === 'REVOKED') statusColor = '#ef4444';
                else if (agent.status === 'REGISTERED') statusColor = '#3b82f6';

                return (
                  <div
                    key={agent.id}
                    onClick={() => selectAgent(agent)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-primary)',
                      border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                        {agent.name}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        backgroundColor: `${statusColor}20`,
                        color: statusColor,
                        fontWeight: 600,
                      }}>
                        {agent.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <span>Type: <strong>{agent.agent_type}</strong></span>
                      <span>Trust: <strong>{agent.trust_level}</strong></span>
                      <span>Roles: <strong>{agent.roles?.length || 0}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Agent Detail & Authorization Inspector */}
        <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
          {selectedAgent ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Agent Identity Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {selectedAgent.name}
                    </h3>
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      backgroundColor: selectedAgent.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: selectedAgent.status === 'ACTIVE' ? '#22c55e' : '#ef4444',
                      fontWeight: 600,
                    }}>
                      {selectedAgent.status}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Agent ID: <code style={{ color: 'var(--text-primary)' }}>{selectedAgent.id}</code>
                  </p>
                  {selectedAgent.description && (
                    <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {selectedAgent.description}
                    </p>
                  )}
                </div>

                {/* State Transition Actions */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {selectedAgent.status !== 'ACTIVE' && (
                    <button
                      onClick={() => handleStatusTransition(selectedAgent.id, 'activate')}
                      style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Activate
                    </button>
                  )}
                  {selectedAgent.status === 'ACTIVE' && (
                    <button
                      onClick={() => handleStatusTransition(selectedAgent.id, 'suspend')}
                      style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#eab308', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Suspend
                    </button>
                  )}
                  {selectedAgent.status !== 'REVOKED' && (
                    <button
                      onClick={() => handleStatusTransition(selectedAgent.id, 'revoke')}
                      style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>

              {/* Clearance & Trust Level Notice */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div style={{ padding: '10px 14px', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Agent Type</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>{selectedAgent.agent_type}</div>
                </div>
                <div style={{ padding: '10px 14px', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Clearance Level</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>{selectedAgent.trust_level}</div>
                </div>
                <div style={{ padding: '10px 14px', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Bound Project</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>{projectName}</div>
                </div>
              </div>

              {/* Roles & Permissions Section */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Assigned Roles & Scopes
                  </h4>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Deny-by-default Enforcement</span>
                </div>

                {(!selectedAgent.roles || selectedAgent.roles.length === 0) ? (
                  <div style={{ padding: '12px', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-subtle)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    No roles assigned. This agent possesses zero tool execution privileges.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedAgent.roles.map((ar) => (
                      <div
                        key={ar.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 12px',
                          backgroundColor: 'var(--bg-primary)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{ar.role_name || ar.role_id}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Scope: {JSON.stringify(ar.scope || {})}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveRole(ar.role_id)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: 'transparent',
                            color: '#ef4444',
                            border: '1px solid #ef4444',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Role Form */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <select
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                    }}
                  >
                    <option value="">Select Role to Assign...</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.description})
                      </option>
                    ))}
                  </select>
                  <select
                    value={roleEnvScope}
                    onChange={(e) => setRoleEnvScope(e.target.value)}
                    style={{
                      width: '130px',
                      padding: '8px',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                    }}
                  >
                    <option value="DEVELOPMENT">DEVELOPMENT</option>
                    <option value="TEST">TEST</option>
                    <option value="STAGING">STAGING</option>
                    <option value="PRODUCTION">PRODUCTION</option>
                  </select>
                  <button
                    onClick={handleAssignRole}
                    disabled={!selectedRoleId}
                    style={{
                      padding: '8px 14px',
                      backgroundColor: 'var(--accent-primary)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Assign
                  </button>
                </div>
              </div>

              {/* Cryptographic Credentials Table */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Cryptographic Credentials ({credentials.length})
                  </h4>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Key Name"
                      value={credName}
                      onChange={(e) => setCredName(e.target.value)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '4px',
                        color: 'var(--text-primary)',
                        width: '140px',
                      }}
                    />
                    <button
                      onClick={handleCreateCredential}
                      style={{
                        padding: '4px 10px',
                        backgroundColor: 'var(--accent-primary)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      + Issue Key
                    </button>
                  </div>
                </div>

                {credentials.length === 0 ? (
                  <div style={{ padding: '12px', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-subtle)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    No credentials issued for this agent. Issue a new key to allow authenticated MCP connections.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {credentials.map((c) => (
                      <div
                        key={c.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 12px',
                          backgroundColor: 'var(--bg-primary)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{c.name}</strong>
                            <code style={{ fontSize: '11px', color: 'var(--accent-primary)' }}>{c.credential_prefix}_...</code>
                            <span style={{
                              fontSize: '10px',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: c.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                              color: c.status === 'ACTIVE' ? '#22c55e' : '#ef4444',
                            }}>
                              {c.status}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Created: {new Date(c.created_at).toLocaleDateString()} {c.last_used_at ? `| Last Used: ${new Date(c.last_used_at).toLocaleDateString()}` : '| Never Used'}
                          </div>
                        </div>

                        {c.status === 'ACTIVE' && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => handleRotateCredential(c.id)}
                              style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: '#eab308', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              Rotate
                            </button>
                            <button
                              onClick={() => handleRevokeCredential(c.id)}
                              style={{ padding: '4px 8px', fontSize: '11px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              Revoke
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)', fontSize: '13px' }}>
              Select an agent from the list on the left to inspect identity, manage scoped roles, and issue cryptographic credentials.
            </div>
          )}
        </div>
      </div>

      {/* Permissions Catalog Section (Section 49) */}
      <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
          System Permissions Catalog ({permissions.length})
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
          {permissions.map((p) => {
            let riskBadge = '#22c55e';
            if (p.risk_level === 'MEDIUM') riskBadge = '#eab308';
            else if (p.risk_level === 'HIGH' || p.risk_level === 'CRITICAL') riskBadge = '#ef4444';

            return (
              <div
                key={p.id}
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <code style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</code>
                  <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', backgroundColor: `${riskBadge}20`, color: riskBadge, fontWeight: 600 }}>
                    {p.risk_level}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {p.description}
                </div>
                <div style={{ display: 'flex', gap: '8px', fontSize: '10px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                  <span>Resource: <strong>{p.resource_type}</strong></span>
                  <span>Action: <strong>{p.action}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Agent Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            width: '460px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Register AI Agent Principal
            </h3>
            <form onSubmit={handleCreateAgent} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Agent Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Antigravity Scanner Agent"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Agent Type
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="CODING_AGENT">CODING_AGENT (Interactive code modification)</option>
                  <option value="SECURITY_AGENT">SECURITY_AGENT (Automated scanner execution)</option>
                  <option value="CI_AGENT">CI_AGENT (Pipeline & GitHub Actions worker)</option>
                  <option value="AUTOMATION_AGENT">AUTOMATION_AGENT (Background scheduled tasks)</option>
                  <option value="IDE_AGENT">IDE_AGENT (Cursor / Antigravity editor agent)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Description / Responsibilities
                </label>
                <textarea
                  rows={2}
                  placeholder="Operational scope of this agent..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Trust Clearance
                  </label>
                  <select
                    value={newTrustLevel}
                    onChange={(e) => setNewTrustLevel(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="LOW">LOW</option>
                    <option value="STANDARD">STANDARD</option>
                    <option value="ELEVATED">ELEVATED</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Initial System Role
                  </label>
                  <select
                    value={newInitialRole}
                    onChange={(e) => setNewInitialRole(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="CodingAssistant">CodingAssistant</option>
                    <option value="SecurityReviewer">SecurityReviewer</option>
                    <option value="SecurityOperator">SecurityOperator</option>
                    <option value="AutomationAgent">AutomationAgent</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'var(--accent-primary)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    color: '#fff',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Register Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
