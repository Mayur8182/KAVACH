import http from 'node:http';
import { URL, URLSearchParams } from 'node:url';
import { generatePKCE, generateRandomToken } from '../../shared/src/crypto.js';
import {
  DEFAULT_CLI_OAUTH_CLIENT_ID,
  DEFAULT_CLOUD_URL,
} from '../../shared/src/constants.js';
import { CredentialStore } from './credential-store.js';
import type { AuthCredentials } from '../../shared/src/types.js';

export interface LoginOptions {
  cloudUrl: string;
  serverUrl?: string;
  clientId?: string;
  scope?: string;
  resource?: string;
  onBrowserOpen?: (url: string) => void;
  onCodeReceived?: (code: string) => void;
}

export interface OAuthMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
  revocation_endpoint?: string;
  scopes_supported?: string[];
}

export interface TokenExchangeParams {
  cloudUrl: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
  clientId?: string;
  resource?: string;
  tokenEndpoint?: string;
  userinfoEndpoint?: string;
  deviceId?: string;
}

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

function normalizeServerUrl(url: string): string {
  return (url || DEFAULT_CLOUD_URL).trim().replace(/\/+$/, '');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function decodeJwtClaims(token?: string): Record<string, any> | null {
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

async function extractResponseError(response: Response): Promise<string> {
  let rawText = '';
  try {
    rawText = await response.text();
  } catch {
    return response.statusText || `HTTP ${response.status}`;
  }
  if (!rawText) {
    return response.statusText || `HTTP ${response.status}`;
  }
  try {
    const parsed = JSON.parse(rawText) as Record<string, any>;
    return String(
      parsed.error_description ||
        parsed.detail ||
        parsed.message ||
        parsed.error ||
        rawText
    );
  } catch {
    return rawText;
  }
}

function renderCallbackPage(title: string, heading: string, detail: string, isError: boolean): string {
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

export class OAuthManager {
  /**
   * Discovers OAuth 2.1 Authorization Server Metadata (RFC 8414),
   * falling back to standard /oauth/authorize and /oauth/token only on HTTP 404.
   */
  public static async discoverMetadata(serverUrl: string): Promise<OAuthMetadata> {
    const baseUrl = normalizeServerUrl(serverUrl);
    const discoveryUrl = `${baseUrl}/.well-known/oauth-authorization-server`;

    let response: Response;
    try {
      response = await fetch(discoveryUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
    } catch (err: any) {
      throw new Error(
        `Cannot reach Kavach server at ${baseUrl}: ${err?.message || err}. Verify network connectivity or KAVACH_SERVER_URL.`
      );
    }

    if (response.status === 404) {
      return {
        issuer: baseUrl,
        authorization_endpoint: `${baseUrl}/oauth/authorize`,
        token_endpoint: `${baseUrl}/oauth/token`,
        userinfo_endpoint: `${baseUrl}/oauth/userinfo`,
        revocation_endpoint: `${baseUrl}/oauth/revoke`,
      };
    }

    if (!response.ok) {
      const reason = await extractResponseError(response);
      throw new Error(
        `OAuth discovery failed at ${discoveryUrl} (HTTP ${response.status}): ${reason}`
      );
    }

    const data = (await response.json()) as Record<string, any>;
    if (!data || typeof data.authorization_endpoint !== 'string' || typeof data.token_endpoint !== 'string') {
      throw new Error(
        `Invalid OAuth discovery metadata received from ${discoveryUrl}: missing authorization_endpoint or token_endpoint.`
      );
    }

    return {
      issuer: typeof data.issuer === 'string' ? data.issuer : baseUrl,
      authorization_endpoint: data.authorization_endpoint,
      token_endpoint: data.token_endpoint,
      userinfo_endpoint: typeof data.userinfo_endpoint === 'string' ? data.userinfo_endpoint : `${baseUrl}/oauth/userinfo`,
      revocation_endpoint: typeof data.revocation_endpoint === 'string' ? data.revocation_endpoint : `${baseUrl}/oauth/revoke`,
      scopes_supported: Array.isArray(data.scopes_supported) ? data.scopes_supported.map(String) : undefined,
    };
  }

  public static resolveScopes(metadata: OAuthMetadata, explicitScope?: string): string {
    if (explicitScope && explicitScope.trim()) {
      return explicitScope.trim();
    }
    if (metadata.scopes_supported && metadata.scopes_supported.length > 0) {
      const supported = new Set(metadata.scopes_supported);
      const matched = DESIRED_SCOPES.filter((s) => supported.has(s));
      if (matched.length > 0) {
        return matched.join(' ');
      }
      return metadata.scopes_supported.join(' ');
    }
    return FALLBACK_DEFAULT_SCOPES;
  }

  /**
   * Fetches verified user identity from OIDC UserInfo endpoint.
   */
  public static async fetchUserInfo(
    accessToken: string,
    serverUrl: string,
    userinfoEndpoint?: string
  ): Promise<Record<string, any>> {
    const baseUrl = normalizeServerUrl(serverUrl);
    const endpoint = userinfoEndpoint || `${baseUrl}/oauth/userinfo`;

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        signal: AbortSignal.timeout(10000),
      });
    } catch (err: any) {
      throw new Error(`Failed to reach Kavach UserInfo endpoint at ${endpoint}: ${err?.message || err}`);
    }

    if (!response.ok) {
      const reason = await extractResponseError(response);
      throw new Error(`UserInfo request failed (HTTP ${response.status}): ${reason}`);
    }

    return (await response.json()) as Record<string, any>;
  }

  /**
   * Starts a local loopback server to perform OAuth 2.1 + PKCE (S256) authorization.
   */
  public static async loginInteractive(options: LoginOptions): Promise<AuthCredentials> {
    const baseUrl = normalizeServerUrl(options.serverUrl || options.cloudUrl);
    const clientId = options.clientId || DEFAULT_CLI_OAUTH_CLIENT_ID;
    const resource = (options.resource || `${baseUrl}/mcp`).replace(/\/+$/, '');

    const metadata = await OAuthManager.discoverMetadata(baseUrl);
    const scope = OAuthManager.resolveScopes(metadata, options.scope);
    const { codeVerifier, codeChallenge } = generatePKCE();
    const state = generateRandomToken(16);
    const deviceId = `dev-${generateRandomToken(8)}`;

    return new Promise((resolve, reject) => {
      const server = http.createServer();
      let settled = false;

      const finish = (err?: Error, creds?: AuthCredentials) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        try {
          server.close();
        } catch {}
        if (err) {
          reject(err);
        } else if (creds) {
          resolve(creds);
        }
      };

      const timeout = setTimeout(() => {
        finish(new Error('Authentication timed out after 180 seconds. Run "kavach login" to try again.'));
      }, 180000);

      server.on('error', (err) => {
        finish(new Error(`Failed to start local OAuth callback listener: ${err.message}`));
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
            res.end(
              renderCallbackPage(
                'Kavach Security — Authorization Failed',
                'Authorization Rejected',
                msg,
                true
              )
            );
            return finish(new Error(`OAuth authorization failed: ${msg}`));
          }

          if (returnedState !== state) {
            res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(
              renderCallbackPage(
                'Kavach Security — State Mismatch',
                'Security Check Failed',
                'OAuth state parameter did not match. Please restart login from your terminal.',
                true
              )
            );
            return finish(new Error('OAuth state mismatch during loopback callback.'));
          }

          if (!code) {
            res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(
              renderCallbackPage(
                'Kavach Security — Missing Code',
                'Missing Authorization Code',
                'The authorization server did not return an authorization code.',
                true
              )
            );
            return finish(new Error('No authorization code received in OAuth callback.'));
          }

          const addr = server.address();
          const port = typeof addr === 'object' && addr ? addr.port : 0;
          const redirectUri = `http://127.0.0.1:${port}/callback`;

          if (options.onCodeReceived) {
            options.onCodeReceived(code);
          }

          try {
            const creds = await OAuthManager.exchangeCodeForTokens({
              cloudUrl: baseUrl,
              tokenEndpoint: metadata.token_endpoint,
              userinfoEndpoint: metadata.userinfo_endpoint,
              code,
              codeVerifier,
              redirectUri,
              clientId,
              resource,
              deviceId,
            });
            CredentialStore.save(creds);

            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(
              renderCallbackPage(
                'Kavach Security — Signed In',
                'Signed In to Kavach',
                `Authenticated as ${creds.user.email || creds.user.id}. You can close this window and return to your terminal.`,
                false
              )
            );
            finish(undefined, creds);
          } catch (exchangeErr: any) {
            const errMsg = exchangeErr?.message || 'Token exchange failed.';
            res.writeHead(502, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(
              renderCallbackPage(
                'Kavach Security — Token Exchange Failed',
                'Token Exchange Failed',
                errMsg,
                true
              )
            );
            finish(exchangeErr instanceof Error ? exchangeErr : new Error(errMsg));
          }
        } catch (handlerErr: any) {
          finish(handlerErr instanceof Error ? handlerErr : new Error(String(handlerErr)));
        }
      });

      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        const port = typeof addr === 'object' && addr ? addr.port : 0;
        const redirectUri = `http://127.0.0.1:${port}/callback`;

        const authUrl = new URL(metadata.authorization_endpoint);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('client_id', clientId);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('code_challenge', codeChallenge);
        authUrl.searchParams.set('code_challenge_method', 'S256');
        authUrl.searchParams.set('state', state);
        authUrl.searchParams.set('scope', scope);
        authUrl.searchParams.set('resource', resource);

        if (options.onBrowserOpen) {
          options.onBrowserOpen(authUrl.toString());
        }
      });
    });
  }

  /**
   * Exchanges OAuth 2.1 authorization code + PKCE verifier at /oauth/token.
   * Never returns fake/offline fallback tokens.
   */
  public static async exchangeCodeForTokens(params: TokenExchangeParams): Promise<AuthCredentials> {
    const baseUrl = normalizeServerUrl(params.cloudUrl);
    const clientId = params.clientId || DEFAULT_CLI_OAUTH_CLIENT_ID;
    let tokenEndpoint = params.tokenEndpoint;
    let userinfoEndpoint = params.userinfoEndpoint;

    if (!tokenEndpoint) {
      const metadata = await OAuthManager.discoverMetadata(baseUrl);
      tokenEndpoint = metadata.token_endpoint;
      userinfoEndpoint = userinfoEndpoint || metadata.userinfo_endpoint;
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: params.code,
      redirect_uri: params.redirectUri,
      client_id: clientId,
      code_verifier: params.codeVerifier,
    });
    if (params.resource) {
      body.set('resource', params.resource);
    }

    let response: Response;
    try {
      response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: body.toString(),
        signal: AbortSignal.timeout(15000),
      });
    } catch (err: any) {
      throw new Error(`OAuth token request failed against ${tokenEndpoint}: ${err?.message || err}`);
    }

    if (!response.ok) {
      const reason = await extractResponseError(response);
      throw new Error(`OAuth token exchange failed (HTTP ${response.status}): ${reason}`);
    }

    const data = (await response.json()) as Record<string, any>;
    if (!data || typeof data.access_token !== 'string' || !data.access_token) {
      throw new Error('OAuth token endpoint returned a response without an access_token.');
    }

    const idClaims = decodeJwtClaims(data.id_token);
    const accessClaims = decodeJwtClaims(data.access_token);
    let userInfo: Record<string, any> | null = null;

    if (!idClaims?.email || !idClaims?.sub) {
      try {
        userInfo = await OAuthManager.fetchUserInfo(data.access_token, baseUrl, userinfoEndpoint);
      } catch {
        // JWT claims below remain authoritative if UserInfo endpoint is unavailable
      }
    }

    const expiresInSeconds =
      typeof data.expires_in === 'number' && data.expires_in > 0 ? data.expires_in : 3600;
    const orgId = data.org_id || userInfo?.org_id || idClaims?.org_id || accessClaims?.org_id;
    const workspaceId = data.workspace_id || idClaims?.workspace_id || accessClaims?.workspace_id;
    const projectId =
      data.project_id ||
      userInfo?.project_id ||
      idClaims?.project_id ||
      accessClaims?.project_id ||
      accessClaims?.projectId;
    const projectName = data.project_name || userInfo?.project_name;

    const userId = String(userInfo?.sub || idClaims?.sub || accessClaims?.sub || '');
    const userEmail = String(
      userInfo?.email || idClaims?.email || userInfo?.preferred_username || ''
    );
    const userName = userInfo?.name || idClaims?.name;

    if (!userId) {
      throw new Error('OAuth token response lacked a verifiable user identity (sub claim).');
    }

    return {
      accessToken: data.access_token,
      refreshToken: typeof data.refresh_token === 'string' ? data.refresh_token : undefined,
      idToken: typeof data.id_token === 'string' ? data.id_token : undefined,
      tokenType: typeof data.token_type === 'string' ? data.token_type : 'Bearer',
      scope: typeof data.scope === 'string' ? data.scope : undefined,
      expiresAt: Date.now() + expiresInSeconds * 1000,
      serverUrl: baseUrl,
      clientId,
      organizationId: orgId ? String(orgId) : undefined,
      workspaceId: workspaceId ? String(workspaceId) : undefined,
      projectId: projectId ? String(projectId) : undefined,
      projectName: projectName ? String(projectName) : undefined,
      deviceId: params.deviceId || `dev-${generateRandomToken(8)}`,
      authenticatedAt: new Date().toISOString(),
      user: {
        id: userId,
        email: userEmail || userId,
        name: userName ? String(userName) : undefined,
        organizationId: orgId ? String(orgId) : undefined,
        workspaceId: workspaceId ? String(workspaceId) : undefined,
        projectId: projectId ? String(projectId) : undefined,
      },
    };
  }

  /**
   * Refreshes an expired OAuth 2.1 access token using the stored refresh_token.
   */
  public static async refreshAccessToken(
    creds: AuthCredentials,
    cloudUrl?: string
  ): Promise<AuthCredentials> {
    if (!creds.refreshToken) {
      throw new Error('No refresh token available. Run "kavach login" to re-authenticate.');
    }

    const baseUrl = normalizeServerUrl(cloudUrl || creds.serverUrl || DEFAULT_CLOUD_URL);
    const clientId = creds.clientId || DEFAULT_CLI_OAUTH_CLIENT_ID;
    const metadata = await OAuthManager.discoverMetadata(baseUrl);

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: creds.refreshToken,
      client_id: clientId,
    });

    let response: Response;
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
    } catch (err: any) {
      throw new Error(`Token refresh network request failed against ${metadata.token_endpoint}: ${err?.message || err}`);
    }

    if (!response.ok) {
      const reason = await extractResponseError(response);
      throw new Error(`Token refresh failed (HTTP ${response.status}): ${reason}. Run "kavach login" to re-authenticate.`);
    }

    const data = (await response.json()) as Record<string, any>;
    if (!data || typeof data.access_token !== 'string' || !data.access_token) {
      throw new Error('Token refresh response did not contain a valid access_token. Run "kavach login".');
    }

    const accessClaims = decodeJwtClaims(data.access_token);
    const expiresInSeconds =
      typeof data.expires_in === 'number' && data.expires_in > 0 ? data.expires_in : 3600;
    const orgId = data.org_id || accessClaims?.org_id || creds.organizationId;
    const workspaceId = data.workspace_id || accessClaims?.workspace_id || creds.workspaceId;
    const projectId =
      data.project_id || accessClaims?.project_id || accessClaims?.projectId || creds.projectId;
    const projectName = data.project_name || creds.projectName;

    const updated: AuthCredentials = {
      ...creds,
      accessToken: data.access_token,
      refreshToken: typeof data.refresh_token === 'string' ? data.refresh_token : creds.refreshToken,
      idToken: typeof data.id_token === 'string' ? data.id_token : creds.idToken,
      tokenType: typeof data.token_type === 'string' ? data.token_type : creds.tokenType || 'Bearer',
      scope: typeof data.scope === 'string' ? data.scope : creds.scope,
      expiresAt: Date.now() + expiresInSeconds * 1000,
      serverUrl: baseUrl,
      clientId,
      organizationId: orgId ? String(orgId) : undefined,
      workspaceId: workspaceId ? String(workspaceId) : undefined,
      projectId: projectId ? String(projectId) : undefined,
      projectName: projectName ? String(projectName) : undefined,
      authenticatedAt: new Date().toISOString(),
      user: {
        ...creds.user,
        organizationId: orgId ? String(orgId) : creds.user.organizationId,
        workspaceId: workspaceId ? String(workspaceId) : creds.user.workspaceId,
        projectId: projectId ? String(projectId) : creds.user.projectId,
      },
    };

    CredentialStore.save(updated);
    return updated;
  }

  /**
   * Returns valid credentials from CredentialStore, automatically exchanging refresh_token if needed.
   */
  public static async getValidCredentials(cloudUrl?: string): Promise<AuthCredentials> {
    const creds = CredentialStore.load();
    if (!creds || !creds.accessToken) {
      throw new Error('Not authenticated with Kavach. Run "kavach login" first.');
    }

    if (CredentialStore.isAccessTokenExpired(creds)) {
      if (!creds.refreshToken) {
        throw new Error('Your Kavach access token has expired. Run "kavach login" to re-authenticate.');
      }
      return OAuthManager.refreshAccessToken(creds, cloudUrl);
    }

    return creds;
  }

  /**
   * Revokes tokens at /oauth/revoke (RFC 7009) and clears local CredentialStore.
   */
  public static async revokeSession(
    creds: AuthCredentials | null,
    cloudUrl?: string
  ): Promise<{ remoteRevoked: boolean; error?: string }> {
    let remoteRevoked = false;
    let revokeError: string | undefined;

    try {
      if (creds && (creds.refreshToken || creds.accessToken)) {
        const baseUrl = normalizeServerUrl(cloudUrl || creds.serverUrl || DEFAULT_CLOUD_URL);
        let revocationEndpoint = `${baseUrl}/oauth/revoke`;
        try {
          const meta = await OAuthManager.discoverMetadata(baseUrl);
          if (meta.revocation_endpoint) revocationEndpoint = meta.revocation_endpoint;
        } catch {}

        const tokenToRevoke = creds.refreshToken || creds.accessToken;
        const body = new URLSearchParams({ token: tokenToRevoke });
        const resp = await fetch(revocationEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
          signal: AbortSignal.timeout(8000),
        });
        if (resp.ok) {
          remoteRevoked = true;
        } else {
          revokeError = `HTTP ${resp.status}: ${await extractResponseError(resp)}`;
        }
      }
    } catch (err: any) {
      revokeError = err?.message || String(err);
    } finally {
      CredentialStore.clear();
    }

    return { remoteRevoked, error: revokeError };
  }

  /**
   * Validates an existing Bearer access token against Kavach /oauth/userinfo and stores it.
   */
  public static async loginWithToken(token: string, cloudUrl: string): Promise<AuthCredentials> {
    const trimmed = token.trim();
    if (!trimmed) {
      throw new Error('Access token cannot be empty.');
    }

    const baseUrl = normalizeServerUrl(cloudUrl);
    const metadata = await OAuthManager.discoverMetadata(baseUrl);
    const userInfo = await OAuthManager.fetchUserInfo(trimmed, baseUrl, metadata.userinfo_endpoint);
    const claims = decodeJwtClaims(trimmed);

    const expMs =
      claims && typeof claims.exp === 'number'
        ? claims.exp * 1000
        : Date.now() + 24 * 60 * 60 * 1000;

    const userId = String(userInfo.sub || claims?.sub || '');
    const email = String(userInfo.email || userInfo.preferred_username || userId);
    if (!userId) {
      throw new Error('Server verified token but did not return a user identity (sub).');
    }

    const creds: AuthCredentials = {
      accessToken: trimmed,
      tokenType: 'Bearer',
      scope: claims?.scope ? String(claims.scope) : undefined,
      expiresAt: expMs,
      serverUrl: baseUrl,
      clientId: claims?.client_id ? String(claims.client_id) : DEFAULT_CLI_OAUTH_CLIENT_ID,
      organizationId: userInfo.org_id || claims?.org_id,
      workspaceId: claims?.workspace_id,
      projectId: userInfo.project_id || claims?.project_id || claims?.projectId,
      projectName: userInfo.project_name,
      deviceId: `dev-${generateRandomToken(8)}`,
      authenticatedAt: new Date().toISOString(),
      user: {
        id: userId,
        email,
        name: userInfo.name ? String(userInfo.name) : undefined,
        organizationId: userInfo.org_id || claims?.org_id,
        workspaceId: claims?.workspace_id,
        projectId: userInfo.project_id || claims?.project_id,
      },
    };
    CredentialStore.save(creds);
    return creds;
  }
}
