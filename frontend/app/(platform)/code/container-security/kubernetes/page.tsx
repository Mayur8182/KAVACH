'use client';

/**
 * Thing Code — Kubernetes Security Overview (/code/container-security/kubernetes)
 * Matches Dashboard Suite Screenshot 08 (Kubernetes Workloads).
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { KubernetesWorkloadsView } from '@/components/code/KubernetesWorkloadsView';
import { api } from '@/lib/api/client';

export default function ContainerSecurityKubernetesPage() {
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
    <KubernetesWorkloadsView
      projectId={projectId}
      initialTab="overview"
      onNavigate={(route) => router.push(route)}
    />
  );
}
