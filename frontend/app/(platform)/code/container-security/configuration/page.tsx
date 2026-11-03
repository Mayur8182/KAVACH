'use client';

/**
 * Thing Code — Container Configuration & Hardening (/code/container-security/configuration)
 * 
 * Container runtime configs, capabilities, seccomp, AppArmor, and security context posture.
 * Matches Dashboard Suite Reference Screenshot (Module B).
 */

import React, { useState, useEffect } from 'react';
import { ContainerConfigHardeningView } from '@/components/code/ContainerConfigHardeningView';
import { api } from '@/lib/api/client';

export default function ContainerSecurityConfigurationPage() {
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
    <ContainerConfigHardeningView
      projectId={projectId}
      repositoryName={repositoryName || 'All Containers'}
    />
  );
}
