'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Agentation on client-side to ensure zero SSR overhead
const Agentation = dynamic(
  () => import('agentation').then((mod) => mod.Agentation),
  { ssr: false }
);

interface AgentationDevToolProps {
  endpoint?: string;
  appName?: string;
}

export const AgentationDevTool: React.FC<AgentationDevToolProps> = ({
  endpoint = process.env.NEXT_PUBLIC_AGENTATION_ENDPOINT || 'http://localhost:4747',
  appName = 'Kavach Security Control Plane',
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Render in development mode or when explicitly enabled
  const isDev = process.env.NODE_ENV !== 'production';
  const isExplicitlyEnabled = process.env.NEXT_PUBLIC_ENABLE_AGENTATION === 'true';

  if (!isDev && !isExplicitlyEnabled) {
    return null;
  }

  return (
    <Agentation
      endpoint={endpoint}
      appName={appName}
      enableKeyboardShortcuts={true}
    />
  );
};

export default AgentationDevTool;
