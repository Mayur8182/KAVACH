"""
Docker Integration Client.

Wraps the Docker Engine API (via docker SDK or direct HTTP).
NEVER exposes the Docker socket to arbitrary callers.
"""
import logging
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class DockerConnectionConfig:
    docker_host: str = "unix:///var/run/docker.sock"
    tls_verify: bool = False
    cert_path: Optional[str] = None


@dataclass
class DockerConnectionResult:
    status: str  # CONNECTED, UNAVAILABLE, NOT_CONFIGURED, AUTHENTICATION_FAILED, ERROR
    version: Optional[str] = None
    api_version: Optional[str] = None
    os: Optional[str] = None
    architecture: Optional[str] = None
    error: Optional[str] = None


@dataclass
class DockerImageInfo:
    repository: str
    tag: Optional[str]
    digest: Optional[str]
    image_id: str
    architecture: Optional[str]
    os: Optional[str]
    size: Optional[int]
    labels: Dict[str, str] = field(default_factory=dict)


class DockerClient:
    """
    Structured Docker Engine API client.
    Never executes arbitrary Docker CLI commands (Rule 31).
    """

    def __init__(self, config: DockerConnectionConfig):
        self.config = config
        self._client = None

    def health_check(self) -> DockerConnectionResult:
        """
        Performs a real Docker API health check.
        Returns NOT_CONFIGURED if Docker SDK is not installed or daemon unreachable on Windows.
        """
        client = self._get_sdk_client()
        if client is None:
            return DockerConnectionResult(
                status="NOT_CONFIGURED",
                error="Docker SDK (docker) not installed. Install with: pip install docker"
            )
        try:
            info = client.info()
            version_info = client.version()
            return DockerConnectionResult(
                status="CONNECTED",
                version=version_info.get("Version"),
                api_version=version_info.get("ApiVersion"),
                os=info.get("OperatingSystem"),
                architecture=info.get("Architecture"),
            )
        except Exception as exc:
            logger.warning("Docker health check failed: %s", exc)
            error_msg = str(exc)
            if "permission" in error_msg.lower() or "denied" in error_msg.lower():
                return DockerConnectionResult(status="AUTHENTICATION_FAILED", error=error_msg)
            return DockerConnectionResult(status="UNAVAILABLE", error=error_msg)

    def _get_sdk_client(self):
        """Lazily initialise the Docker SDK client."""
        try:
            import docker
            if self.config.tls_verify and self.config.cert_path:
                tls_config = docker.tls.TLSConfig(
                    ca_cert=f"{self.config.cert_path}/ca.pem",
                    client_cert=(
                        f"{self.config.cert_path}/cert.pem",
                        f"{self.config.cert_path}/key.pem",
                    ),
                    verify=True,
                )
                return docker.DockerClient(base_url=self.config.docker_host, tls=tls_config)
            return docker.DockerClient(base_url=self.config.docker_host)
        except ImportError:
            return None
        except Exception:
            # DockerException, socket errors on Windows, etc.
            return None

    def inspect_image(self, repository: str, tag: str = "latest") -> Optional[DockerImageInfo]:
        """
        Inspect a local Docker image. Returns None if the image is not found.
        """
        client = self._get_sdk_client()
        if client is None:
            return None
        try:
            ref = f"{repository}:{tag}" if tag else repository
            img = client.images.get(ref)
            attrs = img.attrs
            repo_digests = attrs.get("RepoDigests", [])
            digest = repo_digests[0].split("@")[-1] if repo_digests else None
            return DockerImageInfo(
                repository=repository,
                tag=tag,
                digest=digest,
                image_id=attrs.get("Id", ""),
                architecture=attrs.get("Architecture"),
                os=attrs.get("Os"),
                size=attrs.get("Size"),
                labels=attrs.get("Config", {}).get("Labels") or {},
            )
        except Exception as exc:
            logger.error("Docker image inspect failed for %s:%s — %s", repository, tag, exc)
            return None

    def list_images(self) -> List[DockerImageInfo]:
        """List locally available images. Returns empty list if Docker unavailable."""
        client = self._get_sdk_client()
        if client is None:
            return []
        try:
            images = client.images.list()
            result = []
            for img in images:
                tags = img.tags
                repo = tags[0].split(":")[0] if tags else "<none>"
                tag = tags[0].split(":")[-1] if tags else None
                repo_digests = img.attrs.get("RepoDigests", [])
                digest = repo_digests[0].split("@")[-1] if repo_digests else None
                result.append(DockerImageInfo(
                    repository=repo,
                    tag=tag,
                    digest=digest,
                    image_id=img.id,
                    architecture=img.attrs.get("Architecture"),
                    os=img.attrs.get("Os"),
                    size=img.attrs.get("Size"),
                    labels=img.attrs.get("Config", {}).get("Labels") or {},
                ))
            return result
        except Exception as exc:
            logger.error("Docker list_images failed: %s", exc)
            return []
