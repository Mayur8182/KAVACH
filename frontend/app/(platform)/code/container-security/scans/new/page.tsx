'use client';

/**
 * Thing Code — Run New Scan (/code/container-security/scans/new)
 * Stepper configuration and execution workflow for Trivy container image scans.
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ImageScanManagementView } from '@/components/code/ImageScanManagementView';
import { api } from '@/lib/api/client';

export default function ContainerSecurityRunNewScanPage() {
  const router = useRouter();
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    api.code.repositoryHealth({ limit: 1 })
      .then((res) => {
        if (res?.items && res.items.length > 0) {
          setProjectId(res.items[0].repository_id || null);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <ImageScanManagementView
      projectId={projectId}
      initialTab="new"
      onNavigate={(route) => router.push(route)}
    />
  );
}
