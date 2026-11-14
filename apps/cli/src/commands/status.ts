import chalk from 'chalk';
import ora from 'ora';
import path from 'node:path';
import { AgentLifecycleManager } from '../../../local-agent/src/lifecycle.js';
import { callAgentApi, printKeyValue } from '../output/formatter.js';
import { ProjectDetector } from '../../../../packages/project-manager/src/detector.js';
import { ProjectConfigManager } from '../../../../packages/config/src/project-config.js';
import { CredentialStore } from '../../../../packages/auth/src/credential-store.js';
import { globalConfigManager } from '../../../../packages/config/src/global-config.js';
import { CLI_VERSION } from '../../../../packages/shared/src/constants.js';

export async function statusCommand(): Promise<void> {
  const currentDir = process.cwd();
  const rootDir = ProjectDetector.findProjectRoot(currentDir);
  const cfgMgr = new ProjectConfigManager(rootDir);
  const isProjInit = cfgMgr.isInitialized();
  const projMeta = cfgMgr.loadMetadata();

  const creds = CredentialStore.load();
  const isAuth = CredentialStore.hasValidCredentials();
  const agentRunning = AgentLifecycleManager.isRunning();

  console.log(chalk.bold('KAVACH SECURITY'));
  console.log(chalk.gray('Local Developer Protection'));
  console.log('');

  // Checkmarks
  console.log(`${chalk.green('✓')} CLI installed (v${CLI_VERSION})`);
  console.log(isAuth ? `${chalk.green('✓')} Authentication successful (${creds?.user.email})` : `${chalk.yellow('○')} Authentication pending (run 'kavach login')`);
  console.log(isProjInit ? `${chalk.green('✓')} Project detected (${projMeta?.name || path.basename(rootDir)})` : `${chalk.yellow('○')} Project not initialized (run 'kavach init')`);
  console.log(isProjInit ? `${chalk.green('✓')} Local configuration created (.kavach/)` : `${chalk.gray('○')} Local configuration pending`);

  if (agentRunning.running) {
    console.log(`${chalk.green('✓')} Agent started (PID: ${agentRunning.pid})`);
  } else {
    console.log(`${chalk.yellow('○')} Agent stopped (run 'kavach start')`);
  }

  console.log('');
  console.log(chalk.bold('Status Summary:'));
  printKeyValue('Project', isProjInit ? (projMeta?.name || path.basename(rootDir)) : 'Not initialized');
  printKeyValue('Agent', agentRunning.running ? chalk.green('Running') : chalk.gray('Stopped'));
  printKeyValue('Protection', agentRunning.running ? chalk.green('Ready') : chalk.gray('Standby'));
  printKeyValue('Cloud', isAuth ? chalk.green('Connected') : chalk.gray('Disconnected'));

  if (agentRunning.running) {
    try {
      const health = await callAgentApi('GET', '/health');
      console.log('');
      console.log(chalk.bold('Agent Telemetry:'));
      printKeyValue('Host & Port', `127.0.0.1:${health.port}`);
      printKeyValue('Memory (RSS)', `${health.memoryUsageMb} MB`);
      printKeyValue('Active Watchers', `${health.activeProjectsCount} projects`);
      printKeyValue('Queued Events', `${health.queuedEventsCount} pending`);
      printKeyValue('Uptime', `${health.uptimeSeconds} seconds`);
    } catch {}
  }

  console.log('');
  if (agentRunning.running && isProjInit && isAuth) {
    console.log(chalk.bold.hex('#10B981')('Kavach Local Agent is ready.'));
  } else if (!agentRunning.running) {
    console.log(chalk.cyan(`Tip: Run '${chalk.bold('kavach start')}' to launch the background agent.`));
  }
}

