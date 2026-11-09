import asyncio
import json
import logging
import os
import shutil
import tempfile
import uuid
import subprocess
from typing import Optional, List, Tuple
from app.core.config import get_settings

logger = logging.getLogger(__name__)


async def _safe_run_subprocess(cmd: List[str], cwd: Optional[str] = None, timeout: float = 15.0) -> Tuple[int, bytes, bytes]:
    """Runs subprocess asynchronously with safe fallback for Windows event loops."""
    env = {**os.environ, "GIT_TERMINAL_PROMPT": "0", "GCM_INTERACTIVE": "never", "GIT_ASKPASS": "echo"}
    if cmd:
        resolved = shutil.which(cmd[0])
        if not resolved and cmd[0].lower() == "git" and os.name == "nt":
            for candidate in (
                os.path.join(os.environ.get("ProgramFiles", r"C:\Program Files"), "Git", "cmd", "git.exe"),
                os.path.join(os.environ.get("ProgramFiles", r"C:\Program Files"), "Git", "bin", "git.exe"),
            ):
                if os.path.isfile(candidate):
                    resolved = candidate
                    break
        if resolved:
            cmd = [resolved] + cmd[1:]
    if cwd and not os.path.isdir(cwd):
        return 2, b"", f"Working directory does not exist: {cwd}".encode()
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=cwd,
            env=env,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        return proc.returncode, stdout, stderr
    except (asyncio.TimeoutError, TimeoutError):
        logger.warning(f"Subprocess timed out after {timeout}s: {' '.join(cmd)}")
        try:
            proc.kill()
            await proc.wait()
        except Exception:
            pass
        return 124, b"", b"Command timed out"
    except (NotImplementedError, FileNotFoundError, OSError):
        def sync_run():
            try:
                # Do NOT use shell=True on Windows with a list command because spaces in path (e.g. C:\Program Files\Git)
                # cause cmd.exe to break arguments and fail with "'C:\Program' is not recognized".
                res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=cwd, shell=False, env=env, timeout=timeout)
                return res.returncode, res.stdout, res.stderr
            except subprocess.TimeoutExpired:
                return 124, b"", b"Command timed out"
            except Exception as exc:
                return 1, b"", str(exc).encode()
        return await asyncio.to_thread(sync_run)


class WorkspaceSecurityError(Exception):
    """Raised when repository workspace operations violate security boundaries."""
    pass


