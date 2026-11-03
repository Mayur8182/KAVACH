'use client';

/**
 * Thing Code — Process & Behavior Events (/code/container-security/runtime/events)
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ContainerRuntimeSecurityView } from '@/components/code/ContainerRuntimeSecurityView';
import { api } from '@/lib/api/client';

export default function ContainerSecurityRuntimeEventsPage() {
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
      initialTab="events"
      onNavigate={(route) => router.push(route)}
    />
  );
}
