'use client';

/**
 * /signup — Kavach Unified One-Step Authentication
 *
 * Sourced 100% from real OAuth providers (GitHub and Google).
 * There is no separate registration form or manual sign-up flow.
 * Both new and existing users authenticate via GitHub or Google:
 * - New users are automatically provisioned and directed to onboarding.
 * - Existing users are authenticated and directed to their workspace overview.
 */

import LoginPage from '../login/page';

export default function SignupPage() {
  return <LoginPage />;
}
