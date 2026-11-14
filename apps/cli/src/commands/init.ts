import path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import { ProjectDetector } from '../../../../packages/project-manager/src/detector.js';
import { ProjectConfigManager } from '../../../../packages/config/src/project-config.js';
import { SQLiteStorage } from '../../../../packages/storage/src/sqlite-db.js';
import { ProjectStore } from '../../../../packages/storage/src/project-store.js';
import { callAgentApi } from '../output/formatter.js';
import { AgentLifecycleManager } from '../../../local-agent/src/lifecycle.js';

export async function initCommand(options: { name?: string; yes?: boolean }): Promise<void> {
  const spinner = ora('Detecting repository structure and technology stack...').start();

  const currentDir = process.cwd();
  const rootDir = ProjectDetector.findProjectRoot(currentDir);
  const metadata = ProjectDetector.inspectProject(rootDir);

  if (options.name) {
    metadata.name = options.name;
  }

  spinner.succeed(chalk.green(`Detected project: ${chalk.bold(metadata.name)} at ${rootDir}`));

  console.log('');
  console.log(chalk.bold('  Technology Discovery:'));
  console.log(`    ${chalk.gray('Languages       :')} ${metadata.stack.languages.join(', ') || 'None detected'}`);
  console.log(`    ${chalk.gray('Frameworks      :')} ${metadata.stack.frameworks.join(', ') || 'None detected'}`);
  console.log(`    ${chalk.gray('Infrastructure  :')} ${metadata.stack.infrastructure.join(', ') || 'Standard host'}`);
  console.log(`    ${chalk.gray('Git Repository  :')} ${metadata.gitRepo ? `${metadata.gitBranch} (${metadata.gitRemote || 'local'})` : 'No Git'}`);
  console.log('');

  const cfgSpinner = ora('Creating .kavach/ configuration and policy directory...').start();
  const cfgMgr = new ProjectConfigManager(rootDir);

  if (cfgMgr.isInitialized()) {
    cfgSpinner.info(chalk.yellow('.kavach/ configuration already exists. Refreshing metadata.'));
    cfgMgr.saveMetadata(metadata);
  } else {
    cfgMgr.init(metadata.name, metadata);
    cfgSpinner.succeed(chalk.green('Created .kavach/config.yaml, project.json, ignore, and policies/'));
  }

  // Register in SQLite storage
  const regSpinner = ora('Registering project with local storage and background agent...').start();
  const storage = new SQLiteStorage();
  const store = new ProjectStore(storage);
  store.register(metadata);

  // If agent is actively running, inform it via IPC to attach file watcher immediately
  const agentInfo = AgentLifecycleManager.isRunning();
  if (agentInfo.running) {
    try {
      await callAgentApi('POST', '/projects/init', { path: rootDir, name: metadata.name });
      regSpinner.succeed(chalk.green('Registered project with active Kavach Local Agent. File-watcher enabled.'));
    } catch {
      regSpinner.succeed(chalk.green('Registered project locally. Agent will watch upon next start.'));
    }
  } else {
    regSpinner.succeed(chalk.green('Registered project locally. Run \'kavach start\' to enable background watching.'));
  }

  console.log('');
  console.log(chalk.bold.hex('#10B981')('✓ Project initialized successfully!'));
  console.log(chalk.gray(`Run ${chalk.cyan('kavach status')} to check agent health or ${chalk.cyan('kavach start')} to begin monitoring.`));
}

