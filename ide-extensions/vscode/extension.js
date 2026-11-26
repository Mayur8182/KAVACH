'use strict';

const vscode = require('vscode');
const http = require('node:http');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { URL, URLSearchParams } = require('node:url');

const CLIENT_ID = 'kavach-vscode';
const DEFAULT_SERVER_URL = 'https://mcp.kavachsecurity.me';
const SECRET_KEY = 'kavach.oauth.session.v1';

const DESIRED_SCOPES = [
  'openid',
  'profile',
  'email',
  'mcp:read',
  'mcp:write',
  'projects:read',
  'projects:write',
  'scans:read',
  'scans:run',
  'scans:execute',
  'findings:read',
  'remediation:propose',
  'offline_access',
];

const FALLBACK_DEFAULT_SCOPES = [
  'openid',
  'profile',
  'email',
  'projects:read',
  'projects:write',
  'scans:read',
  'scans:run',
  'findings:read',
  'remediation:propose',
  'offline_access',
].join(' ');

function normalizeServerUrl(raw) {
  return String(raw || DEFAULT_SERVER_URL).trim().replace(/\/+$/, '');
}

function getServerUrl() {
  const cfg = vscode.workspace.getConfiguration('kavach');
  return normalizeServerUrl(cfg.get('serverUrl', DEFAULT_SERVER_URL));
}

function getAutoResolveProject() {
  const cfg = vscode.workspace.getConfiguration('kavach');
  return Boolean(cfg.get('autoResolveProject', true));
}

function getDashboardUrl(serverUrl) {
  try {
    const u = new URL(serverUrl);
    if (u.hostname === 'mcp.kavachsecurity.me' || u.hostname === 'api.kavachsecurity.me') {
      return 'https://kavachsecurity.me';
    }
    if ((u.hostname === 'localhost' || u.hostname === '127.0.0.1') && u.port === '8000') {
      return `${u.protocol}//${u.hostname}:3002`;
    }
    return serverUrl;
  } catch {
    return 'https://kavachsecurity.me';
  }
}

function isLoopbackServer(serverUrl) {
  try {
    const u = new URL(serverUrl);
    return u.hostname === '127.0.0.1' || u.hostname === 'localhost' || u.hostname === '::1';
  } catch {
    return false;
  }
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderCallbackPage(title, heading, detail, isError) {
  const accent = isError ? '#DC2626' : '#059669';
  const badge = isError ? 'Authorization Failed' : 'Authorization Complete';
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F8FAFC; color: #0F172A; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
      .card { background: #FFFFFF; border: 1px solid #E2E8F0; padding: 36px; border-radius: 12px; text-align: center; max-width: 440px; box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08); }
      .badge { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: ${accent}; margin-bottom: 8px; }
      h1 { color: #0F172A; font-size: 20px; margin: 0 0 10px 0; }
      p { color: #475569; font-size: 14px; line-height: 1.5; margin: 0; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="badge">${escapeHtml(badge)}</div>
      <h1>${escapeHtml(heading)}</h1>
      <p>${escapeHtml(detail)}</p>
    </div>
  </body>
</html>`;
}

function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  return { codeVerifier, codeChallenge };
}

function decodeJwtClaims(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const raw = Buffer.from(parts[1], 'base64url').toString('utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

async function extractResponseError(response) {
  let raw = '';
  try {
    raw = await response.text();
  } catch {
    return response.statusText || `HTTP ${response.status}`;
  }
  if (!raw) {
    return response.statusText || `HTTP ${response.status}`;
  }
  try {
    const json = JSON.parse(raw);
    return String(json.error_description || json.detail || json.message || json.error || raw);
  } catch {
    return raw;
  }
}

async function discoverOAuthMetadata(serverUrl) {
  const baseUrl = normalizeServerUrl(serverUrl);
  const discoveryUrl = `${baseUrl}/.well-known/oauth-authorization-server`;

  let response;
  try {
    response = await fetch(discoveryUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    throw new Error(
      `Cannot reach Kavach server at ${baseUrl}: ${err && err.message ? err.message : String(err)}`
    );
  }

  if (response.status === 404) {
    return {
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/oauth/authorize`,
      token_endpoint: `${baseUrl}/oauth/token`,
      userinfo_endpoint: `${baseUrl}/oauth/userinfo`,
      revocation_endpoint: `${baseUrl}/oauth/revoke`,
      scopes_supported: null,
    };
  }

  if (!response.ok) {
    const reason = await extractResponseError(response);
    throw new Error(`OAuth metadata discovery failed (${response.status}): ${reason}`);
  }

  const data = await response.json();
  if (!data || typeof data.authorization_endpoint !== 'string' || typeof data.token_endpoint !== 'string') {
    throw new Error(`Invalid OAuth discovery metadata at ${discoveryUrl}.`);
  }

  return {
    issuer: typeof data.issuer === 'string' ? data.issuer : baseUrl,
    authorization_endpoint: data.authorization_endpoint,
    token_endpoint: data.token_endpoint,
    userinfo_endpoint:
      typeof data.userinfo_endpoint === 'string' ? data.userinfo_endpoint : `${baseUrl}/oauth/userinfo`,
    revocation_endpoint:
      typeof data.revocation_endpoint === 'string' ? data.revocation_endpoint : `${baseUrl}/oauth/revoke`,
    scopes_supported: Array.isArray(data.scopes_supported) ? data.scopes_supported.map(String) : null,
  };
}

function resolveScopes(metadata) {
  if (metadata && Array.isArray(metadata.scopes_supported) && metadata.scopes_supported.length > 0) {
    const supported = new Set(metadata.scopes_supported);
    const matched = DESIRED_SCOPES.filter((s) => supported.has(s));
    if (matched.length > 0) {
      return matched.join(' ');
    }
    return metadata.scopes_supported.join(' ');
  }
  return FALLBACK_DEFAULT_SCOPES;
}

async function fetchUserInfo(accessToken, serverUrl, userinfoEndpoint) {
  const endpoint = userinfoEndpoint || `${normalizeServerUrl(serverUrl)}/oauth/userinfo`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    const reason = await extractResponseError(response);
    throw new Error(`UserInfo request failed (HTTP ${response.status}): ${reason}`);
  }
  return response.json();
}

async function loadSession(context) {
  const raw = await context.secrets.get(SECRET_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && parsed.accessToken ? parsed : null;
  } catch {
    return null;
  }
}

async function saveSession(context, session) {
  await context.secrets.store(SECRET_KEY, JSON.stringify(session));
}

async function clearSession(context) {
  await context.secrets.delete(SECRET_KEY);
}

async function refreshSession(context, session, serverUrl, outputChannel) {
  if (!session || !session.refreshToken) {
    throw new Error('No refresh token available. Click "Sign In to Kavach" to re-authenticate.');
  }

  const baseUrl = normalizeServerUrl(serverUrl || session.serverUrl || DEFAULT_SERVER_URL);
  const metadata = await discoverOAuthMetadata(baseUrl);
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: session.refreshToken,
    client_id: session.clientId || CLIENT_ID,
  });

  let response;
  try {
    response = await fetch(metadata.token_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    throw new Error(`Token refresh failed: ${err && err.message ? err.message : String(err)}`);
  }

  if (!response.ok) {
    const reason = await extractResponseError(response);
    if (response.status === 400 || response.status === 401) {
      await clearSession(context);
    }
    throw new Error(`OAuth token refresh rejected (HTTP ${response.status}): ${reason}`);
  }

  const data = await response.json();
  if (!data || typeof data.access_token !== 'string' || !data.access_token) {
    throw new Error('Token refresh response omitted access_token.');
  }

  const accessClaims = decodeJwtClaims(data.access_token);
  const expiresIn = typeof data.expires_in === 'number' && data.expires_in > 0 ? data.expires_in : 3600;

  const updated = {
    ...session,
    accessToken: data.access_token,
    refreshToken: typeof data.refresh_token === 'string' ? data.refresh_token : session.refreshToken,
    idToken: typeof data.id_token === 'string' ? data.id_token : session.idToken,
    scope: typeof data.scope === 'string' ? data.scope : session.scope,
    expiresAt: Date.now() + expiresIn * 1000,
    serverUrl: baseUrl,
    clientId: session.clientId || CLIENT_ID,
    organizationId: data.org_id || (accessClaims && accessClaims.org_id) || session.organizationId,
    workspaceId: data.workspace_id || (accessClaims && accessClaims.workspace_id) || session.workspaceId,
    projectId:
      data.project_id ||
      (accessClaims && (accessClaims.project_id || accessClaims.projectId)) ||
      session.projectId,
    projectName: data.project_name || session.projectName,
    authenticatedAt: new Date().toISOString(),
  };

  await saveSession(context, updated);
  if (outputChannel) {
    outputChannel.appendLine(`[auth] Refreshed OAuth 2.1 access token for ${updated.user?.email || 'user'}.`);
  }
  return updated;
}

