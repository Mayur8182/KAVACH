'use client';

/**
 * Thing Code — Scan History & Logs (/code/container-security/scans/history)
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ImageScanManagementView } from '@/components/code/ImageScanManagementView';
import { api } from '@/lib/api/client';

export default function ContainerSecurityScanHistoryPage() {
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
      initialTab="history"
      onNavigate={(route) => router.push(route)}
    />
  );
}