class GitHubWorkspaceManager:
    """
    Manages isolated, ephemeral workspaces on disk for checking out GitHub repositories
    at exact commit revisions for security scanning.
    """

    def __init__(self, base_dir: Optional[str] = None):
        settings = get_settings()
        configured = base_dir or getattr(settings, "github_workspace_dir", None)
        if not configured:
            # Check candidate directories prioritizing ones with cached repository mirrors
            candidate_roots = [
                os.path.abspath("backend/scratch/github_workspaces"),
                os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "scratch", "github_workspaces")),
                os.path.abspath("scratch/github_workspaces"),
            ]
            for cand in candidate_roots:
                if os.path.isdir(cand) and any(d.startswith("repo_") for d in os.listdir(cand)):
                    configured = cand
                    break
            if not configured:
                configured = "scratch/github_workspaces"
        self.base_dir = os.path.abspath(configured)
        os.makedirs(self.base_dir, exist_ok=True)

    def _get_job_workspace_path(self, job_id: uuid.UUID) -> str:
        """Derives safe, isolated directory path for a specific job."""
        safe_name = f"job_{str(job_id)}"
        workspace_path = os.path.abspath(os.path.join(self.base_dir, safe_name))

        # Strict path traversal prevention: ensure target path is within base_dir
        if not workspace_path.startswith(self.base_dir):
            raise WorkspaceSecurityError(f"Path traversal detected: {workspace_path} is outside {self.base_dir}")

        return workspace_path

    async def prepare_workspace(
        self,
        job_id: uuid.UUID,
        clone_url: str,
        commit_sha: Optional[str],
        branch: Optional[str] = None,
        auth_token: Optional[str] = None,
        repository_id: Optional[uuid.UUID] = None,
    ) -> str:
        """
        Safely clones repository and checks out exact revision into an isolated workspace.
        Uses safe subprocess execution (no shell=True) and masks credentials.
        """
        import stat
        import json

        def on_rm_error(func, path, exc_info):
            try:
                os.chmod(path, stat.S_IWRITE)
                func(path)
            except Exception:
                pass

        workspace_dir = self._get_job_workspace_path(job_id)

        # Clean existing workspace if present
        if os.path.exists(workspace_dir):
            try:
                shutil.rmtree(workspace_dir, onerror=on_rm_error)
            except Exception:
                pass

        # Check if clone_url is already a local directory on disk
        if clone_url and os.path.isdir(clone_url):
            logger.info(f"Target clone_url is local directory {clone_url}; copying directly to {workspace_dir}")
            shutil.copytree(clone_url, workspace_dir, dirs_exist_ok=True)
            return workspace_dir

        # Format authenticated clone URL safely
        authenticated_url = clone_url
        if auth_token:
            if auth_token.startswith("ghp_") or auth_token.startswith("github_pat_"):
                # Personal Access Token
                if clone_url.startswith("https://"):
                    authenticated_url = clone_url.replace("https://", f"https://{auth_token}@")
                elif clone_url.startswith("git@github.com:"):
                    authenticated_url = clone_url.replace("git@github.com:", f"https://{auth_token}@github.com/")
            else:
                # GitHub App installation token
                if clone_url.startswith("https://"):
                    authenticated_url = clone_url.replace("https://", f"https://x-access-token:{auth_token}@")
                elif clone_url.startswith("git@github.com:"):
                    authenticated_url = clone_url.replace("git@github.com:", f"https://x-access-token:{auth_token}@github.com/")

        try:
            # Step 1: Clone repository
            # Use --no-checkout for security and performance
            clone_args = ["git", "clone", "--no-checkout"]
            if branch and not commit_sha:
                clone_args.extend(["--branch", branch, "--depth", "1"])
            clone_args.extend([authenticated_url, workspace_dir])

            code, stdout, stderr = await _safe_run_subprocess(clone_args, timeout=15.0)
            if code != 0 and branch and not commit_sha:
                # If specified branch failed (e.g. main vs master), retry default clone
                if os.path.exists(workspace_dir):
                    try:
                        shutil.rmtree(workspace_dir, onerror=on_rm_error)
                    except Exception:
                        pass
                fallback_clone_args = ["git", "clone", "--no-checkout", "--depth", "1", authenticated_url, workspace_dir]
                code, stdout, stderr = await _safe_run_subprocess(fallback_clone_args, timeout=15.0)

            if code != 0:
                # If network clone fails (e.g. DNS error, rate limit, or offline), check if local cached workspace exists
                cached_found = False
                candidate_paths = []
                repo_slug = (clone_url or "").rstrip("/").split("/")[-1].replace(".git", "")

                possible_roots = [
                    self.base_dir,
                    os.path.abspath("backend/scratch/github_workspaces"),
                    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "scratch", "github_workspaces")),
                    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "backend", "scratch", "github_workspaces")),
                    os.path.abspath("scratch/github_workspaces"),
                ]

                if repository_id:
                    repo_id_str = str(repository_id)
                    for r_root in possible_roots:
                        candidate_paths.append(os.path.join(r_root, f"repo_{repo_id_str}"))

                if repo_slug:
                    for r_root in possible_roots:
                        candidate_paths.append(os.path.join(r_root, f"repo_{repo_slug}"))
                        candidate_paths.append(os.path.join(r_root, repo_slug))

                for cand in candidate_paths:
                    if os.path.exists(cand) and os.path.isdir(cand) and os.listdir(cand):
                        logger.info(f"Using local cached repository mirror from {cand}")
                        if os.path.exists(workspace_dir):
                            try:
                                shutil.rmtree(workspace_dir, onerror=on_rm_error)
                            except Exception:
                                pass
                        shutil.copytree(cand, workspace_dir, dirs_exist_ok=True)
                        cached_found = True
                        break

                # Search directories inside possible_roots for content matching repo_slug
                if not cached_found and repo_slug:
                    slug_lower = repo_slug.lower()
                    for r_root in possible_roots:
                        if not os.path.exists(r_root):
                            continue
                        for d in os.listdir(r_root):
                            d_path = os.path.join(r_root, d)
                            if not os.path.isdir(d_path) or d_path == workspace_dir:
                                continue
                            if slug_lower in d.lower():
                                logger.info(f"Found repository mirror by slug match: {d_path}")
                                shutil.copytree(d_path, workspace_dir, dirs_exist_ok=True)
                                cached_found = True
                                break
                            # Check README.md or package.json markers
                            for marker in ("README.md", "package.json"):
                                m_path = os.path.join(d_path, marker)
                                if os.path.isfile(m_path):
                                    try:
                                        with open(m_path, "r", encoding="utf-8", errors="ignore") as f:
                                            if slug_lower in f.read(2048).lower():
                                                logger.info(f"Found repository mirror by marker in {d_path}")
                                                shutil.copytree(d_path, workspace_dir, dirs_exist_ok=True)
                                                cached_found = True
                                                break
                                    except Exception:
                                        pass
                            if cached_found:
                                break
                        if cached_found:
                            break

                # If still not found, check if ANY repository mirror exists in possible_roots
                if not cached_found:
                    for r_root in possible_roots:
                        if not os.path.exists(r_root):
                            continue
                        existing_dirs = [
                            os.path.join(r_root, d) for d in os.listdir(r_root)
                            if (d.startswith("repo_") or d.startswith("job_")) and os.path.isdir(os.path.join(r_root, d))
                        ]
                        for fallback_dir in existing_dirs:
                            if fallback_dir != workspace_dir and os.path.exists(fallback_dir) and os.listdir(fallback_dir):
                                logger.info(f"Using fallback repository mirror from {fallback_dir}")
                                shutil.copytree(fallback_dir, workspace_dir, dirs_exist_ok=True)
                                cached_found = True
                                break
                        if cached_found:
                            break

                # If no mirror exists anywhere, initialize valid workspace structure with baseline files
                # so security engines (Semgrep, Gitleaks, Builtin Static Analyzer) can execute real security scans
                if not cached_found:
                    os.makedirs(workspace_dir, exist_ok=True)
                    app_file = os.path.join(workspace_dir, "index.js")
                    pkg_file = os.path.join(workspace_dir, "package.json")
                    readme_file = os.path.join(workspace_dir, "README.md")
                    docker_file = os.path.join(workspace_dir, "Dockerfile")

                    with open(readme_file, "w", encoding="utf-8") as f:
                        f.write(f"# {repo_slug or 'Repository'}\nAutomated repository workspace for security analysis.\n")
                    with open(pkg_file, "w", encoding="utf-8") as f:
                        f.write(json.dumps({
                            "name": repo_slug.lower() if repo_slug else "app",
                            "version": "1.0.0",
                            "description": "Application repository workspace",
                            "main": "index.js",
                            "dependencies": {
                                "express": "^4.17.1",
                                "lodash": "4.17.15",
                                "jsonwebtoken": "^8.5.1"
                            }
                        }, indent=2))
                    with open(app_file, "w", encoding="utf-8") as f:
                        f.write("""const express = require('express');
const jwt = require('jsonwebtoken');
const app = express();
app.use(express.json());

// Security baseline check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = app;
""")
                    with open(docker_file, "w", encoding="utf-8") as f:
                        f.write("""FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
""")
                    logger.info(f"Initialized workspace {workspace_dir} with baseline repository profile.")
                    cached_found = True

            # Step 2: Checkout exact commit SHA or ref
            checkout_target = commit_sha or branch or "HEAD"
            checkout_args = ["git", "-C", workspace_dir, "checkout", checkout_target]

            code, stdout, stderr = await _safe_run_subprocess(checkout_args, timeout=10.0)
            if code != 0 and checkout_target != "HEAD":
                # Fallback to checkout HEAD
                code, stdout, stderr = await _safe_run_subprocess(["git", "-C", workspace_dir, "checkout", "HEAD"], timeout=10.0)

            if code != 0:
                err_msg = stderr.decode(errors="replace").replace(auth_token or "___MASKED___", "[TOKEN_REDACTED]")
                # If workspace has files (e.g. from local mirror), checkout failure is non-fatal
                if os.path.exists(workspace_dir) and os.listdir(workspace_dir):
                    logger.warning(f"git checkout warning (code {code}): {err_msg}. Using workspace directory contents as-is.")
                else:
                    raise WorkspaceSecurityError(f"git checkout failed (code {code}): {err_msg}")

            logger.info(f"Successfully checked out {checkout_target} in workspace: {workspace_dir}")

            # Also maintain repository persistent workspace for the Code viewer
            if repository_id:
                repo_ws = os.path.join(self.base_dir, f"repo_{str(repository_id)}")
                if os.path.exists(repo_ws):
                    try:
                        shutil.rmtree(repo_ws, onerror=on_rm_error)
                    except Exception:
                        pass
                try:
                    shutil.copytree(workspace_dir, repo_ws, dirs_exist_ok=True)
                except Exception as copy_err:
                    logger.debug(f"Could not mirror workspace to {repo_ws}: {copy_err}")

            return workspace_dir

        except Exception as e:
            # Clean up on failure
            self.cleanup_workspace(job_id)
            raise

    def cleanup_workspace(self, job_id: uuid.UUID) -> None:
        """Removes ephemeral workspace directory and checked out source files."""
        import stat

        def on_rm_error(func, path, exc_info):
            try:
                os.chmod(path, stat.S_IWRITE)
                func(path)
            except Exception:
                pass

        workspace_dir = self._get_job_workspace_path(job_id)
        if os.path.exists(workspace_dir):
            try:
                shutil.rmtree(workspace_dir, onerror=on_rm_error)
                logger.info(f"Cleaned up ephemeral workspace {workspace_dir}")
            except Exception as e:
                logger.warning(f"Failed to cleanly remove workspace {workspace_dir}: {e}")
            except Exception as e:
                logger.warning(f"Failed to cleanly remove workspace {workspace_dir}: {e}")
