'use client';

/**
 * Thing Code — Dockerfiles & Build Security (/code/container-security/dockerfiles)
 * 
 * Dockerfile static security analysis, non-root user enforcement, and instruction best practices.
 * Matches Dashboard Suite Reference Screenshot (Module A).
 */

import React, { useState, useEffect } from 'react';
import { DockerfileSecurityView } from '@/components/code/DockerfileSecurityView';
import { api } from '@/lib/api/client';

export default function ContainerSecurityDockerfilesPage() {
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
    <DockerfileSecurityView
      projectId={projectId}
      repositoryName={repositoryName || 'All Dockerfiles'}
    />
  );
}
