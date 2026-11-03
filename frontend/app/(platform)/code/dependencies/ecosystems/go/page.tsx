'use client';

/**
 * Thing Code — Go Modules Ecosystem Subpage (/code/dependencies/ecosystems/go)
 */

import React from 'react';
import { EcosystemDetailView } from '@/components/code/dependencies/ecosystems/EcosystemDetailView';

export default function GoEcosystemPage() {
  return (
    <EcosystemDetailView
      slug="go"
      title="Go Modules"
      subtitle="Security posture, direct and indirect module dependencies, and vulnerability analysis for Go projects."
      subpageType="ecosystems-go"
      manifestTypes={['go.mod', 'go.sum']}
    />
  );
}
