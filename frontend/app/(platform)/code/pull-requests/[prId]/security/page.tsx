'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import PRSecurityPage from '../../security/page';

export default function PRSpecificSecurityPage() {
  const params = useParams();
  const prId = (params?.prId as string) || '237';
  return <PRSecurityPage prId={prId} />;
}
