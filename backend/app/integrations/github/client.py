import asyncio
from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional, Tuple
import httpx

from app.core.config import get_settings
from app.integrations.github.auth import GitHubAppAuth
from app.integrations.github.models import (
    GitHubCheckRunCreate,
    GitHubCheckRunUpdate,
    GitHubCommitInfo,
    GitHubPullRequestInfo,
    GitHubRepoInfo,
)

logger = logging.getLogger(__name__)


class GitHubAPIException(Exception):
    """Base exception for GitHub API errors preserving semantic status."""

    def __init__(self, status_code: int, code: str, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(f"[{code}] {message} (HTTP {status_code})")
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details or {}


class GitHubClient:
    """
    Typed, asynchronous GitHub REST API client.
    Supports App authentication, installation access tokens, automatic backoff retry for transient
    failures, rate limit inspection, Check Runs, pull requests, and commit inspections.
    """

    GITHUB_API_BASE = "https://api.github.com"

    def __init__(self, auth: Optional[GitHubAppAuth] = None):
        self.auth = auth or GitHubAppAuth()
        self.settings = get_settings()

    async def _get_app_headers(self) -> Dict[str, str]:
        """Headers authenticated with GitHub App JWT."""
        jwt_token = self.auth.generate_app_jwt()
        return {
            "Authorization": f"Bearer {jwt_token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": f"SecureAI-Control-Plane/{self.settings.app_name}",
        }

    async def get_installation_token(self, installation_id: int) -> str:
        """
        Retrieves a short-lived installation access token, using the in-memory cache if valid.
        Otherwise requests a fresh token from GitHub using App JWT.
        """
        cached = self.auth.get_cached_installation_token(installation_id)
        if cached:
            return cached

        headers = await self._get_app_headers()
        url = f"{self.GITHUB_API_BASE}/app/installations/{installation_id}/access_tokens"

        res_data = await self._request_with_retry("POST", url, headers=headers, json_body={})
        token = res_data["token"]
        expires_at_str = res_data.get("expires_at")
        if expires_at_str:
            # Parse ISO 8601 string to timestamp
            dt = datetime.fromisoformat(expires_at_str.replace("Z", "+00:00"))
            exp_ts = dt.timestamp()
        else:
            exp_ts = datetime.now(timezone.utc).timestamp() + 3600

        self.auth.store_cached_installation_token(installation_id, token, exp_ts)
        return token

    async def _get_installation_headers(self, installation_id: int) -> Dict[str, str]:
        """Headers authenticated with a short-lived installation token."""
        token = await self.get_installation_token(installation_id)
        return {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": f"SecureAI-Control-Plane/{self.settings.app_name}",
        }

    async def _request_with_retry(
        self,
        method: str,
        url: str,
        headers: Dict[str, str],
        json_body: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        max_retries: int = 3,
    ) -> Any:
        """
        Executes HTTP request with exponential backoff for transient errors (502, 503, 504, 429).
        Preserves semantic status codes without silent failures.
        """
        attempt = 0
        backoff_delay = 1.0

        async with httpx.AsyncClient(timeout=20.0) as client:
            while attempt < max_retries:
                attempt += 1
                try:
                    response = await client.request(
                        method=method,
                        url=url,
                        headers=headers,
                        json=json_body,
                        params=params,
                    )

                    # Successful response (2xx)
                    if 200 <= response.status_code < 300:
                        if response.status_code == 204:
                            return None
                        return response.json()

                    # Semantic Error Classification
                    status_code = response.status_code
                    body_json = {}
                    try:
                        body_json = response.json()
                    except Exception:
                        pass
                    msg = body_json.get("message", response.text)

                    # Transient retries: 429, 502, 503, 504
                    if status_code in (429, 502, 503, 504) and attempt < max_retries:
                        logger.warning(
                            f"GitHub API transient error {status_code} on {method} {url}. Retrying in {backoff_delay}s..."
                        )
                        await asyncio.sleep(backoff_delay)
                        backoff_delay *= 2
                        continue

                    if status_code == 401:
                        raise GitHubAPIException(401, "AUTHENTICATION_FAILED", f"GitHub authentication failed: {msg}", body_json)
                    elif status_code == 403:
                        raise GitHubAPIException(403, "PERMISSION_DENIED", f"GitHub permission denied: {msg}", body_json)
                    elif status_code == 404:
                        raise GitHubAPIException(404, "RESOURCE_NOT_FOUND", f"GitHub resource not found: {msg}", body_json)
                    elif status_code == 422:
                        raise GitHubAPIException(422, "UNPROCESSABLE_ENTITY", f"GitHub validation error: {msg}", body_json)
                    elif status_code == 429:
                        raise GitHubAPIException(429, "RATE_LIMITED", f"GitHub API rate limit exceeded: {msg}", body_json)
                    elif status_code >= 500:
                        raise GitHubAPIException(status_code, "GITHUB_SERVICE_ERROR", f"GitHub service error: {msg}", body_json)
                    else:
                        raise GitHubAPIException(status_code, "API_ERROR", f"GitHub API returned error: {msg}", body_json)

                except httpx.TimeoutException as exc:
                    if attempt < max_retries:
                        logger.warning(f"GitHub API timeout on {method} {url}. Retrying in {backoff_delay}s...")
                        await asyncio.sleep(backoff_delay)
                        backoff_delay *= 2
                        continue
                    raise GitHubAPIException(504, "TIMEOUT", f"GitHub API request timed out: {exc}")
                except httpx.RequestError as exc:
                    if attempt < max_retries:
                        logger.warning(f"GitHub network request error: {exc}. Retrying in {backoff_delay}s...")
                        await asyncio.sleep(backoff_delay)
                        backoff_delay *= 2
                        continue
                    raise GitHubAPIException(500, "NETWORK_ERROR", f"Network error communicating with GitHub: {exc}")

        raise GitHubAPIException(500, "RETRIES_EXHAUSTED", f"GitHub API request failed after {max_retries} attempts")

    # -------------------------------------------------------------------------
    # App & Installation Inspection
    # -------------------------------------------------------------------------

    async def get_app_info(self) -> Dict[str, Any]:
        """Returns metadata about the configured GitHub App."""
        headers = await self._get_app_headers()
        url = f"{self.GITHUB_API_BASE}/app"
        return await self._request_with_retry("GET", url, headers=headers)

    async def get_installation(self, installation_id: int) -> Dict[str, Any]:
        """Fetches installation metadata using App credentials."""
        headers = await self._get_app_headers()
        url = f"{self.GITHUB_API_BASE}/app/installations/{installation_id}"
        return await self._request_with_retry("GET", url, headers=headers)

    async def list_installation_repositories(self, installation_id: int) -> List[GitHubRepoInfo]:
        """Lists repositories accessible to a specific installation."""
        headers = await self._get_installation_headers(installation_id)
        url = f"{self.GITHUB_API_BASE}/installation/repositories"
        data = await self._request_with_retry("GET", url, headers=headers, params={"per_page": 100})
        repositories = data.get("repositories", [])
        result = []
        for r in repositories:
            result.append(
                GitHubRepoInfo(
                    id=r["id"],
                    owner=r["owner"]["login"],
                    name=r["name"],
                    full_name=r["full_name"],
                    default_branch=r.get("default_branch", "main"),
                    private=r.get("private", True),
                    html_url=r.get("html_url", ""),
                    clone_url=r.get("clone_url", ""),
                    ssh_url=r.get("ssh_url"),
                    visibility=r.get("visibility", "private"),
                    archived=r.get("archived", False),
                    permissions=r.get("permissions"),
                )
            )
        return result

    # -------------------------------------------------------------------------
    # Repository, Branch & Commit Operations
    # -------------------------------------------------------------------------

    async def get_repository(self, owner: str, repo: str, installation_id: int) -> GitHubRepoInfo:
        """Retrieves verified repository details."""
        headers = await self._get_installation_headers(installation_id)
        url = f"{self.GITHUB_API_BASE}/repos/{owner}/{repo}"
        r = await self._request_with_retry("GET", url, headers=headers)
        return GitHubRepoInfo(
            id=r["id"],
            owner=r["owner"]["login"],
            name=r["name"],
            full_name=r["full_name"],
            default_branch=r.get("default_branch", "main"),
            private=r.get("private", True),
            html_url=r.get("html_url", ""),
            clone_url=r.get("clone_url", ""),
            ssh_url=r.get("ssh_url"),
            visibility=r.get("visibility", "private"),
            archived=r.get("archived", False),
            permissions=r.get("permissions"),
        )

    async def get_branch(self, owner: str, repo: str, branch: str, installation_id: int) -> Dict[str, Any]:
        """Fetches branch info and tip commit SHA."""
        headers = await self._get_installation_headers(installation_id)
        url = f"{self.GITHUB_API_BASE}/repos/{owner}/{repo}/branches/{branch}"
        return await self._request_with_retry("GET", url, headers=headers)

    async def get_commit(self, owner: str, repo: str, sha: str, installation_id: int) -> GitHubCommitInfo:
        """Fetches commit details from GitHub."""
        headers = await self._get_installation_headers(installation_id)
        url = f"{self.GITHUB_API_BASE}/repos/{owner}/{repo}/commits/{sha}"
        data = await self._request_with_retry("GET", url, headers=headers)
        commit_meta = data.get("commit", {})
        committer = commit_meta.get("committer", {})
        committed_at_str = committer.get("date")
        committed_at = None
        if committed_at_str:
            try:
                committed_at = datetime.fromisoformat(committed_at_str.replace("Z", "+00:00"))
            except Exception:
                pass

        author_login = None
        if data.get("author"):
            author_login = data["author"].get("login")

        return GitHubCommitInfo(
            sha=data["sha"],
            message=commit_meta.get("message"),
            author_login=author_login,
            committed_at=committed_at,
        )

    # -------------------------------------------------------------------------
    # Pull Requests
    # -------------------------------------------------------------------------

    async def get_pull_request(self, owner: str, repo: str, pr_number: int, installation_id: int) -> GitHubPullRequestInfo:
        """Fetches real pull request state from GitHub."""
        headers = await self._get_installation_headers(installation_id)
        url = f"{self.GITHUB_API_BASE}/repos/{owner}/{repo}/pulls/{pr_number}"
        pr = await self._request_with_retry("GET", url, headers=headers)
        return GitHubPullRequestInfo(
            id=pr["id"],
            number=pr["number"],
            title=pr["title"],
            state=pr["state"],
            head_sha=pr["head"]["sha"],
            base_sha=pr["base"]["sha"],
            head_ref=pr["head"]["ref"],
            base_ref=pr["base"]["ref"],
            author_login=pr.get("user", {}).get("login"),
            draft=pr.get("draft", False),
            merged=pr.get("merged", False),
            html_url=pr.get("html_url", ""),
        )

    # -------------------------------------------------------------------------
    # GitHub Check Runs
    # -------------------------------------------------------------------------

    async def create_check_run(
        self,
        owner: str,
        repo: str,
        data: GitHubCheckRunCreate,
        installation_id: int,
    ) -> Dict[str, Any]:
        """Creates a real GitHub Check Run on the commit."""
        headers = await self._get_installation_headers(installation_id)
        url = f"{self.GITHUB_API_BASE}/repos/{owner}/{repo}/check-runs"
        payload = data.model_dump(exclude_none=True)
        return await self._request_with_retry("POST", url, headers=headers, json_body=payload)

    async def update_check_run(
        self,
        owner: str,
        repo: str,
        check_run_id: int,
        data: GitHubCheckRunUpdate,
        installation_id: int,
    ) -> Dict[str, Any]:
        """Updates status and conclusion of an existing Check Run."""
        headers = await self._get_installation_headers(installation_id)
        url = f"{self.GITHUB_API_BASE}/repos/{owner}/{repo}/check-runs/{check_run_id}"
        payload = data.model_dump(exclude_none=True)
        return await self._request_with_retry("PATCH", url, headers=headers, json_body=payload)

    # -------------------------------------------------------------------------
    # Pull Request Bot Comments (Stable single comment update)
    # -------------------------------------------------------------------------

    async def create_or_update_pr_comment(
        self,
        owner: str,
        repo: str,
        pr_number: int,
        body: str,
        marker: str = "<!-- secure-control-plane-comment -->",
        installation_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Creates or updates a single stable bot comment on a pull request to prevent comment spam.
        Searches existing comments for the unique hidden HTML marker.
        """
        if not installation_id:
            raise ValueError("installation_id is required to post PR comments")

        headers = await self._get_installation_headers(installation_id)
        comments_url = f"{self.GITHUB_API_BASE}/repos/{owner}/{repo}/issues/{pr_number}/comments"

        full_body = f"{marker}\n{body}"

        # 1. Fetch recent comments on this PR
        comments = await self._request_with_retry("GET", comments_url, headers=headers, params={"per_page": 50})
        existing_comment_id = None
        for c in comments:
            if marker in c.get("body", ""):
                existing_comment_id = c["id"]
                break

        # 2. Update existing comment or create new one
        if existing_comment_id:
            update_url = f"{self.GITHUB_API_BASE}/repos/{owner}/{repo}/issues/comments/{existing_comment_id}"
            return await self._request_with_retry("PATCH", update_url, headers=headers, json_body={"body": full_body})
        else:
            return await self._request_with_retry("POST", comments_url, headers=headers, json_body={"body": full_body})
