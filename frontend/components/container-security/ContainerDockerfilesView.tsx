'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ContainerSecurityLayout } from './ContainerSecurityLayout';
import { DockerfileSecurityView } from '@/src/components/code/DockerfileSecurityView';
import { useScope } from '@/context/ScopeContext';

const TABS = [
  { id: 'inventory', label: 'Dockerfile Inventory' },
  { id: 'scanner', label: 'Dockerfile Scanner' },
  { id: 'misconfigurations', label: 'Misconfigurations' },
  { id: 'best-practices', label: 'Dockerfile Best Practices' },
  { id: 'hardening', label: 'Hardening Recommendations' },
  { id: 'fixes', label: 'Dockerfile Fixes' },
];

export const ContainerDockerfilesView: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentProject } = useScope();

  const tabParam = searchParams.get('tab') || 'inventory';
  const [activeTab, setActiveTab] = useState<string>(tabParam);

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.push(`/container-security/dockerfiles?tab=${tabId}`);
  };

  return (
    <ContainerSecurityLayout
      sectionTitle="Dockerfile Security"
      sectionDescription="Static analysis of Dockerfile instructions, base image provenance, root execution hazards, build secrets exposure, and automated AST patches."
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    >
      <div className="w-full">
        <DockerfileSecurityView
          projectId={currentProject?.id || null}
          repositoryName="Audited Dockerfiles"
          hideHeader={true}
        />
      </div>
    </ContainerSecurityLayout>
  );
};

export default ContainerDockerfilesView;
