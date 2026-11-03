'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api/client';

export interface UserAccessContext {
  user_id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  is_superuser: boolean;
  organization_id?: string | null;
  organization_name?: string | null;
}

const DEFAULT_ACCESS: UserAccessContext = {
  user_id: '',
  email: '',
  name: '',
  role: 'member',
  permissions: ['authenticated'],
  is_superuser: false,
};

export function useAccessControl() {
  const [access, setAccess] = useState<UserAccessContext>(DEFAULT_ACCESS);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccess = useCallback(async () => {
    try {
      const data = await api.auth.accessContext();
      if (data && data.permissions) {
        setAccess(data);
      }
      setError(null);
    } catch (err: any) {
      console.warn('Could not load user access context:', err?.message || err);
      setError(err?.message || 'Failed to load permissions');
      // If endpoint is unreachable, fallback to authenticated default
      setAccess((prev) => ({
        ...prev,
        permissions: ['authenticated', 'code:read', 'code:write'],
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccess();
  }, [fetchAccess]);

  const hasPermission = useCallback(
    (permissionCode: string): boolean => {
      if (!permissionCode || permissionCode === 'authenticated') return true;
      if (access.is_superuser) return true;
      if (access.permissions.includes('*')) return true;
      if (access.permissions.includes(permissionCode)) return true;

      // Check domain wildcard (e.g. 'code:*' satisfies 'code:read')
      if (permissionCode.includes(':')) {
        const domain = permissionCode.split(':')[0];
        if (access.permissions.includes(`${domain}:*`)) return true;
      }

      return false;
    },
    [access]
  );

  return {
    role: access.role,
    permissions: access.permissions,
    isSuperuser: access.is_superuser,
    access,
    isLoading: loading,
    error,
    hasPermission,
    refreshAccess: fetchAccess,
  };
}
