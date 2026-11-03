'use client';

import React from 'react';
import { ApiSecurityProvider } from './context/ApiSecurityContext';

export default function ApiSecurityRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ApiSecurityProvider>{children}</ApiSecurityProvider>;
}
