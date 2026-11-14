import chalk from 'chalk';
import ora from 'ora';
import { AgentLifecycleManager } from '../../../local-agent/src/lifecycle.js';
import { callAgentApi } from '../output/formatter.js';

export async function stopCommand(): Promise<void> {
  const running = AgentLifecycleManager.isRunning();
  if (!running.running || !running.pid) {
    console.log(chalk.gray('Kavach Local Agent is not running.'));
    return;
  }

  const spinner = ora(`Stopping Kavach Local Agent (PID: ${running.pid})...`).start();

  try {
    // Attempt graceful IPC shutdown first
    try {
      await callAgentApi('POST', '/shutdown');
    } catch {}

    // Wait up to 5 seconds for PID to disappear
    let attempts = 10;
    let stopped = false;
    while (attempts > 0) {
      await new Promise((r) => setTimeout(r, 500));
      const check = AgentLifecycleManager.isRunning();
      if (!check.running) {
        stopped = true;
        break;
      }
      attempts--;
    }

    if (!stopped) {
      // Force kill if graceful shutdown didn't exit in 5s
      try {
        process.kill(running.pid, 'SIGKILL');
      } catch {}
      AgentLifecycleManager.releaseLock();
    }

    spinner.succeed(chalk.green('Kavach Local Agent stopped successfully.'));
  } catch (err: any) {
    spinner.fail(chalk.red(`Failed to stop agent: ${err.message}`));
  }
}

