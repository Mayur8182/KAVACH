import chalk from 'chalk';
import { SQLiteStorage } from '../../../../packages/storage/src/sqlite-db.js';
import { ProjectStore } from '../../../../packages/storage/src/project-store.js';

export async function projectsCommand(): Promise<void> {
  const storage = new SQLiteStorage();
  const store = new ProjectStore(storage);
  const projects = store.list();

  console.log(chalk.bold('CONNECTED KAVACH PROJECTS'));
  console.log(chalk.gray(`Found ${projects.length} project(s) registered locally on this machine:`));
  console.log('');

  if (projects.length === 0) {
    console.log(chalk.gray('  No projects registered yet. Run \'kavach init\' inside any repository.'));
    return;
  }

  for (const p of projects) {
    console.log(`  ${chalk.green.bold(p.name)}`);
    console.log(`    ${chalk.gray('Root Path :')} ${p.rootPath}`);
    console.log(`    ${chalk.gray('Languages :')} ${p.stack.languages.join(', ') || 'N/A'}`);
    console.log(`    ${chalk.gray('Git Branch:')} ${p.gitBranch || 'N/A'}`);
    console.log(`    ${chalk.gray('Cloud Sync:')} ${p.connectedCloud ? chalk.green('Connected') : chalk.gray('Local-only')}`);
    console.log('');
  }
}

