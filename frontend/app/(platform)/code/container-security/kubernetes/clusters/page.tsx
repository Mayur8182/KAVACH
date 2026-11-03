'use client';

/**
 * Thing Code — Clusters & Namespaces (/code/container-security/kubernetes/clusters)
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { KubernetesWorkloadsView } from '@/components/code/KubernetesWorkloadsView';
import { api } from '@/lib/api/client';

export default function ContainerSecurityKubernetesClustersPage() {
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
      initialTab="clusters"
      onNavigate={(route) => router.push(route)}
    />
  );
}
