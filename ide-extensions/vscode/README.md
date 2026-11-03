# Thing Security — VS Code Extension

Provides real-time pre-code and during-code security for Thing.

## Features

- **Security Status Panel** — shows current project security context
- **Inline Diagnostics** — security findings highlighted directly in the editor
- **Findings Panel** — browsable list of all active findings with evidence
- **Contracts Panel** — shows active security contracts and their verification status
- **On-Save Scan** — automatically triggers incremental security scan on file save (debounced)
- **Manual Scan** — run full project scan via Command Palette
- **AI Fix Integration** — request AI-generated fixes (routed through Thing security policy)

## Architecture

```
VS Code Extension
       ↓
Thing Local Security Agent (thing-agent, port 17382)
       ↓
Thing Backend API
       ↓
Scanner Orchestration (Semgrep / Gitleaks / Trivy / Checkov / OSV)
       ↓
Policy Engine
       ↓
ALLOW / WARN / BLOCK
```

## Prerequisites

1. Install the Thing CLI: `pip install thing-cli` (or use local dev setup)
2. Run `thing auth login` in your project directory
3. Run `thing init` to bind your repository to a project
4. Start the local agent: `python cli/local_agent.py`

## Usage

### Commands (Command Palette: Ctrl+Shift+P)

- `Thing Security: Scan Project` — run a full security scan
- `Thing Security: AI Fix` — generate an AI fix for the current finding

### Auto-scan

Files are automatically scanned after saving (1s debounce). Results appear as inline diagnostics.

## Security Invariants

- The extension **never** fabricates findings
- The extension **never** displays SECURE unless a real scanner confirmed it
- All AI agent tool requests pass through Thing's policy engine
- Prompt injection from repository content is actively blocked
- Local agent uses port 17382 (127.0.0.1 only — no external exposure)

## Configuration

```json
{
  "thing.agentPort": 17382,
  "thing.debounceSeconds": 1.5,
  "thing.offlineMode": false
}
```
