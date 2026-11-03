'use client';

/**
 * Thing Code — Cargo & NuGet Ecosystem Subpage (/code/dependencies/ecosystems/other)
 */

import React from 'react';
import { EcosystemDetailView } from '@/components/code/dependencies/ecosystems/EcosystemDetailView';

export default function CargoNuGetEcosystemPage() {
  return (
    <EcosystemDetailView
      slug="other"
      title="Cargo & NuGet"
      subtitle="Security posture and package supply-chain monitoring for Rust (Cargo), .NET (NuGet), RubyGems, and Composer."
      subpageType="ecosystems-other"
      manifestTypes={['Cargo.toml', 'Cargo.lock', '*.csproj', 'packages.config', 'Gemfile']}
    />
  );
}