async function promptSignIn(message) {
  const choice = await vscode.window.showErrorMessage(message, 'Sign In to Kavach');
  if (choice === 'Sign In to Kavach') {
    await vscode.commands.executeCommand('kavach.signIn');
  }
}

async function getValidSession(context, outputChannel, options = {}) {
  const { interactivePrompt = true } = options;
  const serverUrl = getServerUrl();
  const session = await loadSession(context);

  if (!session) {
    if (interactivePrompt) {
      await promptSignIn('Kavach: Not signed in. Please sign in with OAuth 2.1 to continue.');
    }
    return null;
  }

  if (session.serverUrl && normalizeServerUrl(session.serverUrl) !== serverUrl) {
    if (interactivePrompt) {
      await promptSignIn(
        `Kavach server URL changed to ${serverUrl}. Please sign in again to authorize this server.`
      );
    }
    return null;
  }

  const expiresSoon = !session.expiresAt || Date.now() >= session.expiresAt - 60000;
  if (expiresSoon) {
    if (!session.refreshToken) {
      await clearSession(context);
      if (interactivePrompt) {
        await promptSignIn('Kavach: Your OAuth session has expired. Please sign in again.');
      }
      return null;
    }
    try {
      return await refreshSession(context, session, serverUrl, outputChannel);
    } catch (err) {
      if (outputChannel) {
        outputChannel.appendLine(`[auth] Refresh failed: ${err.message}`);
      }
      if (interactivePrompt) {
        await promptSignIn(`Kavach: Session expired (${err.message}).`);
      }
      return null;
    }
  }

  return session;
}

async function fetchWithAuthRetry(context, outputChannel, url, initFactory) {
  let session = await getValidSession(context, outputChannel, { interactivePrompt: true });
  if (!session) {
    throw new Error('Authentication required. Run "Kavach: Sign In with OAuth 2.1".');
  }

  let response;
  try {
    response = await fetch(url, {
      ...initFactory(session.accessToken),
      signal: AbortSignal.timeout(20000),
    });
  } catch (err) {
    throw new Error(`Network error calling ${url}: ${err && err.message ? err.message : String(err)}`);
  }

  if (response.status === 401 && session.refreshToken) {
    session = await refreshSession(context, session, getServerUrl(), outputChannel);
    response = await fetch(url, {
      ...initFactory(session.accessToken),
      signal: AbortSignal.timeout(20000),
    });
  }

  return { response, session };
}

function parseSseJson(text) {
  const lines = text.split(/\r?\n/);
  const dataLines = [];
  for (const line of lines) {
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }
  if (dataLines.length === 0) return null;
  const joined = dataLines.join('\n').trim();
  return JSON.parse(joined);
}

async function callMcpTool(context, outputChannel, state, toolName, args) {
  const serverUrl = getServerUrl();
  const mcpUrl = `${serverUrl}/mcp`;
  const requestId = Date.now();

  const { response } = await fetchWithAuthRetry(context, outputChannel, mcpUrl, (token) => {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      Authorization: `Bearer ${token}`,
    };
    if (state.mcpSessionId) {
      headers['Mcp-Session-Id'] = state.mcpSessionId;
    }
    return {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: requestId,
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args || {},
        },
      }),
    };
  });

  const respSessionId = response.headers.get('mcp-session-id');
  if (respSessionId) {
    state.mcpSessionId = respSessionId;
  }

  if (!response.ok) {
    const reason = await extractResponseError(response);
    throw new Error(`MCP call '${toolName}' failed (HTTP ${response.status}): ${reason}`);
  }

  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  const rawBody = await response.text();
  const rpcPayload = contentType.includes('text/event-stream')
    ? parseSseJson(rawBody)
    : JSON.parse(rawBody);

  if (!rpcPayload) {
    throw new Error(`Empty MCP response for tool '${toolName}'.`);
  }

  if (rpcPayload.error) {
    throw new Error(rpcPayload.error.message || `MCP RPC error (${rpcPayload.error.code})`);
  }

  const result = rpcPayload.result || {};
  const firstText = Array.isArray(result.content)
    ? (result.content.find((c) => c && c.type === 'text') || {}).text
    : null;

  let parsed = null;
  if (typeof firstText === 'string') {
    try {
      parsed = JSON.parse(firstText);
    } catch {
      parsed = { message: firstText };
    }
  }

  return {
    raw: result,
    parsed,
    text: firstText,
    isError: Boolean(result.isError),
  };
}

