'use client';

/**
 * Thing Code — Container CVE Deep Inspection (/code/container-security/vulnerabilities/[cveId])
 * 
 * Deep CVE intelligence, EPSS probabilities, affected container workloads, and fix pull requests.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ContainerSecurityView } from '@/components/code/ContainerSecurityView';
import { api } from '@/lib/api/client';

export default function ContainerCveDetailPage() {
  const params = useParams();
  const router = useRouter();
  const cveId = params?.cveId as string;
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
      repositoryName={cveId ? `Triage: ${cveId}` : 'CVE Triage'}
      initialSubTab="Vulnerabilities"
      onBack={() => router.push('/code/container-security/vulnerabilities')}
    />
  );
}
