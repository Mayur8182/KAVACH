'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ContainerSecurityLayout } from './ContainerSecurityLayout';
import { SBOMView } from '@/src/components/code/SBOMView';
import { useScope } from '@/context/ScopeContext';

const TABS = [
  { id: 'inventory', label: 'SBOM Inventory' },
  { id: 'generator', label: 'SBOM Generator' },
  { id: 'components', label: 'Components' },
  { id: 'graph', label: 'Dependency Graph' },
  { id: 'licenses', label: 'License Analysis' },
  { id: 'provenance', label: 'Package Provenance' },
  { id: 'signatures', label: 'Image Signatures' },
  { id: 'attestations', label: 'Build Provenance & Attestations' },
];

export const ContainerSBOMView: React.FC = () => {
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
    router.push(`/container-security/sbom?tab=${tabId}`);
  };

  return (
    <ContainerSecurityLayout
      sectionTitle="SBOM & Supply Chain"
      sectionDescription="Full Software Bill of Materials generation (SPDX, CycloneDX) via Syft, license risk compliance, cryptographic Cosign signatures, and SLSA provenance attestations."
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    >
      <div className="w-full">
        <SBOMView
          projectId={currentProject?.id || null}
          repositoryName="Container Images SBOM"
        />
      </div>
    </ContainerSecurityLayout>
  );
};

export default ContainerSBOMView;
