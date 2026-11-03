'use client';

/**
 * SecuLayer Enterprise — SSO & Connected Accounts (/settings/sso)
 * Renders the connected identity providers view from SettingsHub directly.
 */

import React from 'react';
import SettingsHub from '../page';

export default function SsoPage() {
  return <SettingsHub defaultTab="connected" />;
}
