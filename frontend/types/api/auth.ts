/**
 * Thing Auth & Identity API Types
 */

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  full_name?: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at?: string;
  role?: string;
  permissions?: string[];
}

export type AuthState =
  | 'authenticated'
  | 'unauthenticated'
  | 'session_expired'
  | 'mfa_required'
  | 'permission_denied'
  | 'account_disabled'
  | 'loading';
