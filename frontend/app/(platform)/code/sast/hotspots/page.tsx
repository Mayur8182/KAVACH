'use client';

import React from 'react';
import SecurityHotspotsOverviewPage from '@/app/(platform)/sast/hotspots/page';
import { KavachSastLayout } from '@/components/code/sast/KavachSastLayout';

export default function SastHotspotsPage() {
  return (
    <KavachSastLayout>
      <SecurityHotspotsOverviewPage />
    </KavachSastLayout>
  );
}