function getTargetWorkspaceFolder() {
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor && activeEditor.document) {
    const folder = vscode.workspace.getWorkspaceFolder(activeEditor.document.uri);
    if (folder) return folder;
  }
  const folders = vscode.workspace.workspaceFolders;
  return folders && folders.length > 0 ? folders[0] : null;
}

function parseGitConfigOriginUrl(startDir) {
  let current = path.resolve(startDir);
  const root = path.parse(current).root;

  while (true) {
    const gitConfigPath = path.join(current, '.git', 'config');
    if (fs.existsSync(gitConfigPath)) {
      try {
        const content = fs.readFileSync(gitConfigPath, 'utf8');
        const lines = content.split(/\r?\n/);
        let inOriginSection = false;
        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (line.startsWith('[')) {
            inOriginSection = /^\[remote\s+"origin"\]$/i.test(line);
            continue;
          }
          if (inOriginSection) {
            const match = /^url\s*=\s*(.+)$/i.exec(line);
            if (match && match[1]) {
              return match[1].trim();
            }
          }
        }
      } catch {}
    }

    if (current === root) break;
    current = path.dirname(current);
  }
  return null;
}

async function getWorkspaceGitRemote(workspacePath) {
  if (!workspacePath) return null;

  const execUrl = await new Promise((resolve) => {
    cp.execFile(
      'git',
      ['remote', 'get-url', 'origin'],
      { cwd: workspacePath, timeout: 5000 },
      (err, stdout) => {
        if (!err && stdout && stdout.trim()) {
          resolve(stdout.trim());
        } else {
          resolve(null);
        }
      }
    );
  });

  if (execUrl) return execUrl;
  return parseGitConfigOriginUrl(workspacePath);
}

async function resolveProjectByRemote(context, outputChannel, gitRemote) {
  const serverUrl = getServerUrl();
  const { response } = await fetchWithAuthRetry(
    context,
    outputChannel,
    `${serverUrl}/api/v1/mcp/resolve-project`,
    (token) => ({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        git_remote: gitRemote || '',
        client_id: CLIENT_ID,
      }),
    })
  );

  if (!response.ok) {
    const reason = await extractResponseError(response);
    throw new Error(`Project resolution failed (HTTP ${response.status}): ${reason}`);
  }

  return response.json();
}

async function updateClientPreferences(context, outputChannel, projectId) {
  const serverUrl = getServerUrl();
  const { response } = await fetchWithAuthRetry(
    context,
    outputChannel,
    `${serverUrl}/api/v1/oauth/preferences`,
    (token) => ({
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_project_id: projectId,
      }),
    })
  );

  if (!response.ok) {
    const reason = await extractResponseError(response);
    throw new Error(`Failed to update client project preference (HTTP ${response.status}): ${reason}`);
  }

  return response.json();
}

async function setActiveProject(context, outputChannel, state, project, gitRemote) {
  const mcpRes = await callMcpTool(context, outputChannel, state, 'set_active_project', {
    project_id: project.id,
    ...(gitRemote ? { git_remote: gitRemote } : {}),
  });

  if (mcpRes.isError || (mcpRes.parsed && mcpRes.parsed.status !== 'SUCCESS')) {
    const msg = (mcpRes.parsed && mcpRes.parsed.message) || mcpRes.text || 'Failed to set active project.';
    throw new Error(msg);
  }

  try {
    await updateClientPreferences(context, outputChannel, project.id);
  } catch (prefErr) {
    outputChannel.appendLine(`[project] Preference sync note: ${prefErr.message}`);
  }

  const active = (mcpRes.parsed && mcpRes.parsed.data && mcpRes.parsed.data.active_project) || project;
  state.activeProject = {
    id: active.id,
    name: active.name,
    repository_url: active.repository_url || project.repository_url || null,
    workspace_id: active.workspace_id || project.workspace_id || null,
  };

  const session = await loadSession(context);
  if (session) {
    session.projectId = state.activeProject.id;
    session.projectName = state.activeProject.name;
    if (state.activeProject.workspace_id) {
      session.workspaceId = state.activeProject.workspace_id;
    }
    await saveSession(context, session);
  }

  return state.activeProject;
}

function updateStatusBar(statusBarItem, session, activeProject) {
  if (!session) {
    statusBarItem.text = '$(shield) Kavach: Sign In';
    statusBarItem.tooltip = 'Not signed in to Kavach. Click to sign in with OAuth 2.1.';
    statusBarItem.command = 'kavach.signIn';
  } else if (activeProject && activeProject.name) {
    statusBarItem.text = `$(shield) Kavach: ${activeProject.name}`;
    statusBarItem.tooltip = [
      `Kavach Security (${(session.user && session.user.email) || 'Authenticated'})`,
      `Active Project: ${activeProject.name}`,
      activeProject.repository_url ? `Repository: ${activeProject.repository_url}` : null,
      'Click to switch active project',
    ]
      .filter(Boolean)
      .join('\n');
    statusBarItem.command = 'kavach.switchProject';
  } else {
    statusBarItem.text = '$(shield) Kavach: Connect Project';
    statusBarItem.tooltip = `Signed in as ${(session.user && session.user.email) || 'Authenticated'}. Click to connect or select a Kavach project.`;
    statusBarItem.command = 'kavach.connectProject';
  }
  statusBarItem.show();
}

async function autoResolveWorkspace(context, outputChannel, statusBarItem, state) {
  const session = await getValidSession(context, outputChannel, { interactivePrompt: false });
  if (!session) {
    state.activeProject = null;
    updateStatusBar(statusBarItem, null, null);
    return null;
  }

  const folder = getTargetWorkspaceFolder();
  const gitRemote = folder ? await getWorkspaceGitRemote(folder.uri.fsPath) : null;

  if (gitRemote) {
    try {
      const resolved = await resolveProjectByRemote(context, outputChannel, gitRemote);
      if (resolved.matched && resolved.project && resolved.project.id) {
        state.activeProject = resolved.project;
        session.projectId = resolved.project.id;
        session.projectName = resolved.project.name;
        if (resolved.workspace && resolved.workspace.id) {
          session.workspaceId = resolved.workspace.id;
        }
        await saveSession(context, session);
        updateStatusBar(statusBarItem, session, state.activeProject);
        outputChannel.appendLine(
          `[resolve] Matched workspace remote '${resolved.normalized_remote || gitRemote}' -> project '${resolved.project.name}' (${resolved.project.id}).`
        );
        return { matched: true, gitRemote, resolved };
      }
      outputChannel.appendLine(
        `[resolve] Remote '${resolved.normalized_remote || gitRemote}' did not match an existing Kavach project.`
      );
    } catch (err) {
      outputChannel.appendLine(`[resolve] Auto-resolve error: ${err.message}`);
    }
  }

  try {
    const activeRes = await callMcpTool(context, outputChannel, state, 'get_active_project', {
      ...(gitRemote ? { git_remote: gitRemote } : {}),
    });
    const ap =
      activeRes &&
      activeRes.parsed &&
      activeRes.parsed.data &&
      activeRes.parsed.data.active_project;
    if (ap && ap.id) {
      state.activeProject = ap;
      updateStatusBar(statusBarItem, session, state.activeProject);
      return { matched: false, gitRemote, activeFallback: ap };
    }
  } catch (err) {
    outputChannel.appendLine(`[resolve] get_active_project check note: ${err.message}`);
  }

  state.activeProject = session.projectId
    ? { id: session.projectId, name: session.projectName || session.projectId }
    : null;
  updateStatusBar(statusBarItem, session, state.activeProject);
  return { matched: false, gitRemote };
}

