'use client';

/**
 * Thing Code — Maven & Gradle Ecosystem Subpage (/code/dependencies/ecosystems/java)
 */

import React from 'react';
import { EcosystemDetailView } from '@/components/code/dependencies/ecosystems/EcosystemDetailView';

export default function JavaEcosystemPage() {
  return (
    <EcosystemDetailView
      slug="java"
      title="Maven & Gradle"
      subtitle="Security posture, JAR components, and dependency tree analysis for Java & Kotlin repositories."
      subpageType="ecosystems-java"
      manifestTypes={['pom.xml', 'build.gradle', 'build.gradle.kts']}
    />
  );
}
