"""
Jenkins Integration Client.

Wraps the Jenkins REST API for structured operations.
NEVER executes arbitrary shell, Groovy, or Jenkins scripts (Rule 29).
"""
import logging
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class JenkinsConnectionConfig:
    base_url: str
    # credential_reference points to the secure credential store
    credential_reference: Optional[str] = None
    # For testing: allow passing username/token directly (NEVER store in DB)
    _username: Optional[str] = None
    _api_token: Optional[str] = None


@dataclass
class JenkinsConnectionResult:
    status: str  # CONNECTED, NOT_CONFIGURED, AUTHENTICATION_FAILED, FORBIDDEN, UNAVAILABLE, ERROR
    version: Optional[str] = None
    error: Optional[str] = None


@dataclass
class JenkinsJobInfo:
    name: str
    url: str
    job_type: str
    description: Optional[str]


@dataclass
class JenkinsBuildInfo:
    number: int
    url: str
    status: str      # RUNNING, SUCCESS, FAILED, ABORTED
    result: Optional[str]
    timestamp: Optional[int]
    duration: Optional[int]
    commit_sha: Optional[str] = None


class JenkinsClient:
    """
    Structured Jenkins REST API client.
    No arbitrary script execution (Rule 29).
    """

    def __init__(self, config: JenkinsConnectionConfig):
        self.config = config

    def _get_auth(self):
        if self.config._username and self.config._api_token:
            return (self.config._username, self.config._api_token)
        return None

    def health_check(self) -> JenkinsConnectionResult:
        """Performs a real Jenkins API health check."""
        try:
            import requests
            auth = self._get_auth()
            if not auth and not self.config.credential_reference:
                return JenkinsConnectionResult(
                    status="NOT_CONFIGURED",
                    error="No credentials configured for Jenkins instance"
                )
            url = f"{self.config.base_url.rstrip('/')}/api/json"
            resp = requests.get(url, auth=auth, timeout=10)
            if resp.status_code == 401:
                return JenkinsConnectionResult(status="AUTHENTICATION_FAILED", error="401 Unauthorized")
            if resp.status_code == 403:
                return JenkinsConnectionResult(status="FORBIDDEN", error="403 Forbidden")
            if resp.status_code != 200:
                return JenkinsConnectionResult(status="UNAVAILABLE", error=f"HTTP {resp.status_code}")
            data = resp.json()
            # Jenkins version is in response headers
            version = resp.headers.get("X-Jenkins", "unknown")
            return JenkinsConnectionResult(status="CONNECTED", version=version)
        except ImportError:
            return JenkinsConnectionResult(
                status="NOT_CONFIGURED",
                error="requests library not installed"
            )
        except Exception as exc:
            logger.error("Jenkins health check failed: %s", exc, exc_info=True)
            return JenkinsConnectionResult(status="UNAVAILABLE", error=str(exc))

    def list_jobs(self) -> List[JenkinsJobInfo]:
        try:
            import requests
            auth = self._get_auth()
            url = f"{self.config.base_url.rstrip('/')}/api/json?tree=jobs[name,url,description,_class]"
            resp = requests.get(url, auth=auth, timeout=10)
            if resp.status_code != 200:
                return []
            data = resp.json()
            jobs = []
            for j in data.get("jobs", []):
                job_type = "PIPELINE" if "workflow" in j.get("_class", "").lower() else "FREESTYLE"
                jobs.append(JenkinsJobInfo(
                    name=j["name"],
                    url=j.get("url", ""),
                    job_type=job_type,
                    description=j.get("description"),
                ))
            return jobs
        except Exception as exc:
            logger.error("Jenkins list_jobs failed: %s", exc)
            return []

    def get_build(self, job_name: str, build_number: int) -> Optional[JenkinsBuildInfo]:
        try:
            import requests
            auth = self._get_auth()
            url = f"{self.config.base_url.rstrip('/')}/job/{job_name}/{build_number}/api/json"
            resp = requests.get(url, auth=auth, timeout=10)
            if resp.status_code != 200:
                return None
            data = resp.json()
            result = data.get("result")
            building = data.get("building", False)
            status = "RUNNING" if building else (result or "UNKNOWN")
            # Try to get commit SHA from SCM actions
            commit_sha = None
            for action in data.get("actions", []):
                if "lastBuiltRevision" in action:
                    commit_sha = action["lastBuiltRevision"].get("SHA1")
                    break
            return JenkinsBuildInfo(
                number=data["number"],
                url=data.get("url", ""),
                status=status,
                result=result,
                timestamp=data.get("timestamp"),
                duration=data.get("duration"),
                commit_sha=commit_sha,
            )
        except Exception as exc:
            logger.error("Jenkins get_build failed for %s#%d: %s", job_name, build_number, exc)
            return None

    def trigger_build(self, job_name: str, parameters: Optional[Dict[str, str]] = None) -> bool:
        """
        Trigger a Jenkins build via the REST API.
        Never executes arbitrary Groovy or shell scripts.
        """
        try:
            import requests
            auth = self._get_auth()
            if parameters:
                url = f"{self.config.base_url.rstrip('/')}/job/{job_name}/buildWithParameters"
                resp = requests.post(url, auth=auth, params=parameters, timeout=10)
            else:
                url = f"{self.config.base_url.rstrip('/')}/job/{job_name}/build"
                resp = requests.post(url, auth=auth, timeout=10)
            return resp.status_code in (200, 201, 204)
        except Exception as exc:
            logger.error("Jenkins trigger_build failed: %s", exc)
            return False

    def evaluate_security_gate(
        self,
        job_name: str,
        build_number: int,
        gate_result: str,  # ALLOW, WARN, BLOCK, REQUIRE_APPROVAL
        evidence: Dict[str, Any],
    ) -> bool:
        """
        Records the security gate decision for a Jenkins build.
        The decision comes from the platform's policy engine, not Jenkins itself.
        If gate_result == BLOCK, the upstream pipeline step should fail.
        """
        logger.info(
            "Security gate for %s#%d: %s. Evidence keys: %s",
            job_name, build_number, gate_result, list(evidence.keys())
        )
        # In a real integration, this would update a Jenkins build
        # parameter or external status check so the pipeline can read it.
        return gate_result in ("ALLOW", "WARN")