async function performInteractiveSignIn(context, outputChannel, statusBarItem, state) {
  const serverUrl = getServerUrl();
  outputChannel.show(true);
  outputChannel.appendLine(`[auth] Starting OAuth 2.1 + PKCE (S256) flow against ${serverUrl} (client_id=${CLIENT_ID})...`);

  const metadata = await discoverOAuthMetadata(serverUrl);
  const scope = resolveScopes(metadata);
  const { codeVerifier, codeChallenge } = generatePKCE();
  const stateToken = crypto.randomBytes(16).toString('hex');
  const resource = `${serverUrl}/mcp`;

  const session = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Kavach: Waiting for OAuth 2.1 browser authorization...',
      cancellable: true,
    },
    (progress, cancellationToken) =>
      new Promise((resolve, reject) => {
        const server = http.createServer();
        let settled = false;

        const finish = (err, result) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutHandle);
          try {
            server.close();
          } catch {}
          if (err) reject(err);
          else resolve(result);
        };

        const timeoutHandle = setTimeout(() => {
          finish(new Error('OAuth 2.1 sign-in timed out after 180 seconds.'));
        }, 180000);

        cancellationToken.onCancellationRequested(() => {
          finish(new Error('Sign-in cancelled by user.'));
        });

        server.on('error', (err) => {
          finish(new Error(`Failed to start local OAuth callback server: ${err.message}`));
        });

        server.on('request', async (req, res) => {
          try {
            const reqUrl = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
            if (reqUrl.pathname !== '/callback') {
              res.writeHead(404, { 'Content-Type': 'text/plain' });
              res.end('Not Found');
              return;
            }

            const code = reqUrl.searchParams.get('code');
            const returnedState = reqUrl.searchParams.get('state');
            const error = reqUrl.searchParams.get('error');
            const errorDescription = reqUrl.searchParams.get('error_description');

            if (error) {
              const msg = errorDescription ? `${error}: ${errorDescription}` : error;
              res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(renderCallbackPage('Kavach — Authorization Failed', 'Authorization Rejected', msg, true));
              return finish(new Error(`OAuth error: ${msg}`));
            }

            if (returnedState !== stateToken) {
              res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(
                renderCallbackPage(
                  'Kavach — State Mismatch',
                  'Security Check Failed',
                  'OAuth state mismatch. Please retry sign-in from your editor.',
                  true
                )
              );
              return finish(new Error('OAuth state mismatch during callback.'));
            }

            if (!code) {
              res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(
                renderCallbackPage(
                  'Kavach — Missing Code',
                  'Missing Authorization Code',
                  'No authorization code was provided.',
                  true
                )
              );
              return finish(new Error('Missing authorization code in callback.'));
            }

            progress.report({ message: 'Exchanging authorization code for OAuth 2.1 tokens...' });

            const addr = server.address();
            const port = typeof addr === 'object' && addr ? addr.port : 0;
            const redirectUri = `http://127.0.0.1:${port}/callback`;

            const tokenBody = new URLSearchParams({
              grant_type: 'authorization_code',
              code,
              redirect_uri: redirectUri,
              client_id: CLIENT_ID,
              code_verifier: codeVerifier,
              resource,
            });

            let tokenRes;
            try {
              tokenRes = await fetch(metadata.token_endpoint, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  Accept: 'application/json',
                },
                body: tokenBody.toString(),
                signal: AbortSignal.timeout(15000),
              });
            } catch (netErr) {
              const msg = `Token exchange network error: ${netErr.message}`;
              res.writeHead(502, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(renderCallbackPage('Kavach — Token Exchange Failed', 'Token Exchange Failed', msg, true));
              return finish(new Error(msg));
            }

            if (!tokenRes.ok) {
              const reason = await extractResponseError(tokenRes);
              const msg = `Token exchange failed (HTTP ${tokenRes.status}): ${reason}`;
              res.writeHead(502, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(renderCallbackPage('Kavach — Token Exchange Failed', 'Token Exchange Failed', msg, true));
              return finish(new Error(msg));
            }

            const tokenData = await tokenRes.json();
            if (!tokenData || !tokenData.access_token) {
              const msg = 'Token endpoint response did not include an access_token.';
              res.writeHead(502, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(renderCallbackPage('Kavach — Invalid Token Response', 'Token Exchange Failed', msg, true));
              return finish(new Error(msg));
            }

            const idClaims = decodeJwtClaims(tokenData.id_token);
            const accessClaims = decodeJwtClaims(tokenData.access_token);
            let userInfo = null;
            if (!idClaims || !idClaims.email || !idClaims.sub) {
              try {
                userInfo = await fetchUserInfo(
                  tokenData.access_token,
                  serverUrl,
                  metadata.userinfo_endpoint
                );
              } catch (uiErr) {
                outputChannel.appendLine(`[auth] UserInfo lookup note: ${uiErr.message}`);
              }
            }

            const expiresIn =
              typeof tokenData.expires_in === 'number' && tokenData.expires_in > 0
                ? tokenData.expires_in
                : 3600;
            const userId = String(
              (userInfo && userInfo.sub) ||
                (idClaims && idClaims.sub) ||
                (accessClaims && accessClaims.sub) ||
                ''
            );
            const userEmail = String(
              (userInfo && (userInfo.email || userInfo.preferred_username)) ||
                (idClaims && idClaims.email) ||
                userId
            );
            const userName = (userInfo && userInfo.name) || (idClaims && idClaims.name) || undefined;

            const newSession = {
              accessToken: tokenData.access_token,
              refreshToken: tokenData.refresh_token || undefined,
              idToken: tokenData.id_token || undefined,
              tokenType: tokenData.token_type || 'Bearer',
              scope: tokenData.scope || scope,
              expiresAt: Date.now() + expiresIn * 1000,
              serverUrl,
              clientId: CLIENT_ID,
              organizationId:
                tokenData.org_id ||
                (userInfo && userInfo.org_id) ||
                (idClaims && idClaims.org_id) ||
                (accessClaims && accessClaims.org_id) ||
                undefined,
              workspaceId:
                tokenData.workspace_id ||
                (idClaims && idClaims.workspace_id) ||
                (accessClaims && accessClaims.workspace_id) ||
                undefined,
              projectId:
                tokenData.project_id ||
                (userInfo && userInfo.project_id) ||
                (idClaims && idClaims.project_id) ||
                (accessClaims && (accessClaims.project_id || accessClaims.projectId)) ||
                undefined,
              projectName: tokenData.project_name || (userInfo && userInfo.project_name) || undefined,
              user: {
                id: userId,
                email: userEmail,
                name: userName,
              },
              authenticatedAt: new Date().toISOString(),
            };

            await saveSession(context, newSession);

            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(
              renderCallbackPage(
                'Kavach — Signed In',
                'Connected to Kavach Security',
                `Signed in as ${userEmail}. You may close this window and return to your IDE.`,
                false
              )
            );
            finish(null, newSession);
          } catch (handlerErr) {
            finish(handlerErr instanceof Error ? handlerErr : new Error(String(handlerErr)));
          }
        });

        server.listen(0, '127.0.0.1', async () => {
          const addr = server.address();
          const port = typeof addr === 'object' && addr ? addr.port : 0;
          const redirectUri = `http://127.0.0.1:${port}/callback`;

          const authUrl = new URL(metadata.authorization_endpoint);
          authUrl.searchParams.set('response_type', 'code');
          authUrl.searchParams.set('client_id', CLIENT_ID);
          authUrl.searchParams.set('redirect_uri', redirectUri);
          authUrl.searchParams.set('code_challenge', codeChallenge);
          authUrl.searchParams.set('code_challenge_method', 'S256');
          authUrl.searchParams.set('state', stateToken);
          authUrl.searchParams.set('scope', scope);
          authUrl.searchParams.set('resource', resource);

          const authUrlStr = authUrl.toString();
          outputChannel.appendLine(`[auth] Opening browser for authorization: ${authUrlStr}`);
          const opened = await vscode.env.openExternal(vscode.Uri.parse(authUrlStr));
          if (!opened) {
            outputChannel.appendLine(
              `[auth] Browser did not open automatically. Visit this URL manually:\n${authUrlStr}`
            );
          }
        });
      })
  );

  outputChannel.appendLine(`[auth] Authenticated as ${session.user.email} (${session.user.id}).`);

  let resolveResult = null;
  if (getAutoResolveProject()) {
    resolveResult = await autoResolveWorkspace(context, outputChannel, statusBarItem, state);
  } else {
    state.activeProject = session.projectId
      ? { id: session.projectId, name: session.projectName || session.projectId }
      : null;
    updateStatusBar(statusBarItem, session, state.activeProject);
  }

  if (resolveResult && resolveResult.matched && state.activeProject) {
    vscode.window.showInformationMessage(
      `Kavach: Signed in as ${session.user.email} and matched project '${state.activeProject.name}'.`
    );
  } else if (state.activeProject) {
    const action = await vscode.window.showInformationMessage(
      `Kavach: Signed in as ${session.user.email} (Active project: ${state.activeProject.name}).`,
      'Connect / Auto-Detect Repository'
    );
    if (action === 'Connect / Auto-Detect Repository') {
      await vscode.commands.executeCommand('kavach.connectProject');
    }
  } else {
    const action = await vscode.window.showInformationMessage(
      `Kavach: Signed in as ${session.user.email}.`,
      'Connect Repository'
    );
    if (action === 'Connect Repository') {
      await vscode.commands.executeCommand('kavach.connectProject');
    }
  }
}

