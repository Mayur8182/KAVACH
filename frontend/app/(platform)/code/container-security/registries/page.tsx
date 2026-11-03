'use client';

/**
 * Thing Code — Registry Integrations (/code/container-security/registries)
 * 
 * Connected container registries, cloud providers, catalog sync, and image discovery.
 * Matches Dashboard Suite Reference Screenshot (Module C).
 */

import React, { useState, useEffect } from 'react';
import { RegistryIntegrationsView } from '@/components/code/RegistryIntegrationsView';
import { api } from '@/lib/api/client';

export default function ContainerSecurityRegistriesPage() {
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
    <RegistryIntegrationsView
      projectId={projectId}
      repositoryName={repositoryName || 'All Containers'}
    />
  );
}
