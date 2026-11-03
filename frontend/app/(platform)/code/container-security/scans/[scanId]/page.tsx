'use client';

/**
 * Thing Code — Scan Detail (/code/container-security/scans/[scanId])
 * Displays Trivy scan results, packages, secrets, configuration issues, SBOM, and execution logs.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ImageScanManagementView } from '@/components/code/ImageScanManagementView';
import { api } from '@/lib/api/client';

export default function ContainerSecurityScanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const scanId = params?.scanId as string;
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
      initialTab="detail"
      scanId={scanId}
      onNavigate={(route) => router.push(route)}
    />
  );
}
