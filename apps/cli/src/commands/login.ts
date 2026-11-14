import chalk from 'chalk';
import ora from 'ora';
import { exec } from 'node:child_process';
import os from 'node:os';
import { OAuthManager } from '../../../../packages/auth/src/oauth-flow.js';
import { CredentialStore } from '../../../../packages/auth/src/credential-store.js';
import { globalConfigManager } from '../../../../packages/config/src/global-config.js';

function openBrowser(url: string): void {
  const platform = os.platform();
  let cmd = '';
  if (platform === 'win32') {
    cmd = `start "" "${url}"`;
  } else if (platform === 'darwin') {
    cmd = `open "${url}"`;
  } else {
    cmd = `xdg-open "${url}"`;
  }
  exec(cmd, () => {});
}

export async function loginCommand(options: { token?: string }): Promise<void> {
  const globalConfig = globalConfigManager.get();

  if (options.token) {
    const spinner = ora('Validating and saving token in OS secure credential store...').start();
    try {
      const creds = await OAuthManager.loginWithToken(options.token, globalConfig.cloudUrl);
      spinner.succeed(chalk.green(`Authenticated successfully as: ${chalk.bold(creds.user.email)}`));
      console.log(chalk.gray(`Credentials saved to OS secure store. Device ID: ${creds.deviceId}`));
    } catch (err: any) {
      spinner.fail(chalk.red(`Login failed: ${err.message}`));
    }
    return;
  }

  console.log(chalk.bold('Initiating Kavach OAuth 2.0 Login...'));
  console.log(chalk.gray('A browser window will open automatically. If it does not, visit the URL below:'));
  console.log('');

  const spinner = ora('Waiting for browser authentication...').start();

  try {
    const creds = await OAuthManager.loginInteractive({
      cloudUrl: globalConfig.cloudUrl,
      onBrowserOpen: (url) => {
        console.log(`  ${chalk.cyan(url)}`);
        console.log('');
        openBrowser(url);
      },
      onCodeReceived: () => {
        spinner.text = 'Authorization code received. Finalizing token exchange...';
      },
    });

    spinner.succeed(chalk.green(`✓ Authentication successful! Logged in as: ${chalk.bold(creds.user.email)}`));
    console.log(chalk.gray(`Local device registered: ${creds.deviceId}`));
  } catch (err: any) {
    spinner.fail(chalk.red(`Authentication failed: ${err.message}`));
    console.log(chalk.gray(`Tip: You can also login with a personal token: ${chalk.cyan('kavach login --token <token>')}`));
  }
}

