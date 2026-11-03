'use client';

/**
 * Thing Code — npm & pnpm Ecosystem Subpage (/code/dependencies/ecosystems/npm)
 */

import React from 'react';
import { EcosystemDetailView } from '@/components/code/dependencies/ecosystems/EcosystemDetailView';

export default function NpmEcosystemPage() {
  return (
    <EcosystemDetailView
      slug="npm"
      title="npm & pnpm"
      subtitle="Security posture, package inventory, and version lifecycle for Node.js / JavaScript & TypeScript dependencies."
      subpageType="ecosystems-npm"
      manifestTypes={['package.json', 'pnpm-lock.yaml', 'package-lock.json', 'yarn.lock']}
    />
  );
}