async function fetchProjectsViaMcp(context, outputChannel, state) {
  const mcpRes = await callMcpTool(context, outputChannel, state, 'list_projects', {
    limit: 100,
    offset: 0,
  });
  if (mcpRes.isError || (mcpRes.parsed && mcpRes.parsed.status !== 'SUCCESS')) {
    const msg = (mcpRes.parsed && mcpRes.parsed.message) || mcpRes.text || 'Could not list projects.';
    throw new Error(msg);
  }
  return (mcpRes.parsed && mcpRes.parsed.data && mcpRes.parsed.data.projects) || [];
}

async function createProjectInteractive(context, outputChannel, statusBarItem, state, gitRemote, defaultName) {
  const name = await vscode.window.showInputBox({
    title: 'Create Kavach Cloud Project',
    prompt: 'Enter a name for the new Kavach project',
    value: defaultName || '',
    ignoreFocusOut: true,
    validateInput: (val) => (!val || !val.trim() ? 'Project name is required.' : null),
  });
  if (!name) return null;

  const res = await callMcpTool(context, outputChannel, state, 'create_project', {
    name: name.trim(),
    ...(gitRemote ? { repository_url: gitRemote } : {}),
    environment: 'production',
    set_as_default: false,
  });

  if (res.isError || (res.parsed && res.parsed.status !== 'SUCCESS')) {
    const msg = (res.parsed && res.parsed.message) || res.text || 'Failed to create project.';
    throw new Error(msg);
  }

  const created = res.parsed && res.parsed.data && res.parsed.data.project;
  if (!created || !created.id) {
    throw new Error('Server did not return created project details.');
  }

  await updateClientPreferences(context, outputChannel, created.id).catch(() => {});
  state.activeProject = created;
  const session = await loadSession(context);
  if (session) {
    session.projectId = created.id;
    session.projectName = created.name;
    if (created.workspace_id) session.workspaceId = created.workspace_id;
    await saveSession(context, session);
  }
  updateStatusBar(statusBarItem, session, state.activeProject);
  outputChannel.appendLine(`[project] Created and activated Kavach project '${created.name}' (${created.id}).`);
  vscode.window.showInformationMessage(`Kavach: Created and connected project '${created.name}'.`);
  return created;
}

