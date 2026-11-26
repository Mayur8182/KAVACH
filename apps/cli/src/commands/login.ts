import chalk from 'chalk';
import ora from 'ora';
import { execFile } from 'node:child_process';
import os from 'node:os';
import { OAuthManager } from '../../../../packages/auth/src/oauth-flow.js';
import { globalConfigManager } from '../../../../packages/config/src/global-config.js';
import { DEFAULT_CLI_OAUTH_CLIENT_ID } from '../../../../packages/shared/src/constants.js';

function openBrowser(url: string): void {
  const platform = os.platform();
  if (platform === 'win32') {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', 'Start-Process -FilePath $env:KAVACH_OPEN_URL'],
      { env: { ...process.env, KAVACH_OPEN_URL: url } },
      () => {}
    );
  } else if (platform === 'darwin') {
    execFile('open', [url], () => {});
  } else {
    execFile('xdg-open', [url], () => {});
  }
}

export async function loginCommand(options: { token?: string }): Promise<void> {
  const globalConfig = globalConfigManager.get();
  const serverUrl = (
    process.env.KAVACH_SERVER_URL ||
    process.env.KAVACH_CLOUD_URL ||
    globalConfig.cloudUrl
  ).replace(/\/+$/, '');

  if (options.token) {
    const spinner = ora(`Validating token with ${serverUrl} and saving credentials...`).start();
    try {
      const creds = await OAuthManager.loginWithToken(options.token, serverUrl);
      spinner.succeed(chalk.green(`Authenticated successfully as: ${chalk.bold(creds.user.email)}`));
      console.log(chalk.gray(`  Server    : ${serverUrl}`));
      console.log(chalk.gray(`  Device ID : ${creds.deviceId}`));
      if (creds.projectName || creds.projectId) {
        console.log(chalk.gray(`  Project   : ${creds.projectName || creds.projectId}`));
      }
    } catch (err: any) {
      spinner.fail(chalk.red(`Login failed: ${err?.message || err}`));
      process.exitCode = 1;
    }
    return;
  }

  console.log(chalk.bold('Initiating Kavach OAuth 2.1 + PKCE (S256) Login...'));
  console.log(chalk.gray(`Server: ${serverUrl} (client_id: ${DEFAULT_CLI_OAUTH_CLIENT_ID})`));
  console.log(chalk.gray('A browser window will open automatically. If it does not, visit the URL below:'));
  console.log('');

  const spinner = ora('Waiting for browser authorization...').start();

  try {
    const creds = await OAuthManager.loginInteractive({
      cloudUrl: serverUrl,
      clientId: DEFAULT_CLI_OAUTH_CLIENT_ID,
      onBrowserOpen: (url) => {
        spinner.stop();
        console.log(`  ${chalk.cyan(url)}`);
        console.log('');
        openBrowser(url);
        spinner.start('Waiting for OAuth 2.1 callback on 127.0.0.1...');
      },
      onCodeReceived: () => {
        spinner.text = 'Authorization code received. Exchanging PKCE code for tokens...';
      },
    });

    spinner.succeed(
      chalk.green(`✓ Authentication successful! Logged in as: ${chalk.bold(creds.user.email)}`)
    );
    console.log(chalk.gray(`  Server     : ${creds.serverUrl || serverUrl}`));
    console.log(chalk.gray(`  Device ID  : ${creds.deviceId}`));
    if (creds.projectName || creds.projectId) {
      console.log(
        chalk.gray(
          `  Active Proj: ${creds.projectName ? `${creds.projectName} (${creds.projectId})` : creds.projectId}`
        )
      );
    }
    if (creds.refreshToken) {
      console.log(chalk.gray(`  Session    : Refreshable OAuth 2.1 token stored securely`));
    }
    console.log(
      chalk.gray(`  Next step  : Run '${chalk.cyan('kavach connect')}' inside a Git repository to bind it.`)
    );
  } catch (err: any) {
    spinner.fail(chalk.red(`Authentication failed: ${err?.message || err}`));
    console.log(
      chalk.gray(
        `Tip: Check KAVACH_SERVER_URL or authenticate headlessly with: ${chalk.cyan('kavach login --token <access_token>')}`
      )
    );
    process.exitCode = 1;
  }
}
