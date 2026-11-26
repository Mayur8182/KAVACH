import chalk from 'chalk';
import ora from 'ora';
import { ProjectDetector } from '../../../../packages/project-manager/src/detector.js';
import { ProjectConfigManager } from '../../../../packages/config/src/project-config.js';
import { OAuthManager } from '../../../../packages/auth/src/oauth-flow.js';
import { CredentialStore } from '../../../../packages/auth/src/credential-store.js';
import { globalConfigManager } from '../../../../packages/config/src/global-config.js';
import { DEFAULT_CLI_OAUTH_CLIENT_ID } from '../../../../packages/shared/src/constants.js';
import { SQLiteStorage } from '../../../../packages/storage/src/sqlite-db.js';
import { ProjectStore } from '../../../../packages/storage/src/project-store.js';

interface ResolveProjectCandidate {
  id: string;
  name: string;
  repository_url?: string | null;
  environment?: string | null;
}

interface ResolveProjectResponse {
  matched: boolean;
  normalized_remote?: string | null;
  project?: {
    id: string;
    name: string;
    repository_url?: string | null;
    environment?: string | null;
    workspace_id?: string | null;
    organization_id?: string | null;
  } | null;
  workspace?: {
    id: string;
    name: string;
  } | null;
  repository?: {
    id: string;
    full_name?: string | null;
    html_url?: string | null;
  } | null;
  candidates?: ResolveProjectCandidate[];
}

async function extractErrorText(response: Response): Promise<string> {
  try {
    const raw = await response.text();
    if (!raw) return response.statusText || `HTTP ${response.status}`;
    try {
      const json = JSON.parse(raw) as Record<string, any>;
      return String(json.detail || json.error_description || json.message || json.error || raw);
    } catch {
      return raw;
    }
  } catch {
    return response.statusText || `HTTP ${response.status}`;
  }
}

async function fetchWithAutoRefresh(
  url: string,
  initFactory: (accessToken: string) => RequestInit,
  serverUrl: string
): Promise<Response> {
  let creds = await OAuthManager.getValidCredentials(serverUrl);
  let response = await fetch(url, {
    ...initFactory(creds.accessToken),
    signal: AbortSignal.timeout(15000),
  });

  if (response.status === 401 && creds.refreshToken) {
    creds = await OAuthManager.refreshAccessToken(creds, serverUrl);
    response = await fetch(url, {
      ...initFactory(creds.accessToken),
      signal: AbortSignal.timeout(15000),
    });
  }

  return response;
}

