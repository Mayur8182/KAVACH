"""
Seed script for CI/CD Extended Models using SQLAlchemy AsyncSession:
This guarantees exact column type coercion (UUID hex encoding, JSON serialization, etc.)
matching SQLAlchemy dialect rules.
"""
import asyncio
import os
import sys
import uuid
import json
from datetime import datetime, timedelta, timezone

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import AsyncSessionLocal, engine
from app.models.base import Base
from app.models.github import GitHubRepository
from app.models.project import Project
from app.models.cicd import CICDEnvironment, CICDIntegration, CICDJob, CICDTemplate
from app.services.cicd_service import CICDService
from sqlalchemy import delete

REPO_ID = uuid.UUID("0ece8aa7-2b82-4709-ad39-957d588d73cc")
PROJECT_ID = uuid.UUID("a760419491d04d24ae50844e4d055d75")

async def seed():
    # 0. Ensure all tables (including cicd_jobs) are created
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # 1. Clean existing records for clean canonical seed
        await session.execute(delete(CICDJob).where(CICDJob.repository_id == REPO_ID))
        await session.execute(delete(CICDEnvironment).where(CICDEnvironment.repository_id == REPO_ID))
        await session.execute(delete(CICDIntegration).where(CICDIntegration.project_id == PROJECT_ID))
        await session.execute(delete(CICDTemplate).where(CICDTemplate.project_id == PROJECT_ID))
        await session.commit()

        now = datetime.now(timezone.utc)

        # 2. Environments
        envs = [
            CICDEnvironment(
                id=uuid.uuid4(),
                project_id=PROJECT_ID,
                repository_id=REPO_ID,
                name="Production",
                status="Healthy",
                icon_type="box",
                version="v1.2.3",
                branch="main",
                region="Mumbai (ap-south-1)",
                url="https://frontend.example.com",
                last_deployed_at=now - timedelta(hours=2),
                uptime_str="15 days 6 hours",
                auto_deploy=True,
                commit_sha="a1b2c3d",
                response_time_ms=120,
                cpu_usage_percent=34,
                memory_usage_percent=56,
                pods_ready=3,
                pods_total=3,
                order_priority=1,
                deployments_history=[
                    {"version": "v1.2.3", "relative_time": "2 hours ago", "branch": "main", "status": "Success"},
                    {"version": "v1.2.2", "relative_time": "1 day ago", "branch": "main", "status": "Success"},
                    {"version": "v1.2.1", "relative_time": "3 days ago", "branch": "main", "status": "Failed"},
                    {"version": "v1.2.0", "relative_time": "5 days ago", "branch": "main", "status": "Success"},
                ],
                variables=[
                    {"key": "NODE_ENV", "value": "production", "is_secret": False},
                    {"key": "PORT", "value": "3000", "is_secret": False},
                    {"key": "NEXT_PUBLIC_API_URL", "value": "https://api.seculayer.io", "is_secret": False},
                ],
                secrets=[
                    {"key": "DATABASE_URL", "value": "••••••••••••••••••••••••", "last_updated": "10 days ago"},
                    {"key": "API_SECRET_KEY", "value": "••••••••••••••••••••••••", "last_updated": "15 days ago"},
                ],
            ),
            CICDEnvironment(
                id=uuid.uuid4(),
                project_id=PROJECT_ID,
                repository_id=REPO_ID,
                name="Staging",
                status="Healthy",
                icon_type="layers",
                version="v1.2.3-rc.1",
                branch="develop",
                region="Mumbai (ap-south-1)",
                url="https://staging.example.com",
                last_deployed_at=now - timedelta(hours=6),
                uptime_str="30 days",
                auto_deploy=True,
                commit_sha="8f39a12",
                response_time_ms=210,
                cpu_usage_percent=28,
                memory_usage_percent=48,
                pods_ready=2,
                pods_total=2,
                order_priority=2,
                deployments_history=[
                    {"version": "v1.2.3-rc.1", "relative_time": "6 hours ago", "branch": "develop", "status": "Success"},
                    {"version": "v1.2.2-rc.2", "relative_time": "2 days ago", "branch": "develop", "status": "Success"},
                ],
                variables=[{"key": "NODE_ENV", "value": "staging", "is_secret": False}],
                secrets=[],
            ),
            CICDEnvironment(
                id=uuid.uuid4(),
                project_id=PROJECT_ID,
                repository_id=REPO_ID,
                name="Development",
                status="Degraded",
                icon_type="cube",
                version="v1.2.2",
                branch="develop",
                region="Mumbai (ap-south-1)",
                url="https://dev.example.com",
                last_deployed_at=now - timedelta(days=1),
                uptime_str="4 days 12 hours",
                auto_deploy=True,
                commit_sha="3e71d44",
                response_time_ms=450,
                cpu_usage_percent=62,
                memory_usage_percent=78,
                pods_ready=1,
                pods_total=2,
                order_priority=3,
                deployments_history=[
                    {"version": "v1.2.2", "relative_time": "1 day ago", "branch": "develop", "status": "Success"},
                    {"version": "v1.2.1-dev", "relative_time": "3 days ago", "branch": "develop", "status": "Failed"},
                ],
                variables=[{"key": "NODE_ENV", "value": "development", "is_secret": False}],
                secrets=[],
            ),
            CICDEnvironment(
                id=uuid.uuid4(),
                project_id=PROJECT_ID,
                repository_id=REPO_ID,
                name="Preview",
                status="Inactive",
                icon_type="preview",
                version="-",
                branch="feature/*",
                region="Mumbai (ap-south-1)",
                url=None,
                last_deployed_at=now - timedelta(days=3),
                uptime_str="—",
                auto_deploy=False,
                commit_sha=None,
                response_time_ms=0,
                cpu_usage_percent=0,
                memory_usage_percent=0,
                pods_ready=0,
                pods_total=0,
                order_priority=4,
                deployments_history=[],
                variables=[],
                secrets=[],
            ),
        ]
        for e in envs:
            session.add(e)

        # 3. Integrations
        integrations = [
            CICDIntegration(
                id=uuid.uuid4(),
                project_id=PROJECT_ID,
                name="GitHub",
                provider_key="github",
                status="Connected",
                icon_key="github",
                category="Source Control",
                subtext="github.com/nj-group",
                connection_endpoint="nj-group/frontend-app",
                account="nj-group",
                repository_name="frontend-app",
                branch="main",
                url="https://github.com/nj-group/frontend-app",
                last_sync_at=now - timedelta(hours=2),
                webhook_status="Active",
                events=["Push", "Pull Request", "Release"],
                webhook_events=[
                    {"name": "Push events", "status": "Active"},
                    {"name": "Pull request events", "status": "Active"},
                    {"name": "Release events", "status": "Active"},
                    {"name": "Issue events", "status": "Inactive"},
                    {"name": "Deployment events", "status": "Active"},
                ],
                created_by="Mayur K.",
                permissions=["repo", "admin:repo_hook", "workflow", "read:packages"],
                logs=[
                    {"event": "Webhook ping", "status": "200 OK", "time": "2 hours ago"},
                    {"event": "Sync repository tree", "status": "Completed", "time": "2 hours ago"},
                ],
                order_priority=1,
            ),
            CICDIntegration(
                id=uuid.uuid4(),
                project_id=PROJECT_ID,
                name="GitLab",
                provider_key="gitlab",
                status="Connected",
                icon_key="gitlab",
                category="Source Control",
                subtext="gitlab.com/nj-group",
                connection_endpoint="nj-group/frontend-app",
                account="nj-group",
                repository_name="frontend-app",
                branch="main",
                url="https://gitlab.com/nj-group/frontend-app",
                last_sync_at=now - timedelta(hours=6),
                webhook_status="Active",
                events=["Push", "Merge Request"],
                webhook_events=[
                    {"name": "Push events", "status": "Active"},
                    {"name": "Merge request events", "status": "Active"},
                ],
                created_by="Mayur K.",
                permissions=["api", "read_repository"],
                logs=[{"event": "Health check", "status": "200 OK", "time": "6 hours ago"}],
                order_priority=2,
            ),
            CICDIntegration(
                id=uuid.uuid4(),
                project_id=PROJECT_ID,
                name="Jenkins",
                provider_key="jenkins",
                status="Connected",
                icon_key="jenkins",
                category="CI/CD",
                subtext="jenkins.nj-group.com",
                connection_endpoint="jenkins-pipeline",
                account="nj-group",
                repository_name="frontend-app",
                branch="main",
                url="https://jenkins.nj-group.com/job/frontend-app",
                last_sync_at=now - timedelta(minutes=10),
                webhook_status="Active",
                events=["Job Trigger", "Build Finish"],
                webhook_events=[
                    {"name": "Job Trigger", "status": "Active"},
                    {"name": "Build Finish", "status": "Active"},
                ],
                created_by="Mayur K.",
                permissions=["Job/Build", "Job/Read"],
                logs=[{"event": "Polling build status", "status": "200 OK", "time": "10 minutes ago"}],
                order_priority=3,
            ),
            CICDIntegration(
                id=uuid.uuid4(),
                project_id=PROJECT_ID,
                name="GitHub Actions",
                provider_key="github-actions",
                status="Connected",
                icon_key="github-actions",
                category="CI/CD",
                subtext="github-actions",
                connection_endpoint="ci-cd.yml",
                account="nj-group",
                repository_name="frontend-app",
                branch="main",
                url="https://github.com/nj-group/frontend-app/actions",
                last_sync_at=now - timedelta(minutes=5),
                webhook_status="Active",
                events=["workflow_dispatch", "workflow_run"],
                webhook_events=[
                    {"name": "workflow_dispatch", "status": "Active"},
                    {"name": "workflow_run", "status": "Active"},
                ],
                created_by="Mayur K.",
                permissions=["actions:read", "actions:write"],
                logs=[{"event": "Workflow status sync", "status": "200 OK", "time": "5 minutes ago"}],
                order_priority=4,
            ),
            CICDIntegration(
                id=uuid.uuid4(),
                project_id=PROJECT_ID,
                name="SonarQube",
                provider_key="sonarqube",
                status="Connected",
                icon_key="sonarqube",
                category="Security",
                subtext="sonarqube.nj-group.com",
                connection_endpoint="sonar-project",
                account="nj-group",
                repository_name="frontend-app",
                branch="main",
                url="https://sonarqube.nj-group.com/dashboard?id=frontend-app",
                last_sync_at=now - timedelta(hours=1),
                webhook_status="Active",
                events=["Quality Gate Passed", "Analysis Completed"],
                webhook_events=[
                    {"name": "Quality Gate Passed", "status": "Active"},
                    {"name": "Analysis Completed", "status": "Active"},
                ],
                created_by="Mayur K.",
                permissions=["scan:read", "project:admin"],
                logs=[{"event": "Quality gate sync", "status": "200 OK", "time": "1 hour ago"}],
                order_priority=5,
            ),
            CICDIntegration(
                id=uuid.uuid4(),
                project_id=PROJECT_ID,
                name="Snyk",
                provider_key="snyk",
                status="Failed",
                icon_key="snyk",
                category="Security",
                subtext="snyk.io",
                connection_endpoint="nj-group-frontend",
                account="nj-group",
                repository_name="frontend-app",
                branch="main",
                url="https://app.snyk.io/org/nj-group",
                last_sync_at=now - timedelta(hours=3),
                webhook_status="Inactive",
                events=["Vulnerability Alert"],
                webhook_events=[{"name": "Vulnerability Alert", "status": "Inactive"}],
                created_by="Mayur K.",
                permissions=["read:org"],
                logs=[{"event": "API token verification", "status": "401 Unauthorized", "time": "3 hours ago"}],
                order_priority=6,
            ),
            CICDIntegration(
                id=uuid.uuid4(),
                project_id=PROJECT_ID,
                name="Docker Hub",
                provider_key="docker-hub",
                status="Connected",
                icon_key="docker",
                category="Artifact Registry",
                subtext="docker.io/nj-group",
                connection_endpoint="nj-group/frontend-app",
                account="nj-group",
                repository_name="frontend-app",
                branch="main",
                url="https://hub.docker.com/r/nj-group/frontend-app",
                last_sync_at=now - timedelta(hours=4),
                webhook_status="Active",
                events=["Image Push", "Tag Update"],
                webhook_events=[
                    {"name": "Image Push", "status": "Active"},
                    {"name": "Tag Update", "status": "Active"},
                ],
                created_by="Mayur K.",
                permissions=["repo:admin"],
                logs=[{"event": "Registry ping", "status": "200 OK", "time": "4 hours ago"}],
                order_priority=7,
            ),
            CICDIntegration(
                id=uuid.uuid4(),
                project_id=PROJECT_ID,
                name="AWS ECR",
                provider_key="aws-ecr",
                status="Connected",
                icon_key="aws",
                category="Artifact Registry",
                subtext="awsecr(ap-south-1)",
                connection_endpoint="123456789012.dkr.ecr.ap-south-1.amazonaws.com",
                account="123456789012",
                repository_name="frontend-app",
                branch="main",
                url="https://ap-south-1.console.aws.amazon.com/ecr/repositories/frontend-app",
                last_sync_at=now - timedelta(hours=6),
                webhook_status="Active",
                events=["Push Image", "Scan on Push"],
                webhook_events=[
                    {"name": "Push Image", "status": "Active"},
                    {"name": "Scan on Push", "status": "Active"},
                ],
                created_by="Mayur K.",
                permissions=["ecr:GetAuthorizationToken", "ecr:BatchCheckLayerAvailability"],
                logs=[{"event": "ECR STS auth token refreshed", "status": "200 OK", "time": "6 hours ago"}],
                order_priority=8,
            ),
        ]
        for item in integrations:
            session.add(item)

        # 4. Templates
        templates_base = [
            ("Next.js CI/CD", "nextjs-ci", "Web Application", "CI/CD Pipeline", "Next.js", "Build, test and deploy Next.js application with optimized settings for production.", 1, 0, 1, ["nextjs", "nodejs", "vercel"], "nextjs", 1200, "4.8", 128),
            ("React CI/CD", "react-ci", "Web Application", "CI/CD Pipeline", "React", "CI/CD pipeline for React applications with testing and build optimization.", 1, 0, 0, ["react", "nodejs", "docker"], "react", 890, "4.7", 94),
            ("Node.js CI/CD", "nodejs-ci", "Web Application", "CI/CD Pipeline", "Node.js", "Build, test and deploy Node.js applications with automated linting.", 1, 0, 0, ["nodejs", "npm", "docker"], "nodejs", 750, "4.6", 82),
            ("Docker Build & Deploy", "docker-deploy", "Container", "Deployment", "Docker", "Build and push Docker images to container registry with layer caching.", 1, 0, 0, ["docker", "build", "registry"], "docker", 920, "4.9", 110),
            ("Kubernetes Deploy", "k8s-deploy", "Container", "Deployment", "Kubernetes", "Deploy application to Kubernetes cluster using Helm charts and rollouts.", 1, 0, 0, ["kubernetes", "helm", "deploy"], "kubernetes", 680, "4.8", 76),
            ("AWS Deploy", "aws-deploy", "Cloud", "Deployment", "AWS", "Deploy application to AWS (EC2, ECS, EKS, S3) with verified IAM roles.", 1, 0, 0, ["aws", "ecs", "eks"], "aws", 840, "4.7", 92),
            ("Azure Deploy", "azure-deploy", "Cloud", "Deployment", "Azure", "Deploy application to Microsoft Azure App Services and AKS clusters.", 1, 0, 0, ["azure", "appservice", "aks"], "azure", 520, "4.5", 61),
            ("Static Site Deploy", "static-deploy", "Web Application", "Deployment", "Static", "Deploy static sites to Vercel/Netlify with global CDN invalidation.", 1, 0, 0, ["vercel", "netlify", "static"], "static", 430, "4.6", 48),
            ("Python Application", "python-ci", "Web Application", "CI/CD Pipeline", "Python", "CI/CD for Python applications with pytest, flake8, and container build.", 1, 0, 0, ["python", "pytest", "docker"], "python", 780, "4.8", 85),
            ("Go Microservice CI", "go-microservice", "Web Application", "CI/CD Pipeline", "Go", "High-performance CI for Golang microservices.", 1, 0, 0, ["go", "microservice", "docker"], "go", 620, "4.8", 72),
            ("Rust Cargo Security Gate", "rust-ci", "Web Application", "CI/CD Pipeline", "Rust", "Cargo clippy, test suite, and audit scanner.", 1, 0, 0, ["rust", "cargo", "security"], "rust", 510, "4.9", 68),
            ("Spring Boot Java Pipeline", "spring-boot", "Web Application", "CI/CD Pipeline", "Java", "Gradle/Maven build, SpotBugs, and container publish.", 1, 0, 0, ["java", "spring", "gradle"], "java", 730, "4.7", 89),
            ("SecuLayer Internal SAST Baseline", "custom-sast-gate", "Security", "CI/CD Pipeline", "Multi", "Custom deterministic Semgrep + Checkov policy gate.", 0, 1, 0, ["semgrep", "checkov", "custom"], "shield", 390, "4.9", 42),
            ("E2E Playwright Browser Matrix", "custom-playwright", "Web Application", "CI/CD Pipeline", "Node.js", "Distributed browser testing across Chrome, Safari, Firefox.", 0, 1, 0, ["playwright", "e2e"], "test", 460, "4.8", 53),
            ("Terraform Cloud Infrastructure", "custom-terraform", "Cloud", "Deployment", "Terraform", "Validate, plan, and apply HCL infrastructure blueprints.", 0, 1, 0, ["terraform", "iac", "aws"], "cloud", 580, "4.7", 67),
            ("GraphQL Gateway Federation", "custom-graphql", "Web Application", "CI/CD Pipeline", "Node.js", "Apollo schema check and breaking change validator.", 0, 1, 0, ["graphql", "api"], "api", 310, "4.6", 38),
            ("Serverless Lambda Packager", "custom-lambda", "Cloud", "Deployment", "AWS", "Package and deploy serverless functions to AWS Lambda.", 0, 1, 0, ["serverless", "lambda"], "cloud", 440, "4.7", 49),
            ("Mobile React Native CI", "custom-react-native", "Mobile", "CI/CD Pipeline", "React Native", "Build iOS IPA and Android APK release binaries.", 0, 1, 0, ["mobile", "android", "ios"], "mobile", 380, "4.6", 44),
            ("Helm Canary Deployment Gate", "custom-helm-canary", "Container", "Deployment", "Kubernetes", "Argo Rollouts automated canary promotion gate.", 0, 1, 0, ["canary", "argo", "k8s"], "k8s", 520, "4.8", 60),
            ("Security Secrets Hardening Hook", "custom-secrets-guard", "Security", "CI/CD Pipeline", "Multi", "Gitleaks deep commit history credential detection.", 0, 1, 0, ["gitleaks", "secrets"], "lock", 610, "4.9", 74),
            ("Django Web Architecture", "community-django", "Web Application", "CI/CD Pipeline", "Python", "Django test runner with PostgreSQL test matrix.", 0, 0, 0, ["django", "python"], "python", 290, "4.6", 32),
            ("Flutter Cross-Platform Build", "community-flutter", "Mobile", "CI/CD Pipeline", "Flutter", "Flutter test and web bundle packaging.", 0, 0, 0, ["flutter", "mobile"], "mobile", 340, "4.7", 39),
            ("Trivy Container Gate", "community-trivy", "Security", "CI/CD Pipeline", "Docker", "Aqua Trivy vulnerability scanning with CycloneDX SBOM.", 0, 0, 0, ["trivy", "sbom"], "shield", 480, "4.8", 58),
            ("PR Performance Benchmark", "community-perf-benchmark", "Web Application", "CI/CD Pipeline", "Node.js", "Lighthouse CI automated performance budgets.", 0, 0, 0, ["lighthouse", "perf"], "gauge", 260, "4.5", 28),
        ]

        for idx, (nm, slg, cat, typ, frm, desc, is_off, is_cust, is_pop, tgs, icn, uc, rat, rc) in enumerate(templates_base, start=1):
            tmpl = CICDTemplate(
                id=uuid.uuid4(),
                project_id=PROJECT_ID,
                name=nm,
                slug=slg,
                category=cat,
                type=typ,
                framework=frm,
                description=desc,
                is_official=bool(is_off),
                is_custom=bool(is_cust),
                is_popular=bool(is_pop),
                tags=tgs,
                maintained_by="SecuLayer" if is_off else ("Custom" if is_cust else "Community"),
                usage_count=uc,
                rating=rat,
                rating_count=rc,
                workflow_yaml=f"name: {nm}\non: [push]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4",
                included_steps=[
                    {"name": "Checkout code", "status": "completed", "duration": "12s"},
                    {"name": "Setup environment", "status": "completed", "duration": "28s"},
                    {"name": "Run tests", "status": "completed", "duration": "1m 48s"},
                    {"name": "Build application", "status": "completed", "duration": "2m 12s"},
                ],
                variables=[],
                icon_key=icn,
                order_priority=idx,
            )
            session.add(tmpl)

        service = CICDService(session)
        await service.ensure_baseline_data(REPO_ID, PROJECT_ID)
        await service.ensure_jobs_baseline_data(REPO_ID, PROJECT_ID)

        await session.commit()
        print("SQLAlchemy session seed committed successfully!")

if __name__ == "__main__":
    asyncio.run(seed())
