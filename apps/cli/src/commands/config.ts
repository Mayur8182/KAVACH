import chalk from 'chalk';
import { globalConfigManager } from '../../../../packages/config/src/global-config.js';
import { ProjectDetector } from '../../../../packages/project-manager/src/detector.js';
import { ProjectConfigManager } from '../../../../packages/config/src/project-config.js';

export async function configCommand(key?: string, value?: string, options: { global?: boolean } = {}): Promise<void> {
  // If no arguments, list current config
  if (!key) {
    console.log(chalk.bold('Global Configuration (~/.kavach/config.json):'));
    const gCfg = globalConfigManager.get();
    for (const [k, v] of Object.entries(gCfg)) {
      console.log(`  ${chalk.cyan(k.padEnd(20))}: ${v}`);
    }

    const currentDir = process.cwd();
    const rootDir = ProjectDetector.findProjectRoot(currentDir);
    const cfgMgr = new ProjectConfigManager(rootDir);
    if (cfgMgr.isInitialized()) {
      console.log('');
      console.log(chalk.bold(`Project Configuration (.kavach/config.yaml):`));
      const pCfg = cfgMgr.loadConfig();
      console.log(JSON.stringify(pCfg, null, 2));
    }
    return;
  }

  // Get specific key
  if (value === undefined) {
    const gCfg = globalConfigManager.get() as any;
    if (key in gCfg) {
      console.log(`${key} = ${gCfg[key]}`);
    } else {
      console.log(chalk.yellow(`Key '${key}' not found in global configuration.`));
    }
    return;
  }

  // Set specific key
  const gCfg = globalConfigManager.get() as any;
  let parsedVal: any = value;
  if (value === 'true') parsedVal = true;
  if (value === 'false') parsedVal = false;
  if (!isNaN(Number(value))) parsedVal = Number(value);

  globalConfigManager.set(key as any, parsedVal);
  console.log(chalk.green(`✓ Set global configuration ${chalk.bold(key)} = ${parsedVal}`));
}

