#!/usr/bin/env node
import { Command } from 'commander';
import { printBanner } from './output/banner.js';
import { CLI_NAME, CLI_VERSION } from '../../../packages/shared/src/constants.js';

import { installCommand } from './commands/install.js';
import { initCommand } from './commands/init.js';
import { loginCommand } from './commands/login.js';
import { logoutCommand } from './commands/logout.js';
import { connectCommand } from './commands/connect.js';
import { statusCommand } from './commands/status.js';
import { startCommand } from './commands/start.js';
import { stopCommand } from './commands/stop.js';
import { restartCommand } from './commands/restart.js';
import { doctorCommand } from './commands/doctor.js';
import { configCommand } from './commands/config.js';
import { projectsCommand } from './commands/projects.js';
import { logsCommand } from './commands/logs.js';
import { uninstallCommand } from './commands/uninstall.js';

const program = new Command();

program
  .name(CLI_NAME)
  .description('Kavach Security — Autonomous Security Engineer & Local Background Agent')
  .version(CLI_VERSION, '-v, --version', 'Output the current version of Kavach CLI');

program
  .command('install')
  .description('Install and configure Kavach local agent components and background service')
  .action(async () => {
    printBanner();
    await installCommand();
  });

program
  .command('init')
  .description('Initialize current repository with Kavach local configuration')
  .option('-n, --name <name>', 'Custom project name')
  .option('-y, --yes', 'Skip confirmation prompts')
  .action(async (opts) => {
    printBanner();
    await initCommand(opts);
  });

program
  .command('login')
  .description('Authenticate developer device with Kavach Cloud account via OAuth 2.0 PKCE')
  .option('-t, --token <token>', 'Personal access token or API key for headless login')
  .action(async (opts) => {
    printBanner();
    await loginCommand(opts);
  });

program
  .command('logout')
  .description('Remove stored credentials and end authenticated session')
  .action(async () => {
    await logoutCommand();
  });

program
  .command('connect')
  .description('Connect local project to your Kavach Cloud account')
  .option('-p, --project <id>', 'Remote Kavach Cloud project ID')
  .action(async (opts) => {
    printBanner();
    await connectCommand(opts);
  });

program
  .command('status')
  .description('Display health, protection status, active watchers, and cloud connection')
  .action(async () => {
    printBanner();
    await statusCommand();
  });

program
  .command('start')
  .description('Start the Kavach Local Agent background daemon')
  .option('-d, --daemon', 'Run in foreground daemon mode (internal)')
  .option('-p, --port <port>', 'Custom loopback port (default: 17382)')
  .action(async (opts) => {
    if (!opts.daemon) printBanner();
    await startCommand(opts);
  });

program
  .command('stop')
  .description('Stop the running Kavach Local Agent background daemon')
  .action(async () => {
    await stopCommand();
  });

program
  .command('restart')
  .description('Restart the Kavach Local Agent background daemon')
  .option('-p, --port <port>', 'Custom loopback port (default: 17382)')
  .action(async (opts) => {
    printBanner();
    await restartCommand(opts);
  });

program
  .command('doctor')
  .description('Diagnose installation, permissions, SQLite storage, and environment')
  .action(async () => {
    printBanner();
    await doctorCommand();
  });

program
  .command('config [key] [value]')
  .description('Get or set Kavach local configuration parameters')
  .option('-g, --global', 'Target global configuration')
  .action(async (key, value, opts) => {
    await configCommand(key, value, opts);
  });

program
  .command('projects')
  .description('List all projects registered on this developer machine')
  .action(async () => {
    printBanner();
    await projectsCommand();
  });

program
  .command('logs')
  .description('Display or stream Kavach Local Agent background logs')
  .option('-f, --follow', 'Stream live agent log output')
  .option('-n, --lines <number>', 'Number of lines to display', '40')
  .action(async (opts) => {
    await logsCommand(opts);
  });

program
  .command('uninstall')
  .description('Uninstall Kavach Local Agent and remove background service entries')
  .option('--purge', 'Remove all state and configuration')
  .action(async (opts) => {
    printBanner();
    await uninstallCommand(opts);
  });

program.parse(process.argv);

