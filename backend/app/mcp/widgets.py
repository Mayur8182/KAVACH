"""
Kavach Interactive MCP Apps / ChatGPT Embedded UI Widgets (`ui://kavach/...`).

Provides self-contained `text/html+skybridge` HTML panels so ChatGPT and MCP Apps clients
can switch projects/repositories, inspect findings/diffs, verify patches, open GitHub PRs,
and complete Human-in-the-Loop (HITL) security approvals INLINE inside ChatGPT without forcing
users into external dashboard tabs.

Security guarantee (AGENTS.md Rule 14 & Rule 15):
Inline approval requests authenticate via a short-lived HMAC-SHA256 token signed with the
server secret (`jwt_secret`) bound strictly to `(approval_id, user_id, exp)` and submitted
by explicit human UI click to `POST /api/v1/mcp/approvals/{approval_id}/widget-decide`.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import html
import json
import time
import uuid
from typing import Any, Dict, Optional

from app.core.config import get_settings


def _widget_hmac_key() -> bytes:
    settings = get_settings()
    raw = f"{settings.jwt_secret}:kavach-mcp-widget-v1"
    return raw.encode("utf-8")


def issue_widget_approval_token(
    *,
    approval_id: uuid.UUID | str,
    user_id: uuid.UUID | str,
    ttl_seconds: int = 900,
) -> str:
    """Issues a short-lived HMAC-signed token authorizing human widget approval clicks."""
    payload = {
        "aid": str(approval_id),
        "uid": str(user_id),
        "exp": int(time.time()) + max(60, int(ttl_seconds)),
    }
    raw_b64 = base64.urlsafe_b64encode(
        json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    ).decode("ascii").rstrip("=")
    sig = hmac.new(_widget_hmac_key(), raw_b64.encode("ascii"), hashlib.sha256).hexdigest()
    return f"{raw_b64}.{sig}"


def verify_widget_approval_token(
    token: str,
    expected_approval_id: uuid.UUID | str,
) -> Optional[Dict[str, str]]:
    """Verifies HMAC signature, expiry, and exact approval_id binding."""
    if not token or "." not in token:
        return None
    try:
        raw_b64, sig = token.strip().split(".", 1)
        expected_sig = hmac.new(_widget_hmac_key(), raw_b64.encode("ascii"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected_sig):
            return None
        padded = raw_b64 + "=" * (-len(raw_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded.encode("ascii")).decode("utf-8"))
        if int(payload.get("exp", 0)) < int(time.time()):
            return None
        if str(payload.get("aid")) != str(expected_approval_id):
            return None
        return {"approval_id": str(payload["aid"]), "user_id": str(payload["uid"])}
    except Exception:
        return None


WIDGET_TOOL_TEMPLATE_MAP: Dict[str, Dict[str, str]] = {
    "get_active_project": {
        "uri": "ui://kavach/workspace-panel",
        "invoking": "Loading Kavach workspace & repository...",
        "invoked": "Kavach workspace & repository ready.",
    },
    "list_projects": {
        "uri": "ui://kavach/workspace-panel",
        "invoking": "Loading authorized Kavach projects...",
        "invoked": "Kavach projects loaded.",
    },
    "set_active_project": {
        "uri": "ui://kavach/workspace-panel",
        "invoking": "Switching active Kavach project...",
        "invoked": "Active project updated.",
    },
    "connect_repository": {
        "uri": "ui://kavach/workspace-panel",
        "invoking": "Connecting repository in Kavach...",
        "invoked": "Repository connected.",
    },
    "get_github_repository": {
        "uri": "ui://kavach/workspace-panel",
        "invoking": "Fetching GitHub repository metadata...",
        "invoked": "GitHub repository metadata loaded.",
    },
    "get_project_posture": {
        "uri": "ui://kavach/remediation-panel",
        "invoking": "Evaluating Kavach security posture...",
        "invoked": "Security posture loaded.",
    },
    "run_security_scan": {
        "uri": "ui://kavach/remediation-panel",
        "invoking": "Running deterministic security scanners on repository...",
        "invoked": "Security scan completed.",
    },
    "security_check": {
        "uri": "ui://kavach/remediation-panel",
        "invoking": "Running consolidated scan and OPA policy verification...",
        "invoked": "Security verification completed.",
    },
    "list_project_findings": {
        "uri": "ui://kavach/remediation-panel",
        "invoking": "Loading verified repository findings...",
        "invoked": "Findings loaded.",
    },
    "propose_remediation_diff": {
        "uri": "ui://kavach/remediation-panel",
        "invoking": "Synthesizing verified security diff...",
        "invoked": "Remediation diff ready.",
    },
    "apply_remediation_patch": {
        "uri": "ui://kavach/remediation-panel",
        "invoking": "Applying patch to remediation branch...",
        "invoked": "Remediation patch status ready.",
    },
    "verify_patch": {
        "uri": "ui://kavach/remediation-panel",
        "invoking": "Running rescan & syntax verification in sandbox...",
        "invoked": "Patch verification completed.",
    },
    "verify_remediation_patch": {
        "uri": "ui://kavach/remediation-panel",
        "invoking": "Running rescan & syntax verification in sandbox...",
        "invoked": "Patch verification completed.",
    },
    "create_branch": {
        "uri": "ui://kavach/remediation-panel",
        "invoking": "Creating remediation branch on GitHub...",
        "invoked": "Branch action complete.",
    },
    "create_pull_request": {
        "uri": "ui://kavach/remediation-panel",
        "invoking": "Opening GitHub Pull Request...",
        "invoked": "Pull Request ready.",
    },
}


def build_tool_ui_meta(
    tool_name: str,
    *,
    is_approval_gate: bool = False,
    widget_api_base: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Builds MCP Apps / OpenAI Skybridge `_meta` annotations for embedded ChatGPT widgets."""
    spec = WIDGET_TOOL_TEMPLATE_MAP.get(tool_name)
    if not spec and not is_approval_gate:
        return None
    template_uri = spec["uri"] if spec else "ui://kavach/remediation-panel"
    if is_approval_gate:
        template_uri = "ui://kavach/remediation-panel"
    meta: Dict[str, Any] = {
        "openai/outputTemplate": template_uri,
        "openai/widgetAccessible": True,
        "openai/toolInvocation/invoking": spec["invoking"] if spec else "Processing Kavach security workflow...",
        "openai/toolInvocation/invoked": spec["invoked"] if spec else "Kavach workflow updated.",
        "ui": {"resourceUri": template_uri},
    }
    if widget_api_base:
        meta["kavach/apiBase"] = widget_api_base.rstrip("/")
    return meta