async function connectProjectCommand(context, outputChannel, statusBarItem, state) {
  const session = await getValidSession(context, outputChannel, { interactivePrompt: true });
  if (!session) return;

  const folder = getTargetWorkspaceFolder();
  const workspacePath = folder ? folder.uri.fsPath : null;
  const folderName = folder ? path.basename(workspacePath) : '';
  const gitRemote = workspacePath ? await getWorkspaceGitRemote(workspacePath) : null;

  outputChannel.show(true);

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: gitRemote
        ? `Kavach: Matching Git remote against Kavach Cloud...`
        : `Kavach: Loading authorized Kavach projects...`,
      cancellable: false,
    },
    async () => {
      let candidates = [];
      let normalizedRemote = null;

      if (gitRemote) {
        outputChannel.appendLine(`[connect] Detected local Git remote: ${gitRemote}`);
        const resolved = await resolveProjectByRemote(context, outputChannel, gitRemote);
        normalizedRemote = resolved.normalized_remote || gitRemote;

        if (resolved.matched && resolved.project && resolved.project.id) {
          try {
            await updateClientPreferences(context, outputChannel, resolved.project.id);
          } catch (prefErr) {
            outputChannel.appendLine(`[connect] Preference sync note: ${prefErr.message}`);
          }

          state.activeProject = resolved.project;
          const latestSession = (await loadSession(context)) || session;
          latestSession.projectId = resolved.project.id;
          latestSession.projectName = resolved.project.name;
          if (resolved.workspace && resolved.workspace.id) {
            latestSession.workspaceId = resolved.workspace.id;
          }
          await saveSession(context, latestSession);
          updateStatusBar(statusBarItem, latestSession, state.activeProject);

          outputChannel.appendLine(
            `[connect] Matched '${normalizedRemote}' -> Project '${resolved.project.name}' (${resolved.project.id}), Workspace '${(resolved.workspace && resolved.workspace.name) || 'Default'}'.`
          );
          vscode.window.showInformationMessage(
            `Kavach: Connected to '${resolved.project.name}' (${normalizedRemote}).`
          );
          return;
        }

        candidates = Array.isArray(resolved.candidates) ? resolved.candidates : [];
        outputChannel.appendLine(
          `[connect] No Kavach project matched remote '${normalizedRemote}'.`
        );
      } else {
        outputChannel.appendLine(
          '[connect] No Git remote origin detected in active workspace. Fetching cloud projects...'
        );
        candidates = await fetchProjectsViaMcp(context, outputChannel, state);
      }

      if (candidates.length === 0) {
        try {
          candidates = await fetchProjectsViaMcp(context, outputChannel, state);
        } catch {}
      }

      const items = candidates.map((p) => ({
        label: p.name,
        description: p.repository_url || p.environment || 'No repository linked',
        detail: `Project ID: ${p.id}`,
        action: 'select',
        project: p,
      }));

      items.push({
        label: '$(add) Create New Kavach Project for This Repository',
        description: gitRemote || folderName || 'Create inside your authorized workspace',
        detail: 'Creates a real project via MCP create_project and sets it active.',
        action: 'create',
      });

      items.push({
        label: '$(link-external) Open Kavach Dashboard to Connect GitHub Repository',
        description: `${getDashboardUrl(getServerUrl())}/repositories`,
        detail: 'Connect or import a GitHub repository in the web console.',
        action: 'dashboard',
      });

      const picked = await vscode.window.showQuickPick(items, {
        title: normalizedRemote
          ? `No Kavach project matched '${normalizedRemote}'`
          : 'Select or Create Kavach Project',
        placeHolder: 'Choose an existing project to connect, create a new project, or open the dashboard',
        ignoreFocusOut: true,
      });

      if (!picked) return;

      if (picked.action === 'dashboard') {
        const dashUrl = `${getDashboardUrl(getServerUrl())}/repositories`;
        await vscode.env.openExternal(vscode.Uri.parse(dashUrl));
        return;
      }

      if (picked.action === 'create') {
        await createProjectInteractive(context, outputChannel, statusBarItem, state, gitRemote, folderName);
        return;
      }

      const active = await setActiveProject(context, outputChannel, state, picked.project, gitRemote);
      const latestSession = (await loadSession(context)) || session;
      updateStatusBar(statusBarItem, latestSession, active);

      if (gitRemote) {
        const bindChoice = await vscode.window.showInformationMessage(
          `Kavach: Active project set to '${active.name}'. Link repository '${gitRemote}' to this project?`,
          'Link Repository',
          'Keep Active Only'
        );
        if (bindChoice === 'Link Repository') {
          const linkRes = await callMcpTool(context, outputChannel, state, 'connect_repository', {
            project_id: active.id,
            repository: gitRemote,
          });
          if (linkRes.isError || (linkRes.parsed && linkRes.parsed.status !== 'SUCCESS')) {
            const msg = (linkRes.parsed && linkRes.parsed.message) || linkRes.text || 'Failed to link repository.';
            vscode.window.showWarningMessage(`Kavach: Active project switched, but linking repo failed: ${msg}`);
          } else {
            outputChannel.appendLine(`[connect] Linked repository '${gitRemote}' to project '${active.name}'.`);
            vscode.window.showInformationMessage(
              `Kavach: Linked '${gitRemote}' to project '${active.name}'.`
            );
          }
          return;
        }
      }

      vscode.window.showInformationMessage(`Kavach: Active project set to '${active.name}'.`);
    }
  );
}

async function switchProjectCommand(context, outputChannel, statusBarItem, state) {
  const session = await getValidSession(context, outputChannel, { interactivePrompt: true });
  if (!session) return;

  const projects = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Kavach: Loading authorized projects...',
      cancellable: false,
    },
    () => fetchProjectsViaMcp(context, outputChannel, state)
  );

  if (!projects || projects.length === 0) {
    const choice = await vscode.window.showInformationMessage(
      'Kavach: No projects found in your workspace.',
      'Connect / Create Project'
    );
    if (choice === 'Connect / Create Project') {
      await vscode.commands.executeCommand('kavach.connectProject');
    }
    return;
  }

  const items = projects.map((p) => {
    const isCurrent =
      (state.activeProject && state.activeProject.id === p.id) || p.is_active;
    return {
      label: isCurrent ? `$(check) ${p.name}` : p.name,
      description: p.repository_url || p.repository || p.environment || '',
      detail: `ID: ${p.id}${p.is_default ? ' · Default' : ''}`,
      project: p,
    };
  });

  const picked = await vscode.window.showQuickPick(items, {
    title: 'Kavach: Switch Active Project',
    placeHolder: 'Select the Kavach project for this editor',
    ignoreFocusOut: true,
  });

  if (!picked) return;

  const folder = getTargetWorkspaceFolder();
  const gitRemote = folder ? await getWorkspaceGitRemote(folder.uri.fsPath) : null;
  const active = await setActiveProject(context, outputChannel, state, picked.project, gitRemote);
  const latestSession = (await loadSession(context)) || session;
  updateStatusBar(statusBarItem, latestSession, active);

  outputChannel.appendLine(`[project] Switched active project to '${active.name}' (${active.id}).`);
  vscode.window.showInformationMessage(`Kavach: Active project switched to '${active.name}'.`);
}

