'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Agentation on the client-side to ensure zero SSR overhead
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
  appName = 'SecuLayer Control Plane',
}) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Avoid rendering during SSR
  if (!isClient) return null;

  // Only render if explicitly enabled via env var (disabled by default to prevent socket overhead)
  if (process.env.NEXT_PUBLIC_ENABLE_AGENTATION !== 'true') {
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