_BASE_WIDGET_CSS = """
:root { color-scheme: light; font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
body { margin: 0; padding: 14px; background: #F8FAFC; color: #0F172A; font-size: 13px; line-height: 1.45; }
.card { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 16px; box-shadow: 0 4px 16px -8px rgba(15,23,42,0.08); }
.hdr { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
.brand { display: inline-flex; align-items: center; gap: 7px; font-weight: 700; font-size: 13px; color: #09090B; }
.dot { width: 8px; height: 8px; border-radius: 999px; background: #10B981; display: inline-block; }
.badge { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 999px; background: #EEF2FF; color: #4338CA; border: 1px solid #C7D2FE; }
.badge-warn { background: #FFF7ED; color: #C2410C; border-color: #FED7AA; }
.badge-ok { background: #ECFDF5; color: #047857; border-color: #A7F3D0; }
.row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 10px; }
.kv { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 8px 10px; margin-top: 8px; }
.lbl { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748B; font-weight: 600; }
.val { font-weight: 600; color: #0F172A; margin-top: 2px; word-break: break-all; }
input, select { width: 100%; box-sizing: border-box; border: 1px solid #CBD5E1; border-radius: 8px; padding: 7px 10px; font-size: 12.5px; color: #0F172A; background: #FFFFFF; }
button { border: 0; border-radius: 8px; padding: 7px 12px; font-size: 12px; font-weight: 600; cursor: pointer; background: #09090B; color: #FFFFFF; transition: background 0.15s; }
button:hover { background: #EA580C; }
button.sec { background: #FFFFFF; color: #0F172A; border: 1px solid #CBD5E1; }
button.sec:hover { background: #F1F5F9; }
button.ok { background: #059669; }
button.ok:hover { background: #047857; }
button:disabled { opacity: 0.55; cursor: not-allowed; }
pre { background: #09090B; color: #E2E8F0; padding: 10px 12px; border-radius: 8px; font-size: 11.5px; overflow-x: auto; white-space: pre-wrap; margin: 8px 0 0; }
.msg { margin-top: 8px; font-size: 12px; color: #334155; }
.list { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; max-height: 220px; overflow-y: auto; }
.item { border: 1px solid #E2E8F0; border-radius: 8px; padding: 8px 10px; background: #FFFFFF; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
"""


def render_workspace_panel_html(api_base: str) -> str:
    safe_base = html.escape(api_base.rstrip("/"), quote=True)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Kavach Workspace & Repository Panel</title>
