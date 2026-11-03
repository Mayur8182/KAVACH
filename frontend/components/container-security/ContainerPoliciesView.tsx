'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ContainerSecurityLayout } from './ContainerSecurityLayout';
import { useScope } from '@/context/ScopeContext';
import { api } from '@/lib/api/client';
import {
  Shield,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
  Lock,
  Layers,
  Settings,
} from 'lucide-react';
import { toast } from '@/lib/toast';

const TABS = [
  { id: 'all', label: 'All Policies' },
  { id: 'admission', label: 'Admission Gate Policies' },
  { id: 'registries', label: 'Registry Whitelists' },
  { id: 'cve-thresholds', label: 'Vulnerability Thresholds' },
  { id: 'signatures', label: 'Image Signatures (Cosign)' },
  { id: 'exceptions', label: 'Risk Exceptions' },
];

export const ContainerPoliciesView: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentProject } = useScope();

  const tabParam = searchParams.get('tab') || 'all';
  const [activeTab, setActiveTab] = useState<string>(tabParam);
  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState<any[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPolicyName, setNewPolicyName] = useState('');
  const [newPolicyAction, setNewPolicyAction] = useState('BLOCK');

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.push(`/container-security/policies?tab=${tabId}`);
  };

  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.containers.policies(currentProject?.id || null);
      setPolicies(res?.policies || []);
    } catch {
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const handleTogglePolicy = async (id: string, currentEnabled: boolean) => {
    try {
      await api.containers.savePolicy({ id, enabled: !currentEnabled });
      setPolicies((prev) =>
        prev.map((p) => (p.id === id ? { ...p, enabled: !currentEnabled } : p))
      );
      toast.success('Policy enforcement updated');
    } catch {
      toast.error('Failed to update policy');
    }
  };

  return (
    <ContainerSecurityLayout
      sectionTitle="Security Policies"
      sectionDescription="Authoritative guardrails for container builds and admissions: CVE thresholds, verified registries whitelist, non-root enforcement, and cryptographic Cosign signatures."
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      headerActions={
        <button
          onClick={() => setIsCreateModalOpen(true)}
          style={{
            padding: '7px 12px',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
          }}
        >
          <Plus size={13} />
          <span>Create Policy</span>
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '100%', boxSizing: 'border-box' }}>
        {/* Policies Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {loading ? (
            <div style={{ gridColumn: '1 / -1', padding: '48px 16px', textAlign: 'center', color: '#64748B' }}>
              <RefreshCw size={24} color="#2563EB" className="animate-spin" style={{ margin: '0 auto 8px' }} />
              <span>Loading security policies...</span>
            </div>
          ) : policies.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '48px 16px', textAlign: 'center', color: '#64748B', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <Shield size={28} color="#10B981" style={{ margin: '0 auto 8px' }} />
              <p style={{ margin: 0, fontWeight: 600, color: '#0F172A' }}>No policies configured yet.</p>
              <p style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Click &quot;Create Policy&quot; to establish an admission or scanning gate.</p>
            </div>
          ) : (
            policies.map((pol) => {
              const act = (pol.action || 'BLOCK').toUpperCase();
              const actBg = act === 'BLOCK' ? '#FEF2F2' : act === 'WARN' ? '#FFFBEB' : '#EFF6FF';
              const actColor = act === 'BLOCK' ? '#B91C1C' : act === 'WARN' ? '#B45309' : '#1D4ED8';
              const actBorder = act === 'BLOCK' ? '#FECACA' : act === 'WARN' ? '#FDE68A' : '#DBEAFE';

              return (
                <div
                  key={pol.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {pol.category || 'Container Policy'}
                      </span>
                      <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '4px 0 0 0' }}>
                        {pol.name}
                      </h3>
                    </div>

                    <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={pol.enabled}
                        onChange={() => handleTogglePolicy(pol.id, pol.enabled)}
                        style={{ display: 'none' }}
                      />
                      <div
                        style={{
                          width: '36px',
                          height: '20px',
                          backgroundColor: pol.enabled ? '#2563EB' : '#CBD5E1',
                          borderRadius: '9999px',
                          transition: 'background-color 200ms ease',
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            backgroundColor: '#FFFFFF',
                            borderRadius: '50%',
                            position: 'absolute',
                            top: '2px',
                            left: pol.enabled ? '18px' : '2px',
                            transition: 'left 200ms ease',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                          }}
                        />
                      </div>
                    </label>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#64748B' }}>Enforcement:</span>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          backgroundColor: actBg,
                          color: actColor,
                          border: `1px solid ${actBorder}`,
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                      >
                        {act}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#64748B' }}>Exceptions:</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#0F172A', fontWeight: 600 }}>
                        {pol.exceptions_count || 0}
                      </span>
                    </div>
                  </div>

                  {pol.allowed_registries && (
                    <div style={{ padding: '10px 12px', borderRadius: '6px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '11.5px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ color: '#64748B' }}>Whitelisted Registries:</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {pol.allowed_registries.map((r: string, idx: number) => (
                          <span
                            key={idx}
                            style={{
                              padding: '2px 7px',
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #CBD5E1',
                              borderRadius: '4px',
                              color: '#334155',
                              fontFamily: 'JetBrains Mono, monospace',
                              fontSize: '10.5px',
                            }}
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Create Policy Modal */}
        {isCreateModalOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(3px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
            onClick={() => setIsCreateModalOpen(false)}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                maxWidth: '460px',
                width: '100%',
                padding: '24px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Create Container Security Policy
                </h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '18px' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12.5px' }}>
                <div>
                  <label style={{ display: 'block', color: '#334155', fontWeight: 600, marginBottom: '6px' }}>
                    Policy Rule Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Disallow Latest Tag in Production"
                    value={newPolicyName}
                    onChange={(e) => setNewPolicyName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #CBD5E1',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                      color: '#0F172A',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: '#334155', fontWeight: 600, marginBottom: '6px' }}>
                    Enforcement Action
                  </label>
                  <select
                    value={newPolicyAction}
                    onChange={(e) => setNewPolicyAction(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #CBD5E1',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                      color: '#0F172A',
                      outline: 'none',
                    }}
                  >
                    <option value="BLOCK">BLOCK (Halt Deployment & PR)</option>
                    <option value="WARN">WARN (Log Alert in Pipeline)</option>
                    <option value="AUDIT">AUDIT (Silent Telemetry Recording)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid #E2E8F0' }}>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{
                    padding: '7px 14px',
                    fontSize: '12.5px',
                    fontWeight: 500,
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    backgroundColor: '#FFFFFF',
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!newPolicyName) return;
                    await api.containers.savePolicy({
                      name: newPolicyName,
                      action: newPolicyAction,
                      enabled: true,
                    });
                    toast.success('Policy created successfully');
                    setIsCreateModalOpen(false);
                    setNewPolicyName('');
                    fetchPolicies();
                  }}
                  style={{
                    padding: '7px 16px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Save Policy
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ContainerSecurityLayout>
  );
};

export default ContainerPoliciesView;
