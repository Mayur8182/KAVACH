'use client';

import React, { useEffect, useState } from 'react';

interface AgentationDevToolProps {
  endpoint?: string;
  appName?: string;
}

export const AgentationDevTool: React.FC<AgentationDevToolProps> = ({
  endpoint = process.env.NEXT_PUBLIC_AGENTATION_ENDPOINT || 'http://localhost:4747',
  appName = 'Kavach Security Control Plane',
}) => {
  const [AgentationComp, setAgentationComp] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    // Zero production overhead: only load in local development or if explicitly enabled
    const isDev = process.env.NODE_ENV !== 'production';
    const isExplicitlyEnabled = process.env.NEXT_PUBLIC_ENABLE_AGENTATION === 'true';

    if (!isDev && !isExplicitlyEnabled) {
      return;
    }

    // Dynamic runtime import that safely ignores if agentation is not present in production
    import(/* webpackIgnore: true */ 'agentation')
      .then((mod) => {
        if (mod && mod.Agentation) {
          setAgentationComp(() => mod.Agentation);
        }
      })
      .catch(() => {
        // Dev tool not present, silently no-op
      });
  }, []);

  if (!AgentationComp) return null;

  return (
    <AgentationComp
      endpoint={endpoint}
      appName={appName}
      enableKeyboardShortcuts={true}
    />
  );
};

export default AgentationDevTool;
