'use client';

/**
 * Thing Code — Container Image Deep Inspection (/code/container-security/images/[imageId])
 * 
 * Detailed layer inspection, SBOM package tree, CVE breakdown, and rebuild triggers.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ContainerSecurityView } from '@/components/code/ContainerSecurityView';
import { api } from '@/lib/api/client';

export default function ContainerImageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const imageId = params?.imageId as string;
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    api.code.repositoryHealth({ limit: 1 })
      .then(res => {
        if (res?.items && res.items.length > 0) {
          setProjectId(res.items[0].repository_id || null);
        }
      })
      .catch(() => { });
  }, []);

  return (
    <ContainerSecurityView
      projectId={projectId}
      repositoryName="Image Inspection"
      initialSubTab="Images"
      onBack={() => router.push('/code/container-security/images')}
    />
  );
}
