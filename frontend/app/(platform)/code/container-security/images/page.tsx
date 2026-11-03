'use client';

/**
 * Thing Code — Container Security Images (/code/container-security/images)
 * 
 * Deep image inventory, tag tracking, digests, and multi-registry visibility.
 */

import React, { useState, useEffect } from 'react';
import { ContainerSecurityView } from '@/components/code/ContainerSecurityView';
import { api } from '@/lib/api/client';

export default function ContainerSecurityImagesPage() {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [repositoryName, setRepositoryName] = useState<string>('');

  useEffect(() => {
    api.code.repositoryHealth({ limit: 1 })
      .then(res => {
        if (res?.items && res.items.length > 0) {
          setProjectId(res.items[0].repository_id || null);
          setRepositoryName(res.items[0].repository_name || res.items[0].name || '');
        }
      })
      .catch(() => { });
  }, []);

  return (
    <ContainerSecurityView
      projectId={projectId}
      repositoryName={repositoryName || 'All Containers'}
      initialSubTab="Images"
    />
  );
}