async function configureMcpCommand(outputChannel) {
  const folder = getTargetWorkspaceFolder();
  if (!folder) {
    vscode.window.showErrorMessage('Kavach: Open a workspace folder first to write .vscode/mcp.json.');
    return;
  }

  const serverUrl = getServerUrl();
  const mcpEndpoint = `${serverUrl}/mcp`;
  const vscodeDir = path.join(folder.uri.fsPath, '.vscode');
  const mcpFilePath = path.join(vscodeDir, 'mcp.json');

  let existing = {};
  if (fs.existsSync(mcpFilePath)) {
    const raw = fs.readFileSync(mcpFilePath, 'utf8').trim();
    if (raw) {
      try {
        existing = JSON.parse(raw);
      } catch (parseErr) {
        vscode.window.showErrorMessage(
          `Kavach: Existing .vscode/mcp.json contains invalid JSON (${parseErr.message}). Fix it manually before updating.`
        );
        return;
      }
    }
  }

  const nextConfig = {
    ...(existing && typeof existing === 'object' ? existing : {}),
    servers: {
      ...(existing && existing.servers && typeof existing.servers === 'object' ? existing.servers : {}),
      kavach: {
        type: 'http',
        url: mcpEndpoint,
      },
    },
  };

  fs.mkdirSync(vscodeDir, { recursive: true });
  fs.writeFileSync(mcpFilePath, JSON.stringify(nextConfig, null, 2) + '\n', 'utf8');

  outputChannel.appendLine(`[mcp] Configured Kavach MCP server in ${mcpFilePath} -> ${mcpEndpoint}`);
  const action = await vscode.window.showInformationMessage(
    `Kavach: Configured MCP server (${mcpEndpoint}) in .vscode/mcp.json.`,
    'Open .vscode/mcp.json'
  );
  if (action === 'Open .vscode/mcp.json') {
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(mcpFilePath));
    await vscode.window.showTextDocument(doc);
  }
}

function populateDiagnosticsFromFindings(diagnosticCollection, workspacePath, findings) {
  diagnosticCollection.clear();
  if (!workspacePath || !Array.isArray(findings) || findings.length === 0) return;

  const grouped = new Map();
  for (const f of findings) {
    if (!f || !f.file_path) continue;
    const candidatePath = path.isAbsolute(f.file_path)
      ? f.file_path
      : path.resolve(workspacePath, f.file_path);
    if (!fs.existsSync(candidatePath)) continue;

    const lineIdx = Math.max(0, (Number(f.line_number) || 1) - 1);
    const range = new vscode.Range(lineIdx, 0, lineIdx, 200);
    const sevRaw = String(f.severity || '').toUpperCase();
    const severity =
      sevRaw === 'CRITICAL' || sevRaw === 'HIGH'
        ? vscode.DiagnosticSeverity.Error
        : sevRaw === 'MEDIUM'
          ? vscode.DiagnosticSeverity.Warning
          : vscode.DiagnosticSeverity.Information;
    const diag = new vscode.Diagnostic(
      range,
      `[Kavach/${f.scanner || 'scanner'}] ${f.title || f.rule_id || 'Security finding'}${f.rule_id ? ` (${f.rule_id})` : ''}`,
      severity
    );
    diag.source = 'Kavach Security';
    if (!grouped.has(candidatePath)) grouped.set(candidatePath, []);
    grouped.get(candidatePath).push(diag);
  }

  for (const [filePath, diags] of grouped.entries()) {
    diagnosticCollection.set(vscode.Uri.file(filePath), diags);
  }
}

async function scanWorkspaceCommand(context, outputChannel, statusBarItem, state, diagnosticCollection) {
  const session = await getValidSession(context, outputChannel, { interactivePrompt: true });
  if (!session) return;

  const folder = getTargetWorkspaceFolder();
  if (!folder) {
    vscode.window.showErrorMessage('Kavach: Open a workspace folder before running a security scan.');
    return;
  }

  const workspacePath = folder.uri.fsPath;
  const serverUrl = getServerUrl();
  outputChannel.show(true);

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Kavach: Running security scan via MCP Gateway...',
      cancellable: false,
    },
    async (progress) => {
      let projectId = state.activeProject && state.activeProject.id ? state.activeProject.id : null;
      let projectName = state.activeProject && state.activeProject.name ? state.activeProject.name : null;

      if (!projectId) {
        progress.report({ message: 'Resolving active Kavach project...' });
        const gitRemote = await getWorkspaceGitRemote(workspacePath);
        const activeRes = await callMcpTool(context, outputChannel, state, 'get_active_project', {
          ...(gitRemote ? { git_remote: gitRemote } : {}),
        });
        const ap =
          activeRes.parsed &&
          activeRes.parsed.data &&
          activeRes.parsed.data.active_project;
        if (ap && ap.id) {
          projectId = ap.id;
          projectName = ap.name;
          state.activeProject = ap;
          updateStatusBar(statusBarItem, session, state.activeProject);
        } else {
          const msg =
            (activeRes.parsed && activeRes.parsed.message) ||
            'No active Kavach project is selected for this workspace.';
          outputChannel.appendLine(`[scan] Aborted: ${msg}`);
          const choice = await vscode.window.showWarningMessage(
            `Kavach: ${msg}`,
            'Connect Repository',
            'Switch Project'
          );
          if (choice === 'Connect Repository') {
            await vscode.commands.executeCommand('kavach.connectProject');
          } else if (choice === 'Switch Project') {
            await vscode.commands.executeCommand('kavach.switchProject');
          }
          return;
        }
      }

      const scanArgs = { project_id: projectId };
      if (isLoopbackServer(serverUrl)) {
        scanArgs.target_path = workspacePath;
      }

      outputChannel.appendLine('============================================================');
      outputChannel.appendLine(`[scan] Starting MCP run_security_scan for project '${projectName || projectId}' (${projectId})`);
      outputChannel.appendLine(`[scan] Gateway: ${serverUrl}/mcp`);
      progress.report({ message: `Executing scanners for ${projectName || projectId}...` });

      const scanRes = await callMcpTool(context, outputChannel, state, 'run_security_scan', scanArgs);
      const parsed = scanRes.parsed || {};
      const data = parsed.data || {};

      if (scanRes.isError || parsed.status === 'FAILED' || parsed.status === 'DENIED') {
        const errMsg = parsed.message || scanRes.text || 'Security scan failed.';
        outputChannel.appendLine(`[scan] FAILED (${parsed.error_code || 'ERROR'}): ${errMsg}`);
        vscode.window.showErrorMessage(`Kavach Scan Failed: ${errMsg}`);
        return;
      }

      if (parsed.status === 'REQUIRES_APPROVAL') {
        outputChannel.appendLine(`[scan] REQUIRES APPROVAL: ${parsed.message}`);
        vscode.window.showWarningMessage(`Kavach Scan requires approval: ${parsed.message}`);
        return;
      }

      const scanId = data.scan_id || parsed.result_reference;
      const scanStatus = data.status || parsed.status || 'UNKNOWN';
      const findingCount = typeof data.finding_count === 'number' ? data.finding_count : 0;
      const durationSec = typeof data.duration_seconds === 'number' ? data.duration_seconds : null;
      const scanners = Array.isArray(data.scanners_executed) ? data.scanners_executed.join(', ') : 'default';

      outputChannel.appendLine(`[scan] Scan ID          : ${scanId || 'N/A'}`);
      outputChannel.appendLine(`[scan] Scan Status      : ${scanStatus}`);
      outputChannel.appendLine(`[scan] Scanners         : ${scanners}`);
      outputChannel.appendLine(`[scan] Findings Count   : ${findingCount}`);
      if (durationSec !== null) {
        outputChannel.appendLine(`[scan] Duration         : ${durationSec}s`);
      }

      if (scanId) {
        try {
          progress.report({ message: 'Fetching scan findings & verification evidence...' });
          const detailsRes = await callMcpTool(context, outputChannel, state, 'get_scan', {
            scan_id: scanId,
          });
          const details = (detailsRes.parsed && detailsRes.parsed.data) || {};
          const findings = Array.isArray(details.findings) ? details.findings : [];
          const verifications = Array.isArray(details.verifications) ? details.verifications : [];

          populateDiagnosticsFromFindings(diagnosticCollection, workspacePath, findings);

          if (findings.length > 0) {
            outputChannel.appendLine('[scan] Findings:');
            for (const f of findings) {
              const loc = f.file_path
                ? `${f.file_path}${f.line_number ? `:${f.line_number}` : ''}`
                : 'workspace';
              outputChannel.appendLine(
                `  - [${f.severity || 'INFO'}] ${f.title || f.rule_id || 'Finding'} (${f.scanner || 'scanner'}) at ${loc}${f.rule_id ? ` [${f.rule_id}]` : ''}`
              );
            }
          } else {
            outputChannel.appendLine('[scan] 0 vulnerabilities reported.');
          }

          if (verifications.length > 0) {
            outputChannel.appendLine('[scan] Requirement Verifications:');
            for (const v of verifications) {
              outputChannel.appendLine(
                `  - ${v.requirement_key}: ${v.status}${v.rationale ? ` — ${v.rationale}` : ''}`
              );
            }
          }
        } catch (getScanErr) {
          outputChannel.appendLine(`[scan] Could not fetch detailed findings via get_scan: ${getScanErr.message}`);
        }
      }

      outputChannel.appendLine('============================================================');

      if (scanStatus === 'FAILED') {
        vscode.window.showErrorMessage(`Kavach: Scan ${scanId || ''} finished with status FAILED.`);
      } else if (findingCount > 0) {
        vscode.window.showWarningMessage(
          `Kavach: Scan finished (${scanStatus}) with ${findingCount} finding(s). See "Kavach Security" output.`
        );
      } else {
        vscode.window.showInformationMessage(
          `Kavach: Scan finished (${scanStatus}) with 0 findings.`
        );
      }
    }
  );
}

