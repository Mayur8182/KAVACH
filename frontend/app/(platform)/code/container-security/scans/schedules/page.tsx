'use client';

/**
 * Thing Code — Scheduled Scans (/code/container-security/scans/schedules)
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ImageScanManagementView } from '@/components/code/ImageScanManagementView';
import { api } from '@/lib/api/client';

export default function ContainerSecurityScanSchedulesPage() {
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
      initialTab="schedules"
      onNavigate={(route) => router.push(route)}
    />
  );
}
