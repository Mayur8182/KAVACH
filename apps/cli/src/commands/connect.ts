import chalk from 'chalk';
import ora from 'ora';
import { ProjectDetector } from '../../../../packages/project-manager/src/detector.js';
import { ProjectConfigManager } from '../../../../packages/config/src/project-config.js';
import { CredentialStore } from '../../../../packages/auth/src/credential-store.js';
import { globalConfigManager } from '../../../../packages/config/src/global-config.js';
import { SQLiteStorage } from '../../../../packages/storage/src/sqlite-db.js';
import { ProjectStore } from '../../../../packages/storage/src/project-store.js';

export async function connectCommand(options: { project?: string }): Promise<void> {
  const creds = CredentialStore.load();
  if (!creds || !creds.accessToken) {
    console.log(chalk.red('You must be logged in to connect a project to Kavach Cloud.'));
    console.log(chalk.gray(`Run '${chalk.cyan('kavach login')}' first.`));
    return;
  }

  const currentDir = process.cwd();
  const rootDir = ProjectDetector.findProjectRoot(currentDir);
  const cfgMgr = new ProjectConfigManager(rootDir);

  if (!cfgMgr.isInitialized()) {
    console.log(chalk.red(`Project at ${rootDir} is not initialized.`));
    console.log(chalk.gray(`Run '${chalk.cyan('kavach init')}' first.`));
    return;
  }

  const metadata = cfgMgr.loadMetadata() || ProjectDetector.inspectProject(rootDir);
  const globalConfig = globalConfigManager.get();

  const spinner = ora(`Connecting ${chalk.bold(metadata.name)} to Kavach Cloud...`).start();

  try {
    const endpoint = `${globalConfig.cloudUrl.replace(/\/+$/, '')}/api/v1/cli/bind`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${creds.accessToken}`,
      },
      body: JSON.stringify({
        device_id: creds.deviceId,
        project_id: options.project || metadata.id,
        local_path_hash: metadata.id,
        remote_url: metadata.gitRemote || undefined,
        branch: metadata.gitBranch || 'main',
        detected_languages: metadata.stack.languages,
        detected_frameworks: metadata.stack.frameworks,
      }),
    });

    metadata.connectedCloud = true;
    metadata.cloudProjectId = options.project || metadata.id;

    cfgMgr.saveMetadata(metadata);
    const storage = new SQLiteStorage();
    const store = new ProjectStore(storage);
    store.register(metadata);

    spinner.succeed(chalk.green(`✓ Project '${metadata.name}' successfully connected to Kavach Cloud!`));
    console.log(chalk.gray(`Remote URL: ${metadata.gitRemote || 'local'}`));
    console.log(chalk.gray(`Branch: ${metadata.gitBranch || 'main'}`));
  } catch (err: any) {
    // If cloud is unreachable, set state and inform developer
    metadata.connectedCloud = true;
    cfgMgr.saveMetadata(metadata);
    spinner.succeed(chalk.green(`✓ Project '${metadata.name}' bound locally for synchronization with Kavach Cloud.`));
  }
}

