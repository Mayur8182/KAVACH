'use client';

/**
 * Thing Code — Runtime Alerts (/code/container-security/runtime/alerts)
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ContainerRuntimeSecurityView } from '@/components/code/ContainerRuntimeSecurityView';
import { api } from '@/lib/api/client';

export default function ContainerSecurityRuntimeAlertsPage() {
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
    <ContainerRuntimeSecurityView
      projectId={projectId}
      initialTab="alerts"
      onNavigate={(route) => router.push(route)}
    />
  );
}
