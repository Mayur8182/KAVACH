'use client';

import { useState, useCallback } from 'react';

export type UserRole = 'Owner' | 'Admin' | 'Security Auditor' | 'Developer' | 'Viewer';

export interface PermissionCheck {
  hasPermission: boolean;
  requiredRole: UserRole;
  auditTrailId: string;
  requestElevation: (reason: string) => Promise<{ success: boolean; requestId: string }>;
}

export function usePermissions(userRole: UserRole = 'Viewer') {
  const [elevationPending, setElevationPending] = useState(false);

  const check = useCallback(
    (requiredRole: UserRole): PermissionCheck => {
      const hierarchy: Record<UserRole, number> = {
        Owner: 5,
        Admin: 4,
        'Security Auditor': 3,
        Developer: 2,
        Viewer: 1,
      };

      const userLevel = hierarchy[userRole] || 1;
      const requiredLevel = hierarchy[requiredRole] || 4;
      const hasPermission = userLevel >= requiredLevel;

      return {
        hasPermission,
        requiredRole,
        auditTrailId: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
        requestElevation: async (reason: string) => {
          setElevationPending(true);
          await new Promise((r) => setTimeout(r, 600));
          setElevationPending(false);
          return {
            success: true,
            requestId: `JIT-${Date.now().toString(36).toUpperCase()}`,
          };
        },
      };
    },
    [userRole]
  );

  return {
    userRole,
    elevationPending,
    check,
  };
}
