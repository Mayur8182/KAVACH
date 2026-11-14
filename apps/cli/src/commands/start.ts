import path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import { fileURLToPath } from 'node:url';
import { AgentLifecycleManager } from '../../../local-agent/src/lifecycle.js';
import { getPlatformAdapter } from '../../../../packages/platform/src/index.js';
import { callAgentApi } from '../output/formatter.js';
import { startLocalAgent } from '../../../local-agent/src/index.js';
import { DEFAULT_AGENT_PORT } from '../../../../packages/shared/src/constants.js';

export async function startCommand(options: { daemon?: boolean; port?: string }): Promise<void> {
  const port = options.port ? parseInt(options.port, 10) : DEFAULT_AGENT_PORT;

  // 1. If running as the inner background worker daemon itself:
  if (options.daemon || process.env.KAVACH_DAEMON === '1') {
    try {
      await startLocalAgent(port);
      // Keep process alive indefinitely
      await new Promise(() => {});
    } catch (err: any) {
      process.stderr.write(`Fatal Agent Error: ${err.message}\n`);
      process.exit(1);
    }
    return;
  }

  // 2. Running as user-facing CLI command:
  const running = AgentLifecycleManager.isRunning();
  if (running.running) {
    console.log(chalk.yellow(`Kavach Local Agent is already running (PID: ${running.pid}).`));
    console.log(chalk.gray(`Use '${chalk.cyan('kavach restart')}' or '${chalk.cyan('kavach status')}' for details.`));
    return;
  }

  const spinner = ora('Spawning Kavach Local Agent background service...').start();

  try {
    const platformAdapter = getPlatformAdapter();
    const cliEntry = path.resolve(__dirname, '../bin.js');

    const spawned = platformAdapter.spawnDetachedAgent(cliEntry, ['start', '--daemon', '--port', port.toString()]);
    spinner.text = `Agent process spawned (PID: ${spawned.pid}). Waiting for health probe...`;

    // Poll health endpoint for up to 10 seconds to confirm ready
    let attempts = 20;
    let healthy = false;
    while (attempts > 0) {
      await new Promise((r) => setTimeout(r, 500));
      try {
        const health = await callAgentApi('GET', '/health', null, port);
        if (health && health.status) {
          healthy = true;
          break;
        }
      } catch {}
      attempts--;
    }

    if (healthy) {
      spinner.succeed(chalk.green(`Kavach Local Agent is running in background (PID: ${spawned.pid}, Port: ${port})`));
      console.log(chalk.gray(`Logs available via: ${chalk.cyan('kavach logs')} or ~/.kavach/logs/agent.log`));
    } else {
      spinner.warn(chalk.yellow(`Agent spawned (PID: ${spawned.pid}) but health probe timed out. Check 'kavach logs'.`));
    }
  } catch (err: any) {
    spinner.fail(chalk.red(`Failed to start agent: ${err.message}`));
  }
}

