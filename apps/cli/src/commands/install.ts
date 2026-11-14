import fs from 'node:fs';
import chalk from 'chalk';
import ora from 'ora';
import { GLOBAL_KAVACH_DIR, GLOBAL_LOGS_DIR } from '../../../../packages/shared/src/constants.js';
import { SQLiteStorage } from '../../../../packages/storage/src/sqlite-db.js';
import { getPlatformAdapter } from '../../../../packages/platform/src/index.js';

export async function installCommand(): Promise<void> {
  const spinner = ora('Setting up Kavach local directories and permissions...').start();

  try {
    fs.mkdirSync(GLOBAL_KAVACH_DIR, { recursive: true, mode: 0o700 });
    fs.mkdirSync(GLOBAL_LOGS_DIR, { recursive: true, mode: 0o700 });
    spinner.succeed(chalk.green(`✓ Local directories prepared (~/.kavach)`));

    const dbSpinner = ora('Initializing local persistent SQLite event storage...').start();
    const storage = new SQLiteStorage();
    storage.close();
    dbSpinner.succeed(chalk.green(`✓ SQLite event database initialized (WAL mode)`));

    const srvSpinner = ora('Configuring platform background service integration...').start();
    const platform = getPlatformAdapter();
    const srvRes = await platform.installService();
    if (srvRes.success) {
      srvSpinner.succeed(chalk.green(`✓ ${srvRes.message}`));
    } else {
      srvSpinner.info(chalk.yellow(`Startup integration note: ${srvRes.message}`));
    }

    console.log('');
    console.log(chalk.bold.hex('#10B981')('✓ Kavach Local Agent installation completed!'));
    console.log(chalk.gray(`Next steps:`));
    console.log(`  1. Login to Kavach:   ${chalk.cyan('kavach login')}`);
    console.log(`  2. Start the agent:   ${chalk.cyan('kavach start')}`);
    console.log(`  3. Init any project:  ${chalk.cyan('cd my-project && kavach init')}`);
  } catch (err: any) {
    spinner.fail(chalk.red(`Installation failed: ${err.message}`));
  }
}

