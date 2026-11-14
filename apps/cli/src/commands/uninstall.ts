import chalk from 'chalk';
import ora from 'ora';
import { stopCommand } from './stop.js';
import { getPlatformAdapter } from '../../../../packages/platform/src/index.js';
import { CredentialStore } from '../../../../packages/auth/src/credential-store.js';

export async function uninstallCommand(options: { purge?: boolean }): Promise<void> {
  console.log(chalk.bold('Uninstalling Kavach Local Agent components...'));

  // 1. Stop background service if running
  await stopCommand();

  // 2. Remove platform auto-start / service entry
  const spinner = ora('Removing platform background service...').start();
  const platform = getPlatformAdapter();
  await platform.uninstallService();
  spinner.succeed(chalk.green('✓ Platform background service integration removed.'));

  // 3. Clear credentials
  CredentialStore.clear();
  console.log(chalk.green('✓ Stored local credentials removed.'));

  console.log('');
  console.log(chalk.bold.hex('#10B981')('✓ Kavach Local Agent uninstalled successfully.'));
  console.log(chalk.gray('Project .kavach/ directories have been preserved for your safety.'));
}

