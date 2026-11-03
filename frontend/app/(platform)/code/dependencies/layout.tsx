'use client';

import React from 'react';
import { KavachDependenciesLayout } from '@/components/code/dependencies/KavachDependenciesLayout';

export default function DependenciesDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <KavachDependenciesLayout>{children}</KavachDependenciesLayout>;
}