async function signOutCommand(context, outputChannel, statusBarItem, state) {
  const session = await loadSession(context);
  const serverUrl = (session && session.serverUrl) || getServerUrl();

  if (session && (session.refreshToken || session.accessToken)) {
    try {
      let revocationEndpoint = `${serverUrl}/oauth/revoke`;
      try {
        const meta = await discoverOAuthMetadata(serverUrl);
        if (meta.revocation_endpoint) revocationEndpoint = meta.revocation_endpoint;
      } catch {}

      const token = session.refreshToken || session.accessToken;
      const body = new URLSearchParams({ token });
      const res = await fetch(revocationEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        signal: AbortSignal.timeout(8000),
      });
      outputChannel.appendLine(
        res.ok
          ? `[auth] Revoked OAuth token family at ${revocationEndpoint}.`
          : `[auth] Remote revocation returned HTTP ${res.status}; clearing local credentials.`
      );
    } catch (err) {
      outputChannel.appendLine(`[auth] Remote revocation skipped (${err.message}); clearing local credentials.`);
    }
  }

  await clearSession(context);
  state.activeProject = null;
  state.mcpSessionId = null;
  updateStatusBar(statusBarItem, null, null);
  vscode.window.showInformationMessage('Kavach: Signed out and cleared stored credentials.');
}

function wrapCommand(outputChannel, fn) {
  return async () => {
    try {
      await fn();
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      outputChannel.appendLine(`[error] ${msg}`);
      vscode.window.showErrorMessage(`Kavach: ${msg}`);
    }
  };
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const outputChannel = vscode.window.createOutputChannel('Kavach Security');
  const diagnosticCollection = vscode.languages.createDiagnosticCollection('kavach-security');
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);

  const state = {
    activeProject: null,
    mcpSessionId: null,
  };

  context.subscriptions.push(outputChannel, diagnosticCollection, statusBarItem);

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'kavach.signIn',
      wrapCommand(outputChannel, () =>
        performInteractiveSignIn(context, outputChannel, statusBarItem, state)
      )
    ),
    vscode.commands.registerCommand(
      'kavach.connectProject',
      wrapCommand(outputChannel, () =>
        connectProjectCommand(context, outputChannel, statusBarItem, state)
      )
    ),
    vscode.commands.registerCommand(
      'kavach.switchProject',
      wrapCommand(outputChannel, () =>
        switchProjectCommand(context, outputChannel, statusBarItem, state)
      )
    ),
    vscode.commands.registerCommand(
      'kavach.configureMcp',
      wrapCommand(outputChannel, () => configureMcpCommand(outputChannel))
    ),
    vscode.commands.registerCommand(
      'kavach.scanWorkspace',
      wrapCommand(outputChannel, () =>
        scanWorkspaceCommand(context, outputChannel, statusBarItem, state, diagnosticCollection)
      )
    ),
    vscode.commands.registerCommand(
      'kavach.signOut',
      wrapCommand(outputChannel, () =>
        signOutCommand(context, outputChannel, statusBarItem, state)
      )
    )
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('kavach.serverUrl') || e.affectsConfiguration('kavach.autoResolveProject')) {
        state.mcpSessionId = null;
        autoResolveWorkspace(context, outputChannel, statusBarItem, state).catch(() => {});
      }
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      if (getAutoResolveProject()) {
        autoResolveWorkspace(context, outputChannel, statusBarItem, state).catch(() => {});
      }
    })
  );

  // Initialize status bar immediately, then auto-resolve workspace project if already signed in
  updateStatusBar(statusBarItem, null, null);
  loadSession(context)
    .then((existing) => {
      if (existing) {
        updateStatusBar(
          statusBarItem,
          existing,
          existing.projectId ? { id: existing.projectId, name: existing.projectName || existing.projectId } : null
        );
        if (getAutoResolveProject()) {
          return autoResolveWorkspace(context, outputChannel, statusBarItem, state);
        }
      }
      return null;
    })
    .catch((err) => {
      outputChannel.appendLine(`[startup] Session check error: ${err.message}`);
    });
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
