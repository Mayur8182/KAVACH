'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ContainerSecurityLayout } from './ContainerSecurityLayout';
import { useScope } from '@/context/ScopeContext';
import { api } from '@/lib/api/client';
import {
  RefreshCw,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { toast } from '@/lib/toast';

const TABS = [
  { id: 'all', label: 'All Integrations' },
  { id: 'registries', label: 'Registries (ECR / ACR / GCR / Hub)' },
  { id: 'kubernetes', label: 'Kubernetes Clusters' },
  { id: 'cicd', label: 'CI/CD Pipelines' },
  { id: 'alerting', label: 'Alerting Webhooks' },
];

export const ContainerIntegrationsView: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentProject } = useScope();

  const tabParam = searchParams.get('tab') || 'all';
  const [activeTab, setActiveTab] = useState<string>(tabParam);
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [testingId, setTestingId] = useState<string | null>(null);

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.push(`/container-security/integrations?tab=${tabId}`);
  };

  const fetchIntegrations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.containers.registries(currentProject?.id || null);
      setIntegrations(res?.items || []);
    } catch {
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const handleTestConnection = async (intId: string, name: string) => {
    setTestingId(intId);
    try {
      const res = await api.containers.testRegistryConnection(intId);
      if (res?.success) {
        toast.success(`Connection verified: ${name}`);
      } else {
        toast.error(res?.message || `Failed to verify connection to ${name}`);
      }
    } catch (err: any) {
      toast.error(err?.message || `Error testing connection to ${name}`);
    } finally {
      setTestingId(null);
    }
  };

  return (
    <ContainerSecurityLayout
      sectionTitle="Integrations"
      sectionDescription="Connect container registries (ECR, Docker Hub, ACR, GHCR), orchestrators (EKS, GKE, AKS), CI/CD pipelines, and alerting webhooks."
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          {loading ? (
            <div style={{ gridColumn: '1 / -1', padding: '48px 16px', textAlign: 'center', color: '#64748B' }}>
              <RefreshCw size={24} color="#2563EB" className="animate-spin" style={{ margin: '0 auto 8px' }} />
              <span>Checking integration connectors...</span>
            </div>
          ) : integrations.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '48px 16px', textAlign: 'center', color: '#64748B', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <HardDrive size={28} color="#94A3B8" style={{ margin: '0 auto 8px' }} />
              <p style={{ margin: 0, fontWeight: 600, color: '#0F172A' }}>No integrations connected yet.</p>
              <p style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Use &quot;Connect Registry&quot; in the header to authenticate an OCI container provider.</p>
            </div>
          ) : (
            integrations.map((int) => {
              const isConnected = int.status === 'CONNECTED' || int.status === 'ACTIVE';
              return (
                <div
                  key={int.id}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ padding: '8px', borderRadius: '6px', backgroundColor: '#EFF6FF', color: '#2563EB', border: '1px solid #DBEAFE' }}>
                        <HardDrive size={18} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                          {int.name}
                        </h4>
                        <span style={{ fontSize: '11px', color: '#64748B' }}>{int.provider || int.type || 'Container Registry'}</span>
                      </div>
                    </div>

                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        backgroundColor: isConnected ? '#ECFDF5' : '#F8FAFC',
                        color: isConnected ? '#047857' : '#64748B',
                        border: `1px solid ${isConnected ? '#A7F3D0' : '#E2E8F0'}`,
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      {int.status || 'READY'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', paddingTop: '10px', borderTop: '1px solid #F1F5F9' }}>
                    <span style={{ fontSize: '11.5px', color: '#64748B', fontFamily: 'JetBrains Mono, monospace' }}>
                      {int.url ? int.url.replace(/^https?:\/\//, '').slice(0, 24) : 'Endpoint active'}
                    </span>
                    <button
                      onClick={() => handleTestConnection(int.id, int.name)}
                      disabled={testingId === int.id}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #CBD5E1',
                        borderRadius: '4px',
                        color: '#334155',
                        cursor: testingId === int.id ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {testingId === int.id ? (
                        <>
                          <RefreshCw size={11} className="animate-spin" />
                          <span>Testing...</span>
                        </>
                      ) : (
                        <span>Test Health</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </ContainerSecurityLayout>
  );
};

export default ContainerIntegrationsView;
