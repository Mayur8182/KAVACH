import chalk from 'chalk';
import { SQLiteStorage } from '../../../../packages/storage/src/sqlite-db.js';
import { ProjectStore } from '../../../../packages/storage/src/project-store.js';
import { CredentialStore } from '../../../../packages/auth/src/credential-store.js';
import { OAuthManager } from '../../../../packages/auth/src/oauth-flow.js';
import { globalConfigManager } from '../../../../packages/config/src/global-config.js';

export async function projectsCommand(): Promise<void> {
  const storage = new SQLiteStorage();
  const store = new ProjectStore(storage);
  const projects = store.list();
  storage.close();

  console.log(chalk.bold('LOCAL REGISTERED KAVACH PROJECTS'));
  console.log(chalk.gray(`Found ${projects.length} project(s) registered locally on this machine:`));
  console.log('');

  if (projects.length === 0) {
    console.log(chalk.gray("  No projects registered yet. Run 'kavach init' inside any repository."));
  } else {
    for (const p of projects) {
      console.log(`  ${chalk.green.bold(p.name)}`);
      console.log(`    ${chalk.gray('Root Path  :')} ${p.rootPath}`);
      console.log(`    ${chalk.gray('Languages  :')} ${p.stack.languages.join(', ') || 'N/A'}`);
      console.log(`    ${chalk.gray('Git Remote :')} ${p.gitRemote || 'N/A'}`);
      console.log(`    ${chalk.gray('Git Branch :')} ${p.gitBranch || 'N/A'}`);
      console.log(
        `    ${chalk.gray('Cloud Sync :')} ${
          p.connectedCloud && p.cloudProjectId
            ? chalk.green(`Connected (${p.cloudProjectId})`)
            : chalk.gray('Local-only')
        }`
      );
      console.log('');
    }
  }

  const serverUrl = (
    process.env.KAVACH_SERVER_URL ||
    process.env.KAVACH_CLOUD_URL ||
    globalConfigManager.get().cloudUrl
  ).replace(/\/+$/, '');

  console.log(chalk.bold(`KAVACH CLOUD PROJECTS (${serverUrl})`));

  if (!CredentialStore.hasRefreshableSession()) {
    console.log(chalk.yellow("  NOT CONNECTED — Run 'kavach login' to view authorized cloud projects."));
    return;
  }

  try {
    const creds = await OAuthManager.getValidCredentials(serverUrl);
    const res = await fetch(`${serverUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${creds.accessToken}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'list_projects', arguments: { limit: 100, offset: 0 } },
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      const text = await res.text();
      console.log(chalk.red(`  Failed to load cloud projects (HTTP ${res.status}): ${text || res.statusText}`));
      return;
    }

    const rpc = (await res.json()) as Record<string, any>;
    if (rpc.error) {
      console.log(chalk.red(`  MCP error: ${rpc.error.message || JSON.stringify(rpc.error)}`));
      return;
    }

    const rawText = rpc.result?.content?.[0]?.text;
    const payload = typeof rawText === 'string' ? (JSON.parse(rawText) as Record<string, any>) : null;
    const cloudProjects = payload?.data?.projects;

    if (!Array.isArray(cloudProjects) || cloudProjects.length === 0) {
      console.log(chalk.gray('  No cloud projects found in your authorized workspace.'));
      return;
    }

    for (const cp of cloudProjects) {
      const badge = cp.is_active ? chalk.cyan(' [ACTIVE]') : '';
      console.log(`  ${chalk.white.bold(cp.name)}${badge}`);
      console.log(`    ${chalk.gray('Project ID :')} ${cp.id}`);
      console.log(`    ${chalk.gray('Repository :')} ${cp.repository_url || cp.repository || 'Not linked'}`);
      console.log(`    ${chalk.gray('Environment:')} ${cp.environment || cp.status || 'N/A'}`);
      console.log('');
    }
  } catch (err: any) {
    console.log(chalk.red(`  Could not reach Kavach Cloud at ${serverUrl}: ${err?.message || err}`));
  }
}
