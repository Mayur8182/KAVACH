'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ContainerSecurityLayout } from './ContainerSecurityLayout';
import { RegistryIntegrationsView } from '@/src/components/code/RegistryIntegrationsView';
import { useScope } from '@/context/ScopeContext';

const TABS = [
  { id: 'all', label: 'All Registries' },
  { id: 'connect', label: 'Connect Registry' },
  { id: 'dockerhub', label: 'Docker Hub' },
  { id: 'ecr', label: 'Amazon ECR' },
  { id: 'acr', label: 'Azure Container Registry' },
  { id: 'gar', label: 'Google Artifact Registry' },
  { id: 'ghcr', label: 'GitHub Container Registry' },
  { id: 'gitlab', label: 'GitLab Container Registry' },
  { id: 'images', label: 'Registry Images' },
  { id: 'coverage', label: 'Registry Scan Coverage' },
];

export const ContainerRegistriesView: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentProject } = useScope();

  const tabParam = searchParams.get('tab') || 'all';
  const [activeTab, setActiveTab] = useState<string>(tabParam);

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.push(`/container-security/registries?tab=${tabId}`);
  };

  return (
    <ContainerSecurityLayout
      sectionTitle="Registry Management"
      sectionDescription="Multi-cloud container registry discovery, continuous image sync, credential isolation, and automated pre-deployment scan coverage."
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    >
      <div className="w-full">
        <RegistryIntegrationsView
          projectId={currentProject?.id || null}
          repositoryName="Monitored Registries"
        />
      </div>
    </ContainerSecurityLayout>
  );
};

export default ContainerRegistriesView;
