"""
Wipe All Security Scan, Findings, Repository, and Pipeline Data
Cleans out all previously seeded and test data from the SQLite / PostgreSQL database,
returning the entire platform to a pristine 0-data clean slate.
Preserves user authentication and organization tenant structures.
"""

import asyncio
import logging
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import delete
from app.core.database import AsyncSessionLocal, get_session_factory

# Import models
from app.models.scan import (
    SecurityFinding,
    SecurityScan,
    ScannerExecution,
    RequirementVerificationResult,
)
from app.models.github import (
    GitHubSecurityJob,
    GitHubPullRequest,
    GitHubCommit,
    GitHubWebhookEvent,
    GitHubRepository,
    SecurityJobSchedule,
)
from app.models.remediation import (
    RemediationPlan,
    RemediationPatch,
    RemediationValidation,
)
from app.models.sbom import (
    SBOMJob,
    SBOMDocument,
    SBOMComponent,
)
from app.models.hotspot import Hotspot, HotspotComment, HotspotHistory
from app.models.policy import SecurityDecision
from app.models.code_config import CodeSecurityConfig

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("wipe-data")


async def wipe_all_data():
    factory = get_session_factory()
    async with factory() as db:
        logger.info("Initiating full clean slate wipeout...")

        # 1. Remediation data
        await db.execute(delete(RemediationValidation))
        await db.execute(delete(RemediationPatch))
        await db.execute(delete(RemediationPlan))
        logger.info("Cleared Remediation plans, patches, and validations.")

        # 2. Findings & Scans
        await db.execute(delete(SecurityFinding))
        await db.execute(delete(RequirementVerificationResult))
        await db.execute(delete(ScannerExecution))
        await db.execute(delete(SecurityScan))
        logger.info("Cleared SecurityFindings, Executions, and Scans.")

        # 3. SBOM Data
        await db.execute(delete(SBOMComponent))
        await db.execute(delete(SBOMDocument))
        await db.execute(delete(SBOMJob))
        logger.info("Cleared SBOMComponents, Documents, and Jobs.")

        # 4. Security Hotspots & Decisions
        try:
            await db.execute(delete(HotspotComment))
            await db.execute(delete(HotspotHistory))
            await db.execute(delete(Hotspot))
            logger.info("Cleared Security Hotspots.")
        except Exception as e:
            logger.warning(f"Note on Hotspots: {e}")

        try:
            await db.execute(delete(SecurityDecision))
            logger.info("Cleared SecurityDecisions.")
        except Exception as e:
            logger.warning(f"Note on SecurityDecision: {e}")

        # 5. GitHub Security Jobs, PRs, Commits, Repositories
        await db.execute(delete(GitHubSecurityJob))
        await db.execute(delete(GitHubPullRequest))
        await db.execute(delete(GitHubCommit))
        await db.execute(delete(GitHubWebhookEvent))
        try:
            await db.execute(delete(SecurityJobSchedule))
        except Exception:
            pass
        await db.execute(delete(GitHubRepository))
        logger.info("Cleared GitHub repositories, jobs, PRs, and commits.")

        # 6. Reset Code Security Configs
        try:
            await db.execute(delete(CodeSecurityConfig))
            logger.info("Reset CodeSecurityConfigs.")
        except Exception:
            pass

        # 7. Container & Docker Models if present
        try:
            from app.models.docker_models import DockerImage, DockerContainer, ContainerImageFinding
            await db.execute(delete(ContainerImageFinding))
            await db.execute(delete(DockerContainer))
            await db.execute(delete(DockerImage))
            logger.info("Cleared Docker models and container image findings.")
        except Exception:
            pass

        # 8. Kubernetes Models if present
        try:
            from app.models.kubernetes_models import KubernetesCluster, KubernetesWorkload
            await db.execute(delete(KubernetesWorkload))
            await db.execute(delete(KubernetesCluster))
            logger.info("Cleared Kubernetes models.")
        except Exception:
            pass

        # 9. IaC Drift Models if present
        try:
            from app.models.iac_drift_models import IaCDriftResource, IaCDriftEvent
            await db.execute(delete(IaCDriftEvent))
            await db.execute(delete(IaCDriftResource))
            logger.info("Cleared IaC drift models.")
        except Exception:
            pass

        await db.commit()
        logger.info("SUCCESS: Database completely wiped to 0-data clean slate! Ready for fresh GitHub repo connect.")


if __name__ == "__main__":
    asyncio.run(wipe_all_data())
