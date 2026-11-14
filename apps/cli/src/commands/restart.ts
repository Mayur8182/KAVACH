import chalk from 'chalk';
import { stopCommand } from './stop.js';
import { startCommand } from './start.js';

export async function restartCommand(options: { port?: string }): Promise<void> {
  console.log(chalk.bold('Restarting Kavach Local Agent...'));
  await stopCommand();
  await new Promise((r) => setTimeout(r, 1000));
  await startCommand(options);
}

