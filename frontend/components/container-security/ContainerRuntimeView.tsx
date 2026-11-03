'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ContainerSecurityLayout } from './ContainerSecurityLayout';
import { ContainerRuntimeSecurityView } from '@/src/components/code/ContainerRuntimeSecurityView';
import { useScope } from '@/context/ScopeContext';

const TABS = [
  { id: 'overview', label: 'Overview & Telemetry' },
  { id: 'events', label: 'Live Syscall & Process Events' },
  { id: 'workloads', label: 'Pod & Container Workloads' },
  { id: 'policies', label: 'Runtime Enforcement Rules' },
];

export const ContainerRuntimeView: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentProject } = useScope();

  const tabParam = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState<string>(tabParam);

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.push(`/container-security/runtime?tab=${tabId}`);
  };

  const mapSubTab = (tab: string): 'overview' | 'policies' | 'events' | 'alerts' => {
    if (tab === 'events') return 'events';
    if (tab === 'workloads') return 'alerts';
    if (tab === 'policies') return 'policies';
    return 'overview';
  };

  return (
    <ContainerSecurityLayout
      sectionTitle="Runtime & Workloads"
      sectionDescription="eBPF-driven container runtime behavioral monitoring, syscall tracking, pod network egress, and deterministic SIGKILL policy enforcement."
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    >
      <div className="w-full">
        <ContainerRuntimeSecurityView
          projectId={currentProject?.id || null}
          initialTab={mapSubTab(activeTab)}
        />
      </div>
    </ContainerSecurityLayout>
  );
};

export default ContainerRuntimeView;
