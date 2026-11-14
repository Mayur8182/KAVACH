import fs from 'node:fs';
import chalk from 'chalk';
import { GLOBAL_LOG_FILE } from '../../../../packages/shared/src/constants.js';

export async function logsCommand(options: { follow?: boolean; lines?: string }): Promise<void> {
  if (!fs.existsSync(GLOBAL_LOG_FILE)) {
    console.log(chalk.gray(`No agent logs found at ${GLOBAL_LOG_FILE}`));
    return;
  }

  const numLines = options.lines ? parseInt(options.lines, 10) : 40;
  const content = fs.readFileSync(GLOBAL_LOG_FILE, 'utf8');
  const allLines = content.split('\n').filter((l) => l.trim().length > 0);
  const tail = allLines.slice(-numLines);

  console.log(chalk.bold(`--- Kavach Agent Logs (Last ${tail.length} lines) ---`));
  for (const line of tail) {
    if (line.includes('[ERROR]')) {
      console.log(chalk.red(line));
    } else if (line.includes('[WARN]')) {
      console.log(chalk.yellow(line));
    } else {
      console.log(chalk.gray(line));
    }
  }

  if (options.follow) {
    console.log(chalk.cyan('\nStreaming live logs... (Press Ctrl+C to exit)\n'));
    let currentSize = fs.statSync(GLOBAL_LOG_FILE).size;

    setInterval(() => {
      try {
        const newStat = fs.statSync(GLOBAL_LOG_FILE);
        if (newStat.size > currentSize) {
          const stream = fs.createReadStream(GLOBAL_LOG_FILE, {
            start: currentSize,
            end: newStat.size,
            encoding: 'utf8',
          });
          stream.on('data', (chunk) => {
            process.stdout.write(chunk.toString());
          });
          currentSize = newStat.size;
        }
      } catch {}
    }, 500);

    // Keep event loop alive
    await new Promise(() => {});
  }
}

