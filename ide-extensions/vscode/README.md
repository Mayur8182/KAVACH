# Kavach Security — VS Code / Cursor / Windsurf Extension

Official IDE extension for the **Kavach MCP Security Gateway**, using **Universal OAuth 2.1 + PKCE (`S256`)**, automatic Git repository matching, and real deterministic security scanning via MCP (`Streamable HTTP`).

## Features

- **Universal OAuth 2.1 + PKCE (`S256`) Sign-In** — Discovers endpoints from `/.well-known/oauth-authorization-server`, opens your browser for GitHub/Google/SSO + project consent using `client_id="kavach-vscode"`, and stores access & refresh tokens securely in OS keychain via VS Code `SecretStorage`.
- **Automatic Git Remote Resolution** — Reads the workspace `origin` remote (`git remote get-url origin` / `.git/config`) and calls `POST /api/v1/mcp/resolve-project` so your IDE automatically binds to the right Kavach Cloud project.
- **Interactive Project Switching & Creation** — Browse authorized projects (`list_projects`), switch active context (`set_active_project` + `PATCH /api/v1/oauth/preferences`), or create/link a new project directly from QuickPick.
- **Zero-Token `.vscode/mcp.json` Setup** — Generates `.vscode/mcp.json` with `{ "servers": { "kavach": { "type": "http", "url": "${serverUrl}/mcp" } } }` for VS Code, Cursor, and Windsurf MCP clients without storing static secrets in your repository.
- **Real MCP Security Scans** — Executes `run_security_scan` and `get_scan` against `${serverUrl}/mcp`, streaming verified scanner output and findings into the **Kavach Security** Output panel and editor diagnostics.
- **Status Bar Indicator** — Displays `$(shield) Kavach: <active_project>` or `$(shield) Kavach: Sign In` for one-click sign-in or project switching.

## Commands (Command Palette: `Ctrl+Shift+P` / `Cmd+Shift+P`)

| Command | Title | Purpose |
| --- | --- | --- |
| `kavach.signIn` | `Kavach: Sign In with OAuth 2.1` | Authenticate via OAuth 2.1 PKCE loopback (`127.0.0.1`) and auto-resolve workspace repo |
| `kavach.connectProject` | `Kavach: Connect / Auto-Detect Repository` | Match workspace Git remote or pick/create a Kavach Cloud project |
| `kavach.switchProject` | `Kavach: Switch Active Project` | Switch active project via MCP `list_projects` and `set_active_project` |
| `kavach.configureMcp` | `Kavach: Configure MCP Server (.vscode/mcp.json)` | Write/update `.vscode/mcp.json` cleanly with zero hardcoded tokens |
| `kavach.scanWorkspace` | `Kavach: Run Security Scan via MCP` | Run `run_security_scan` via MCP and log real results in `Kavach Security` output |
| `kavach.signOut` | `Kavach: Sign Out` | Revoke active OAuth session at `/oauth/revoke` and clear `SecretStorage` |

## Configuration

```json
{
  "kavach.serverUrl": "https://mcp.kavachsecurity.me",
  "kavach.autoResolveProject": true
}
```

For local backend development, set `"kavach.serverUrl": "http://localhost:8000"`.

## Security Invariants

- **Zero hardcoded credentials** — OAuth tokens are stored exclusively in `vscode.ExtensionContext.secrets`, never in `.vscode/mcp.json` or workspace files.
- **No fake offline results** — Unauthenticated, expired, or unreachable gateway requests fail explicitly with actionable remediation (`Kavach: Sign In with OAuth 2.1`).
- **Deterministic authority** — Scanners, RBAC, and OPA policy gates execute server-side behind the Kavach MCP Security Gateway.
