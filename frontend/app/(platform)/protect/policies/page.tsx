'use client';

/**
 * Thing Protect — Policies Management Page (/protect/policies)
 * Deterministic policy registry, 8-step builder, and dry-run simulation.
 */

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  FileCheck2,
  PlusCircle,
  Play,
  Search,
  Filter,
  CheckCircle,
  Clock,
  ChevronRight,
  Shield,
  Layers,
  ArrowRight,
  X,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { ProtectWorkshell } from '@/components/protect/ProtectWorkshell';
import {
  PolicyStatusBadge,
  EnforcementDecisionBadge,
  EmptyProtectState,
} from '@/components/protect/ProtectComponents';
import { api } from '@/lib/api/client';
import type { ProtectionPolicyItem, PolicySimulationResponse } from '@/types/api/protect';

function PoliciesContent() {
  const searchParams = useSearchParams();
  const initialAction = searchParams.get('action');

  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Create Policy Modal state
  const [createModalOpen, setCreateModalOpen] = useState(initialAction === 'create');
  const [currentStep, setCurrentStep] = useState(1);
  const [policyName, setPolicyName] = useState('');
  const [policyType, setPolicyType] = useState('Agent');
  const [scope, setScope] = useState('production');
  const [conditionActor, setConditionActor] = useState('AI Agent');
  const [conditionResource, setConditionResource] = useState('customer_records');
  const [conditionAction, setConditionAction] = useState('READ');
  const [decisionAction, setDecisionAction] = useState('REQUIRE_APPROVAL');
  const [enforcementMode, setEnforcementMode] = useState('ENFORCE');
  const [creating, setCreating] = useState(false);

  // Simulation Modal state
  const [simModalOpen, setSimModalOpen] = useState(initialAction === 'simulate');
  const [simPolicyId, setSimPolicyId] = useState('');
  const [simActor, setSimActor] = useState('agent/research-assistant');
  const [simAction, setSimAction] = useState('READ');
  const [simResource, setSimResource] = useState('customer_database');
  const [simResult, setSimResult] = useState<PolicySimulationResponse | null>(null);
  const [simulating, setSimulating] = useState(false);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const data: any = await api.protect.policies();
      const list = Array.isArray(data) ? data : data?.items || [];
      setPolicies(list);
      if (list.length > 0 && !simPolicyId) {
        setSimPolicyId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load policies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleCreatePolicy = async () => {
    try {
      setCreating(true);
      await api.protect.createPolicy({
        name: policyName || 'Custom Security Policy',
        policy_type: policyType,
        scope: { environment: scope },
        enforcement_mode: enforcementMode,
        conditions: [
          { field: 'actor', operator: 'equals', value: conditionActor },
          { field: 'resource', operator: 'equals', value: conditionResource },
          { field: 'action', operator: 'equals', value: conditionAction },
        ],
        action: decisionAction,
        description: `Enforces ${decisionAction} when ${conditionActor} attempts ${conditionAction} on ${conditionResource}.`,
      });
      setCreateModalOpen(false);
      fetchPolicies();
    } catch (err) {
      console.error('Failed to create policy:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleSimulate = async () => {
    if (!simPolicyId) return;
    try {
      setSimulating(true);
      const res = await api.protect.simulatePolicy(simPolicyId, {
        sample_events: [
          {
            actor: simActor,
            action: simAction,
            resource: simResource,
            environment: 'production',
          },
        ],
      });
      setSimResult(res);
    } catch (err) {
      console.error('Simulation failed:', err);
    } finally {
      setSimulating(false);
    }
  };

  const safePolicies = Array.isArray(policies) ? policies : [];
  const filtered = safePolicies.filter((p) => {
    const pName = p.name || '';
    const pType = p.policy_type || '';
    const matchSearch =
      pName.toLowerCase().includes(search.toLowerCase()) ||
      pType.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'ALL' || pType === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <ProtectWorkshell>
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
              DETERMINISTIC SECURITY POLICIES
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
              Authoritative OPA &amp; contract policies. Zero hallucination: policies strictly govern all agent, MCP, and API operations.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setSimModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: 600,
                background: 'rgba(234, 179, 8, 0.12)',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                borderRadius: 'var(--radius-md)',
                color: '#eab308',
                cursor: 'pointer',
              }}
            >
              <Play size={11} />
              Simulate Policy
            </button>
            <button
              onClick={() => {
                setCurrentStep(1);
                setCreateModalOpen(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 14px',
                fontSize: '11px',
                fontWeight: 700,
                background: '#10b981',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                color: '#ffffff',
                cursor: 'pointer',
              }}
            >
              <PlusCircle size={12} />
              Create Policy
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={13} color="var(--color-text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              placeholder="Search policies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                fontSize: '12px',
                background: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text-primary)',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            <Filter size={12} />
            <span>Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                background: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                fontSize: '11px',
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                outline: 'none',
              }}
            >
              <option value="ALL">ALL TYPES</option>
              <option value="Agent">Agent</option>
              <option value="MCP">MCP</option>
              <option value="API">API</option>
              <option value="Data">Data</option>
              <option value="Network">Network</option>
              <option value="Rate Limit">Rate Limit</option>
            </select>
          </div>
        </div>

        {/* Policies Table */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}
        >
          {loading && safePolicies.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Loading deterministic policies...
            </div>
          ) : filtered.length === 0 ? (
            <EmptyProtectState
              title="NO POLICIES FOUND"
              description="No active policies matching current filter."
              actionLabel="Create Policy"
              onAction={() => setCreateModalOpen(true)}
            />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    background: 'var(--color-surface-elevated)',
                    color: 'var(--color-text-muted)',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  <th style={{ padding: '10px 16px' }}>POLICY NAME</th>
                  <th style={{ padding: '10px 16px' }}>TYPE</th>
                  <th style={{ padding: '10px 16px' }}>SCOPE</th>
                  <th style={{ padding: '10px 16px' }}>VERSION</th>
                  <th style={{ padding: '10px 16px' }}>STATUS</th>
                  <th style={{ padding: '10px 16px' }}>MODE</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {p.name}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>
                      <span
                        style={{
                          padding: '2px 6px',
                          background: 'var(--color-surface-elevated)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '4px',
                          fontSize: '11px',
                        }}
                      >
                        {p.policy_type}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>
                      {typeof p.scope === 'object' ? JSON.stringify(p.scope) : p.scope || 'All'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                      {p.policy_version || `v${p.version || 1}`}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <PolicyStatusBadge status={p.status || 'ACTIVE'} />
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-primary)' }}>
                      <span
                        style={{
                          padding: '2px 6px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '4px',
                          fontSize: '11px',
                        }}
                      >
                        {p.enforcement_mode || 'ENFORCE'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <Link
                        href={`/protect/policies/${p.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          fontSize: '11px',
                          color: '#10b981',
                          background: 'rgba(16, 185, 129, 0.08)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          borderRadius: 'var(--radius-sm)',
                          textDecoration: 'none',
                        }}
                      >
                        <span>VIEW &amp; DIFF</span>
                        <ChevronRight size={11} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 8-Step Create Policy Modal */}
      {createModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(3px)',
            padding: '16px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '24px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileCheck2 size={16} color="#10b981" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  CREATE DETERMINISTIC POLICY
                </span>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
              Step {currentStep} of 4: Predicates &amp; Enforcement Actions
            </div>

            {currentStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Policy Name</label>
                  <input
                    type="text"
                    value={policyName}
                    placeholder="e.g. Sensitive Customer DB Protection"
                    onChange={(e) => setPolicyName(e.target.value)}
                    style={{ width: '100%', padding: '8px', fontSize: '12px', background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-primary)', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Policy Type</label>
                  <select
                    value={policyType}
                    onChange={(e) => setPolicyType(e.target.value)}
                    style={{ width: '100%', padding: '8px', fontSize: '12px', background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-primary)', outline: 'none' }}
                  >
                    <option value="Agent">Agent</option>
                    <option value="MCP">MCP</option>
                    <option value="API">API</option>
                    <option value="Data">Data</option>
                    <option value="Network">Network</option>
                  </select>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Actor Predicate</label>
                  <input
                    type="text"
                    value={conditionActor}
                    onChange={(e) => setConditionActor(e.target.value)}
                    style={{ width: '100%', padding: '8px', fontSize: '12px', background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-primary)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Resource Target</label>
                  <input
                    type="text"
                    value={conditionResource}
                    onChange={(e) => setConditionResource(e.target.value)}
                    style={{ width: '100%', padding: '8px', fontSize: '12px', background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-primary)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Action</label>
                  <input
                    type="text"
                    value={conditionAction}
                    onChange={(e) => setConditionAction(e.target.value)}
                    style={{ width: '100%', padding: '8px', fontSize: '12px', background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-primary)' }}
                  />
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Enforcement Action</label>
                  <select
                    value={decisionAction}
                    onChange={(e) => setDecisionAction(e.target.value)}
                    style={{ width: '100%', padding: '8px', fontSize: '12px', background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-primary)' }}
                  >
                    <option value="REQUIRE_APPROVAL">REQUIRE APPROVAL (Human-in-the-loop)</option>
                    <option value="BLOCK">BLOCK (Immediate Drop)</option>
                    <option value="CHALLENGE">CHALLENGE (Re-authenticate)</option>
                    <option value="RATE_LIMIT">RATE LIMIT</option>
                    <option value="ALLOW">ALLOW</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Mode</label>
                  <select
                    value={enforcementMode}
                    onChange={(e) => setEnforcementMode(e.target.value)}
                    style={{ width: '100%', padding: '8px', fontSize: '12px', background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-primary)' }}
                  >
                    <option value="ENFORCE">ENFORCE (Active enforcement)</option>
                    <option value="ALERT">ALERT (Notify without blocking)</option>
                    <option value="MONITOR">MONITOR (Observe only)</option>
                  </select>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div style={{ padding: '12px', background: 'var(--color-surface-elevated)', borderRadius: 'var(--radius-sm)', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div><strong>Policy:</strong> {policyName || 'Custom Policy'}</div>
                <div><strong>WHEN:</strong> {conditionActor} performs {conditionAction} on {conditionResource}</div>
                <div><strong>THEN:</strong> {decisionAction} (Mode: {enforcementMode})</div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
              {currentStep > 1 ? (
                <button
                  onClick={() => setCurrentStep((s) => s - 1)}
                  style={{ padding: '6px 14px', fontSize: '11px', background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-primary)', cursor: 'pointer' }}
                >
                  Back
                </button>
              ) : <div />}

              {currentStep < 4 ? (
                <button
                  onClick={() => setCurrentStep((s) => s + 1)}
                  style={{ padding: '6px 14px', fontSize: '11px', background: '#10b981', border: 'none', borderRadius: 'var(--radius-sm)', color: '#ffffff', cursor: 'pointer' }}
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleCreatePolicy}
                  disabled={creating}
                  style={{ padding: '6px 16px', fontSize: '11px', background: '#10b981', border: 'none', borderRadius: 'var(--radius-sm)', color: '#ffffff', cursor: 'pointer', fontWeight: 700 }}
                >
                  {creating ? 'Publishing...' : 'Publish Policy'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Simulation Modal */}
      {simModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(3px)',
            padding: '16px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Play size={16} color="#eab308" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  POLICY DRY-RUN SIMULATION
                </span>
              </div>
              <button
                onClick={() => setSimModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(234, 179, 8, 0.1)',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px',
                color: '#eab308',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangle size={14} />
              <span>SIMULATION MODE — NO ENFORCEMENT ACTION WILL BE TAKEN</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Target Policy</label>
                <select
                  value={simPolicyId}
                  onChange={(e) => setSimPolicyId(e.target.value)}
                  style={{ width: '100%', padding: '8px', fontSize: '12px', background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-primary)' }}
                >
                  {safePolicies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: 'var(--color-text-muted)' }}>Actor</label>
                  <input
                    type="text"
                    value={simActor}
                    onChange={(e) => setSimActor(e.target.value)}
                    style={{ width: '100%', padding: '6px', fontSize: '11px', background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-primary)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: 'var(--color-text-muted)' }}>Action</label>
                  <input
                    type="text"
                    value={simAction}
                    onChange={(e) => setSimAction(e.target.value)}
                    style={{ width: '100%', padding: '6px', fontSize: '11px', background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-primary)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: 'var(--color-text-muted)' }}>Resource</label>
                  <input
                    type="text"
                    value={simResource}
                    onChange={(e) => setSimResource(e.target.value)}
                    style={{ width: '100%', padding: '6px', fontSize: '11px', background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-primary)' }}
                  />
                </div>
              </div>

              <button
                onClick={handleSimulate}
                disabled={simulating}
                style={{
                  padding: '8px',
                  background: '#eab308',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  color: '#000000',
                  fontWeight: 700,
                  fontSize: '11px',
                  cursor: 'pointer',
                  marginTop: '6px',
                }}
              >
                {simulating ? 'Evaluating in OPA...' : 'Run Simulation'}
              </button>

              {simResult && (
                <div style={{ marginTop: '10px', padding: '12px', background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>PREDICTED DECISION</span>
                    <span style={{ fontWeight: 700, color: '#eab308' }}>WOULD {simResult.predicted_decision}</span>
                  </div>
                  <div style={{ marginTop: '4px', color: 'var(--color-text-secondary)' }}>
                    {simResult.reason}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </ProtectWorkshell>
  );
}

export default function PoliciesPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-muted)' }}>Loading...</div>}>
      <PoliciesContent />
    </Suspense>
  );
}
