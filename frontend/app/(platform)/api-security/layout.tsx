'use client';

import React, { useEffect } from 'react';
import { ApiSecurityProvider, useApiSecurity } from './context/ApiSecurityContext';
import { ApiSecurityGithubModal } from './components/ApiSecurityGithubModal';

function ApiSecurityModalHost() {
  const { isGithubModalOpen, setIsGithubModalOpen } = useApiSecurity();

  useEffect(() => {
    const handleOpen = () => setIsGithubModalOpen(true);
    if (typeof window !== 'undefined') {
      window.addEventListener('kavach:open-github-modal', handleOpen);
      return () => window.removeEventListener('kavach:open-github-modal', handleOpen);
    }
  }, [setIsGithubModalOpen]);

  return (
    <ApiSecurityGithubModal
      isOpen={isGithubModalOpen}
      onClose={() => setIsGithubModalOpen(false)}
    />
  );
}

export default function ApiSecurityRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ApiSecurityProvider>
      {children}
      <ApiSecurityModalHost />
    </ApiSecurityProvider>
  );
}
