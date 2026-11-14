import chalk from 'chalk';
import { CLI_VERSION } from '../../../../packages/shared/src/constants.js';

export function printBanner(): void {
  console.log(
    chalk.bold.hex('#10B981')('  _  __     ___      ___    ____ _   _ ')
  );
  console.log(
    chalk.bold.hex('#10B981')(' | |/ /\\   \\   \\    /   /  /    | | | |')
  );
  console.log(
    chalk.bold.hex('#059669')(' | \' /  \\   \\   \\  /   /  |  /| | |_| |')
  );
  console.log(
    chalk.bold.hex('#047857')(' | . \\   \\   \\   \\/   /   | | | |  _  |')
  );
  console.log(
    chalk.bold.hex('#065F46')(' |_|\\_\\___\\   \\______/    |_| |_|_| |_|')
  );
  console.log('');
  console.log(
    chalk.bold('  KAVACH SECURITY') +
      chalk.gray(` — Autonomous Security Control Plane (CLI v${CLI_VERSION})`)
  );
  console.log(chalk.gray('  Deterministic Defense • Local Developer Agent'));
  console.log('');
}

