'use client';

/**
 * ProjectContext compatibility shim
 * Wraps useScope from '@/context/ScopeContext'
 */

import { useScope } from '@/context/ScopeContext';

export const useProject = () => {
  const scope = useScope();
  return {
    currentProject: scope.currentProject,
    currentOrg: scope.currentOrg,
    currentEnv: scope.currentEnv,
    setCurrentProject: scope.setCurrentProject,
    isLoading: scope.isLoadingScope,
  };
};

export default useProject;
