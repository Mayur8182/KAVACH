'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ContainerSecurityLayout } from './ContainerSecurityLayout';
import { KubernetesWorkloadsView } from '@/src/components/code/KubernetesWorkloadsView';
import { useScope } from '@/context/ScopeContext';

const TABS = [
  { id: 'clusters', label: 'Clusters' },
  { id: 'namespaces', label: 'Namespaces' },
  { id: 'deployments', label: 'Deployments' },
  { id: 'pods', label: 'Pods' },
  { id: 'containers', label: 'Running Containers' },
  { id: 'security', label: 'Workload Security' },
  { id: 'misconfigurations', label: 'Kubernetes Misconfigurations' },
  { id: 'rbac', label: 'RBAC & Permissions' },
  { id: 'network-policies', label: 'Network Policies' },
  { id: 'admission', label: 'Admission Control' },
];

export const ContainerWorkloadsView: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentProject } = useScope();

  const tabParam = searchParams.get('tab') || 'clusters';
  const [activeTab, setActiveTab] = useState<string>(tabParam);

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.push(`/container-security/workloads?tab=${tabId}`);
  };

  return (
    <ContainerSecurityLayout
      sectionTitle="Kubernetes Workloads"
      sectionDescription="Real-time audit of running pods, DaemonSets, Deployments, RBAC privilege escalations, NetworkPolicy isolation, and Admission Controller gates."
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    >
      <div className="w-full">
        <KubernetesWorkloadsView
          projectId={currentProject?.id || null}
          initialTab={
            activeTab === 'clusters'
              ? 'clusters'
              : activeTab === 'misconfigurations' || activeTab === 'security'
              ? 'findings'
              : 'workloads'
          }
        />
      </div>
    </ContainerSecurityLayout>
  );
};

export default ContainerWorkloadsView;
