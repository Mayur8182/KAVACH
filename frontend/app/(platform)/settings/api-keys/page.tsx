'use client';

/**
 * SecuLayer Enterprise — Personal Access Tokens & API Keys (/settings/api-keys)
 * Renders the tokens management view from SettingsHub directly with real key generation and revocation.
 */

import React from 'react';
import SettingsHub from '../page';

export default function ApiKeysPage() {
  return <SettingsHub defaultTab="tokens" />;
}
