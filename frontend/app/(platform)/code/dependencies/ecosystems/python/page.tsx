'use client';

/**
 * Thing Code — Python & pip Ecosystem Subpage (/code/dependencies/ecosystems/python)
 */

import React from 'react';
import { EcosystemDetailView } from '@/components/code/dependencies/ecosystems/EcosystemDetailView';

export default function PythonEcosystemPage() {
  return (
    <EcosystemDetailView
      slug="python"
      title="Python & pip"
      subtitle="Security posture, PyPI packages, and dependency health for Python, Poetry, and Pipenv projects."
      subpageType="ecosystems-python"
      manifestTypes={['requirements.txt', 'pyproject.toml', 'Pipfile', 'setup.py']}
    />
  );
}
