'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ContainerSecurityLayout } from './ContainerSecurityLayout';
import { ImageScanManagementView } from '@/src/components/code/ImageScanManagementView';
import { useScope } from '@/context/ScopeContext';

const TABS = [
  { id: 'all', label: 'All Scans' },
  { id: 'images', label: 'Image Scans' },
  { id: 'dockerfiles', label: 'Dockerfile Scans' },
  { id: 'registries', label: 'Registry Scans' },
  { id: 'kubernetes', label: 'Kubernetes Scans' },
  { id: 'scheduled', label: 'Scheduled Scans' },
  { id: 'configurations', label: 'Scan Configurations' },
  { id: 'logs', label: 'Scan Logs' },
  { id: 'details', label: 'Scan Details' },
];

export const ContainerScansView: React.FC = () => {
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
    router.push(`/container-security/scans?tab=${tabId}`);
  };

  return (
    <ContainerSecurityLayout
      sectionTitle="Scans & Scan History"
      sectionDescription="Full execution history of Trivy, Grype, and Syft scan engines across registry images, CI builds, Dockerfiles, and production Kubernetes clusters."
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    >
      <div className="w-full">
        <ImageScanManagementView
          projectId={currentProject?.id || null}
          initialTab={
            activeTab === 'scheduled'
              ? 'schedules'
              : activeTab === 'details' || activeTab === 'logs'
              ? 'detail'
              : 'scans'
          }
        />
      </div>
    </ContainerSecurityLayout>
  );
};

export default ContainerScansView;
