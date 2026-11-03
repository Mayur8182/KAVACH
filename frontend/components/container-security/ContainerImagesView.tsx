'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ContainerSecurityLayout } from './ContainerSecurityLayout';
import { ContainerSecurityView } from '@/src/components/code/ContainerSecurityView';
import { useScope } from '@/context/ScopeContext';

const TABS = [
  { id: 'all', label: 'All Images' },
  { id: 'registries', label: 'Connected Registries' },
  { id: 'layers', label: 'Layers & OS Packages' },
  { id: 'sbom', label: 'SBOM Components' },
];

export const ContainerImagesView: React.FC = () => {
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
    router.push(`/container-security/images?tab=${tabId}`);
  };

  const getSubTab = (tab: string) => {
    if (tab === 'registries') return 'Registry Settings';
    if (tab === 'layers') return 'Layers';
    if (tab === 'sbom' || tab === 'os-packages' || tab === 'app-packages') return 'Packages';
    if (tab === 'vulnerabilities') return 'Vulnerabilities';
    if (tab === 'details') return 'Details';
    return 'Images';
  };

  return (
    <ContainerSecurityLayout
      sectionTitle="Images & Registries"
      sectionDescription="Container images, layer manifests, SBOM packages, and connected OCI registries (Docker Hub, AWS ECR, Azure ACR, GCR, GHCR)."
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    >
      <div className="w-full">
        <ContainerSecurityView
          projectId={currentProject?.id || null}
          repositoryName="Audited Images"
          hideHeader={true}
          initialSubTab={getSubTab(activeTab)}
        />
      </div>
    </ContainerSecurityLayout>
  );
};

export default ContainerImagesView;
