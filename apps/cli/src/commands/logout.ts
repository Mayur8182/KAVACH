import chalk from 'chalk';
import { CredentialStore } from '../../../../packages/auth/src/credential-store.js';
import { OAuthManager } from '../../../../packages/auth/src/oauth-flow.js';
import { globalConfigManager } from '../../../../packages/config/src/global-config.js';

export async function logoutCommand(): Promise<void> {
  const creds = CredentialStore.load();
  const serverUrl = (
    creds?.serverUrl ||
    process.env.KAVACH_SERVER_URL ||
    process.env.KAVACH_CLOUD_URL ||
    globalConfigManager.get().cloudUrl
  ).replace(/\/+$/, '');

  const result = await OAuthManager.revokeSession(creds, serverUrl);
  console.log(chalk.green('✓ Local Kavach credentials removed from secure storage.'));
  if (creds) {
    if (result.remoteRevoked) {
      console.log(chalk.gray(`  OAuth token family revoked at ${serverUrl}.`));
    } else if (result.error) {
      console.log(chalk.yellow(`  Note: Remote token revocation skipped (${result.error}).`));
    }
  }
}
