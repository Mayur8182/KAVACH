'use client';

/**
 * Thing Code — Suspicious Activity Detail (/code/container-security/runtime/events/[eventId])
 */

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ContainerRuntimeSecurityView } from '@/components/code/ContainerRuntimeSecurityView';
import { api } from '@/lib/api/client';

export default function ContainerSecurityRuntimeEventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params?.eventId as string;
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
      initialTab="detail"
      eventId={eventId}
      onNavigate={(route) => router.push(route)}
    />
  );
}
