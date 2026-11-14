'use client';

/**
 * CloudWorkshell — Shared container for Kavach Cloud
 */

import React from 'react';

interface CloudWorkshellProps {
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const CloudWorkshell: React.FC<CloudWorkshellProps> = ({ children }) => {
  return <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0 }}>{children}</div>;
};

export default CloudWorkshell;
