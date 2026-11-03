'use client';

/**
 * Thing Code — Infrastructure as Code Drift Detection (/code/iac/drift)
 * 
 * Deep Terraform state vs live cloud infrastructure drift tracking,
 * configuration diffs, historical timeline, baseline comparison, and remediation engine.
 */

import React from 'react';
import { DriftDetectionView } from '@/components/code/iac/DriftDetectionView';

export default function DriftDetectionPage() {
  return <DriftDetectionView />;
}
