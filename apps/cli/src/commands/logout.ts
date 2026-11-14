import chalk from 'chalk';
import { CredentialStore } from '../../../../packages/auth/src/credential-store.js';

export async function logoutCommand(): Promise<void> {
  CredentialStore.clear();
  console.log(chalk.green('✓ Logged out successfully. Local credentials removed from secure storage.'));
}

