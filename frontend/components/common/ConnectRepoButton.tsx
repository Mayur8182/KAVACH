'use client';

import React, { useState } from 'react';
import { ArrowRight, FolderGit2 } from 'lucide-react';
import { ProjectGitHubConnectModal } from '@/components/repositories/ProjectGitHubConnectModal';
import { useScope } from '@/context/ScopeContext';

export interface ConnectRepoButtonProps {
  className?: string;
  onSuccess?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export const ConnectRepoButton: React.FC<ConnectRepoButtonProps> = ({
  className = '',
  onSuccess,
  size = 'md',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { currentProject, refreshRepositories } = useScope();

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-xs font-semibold gap-2',
    lg: 'px-5 py-2.5 text-sm font-bold gap-2.5',
  }[size];

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center justify-center bg-black hover:bg-zinc-800 active:bg-zinc-900 text-white rounded-lg shadow-sm transition-all duration-150 select-none cursor-pointer ${sizeClasses} ${className}`}
        title="Connect a GitHub repository for automated security scanning"
      >
        <span>Connect a Repository</span>
        <span className="font-bold transition-transform group-hover:translate-x-0.5">→</span>
      </button>

      {isOpen && (
        <ProjectGitHubConnectModal
          isOpen={isOpen}
          projectId={currentProject?.id || null}
          projectName={currentProject?.name || 'Project'}
          onClose={() => setIsOpen(false)}
          onConnected={() => {
            setIsOpen(false);
            refreshRepositories?.();
            onSuccess?.();
          }}
        />
      )}
    </>
  );
};