<style>{_BASE_WIDGET_CSS}</style>
</head>
<body>
<div class="card">
  <div class="hdr">
    <div class="brand"><span class="dot"></span> Kavach Security Workspace</div>
    <span id="statusBadge" class="badge">Live Connected</span>
  </div>
  <div class="kv">
    <div class="lbl">Active Project & Repository</div>
    <div id="activeInfo" class="val">Syncing workspace context...</div>
  </div>
  <div class="row" style="margin-top:10px;">
    <div style="flex:1;min-width:190px;">
      <div class="lbl" style="margin-bottom:4px;">Connect / Switch GitHub Repository (owner/repo)</div>
      <input id="repoInput" placeholder="Mayur8182/KAVACH" />
    </div>
    <button id="connectBtn" type="button" style="align-self:flex-end;">Connect & Sync</button>
    <button id="scanBtn" type="button" class="ok" style="align-self:flex-end;">Scan Repo</button>
  </div>
  <div id="projectsList" class="list"></div>
  <div id="feedback" class="msg"></div>
</div>
<script>
(function() {{
  const apiBase = "{safe_base}";
  const oa = window.openai || {{}};
  const out = oa.toolOutput || {{}};
  const data = out.data || out || {{}};
  const activeEl = document.getElementById("activeInfo");
  const repoInput = document.getElementById("repoInput");
  const listEl = document.getElementById("projectsList");
  const msgEl = document.getElementById("feedback");

  function escapeHtml(s) {{
    return String(s || "").replace(/[&<>\"']/g, c => ({{ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }}[c]));
  }}

  const ap = data.active_project || data.project || data;
  const repoLabel = data.full_name || data.repository_url || (ap && ap.repository_url) || "Not linked";
  const projLabel = (ap && (ap.name || ap.project_name)) || out.tool || "Kavach Project";
  activeEl.innerHTML = escapeHtml(projLabel) + " &bull; <code>" + escapeHtml(repoLabel) + "</code>";
  if (repoLabel && repoLabel !== "Not linked") {{
    const cleaned = String(repoLabel).replace(/^https?:\\/\\/github\\.com\\//i, "").replace(/\\.git$/i, "");
    repoInput.value = cleaned;
  }}

  const projects = data.projects || data.available_projects || [];
  if (Array.isArray(projects) && projects.length > 0) {{
    listEl.innerHTML = projects.slice(0, 8).map(p => (
      '<div class="item"><div><strong>' + escapeHtml(p.name) + '</strong><div class="lbl">' +
      escapeHtml(p.repository_url || "No repository") + '</div></div>' +
      '<button class="sec" data-pid="' + escapeHtml(p.id) + '">Activate</button></div>'
    )).join("");
    listEl.querySelectorAll("button[data-pid]").forEach(btn => {{
      btn.addEventListener("click", async () => {{
        const pid = btn.getAttribute("data-pid");
        msgEl.textContent = "Switching active project inside ChatGPT...";
        if (oa.callTool) {{
          const res = await oa.callTool("set_active_project", {{ project_id: pid, set_as_default: true }});
          msgEl.textContent = (res && res.result) || "Switched project.";
        }}
      }});
    }});
  }}

  document.getElementById("connectBtn").addEventListener("click", async () => {{
    const r = repoInput.value.trim();
    if (!r) return;
    msgEl.textContent = "Linking " + r + " to active project...";
    if (oa.callTool) {{
      const res = await oa.callTool("connect_repository", {{ repository: r, replace_project_repo: true }});
      msgEl.textContent = (res && res.result) || ("Connected " + r);
    }} else {{
      msgEl.textContent = "Connected " + r + " via " + apiBase;
    }}
  }});

  document.getElementById("scanBtn").addEventListener("click", async () => {{
    msgEl.textContent = "Starting real repository security scan...";
    if (oa.callTool) {{
      const res = await oa.callTool("run_security_scan", {{}});
      msgEl.textContent = (res && res.result) || "Scan initiated.";
    }}
  }});
}})();
</script>
</body>
</html>"""


def render_remediation_panel_html(api_base: str) -> str:
    safe_base = html.escape(api_base.rstrip("/"), quote=True)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Kavach Security Findings, Approvals & PR Panel</title>
<style>{_BASE_WIDGET_CSS}</style>
</head>
<body>
<div class="card">
  <div class="hdr">
    <div class="brand"><span class="dot"></span> Kavach Security Action Gate</div>
    <span id="stateBadge" class="badge">Ready</span>
  </div>
  <div id="summaryBox" class="kv"></div>
  <div id="approvalBox" class="kv" style="display:none;border-color:#FDBA74;background:#FFF7ED;">
    <div class="lbl" style="color:#9A3412;">Human Security Sign-Off Required (Inline)</div>
    <div id="approvalDesc" class="val" style="margin-bottom:8px;"></div>
    <div class="row">
      <button id="approveInlineBtn" class="ok" type="button">Approve Action in ChatGPT</button>
      <button id="rejectInlineBtn" class="sec" type="button">Reject</button>
    </div>
  </div>
  <pre id="diffBox" style="display:none;"></pre>
  <div class="row" id="actionsRow">
    <button id="verifyBtn" type="button" class="sec">Verify Patch</button>
    <button id="prBtn" type="button">Open GitHub PR</button>
  </div>
  <div id="statusMsg" class="msg"></div>
</div>
<script>
(function() {{
  const defaultApiBase = "{safe_base}";
  const oa = window.openai || {{}};
  const out = oa.toolOutput || {{}};
  const meta = oa.toolResponseMetadata || out._meta || {{}};
  const apiBase = meta["kavach/apiBase"] || defaultApiBase;
  const data = out.data || out || {{}};
  const statusEl = document.getElementById("stateBadge");
  const summaryEl = document.getElementById("summaryBox");
  const approvalBox = document.getElementById("approvalBox");
  const approvalDesc = document.getElementById("approvalDesc");
  const diffBox = document.getElementById("diffBox");
  const msgEl = document.getElementById("statusMsg");

  function esc(s) {{
    return String(s || "").replace(/[&<>\"']/g, c => ({{ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }}[c]));
  }}

  statusEl.textContent = out.status || data.status || "READY";
  if ((out.status || "").includes("APPROVAL")) statusEl.className = "badge badge-warn";
  else if ((out.status || "") === "SUCCESS") statusEl.className = "badge badge-ok";

  const repoName = data.repository || (data.project && data.project.repository_url) || "";
  const titleText = out.message || data.root_cause || "Security evidence loaded";
  summaryEl.innerHTML = '<div class="lbl">' + esc(repoName || out.tool || "Kavach") + '</div><div class="val">' + esc(titleText) + '</div>';

  const patchText = data.patch || data.applied_diff || "";
  if (patchText) {{
    diffBox.style.display = "block";
    diffBox.textContent = patchText;
  }}

  const approvalId = out.approval_id || data.approval_id;
  const widgetToken = data.widget_approval_token;
  if (approvalId && out.status === "REQUIRES_APPROVAL") {{
    approvalBox.style.display = "block";
    approvalDesc.textContent = "Approve tool '" + (data.pending_tool || out.tool || "security action") + "' (" + approvalId + ") directly without leaving ChatGPT.";
    const decide = async (decision) => {{
      if (!widgetToken) {{
        msgEl.textContent = "Widget approval token unavailable; approve via /settings/mcp.";
        return;
      }}
      msgEl.textContent = "Submitting signed decision (" + decision + ")...";
      const res = await fetch(apiBase + "/api/v1/mcp/approvals/" + encodeURIComponent(approvalId) + "/widget-decide", {{
        method: "POST",
        headers: {{ "Content-Type": "application/json" }},
        body: JSON.stringify({{ decision: decision, widget_token: widgetToken }}),
      }});
      const body = await res.json();
      if (!res.ok) {{
        msgEl.textContent = "Decision failed: " + (body.detail || res.status);
        return;
      }}
      msgEl.textContent = "Decision recorded: " + body.status + (decision === "APPROVED" ? ". Executing approved tool..." : ".");
      approvalBox.style.display = "none";
      if (decision === "APPROVED" && oa.callTool && data.pending_tool) {{
        const nextArgs = Object.assign({{}}, data.pending_arguments || {{}}, {{ approval_id: approvalId }});
        await oa.callTool(data.pending_tool, nextArgs);
      }}
    }};
    document.getElementById("approveInlineBtn").addEventListener("click", () => decide("APPROVED"));
    document.getElementById("rejectInlineBtn").addEventListener("click", () => decide("REJECTED"));
  }}

  document.getElementById("verifyBtn").addEventListener("click", async () => {{
    if (!oa.callTool) return;
    msgEl.textContent = "Running sandbox scanner verification...";
    await oa.callTool("verify_patch", {{
      file_path: data.file_path || "app.py",
      branch: data.branch || "security/ai-remediation",
      finding_id: data.finding_id || undefined,
      patched_content: data.patched_content || undefined,
    }});
  }});

  document.getElementById("prBtn").addEventListener("click", async () => {{
    if (!oa.callTool) return;
    msgEl.textContent = "Requesting GitHub Pull Request...";
    await oa.callTool("create_pull_request", {{
      head_branch: data.branch || "security/ai-remediation",
      title: "Security: AI remediation for verified findings",
    }});
  }});
}})();
</script>
</body>
</html>"""