export async function connectCommand(options: { project?: string }): Promise<void> {
  const globalConfig = globalConfigManager.get();
  const serverUrl = (
    process.env.KAVACH_SERVER_URL ||
    process.env.KAVACH_CLOUD_URL ||
    globalConfig.cloudUrl
  ).replace(/\/+$/, '');

  const rawCreds = CredentialStore.load();
  if (!rawCreds || !rawCreds.accessToken) {
    console.log(chalk.red('Authentication required: No Kavach credentials found.'));
    console.log(chalk.gray(`Run '${chalk.cyan('kavach login')}' first to authenticate via OAuth 2.1.`));
    process.exitCode = 1;
    return;
  }

  try {
    await OAuthManager.getValidCredentials(serverUrl);
  } catch (authErr: any) {
    console.log(chalk.red(`Authentication error: ${authErr?.message || authErr}`));
    console.log(chalk.gray(`Run '${chalk.cyan('kavach login')}' to sign in again.`));
    process.exitCode = 1;
    return;
  }

  const currentDir = process.cwd();
  const rootDir = ProjectDetector.findProjectRoot(currentDir);
  const cfgMgr = new ProjectConfigManager(rootDir);

  if (!cfgMgr.isInitialized()) {
    console.log(chalk.red(`Project at ${rootDir} is not initialized.`));
    console.log(chalk.gray(`Run '${chalk.cyan('kavach init')}' first.`));
    process.exitCode = 1;
    return;
  }

  const metadata = cfgMgr.loadMetadata() || ProjectDetector.inspectProject(rootDir);
  const liveGit = ProjectDetector.inspectGit(rootDir);
  if (liveGit.isRepo) {
    metadata.gitRepo = true;
    metadata.gitBranch = liveGit.branch || metadata.gitBranch;
    metadata.gitRemote = liveGit.remote || metadata.gitRemote;
  }

  const spinner = ora(
    options.project
      ? `Connecting ${chalk.bold(metadata.name)} to Kavach Cloud project ${options.project}...`
      : `Resolving ${chalk.bold(metadata.name)} via Git remote against ${serverUrl}...`
  ).start();

  try {
    if (options.project) {
      const mcpRes = await fetchWithAutoRefresh(
        `${serverUrl}/mcp`,
        (token) => ({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: {
              name: 'set_active_project',
              arguments: {
                project_id: options.project,
                ...(metadata.gitRemote ? { git_remote: metadata.gitRemote } : {}),
              },
            },
          }),
        }),
        serverUrl
      );

      if (!mcpRes.ok) {
        const reason = await extractErrorText(mcpRes);
        spinner.fail(chalk.red(`Failed to connect project (HTTP ${mcpRes.status}): ${reason}`));
        if (mcpRes.status === 401) {
          console.log(chalk.gray(`Run '${chalk.cyan('kavach login')}' to re-authenticate.`));
        }
        process.exitCode = 1;
        return;
      }

      const rpcPayload = (await mcpRes.json()) as Record<string, any>;
      if (rpcPayload.error) {
        spinner.fail(chalk.red(`MCP error: ${rpcPayload.error.message || JSON.stringify(rpcPayload.error)}`));
        process.exitCode = 1;
        return;
      }

      const textContent = rpcPayload.result?.content?.[0]?.text;
      let parsedTool: Record<string, any> | null = null;
      if (typeof textContent === 'string') {
        try {
          parsedTool = JSON.parse(textContent);
        } catch {}
      }

      if (rpcPayload.result?.isError || (parsedTool && parsedTool.status !== 'SUCCESS')) {
        const errMsg = parsedTool?.message || textContent || 'Project activation rejected by Kavach.';
        spinner.fail(chalk.red(`Could not connect project '${options.project}': ${errMsg}`));
        process.exitCode = 1;
        return;
      }

      const activeProj = parsedTool?.data?.active_project;
      if (!activeProj?.id) {
        spinner.fail(chalk.red('Server did not return a verified active project record.'));
        process.exitCode = 1;
        return;
      }

      metadata.connectedCloud = true;
      metadata.cloudProjectId = activeProj.id;
      metadata.cloudProjectName = activeProj.name;
      metadata.cloudWorkspaceId = activeProj.workspace_id || undefined;
      metadata.cloudOrganizationId = activeProj.organization_id || undefined;
      metadata.cloudRepositoryUrl = activeProj.repository_url || undefined;

      cfgMgr.saveMetadata(metadata);
      const storage = new SQLiteStorage();
      const store = new ProjectStore(storage);
      store.register(metadata);
      storage.close();

      spinner.succeed(
        chalk.green(`✓ Project '${metadata.name}' connected to Kavach Cloud project '${activeProj.name}'!`)
      );
      console.log(chalk.gray(`  Cloud Project ID : ${activeProj.id}`));
      if (activeProj.workspace_id) {
        console.log(chalk.gray(`  Workspace ID     : ${activeProj.workspace_id}`));
      }
      console.log(chalk.gray(`  Git Remote       : ${metadata.gitRemote || 'none'}`));
      return;
    }

    const resolveEndpoint = `${serverUrl}/api/v1/mcp/resolve-project`;
    const response = await fetchWithAutoRefresh(
      resolveEndpoint,
      (token) => ({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          git_remote: metadata.gitRemote || '',
          client_id: DEFAULT_CLI_OAUTH_CLIENT_ID,
        }),
      }),
      serverUrl
    );

    if (!response.ok) {
      const reason = await extractErrorText(response);
      spinner.fail(chalk.red(`Cloud project resolution failed (HTTP ${response.status}): ${reason}`));
      if (response.status === 401) {
        console.log(chalk.gray(`Your session is invalid or expired. Run '${chalk.cyan('kavach login')}' first.`));
      } else {
        console.log(chalk.gray(`Verify server URL (${serverUrl}) or run '${chalk.cyan('kavach doctor')}' to diagnose.`));
      }
      process.exitCode = 1;
      return;
    }

    const data = (await response.json()) as ResolveProjectResponse;

    if (data.matched === true && data.project?.id) {
      metadata.connectedCloud = true;
      metadata.cloudProjectId = data.project.id;
      metadata.cloudProjectName = data.project.name;
      metadata.cloudWorkspaceId = data.workspace?.id || data.project.workspace_id || undefined;
      metadata.cloudWorkspaceName = data.workspace?.name || undefined;
      metadata.cloudOrganizationId = data.project.organization_id || undefined;
      metadata.cloudRepositoryUrl =
        data.repository?.html_url || data.project.repository_url || undefined;

      cfgMgr.saveMetadata(metadata);
      const storage = new SQLiteStorage();
      const store = new ProjectStore(storage);
      store.register(metadata);
      storage.close();

      spinner.succeed(
        chalk.green(`✓ Connected '${metadata.name}' to Kavach Cloud project '${data.project.name}'!`)
      );
      console.log(chalk.gray(`  Cloud Project ID : ${data.project.id}`));
      console.log(
        chalk.gray(
          `  Workspace        : ${data.workspace?.name || 'Default'}${
            data.workspace?.id ? ` (${data.workspace.id})` : ''
          }`
        )
      );
      console.log(
        chalk.gray(`  Matched Remote   : ${data.normalized_remote || metadata.gitRemote || 'local'}`)
      );
      if (metadata.cloudRepositoryUrl) {
        console.log(chalk.gray(`  Repository URL   : ${metadata.cloudRepositoryUrl}`));
      }
      console.log(chalk.gray(`  Git Branch       : ${metadata.gitBranch || 'main'}`));
      return;
    }

    spinner.fail(
      chalk.yellow(
        metadata.gitRemote
          ? `No Kavach Cloud project matched Git remote '${data.normalized_remote || metadata.gitRemote}'.`
          : `No Git remote 'origin' detected in ${rootDir}; could not auto-match a Kavach project.`
      )
    );

    const candidates = Array.isArray(data.candidates) ? data.candidates : [];
    if (candidates.length > 0) {
      console.log('');
      console.log(chalk.bold('  Available Kavach Cloud Projects:'));
      for (const c of candidates) {
        const repoText = c.repository_url ? chalk.cyan(c.repository_url) : chalk.gray('no repository linked');
        console.log(`    • ${chalk.white.bold(c.name)} ${chalk.gray(`(${c.id})`)} — ${repoText}`);
      }
    } else {
      console.log('');
      console.log(chalk.gray('  No existing projects were found in your Kavach workspace.'));
    }

    console.log('');
    console.log(chalk.bold('  Next steps (project was NOT connected):'));
    if (!metadata.gitRemote) {
      console.log(`    1. Add a Git remote (${chalk.cyan('git remote add origin <repo-url>')}) and re-run ${chalk.cyan('kavach connect')}.`);
    } else {
      console.log(`    1. Create a project or link '${chalk.cyan(data.normalized_remote || metadata.gitRemote)}' in the Kavach Dashboard (https://kavachsecurity.me/repositories) or via MCP tools ${chalk.cyan('create_project')} / ${chalk.cyan('connect_repository')}.`);
    }
    if (candidates.length > 0) {
      console.log(`    2. Or connect directly to a project ID above: ${chalk.cyan('kavach connect --project <project-id>')}`);
    }
    process.exitCode = 1;
  } catch (err: any) {
    spinner.fail(chalk.red(`Failed to connect '${metadata.name}' to Kavach Cloud (${serverUrl}): ${err?.message || err}`));
    console.log(
      chalk.gray(
        `Check network connectivity and KAVACH_SERVER_URL / 'kavach config cloudUrl', then run '${chalk.cyan('kavach connect')}' again.`
      )
    );
    process.exitCode = 1;
  }
}
