'use client';

/**
 * Thing Code — SBOM (/code/sbom)
 * 
 * Software Bill of Materials workspace for SecuLayer.
 * Connected to real Syft CLI, PostgreSQL/SQLite database models,
 * CycloneDX 1.5 export, component inventory, license risk tracking,
 * and vulnerability surface correlation.
 * 
 * Real APIs:
 *   - GET /api/v1/sbom/summary
 *   - GET /api/v1/sbom/components
 *   - POST /api/v1/sbom/generate
 *   - GET /api/v1/sbom/jobs/{id}
 *   - GET /api/v1/sbom/export
 */

import React, { useState, useEffect } from 'react';
import { SBOMView } from '@/components/code/SBOMView';
import { api } from '@/lib/api/client';

export default function SBOMPage() {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [repositoryId, setRepositoryId] = useState<string | null>(null);
  const [repositoryName, setRepositoryName] = useState<string>('');

  useEffect(() => {
    // Resolve active repository and project ID from repository health
    api.code.repositoryHealth({ limit: 10 })
      .then(res => {
        if (res?.items && res.items.length > 0) {
          const firstRepo = res.items[0];
          
          if (firstRepo.repository_id) {
            setRepositoryId(firstRepo.repository_id);
          }
          if (firstRepo.project_id) {
            setProjectId(firstRepo.project_id);
          }
          setRepositoryName(firstRepo.repository_name || firstRepo.name || '');
        }
      })
      .catch(() => {});
  }, []);

  return (
    <SBOMView
      repositoryId={repositoryId}
      projectId={projectId}
      repositoryName={repositoryName || 'All Repositories'}
    />
  );
}
