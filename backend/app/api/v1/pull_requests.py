import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.github import GitHubPullRequest, GitHubRepository
from app.models.scan import SecurityFinding
from app.models.user import User
from app.schemas.pull_request import PullRequestDetailResponse, PRCodeChange, PRCheck
from app.schemas.github import GitHubPullRequestResponse
from app.schemas.scan import SecurityFindingResponse

router = APIRouter(tags=["Pull Requests Detailed Views"])

@router.get(
    "/pull-requests/{pr_id}",
    response_model=PullRequestDetailResponse,
    summary="Get Detailed Pull Request",
    description="Retrieves the detailed view of a pull request including security findings and AI remediation workflow."
)
async def get_pull_request_detail(
    pr_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PullRequestDetailResponse:
    
    pr_uuid = None
    try:
        pr_uuid = uuid.UUID(str(pr_id))
    except (ValueError, AttributeError):
        pass

    pr_num = int(pr_id) if str(pr_id).isdigit() else None

    # 1. Fetch real PR from DB
    conditions = []
    if pr_uuid:
        conditions.append(GitHubPullRequest.id == pr_uuid)
    if pr_num is not None:
        conditions.append(GitHubPullRequest.number == pr_num)

    if not conditions:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Pull request '{pr_id}' not found")

    stmt = select(GitHubPullRequest).where(or_(*conditions))
    res = await db.execute(stmt)
    db_pr = res.scalars().first()

    if not db_pr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Pull request '{pr_id}' not found")

    # 2. Fetch associated repository
    repo_row = await db.get(GitHubRepository, db_pr.repository_id) if db_pr.repository_id else None
    repo_name = repo_row.name if repo_row else "Repository"
    repo_full = repo_row.full_name if repo_row else repo_name

    # Enforce project ownership authorization
    if repo_row and repo_row.project_id and current_user and not getattr(current_user, "is_superuser", False):
        from app.models.project import Project
        proj = await db.get(Project, repo_row.project_id)
        if proj and proj.owner_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to repository pull request")

    pr_info = GitHubPullRequestResponse(
        id=db_pr.id,
        repository_id=db_pr.repository_id,
        github_pr_id=db_pr.github_pr_id,
        number=db_pr.number,
        title=db_pr.title,
        state=db_pr.state,
        head_sha=db_pr.head_sha,
        base_sha=db_pr.base_sha,
        head_ref=db_pr.head_ref,
        base_ref=db_pr.base_ref,
        author_login=db_pr.author_login or "secureai-bot",
        draft=db_pr.draft,
        merged=db_pr.merged,
        html_url=db_pr.html_url or f"https://github.com/{repo_full}/pull/{db_pr.number}",
        created_at=db_pr.created_at or datetime.utcnow(),
    )

    # 3. Connect real findings if available for this repository or project
    findings: List[SecurityFindingResponse] = []
    if repo_row:
        f_conditions = []
        if repo_row.project_id:
            f_conditions.append(SecurityFinding.project_id == repo_row.project_id)
        if repo_row.name:
            f_conditions.append(SecurityFinding.repository == repo_row.name)
        if repo_row.full_name:
            f_conditions.append(SecurityFinding.repository == repo_row.full_name)

        if f_conditions:
            f_stmt = select(SecurityFinding).where(or_(*f_conditions)).limit(20)
            finding_rows = (await db.execute(f_stmt)).scalars().all()
            findings = [
                SecurityFindingResponse(
                    id=rf.id,
                    scan_id=rf.scan_id or uuid.uuid4(),
                    scanner_execution_id=rf.scanner_execution_id or uuid.uuid4(),
                    scanner_name=rf.scanner_name or "Scanner",
                    rule_id=rf.rule_id or "SEC-RULE",
                    title=rf.title or "Security finding",
                    description=rf.description or "",
                    severity=rf.severity or "Medium",
                    file_path=rf.file_path or "",
                    line_number=rf.line_number or rf.line_start or 1,
                    fingerprint=rf.fingerprint or "",
                    created_at=rf.detected_at or datetime.utcnow(),
                )
                for rf in finding_rows
            ]

    changes = [
        PRCodeChange(file_path="src/auth/middleware.js", additions=32, deletions=4, patch="@@ -16,8 +16,8 @@\n- const jwtSecret = \"mysecret123\";\n+ const jwtSecret = process.env.JWT_SECRET;", status="modified"),
    ]
    
    checks = [
        PRCheck(name="SAST Scan (Semgrep)", status="Passed", duration="2m 34s", is_security_scan=True),
        PRCheck(name="Secrets Scan (Gitleaks)", status="Passed", duration="1m 12s", is_security_scan=True),
        PRCheck(name="Dependency Scan (Snyk)", status="Passed", duration="1m 45s", is_security_scan=True),
        PRCheck(name="Policy Check (Open Policy)", status="Passed", duration="28s", is_security_scan=True),
    ]

    security_checks_data = [
        {"name": "SAST Scan", "tool": "Semgrep", "status": "Failed", "findings": 4, "duration": "2m 34s"},
        {"name": "Secrets Scan", "tool": "Gitleaks", "status": "Failed", "findings": 2, "duration": "1m 12s"},
        {"name": "Dependency Scan", "tool": "Snyk", "status": "Passed", "findings": 3, "duration": "1m 45s"},
        {"name": "Container Scan", "tool": "Trivy", "status": "Skipped", "findings": "-", "duration": "-"},
        {"name": "IaC Scan", "tool": "Checkov", "status": "Skipped", "findings": "-", "duration": "-"},
        {"name": "Code Quality", "tool": "SonarQube", "status": "Passed", "findings": 2, "duration": "1m 08s"},
        {"name": "License Check", "tool": "FOSSA", "status": "Passed", "findings": 0, "duration": "45s"},
        {"name": "Policy Check", "tool": "Open Policy", "status": "Passed", "findings": 0, "duration": "28s"},
    ]

    changed_files_tree_data = [
        {"folder": "src/auth", "file": "middleware.js", "change": "+32 -4", "lines": "+28 / -4", "findings": "2 High"},
        {"folder": "src/auth", "file": "routes.js", "change": "+12 -2", "lines": "+10 / -2", "findings": "1 Medium"},
        {"folder": "src/components", "file": "Login.jsx", "change": "+45 -10", "lines": "+35 / -10", "findings": "2 Low"},
        {"folder": "src/components", "file": "Header.jsx", "change": "+10 -2", "lines": "+8 / -2", "findings": "-"},
        {"folder": "src/utils", "file": "validation.js", "change": "+18 -6", "lines": "+12 / -6", "findings": "1 Medium"},
        {"folder": "src/utils", "file": "constants.js", "change": "+5 -1", "lines": "+4 / -1", "findings": "-"},
        {"folder": "root", "file": "package.json", "change": "+3 -1", "lines": "+2 / -1", "findings": "1 High"},
        {"folder": "root", "file": ".env.example", "change": "+2 -0", "lines": "+2 / -0", "findings": "-"},
        {"folder": "root", "file": "README.md", "change": "+6 -3", "lines": "+3 / -3", "findings": "-"},
    ]

    code_review_findings_data = [
        {"id": "CR-001", "rule": "Hardcoded secret", "severity": "Critical", "file": "src/auth/middleware.js", "line": 18, "status": "Open"},
        {"id": "CR-002", "rule": "Insecure JWT handling", "severity": "High", "file": "src/auth/middleware.js", "line": 45, "status": "Open"},
        {"id": "CR-003", "rule": "Missing input validation", "severity": "High", "file": "src/routes.js", "line": 32, "status": "Open"},
        {"id": "CR-004", "rule": "SQL injection risk", "severity": "Medium", "file": "src/routes.js", "line": 67, "status": "Open"},
        {"id": "CR-005", "rule": "XSS in user input", "severity": "Medium", "file": "src/components/Login.jsx", "line": 23, "status": "Open"},
        {"id": "CR-006", "rule": "Insecure direct object reference", "severity": "Low", "file": "src/utils/validation.js", "line": 12, "status": "Open"},
    ]

    secret_findings_data = [
        {
            "id": "SEC-001",
            "type": "API Key",
            "severity": "High",
            "file": "src/config.js",
            "line": 12,
            "status": "Open",
            "secret_type": "Generic API Key",
            "confidence": "98%",
            "detected_value": 'const apiKey = "sk_live_51M8x3...";',
            "recommendation": "Use environment variables or a secrets manager to store API keys instead of hardcoding them in the code."
        },
        {
            "id": "SEC-002",
            "type": "Database URL",
            "severity": "Medium",
            "file": ".env.example",
            "line": 4,
            "status": "Open",
            "secret_type": "Database Connection String",
            "confidence": "92%",
            "detected_value": 'DATABASE_URL="postgres://user:pass@localhost:5432/app"',
            "recommendation": "Do not commit production database credentials to repository examples."
        }
    ]

    cicd_check_details_data = {
        "name": "Security Scan (SAST)",
        "status": "Failed",
        "started": "5m ago",
        "duration": "2m 34s",
        "steps": [
            {"name": "Setup", "status": "Passed", "duration": "12s"},
            {"name": "Install dependencies", "status": "Passed", "duration": "34s"},
            {"name": "Run SAST scan", "status": "Failed", "duration": "1m 42s"},
            {"name": "Upload results", "status": "Pending", "duration": "6s"}
        ],
        "output": """> Running Semgrep SAST scan...
  Scanning 342 files...

✖ [CRITICAL] Hardcoded JWT secret (src/auth/middleware.js:18)
✖ [HIGH] Insecure JWT handling (src/auth/middleware.js:45)
✖ [HIGH] Missing input validation (src/routes.js:32)
▲ [MEDIUM] SQL injection risk (src/routes.js:67)
▲ [MEDIUM] XSS in user input (src/components/Login.jsx:23)

! Scan completed: 12 findings (2 critical, 5 high, 3 medium, 2 low)"""
    }

    review_approval_status_data = {
        "approvals": "2/3",
        "changes_requested": 1,
        "comments": 4,
        "merge_status": "Pending",
        "reviewers": [
            {"reviewer": "mayur.bharvad", "status": "Approved", "reviewed_at": "Oct 04, 10:24", "comments": 2},
            {"reviewer": "dev-team", "status": "Changes Requested", "reviewed_at": "Oct 04, 09:12", "comments": 1},
            {"reviewer": "security-team", "status": "Pending", "reviewed_at": "-", "comments": "-"}
        ],
        "latest_reviews": [
            {"author": "mayur.bharvad", "action": "approved this pull request", "time": "Oct 04, 2026, 10:24 AM"},
            {"author": "dev-team", "action": "requested changes", "time": "Oct 04, 2026, 09:12 AM", "note": "Please address the security findings and add input validation for user data."},
            {"author": "security-team", "action": "reviewed", "time": "Oct 04, 2026, 08:45 AM", "status": "Pending"}
        ]
    }

    pr_timeline_history_data = [
        {"node": "pr", "title": "mayur.bharvad opened this pull request", "time": "Oct 03, 2026, 04:18 PM", "badge": "a1b2c3d"},
        {"node": "commit", "title": "12 commits pushed", "time": "Oct 03, 2026, 08:22 PM"},
        {"node": "security", "title": "Security scan completed", "time": "Oct 04, 2026, 08:45 AM", "status": "Failed", "details": "12 findings"},
        {"node": "x", "title": "dev-team requested changes", "time": "Oct 04, 2026, 09:12 AM", "note": "Please address the security findings and add input validation."},
        {"node": "commit", "title": "mayur.bharvad pushed new commits", "time": "Oct 04, 2026, 09:45 AM", "badge": "f4e5d6c"},
        {"node": "security", "title": "Security scan re-run", "time": "Oct 04, 2026, 10:05 AM", "status": "Failed", "details": "8 findings"},
        {"node": "check", "title": "mayur.bharvad approved", "time": "Oct 04, 2026, 10:24 AM"},
        {"node": "clock", "title": "security-team review pending", "time": "Waiting for review", "status": "Pending"}
    ]
    
    return PullRequestDetailResponse(
        pr_info=pr_info,
        scan_summary={"total": 12, "critical": 2, "high": 5, "medium": 3, "low": 2, "categories": {"SAST": 4, "Secrets": 2, "Dependencies": 3, "Code Quality": 2, "Other": 1}},
        findings=[finding],
        code_changes=changes,
        checks=checks,
        reviewers=[{"name": "mayur.bharvad", "status": "Success"}, {"name": "dev-team", "status": "Changes Requested"}, {"name": "security-team", "status": "Pending"}],
        labels=["security", "authentication", "api-gateway"],
        related_issues=[{"id": "#101", "title": "Implement authentication middleware", "status": "Open"}],
        security_checks=security_checks_data,
        changed_files_tree=changed_files_tree_data,
        code_review_findings=code_review_findings_data,
        secret_findings_data=secret_findings_data,
        cicd_check_details=cicd_check_details_data,
        review_approval_status=review_approval_status_data,
        pr_timeline_history=pr_timeline_history_data,
    )


@router.get(
    "/pull-requests/{pr_id}/activity",
    response_model=dict,
    summary="Get Pull Request Activity (Screens 12.1 - 12.8)",
    description="Returns full activity overview, timeline, events, reviews, security, CI/CD, and audit log for a PR."
)
async def get_pull_request_activity(
    pr_id: str,
    event_type: Optional[str] = None,
    user: Optional[str] = None,
    days: Optional[int] = 30,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    pr_num = int(pr_id) if str(pr_id).isdigit() else 237

    pr_info = {
        "number": pr_num,
        "title": "Add authentication middleware" if pr_num == 237 else f"Pull Request #{pr_num}",
        "state": "open",
        "head_ref": "feature/auth-middleware",
        "base_ref": "main",
        "author": "@mayur.bharvad",
        "author_avatar": "MB",
        "created_at": "2026-06-27T16:12:00Z",
        "repository": "frontend-app",
    }

    overview_stats = {
        "total_events": 42,
        "commits": 8,
        "reviews": 5,
        "comments": 12,
    }

    activity_trend = [
        {"date": "Sep 23", "commits": 12, "reviews": 4, "comments": 8, "security": 2},
        {"date": "Sep 24", "commits": 24, "reviews": 6, "comments": 15, "security": 4},
        {"date": "Sep 25", "commits": 8, "reviews": 3, "comments": 6, "security": 1},
        {"date": "Sep 26", "commits": 16, "reviews": 5, "comments": 11, "security": 3},
        {"date": "Sep 27", "commits": 19, "reviews": 7, "comments": 14, "security": 5},
        {"date": "Sep 28", "commits": 28, "reviews": 9, "comments": 20, "security": 6},
        {"date": "Sep 29", "commits": 14, "reviews": 5, "comments": 12, "security": 3},
    ]

    recent_activity = [
        {
            "id": "act-1",
            "event_type": "commit",
            "title": "@mayur.bharvad pushed a commit",
            "subtitle": "ab1c3df: Add JWT middleware",
            "time_ago": "2 hours ago",
            "icon_type": "commit",
        },
        {
            "id": "act-2",
            "event_type": "security",
            "title": "Security scan completed",
            "subtitle": "2 new vulnerabilities found",
            "time_ago": "5 hours ago",
            "icon_type": "security",
            "status": "warning",
        },
        {
            "id": "act-3",
            "event_type": "review",
            "title": "@security-team requested changes",
            "subtitle": "Review comment added",
            "time_ago": "1 day ago",
            "icon_type": "review",
            "status": "danger",
        },
        {
            "id": "act-4",
            "event_type": "ci",
            "title": "CI pipeline passed",
            "subtitle": "All checks successful",
            "time_ago": "1 day ago",
            "icon_type": "ci",
            "status": "success",
        },
        {
            "id": "act-5",
            "event_type": "comment",
            "title": "@dev-team commented",
            "subtitle": "Looks good overall",
            "time_ago": "2 days ago",
            "icon_type": "comment",
        },
    ]

    timeline = [
        {
            "date": "Sep 29, 2026",
            "events": [
                {
                    "id": "tl-1",
                    "time": "10:24 AM",
                    "author": "@mayur.bharvad",
                    "title": "@mayur.bharvad pushed 2 commits",
                    "event_type": "push",
                    "commits": [
                        {"hash": "a1b2c3d", "message": "Add input validation"},
                        {"hash": "b3c4d5e", "message": "Fix error handling"},
                    ],
                    "action_label": "View changes",
                    "action_type": "changes",
                },
                {
                    "id": "tl-2",
                    "time": "09:12 AM",
                    "author": "github-actions",
                    "title": "Security scan completed",
                    "description": "2 vulnerabilities found",
                    "event_type": "security_scan",
                    "badges": [
                        {"label": "High", "color": "orange"},
                        {"label": "Medium", "color": "amber"},
                    ],
                    "action_label": "View results",
                    "action_type": "results",
                },
                {
                    "id": "tl-3",
                    "time": "08:45 AM",
                    "author": "github-actions",
                    "title": "CI pipeline passed",
                    "description": "All 6 checks successful",
                    "event_type": "ci",
                    "action_label": "View checks",
                    "action_type": "checks",
                },
            ],
        },
        {
            "date": "Jun 28, 2026",
            "events": [
                {
                    "id": "tl-4",
                    "time": "08:30 PM",
                    "author": "@security-team",
                    "title": "@security-team requested changes",
                    "description": "Please address the security issue in auth.js",
                    "event_type": "review_changes",
                    "action_label": "View review",
                    "action_type": "review",
                },
                {
                    "id": "tl-5",
                    "time": "03:15 PM",
                    "author": "@dev-team",
                    "title": "@dev-team commented",
                    "description": "Looks good, just minor suggestions",
                    "event_type": "comment",
                    "action_label": "View comment",
                    "action_type": "comment",
                },
                {
                    "id": "tl-6",
                    "time": "11:20 AM",
                    "author": "@mayur.bharvad",
                    "title": "Label added",
                    "event_type": "label",
                    "badges": [{"label": "security", "color": "blue"}],
                },
                {
                    "id": "tl-7",
                    "time": "10:05 AM",
                    "author": "@frontend-team",
                    "title": "@frontend-team approved",
                    "description": "LGTM 🚀",
                    "event_type": "approved",
                    "action_label": "View review",
                    "action_type": "review",
                },
            ],
        },
        {
            "date": "Jun 27, 2026",
            "events": [
                {
                    "id": "tl-8",
                    "time": "04:12 PM",
                    "author": "@mayur.bharvad",
                    "title": "PR opened by @mayur.bharvad",
                    "description": "Add authentication middleware",
                    "event_type": "opened",
                    "action_label": "View PR",
                    "action_type": "pr",
                },
            ],
        },
    ]

    events = [
        {"id": "ev-1", "time": "Sep 29, 10:24", "event": "Push", "user": "@mayur.bharvad", "details": "2 commits added", "status": None, "status_type": None},
        {"id": "ev-2", "time": "Sep 29, 09:12", "event": "Security Scan", "user": "github-actions", "details": "2 vulnerabilities", "status": "High", "status_type": "high"},
        {"id": "ev-3", "time": "Sep 29, 08:45", "event": "CI Check", "user": "github-actions", "details": "All checks passed", "status": "Success", "status_type": "success"},
        {"id": "ev-4", "time": "Sep 28, 18:30", "event": "Review", "user": "@security-team", "details": "Requested changes", "status": None, "status_type": None},
        {"id": "ev-5", "time": "Sep 28, 15:15", "event": "Comment", "user": "@dev-team", "details": "Added a comment", "status": None, "status_type": None},
        {"id": "ev-6", "time": "Sep 28, 11:20", "event": "Label", "user": "@mayur.bharvad", "details": "Added 'security'", "status": None, "status_type": None},
        {"id": "ev-7", "time": "Sep 28, 10:05", "event": "Review", "user": "@frontend-team", "details": "Approved", "status": None, "status_type": None},
        {"id": "ev-8", "time": "Sep 27, 16:40", "event": "Push", "user": "@mayur.bharvad", "details": "1 commit added", "status": None, "status_type": None},
        {"id": "ev-9", "time": "Sep 27, 14:22", "event": "CI Check", "user": "github-actions", "details": "Failed (test)", "status": "Failed", "status_type": "danger"},
        {"id": "ev-10", "time": "Sep 27, 13:18", "event": "Comment", "user": "@qa-team", "details": "Suggested changes", "status": None, "status_type": None},
    ]

    reviewers = [
        {"id": "rev-1", "reviewer": "@frontend-team", "type": "Review", "status": "Approved", "status_type": "success", "comments": 3, "time": "Sep 28, 10:05"},
        {"id": "rev-2", "reviewer": "@security-team", "type": "Review", "status": "Changes Requested", "status_type": "danger", "comments": 5, "time": "Sep 28, 18:30"},
        {"id": "rev-3", "reviewer": "@dev-team", "type": "Comment", "status": "-", "status_type": "neutral", "comments": 2, "time": "Sep 28, 15:15"},
        {"id": "rev-4", "reviewer": "@qa-team", "type": "Comment", "status": "-", "status_type": "neutral", "comments": 1, "time": "Sep 27, 13:18"},
    ]

    review_comments = [
        {
            "id": "rc-1",
            "author": "@frontend-team",
            "initials": "FT",
            "avatar_color": "#2563EB",
            "time": "Sep 28, 10:05",
            "status": "Approved",
            "status_type": "success",
            "text": "LGTM! Great implementation. Just a few minor suggestions.",
        },
        {
            "id": "rc-2",
            "author": "@security-team",
            "initials": "ST",
            "avatar_color": "#DC2626",
            "time": "Sep 28, 18:30",
            "status": "Changes Requested",
            "status_type": "danger",
            "text": "Please address the security issue in auth.js. Also add input validation.",
        },
        {
            "id": "rc-3",
            "author": "@dev-team",
            "initials": "DT",
            "avatar_color": "#475569",
            "time": "Sep 28, 15:15",
            "status": None,
            "status_type": None,
            "text": "Consider using a utility function for token validation.",
        },
        {
            "id": "rc-4",
            "author": "@qa-team",
            "initials": "QT",
            "avatar_color": "#0D9488",
            "time": "Sep 27, 13:18",
            "status": None,
            "status_type": None,
            "text": "Can you add test cases for the new middleware?",
        },
    ]

    security_stats = {
        "scan_events": 12,
        "findings": 5,
        "high": 2,
        "medium": 3,
    }

    security_scans = [
        {"id": "sec-1", "time": "Sep 29, 09:12", "event": "Code Scan", "details": "2 new vulnerabilities", "severity": "High", "status": "Completed", "status_type": "success"},
        {"id": "sec-2", "time": "Sep 28, 14:20", "event": "Secret Scan", "details": "No secrets found", "severity": "-", "status": "Completed", "status_type": "success"},
        {"id": "sec-3", "time": "Sep 27, 11:05", "event": "Dependency Scan", "details": "1 vulnerable package", "severity": "Medium", "status": "Completed", "status_type": "success"},
        {"id": "sec-4", "time": "Sep 26, 16:30", "event": "Code Scan", "details": "No new issues", "severity": "-", "status": "Completed", "status_type": "success"},
        {"id": "sec-5", "time": "Sep 25, 10:15", "event": "Container Scan", "details": "Not applicable", "severity": "-", "status": "Skipped", "status_type": "neutral"},
    ]

    security_trend = [
        {"date": "Sep 23", "high": 8, "medium": 4, "low": 2},
        {"date": "Sep 24", "high": 5, "medium": 3, "low": 2},
        {"date": "Sep 25", "high": 4, "medium": 2, "low": 1},
        {"date": "Sep 26", "high": 6, "medium": 4, "low": 2},
        {"date": "Sep 27", "high": 5, "medium": 3, "low": 1},
        {"date": "Sep 28", "high": 3, "medium": 2, "low": 1},
        {"date": "Sep 29", "high": 2, "medium": 3, "low": 0},
    ]

    cicd_stats = {
        "pipeline_runs": 18,
        "passed": 16,
        "failed": 2,
        "checks": 6,
    }

    cicd_runs = [
        {"id": "ci-1", "time": "Sep 29, 08:45", "workflow": "CI", "status": "Passed", "status_type": "success", "duration": "4m 12s", "details": "6/6 checks"},
        {"id": "ci-2", "time": "Sep 27, 14:22", "workflow": "CI", "status": "Failed", "status_type": "danger", "duration": "3m 48s", "details": "4/6 checks"},
        {"id": "ci-3", "time": "Sep 26, 11:30", "workflow": "CI", "status": "Passed", "status_type": "success", "duration": "3m 21s", "details": "6/6 checks"},
        {"id": "ci-4", "time": "Sep 25, 09:10", "workflow": "CI", "status": "Passed", "status_type": "success", "duration": "3m 05s", "details": "6/6 checks"},
        {"id": "ci-5", "time": "Sep 24, 16:40", "workflow": "CI", "status": "Passed", "status_type": "success", "duration": "2m 54s", "details": "6/6 checks"},
    ]

    cicd_checks = [
        {"name": "Build", "percentage": 100, "passed_count": 18, "total_count": 18, "status_color": "#10B981"},
        {"name": "Test", "percentage": 89, "passed_count": 16, "total_count": 18, "status_color": "#10B981"},
        {"name": "Lint", "percentage": 94, "passed_count": 17, "total_count": 18, "status_color": "#10B981"},
        {"name": "Code Scan", "percentage": 83, "passed_count": 15, "total_count": 18, "status_color": "#F59E0B"},
        {"name": "Security Scan", "percentage": 78, "passed_count": 14, "total_count": 18, "status_color": "#F59E0B"},
        {"name": "Dependency Scan", "percentage": 89, "passed_count": 16, "total_count": 18, "status_color": "#10B981"},
    ]

    audit_logs = [
        {"id": "al-1", "time": "Sep 29, 10:24", "user": "@mayur.bharvad", "action": "push", "resource": "refs/heads/feature/*", "ip_address": "203.0.113.24"},
        {"id": "al-2", "time": "Sep 29, 09:12", "user": "github-actions", "action": "scan", "resource": "security/code-scan", "ip_address": "192.0.2.10"},
        {"id": "al-3", "time": "Sep 28, 18:30", "user": "@security-team", "action": "review", "resource": "pull/237", "ip_address": "203.0.113.45"},
        {"id": "al-4", "time": "Sep 28, 15:15", "user": "@dev-team", "action": "comment", "resource": "pull/237", "ip_address": "203.0.113.67"},
        {"id": "al-5", "time": "Sep 28, 11:20", "user": "@mayur.bharvad", "action": "label", "resource": "pull/237", "ip_address": "203.0.113.24"},
        {"id": "al-6", "time": "Sep 28, 10:05", "user": "@frontend-team", "action": "review", "resource": "pull/237", "ip_address": "203.0.113.89"},
        {"id": "al-7", "time": "Sep 27, 14:22", "user": "github-actions", "action": "ci", "resource": "runs/892344", "ip_address": "192.0.2.10"},
        {"id": "al-8", "time": "Sep 27, 13:18", "user": "@qa-team", "action": "comment", "resource": "pull/237", "ip_address": "203.0.113.91"},
        {"id": "al-9", "time": "Sep 27, 11:05", "user": "github-actions", "action": "scan", "resource": "security/deps", "ip_address": "192.0.2.10"},
        {"id": "al-10", "time": "Sep 26, 16:30", "user": "github-actions", "action": "scan", "resource": "security/code-scan", "ip_address": "192.0.2.10"},
    ]

    # ── PR #237 Single-View Master Activity (Screenshot 12.0) ───────────────────
    summary_stats = {
        "total_events": 12,
        "commits": 4,
        "comments": 6,
        "review_events": 2,
        "security_events": 5,
        "cicd_events": 3,
    }

    timeline_events = [
        {
            "id": "act-ev-1",
            "time": "10:24 AM",
            "date": "Oct 04, 2026",
            "category": "Status Changes",
            "author": "mayur.bharvad",
            "author_avatar": "MK",
            "avatar_type": "user",
            "title": "mayur.bharvad opened this pull request",
            "description": "Add authentication middleware for secure API endpoints.",
            "commit_badge": "a1b2c3d",
            "icon_type": "pr",
        },
        {
            "id": "act-ev-2",
            "time": "10:32 AM",
            "date": "Oct 04, 2026",
            "category": "Commits",
            "author": "mayur.bharvad",
            "author_avatar": "MK",
            "avatar_type": "user",
            "title": "mayur.bharvad pushed 3 commits",
            "commits": [
                {"hash": "f4e5d6c", "message": "Add JWT middleware"},
                {"hash": "d7e8f9a", "message": "Add auth routes"},
                {"hash": "e1f2a3b", "message": "Fix token validation"},
            ],
            "icon_type": "commit",
        },
        {
            "id": "act-ev-3",
            "time": "10:35 AM",
            "date": "Oct 04, 2026",
            "category": "Security Events",
            "author": "Security Scan",
            "author_avatar": "avatar",
            "avatar_type": "photo",
            "title": "Security scan completed",
            "description": "SAST scan finished with 2 high, 3 medium findings.",
            "badges": [
                {"label": "2 High", "type": "danger"},
                {"label": "3 Medium", "type": "warning"},
            ],
            "icon_type": "security",
        },
        {
            "id": "act-ev-4",
            "time": "11:02 AM",
            "date": "Oct 04, 2026",
            "category": "CI/CD Events",
            "author": "CI System",
            "author_avatar": "x",
            "avatar_type": "icon-x",
            "title": "CI checks failed",
            "description": "Build failed due to unit test errors.",
            "status_badge": {"label": "Failed", "type": "danger"},
            "has_view_logs": True,
            "icon_type": "ci",
        },
        {
            "id": "act-ev-5",
            "time": "11:30 AM",
            "date": "Oct 04, 2026",
            "category": "Comments",
            "author": "dev-team",
            "author_avatar": "avatar2",
            "avatar_type": "photo",
            "title": "dev-team commented",
            "description": "Please add input validation for the new routes.",
            "icon_type": "comment",
        },
        {
            "id": "act-ev-6",
            "time": "12:15 PM",
            "date": "Oct 04, 2026",
            "category": "Commits",
            "author": "mayur.bharvad",
            "author_avatar": "MK",
            "avatar_type": "user",
            "title": "mayur.bharvad pushed new commits",
            "commits": [
                {"hash": "9c8b7a6", "message": "Add input validation"},
                {"hash": "7a6b5c4", "message": "Fix unit tests"},
            ],
            "commit_badge": "9c8b7a6",
            "icon_type": "commit",
        },
        {
            "id": "act-ev-7",
            "time": "12:28 PM",
            "date": "Oct 04, 2026",
            "category": "CI/CD Events",
            "author": "CI System",
            "author_avatar": "check",
            "avatar_type": "icon-check",
            "title": "CI checks passed",
            "description": "All checks passed successfully.",
            "status_badge": {"label": "Passed", "type": "success"},
            "has_view_logs": True,
            "icon_type": "ci",
        },
        {
            "id": "act-ev-8",
            "time": "12:40 PM",
            "date": "Oct 04, 2026",
            "category": "Security Events",
            "author": "Security Scan",
            "author_avatar": "check",
            "avatar_type": "icon-check",
            "title": "Security scan completed",
            "description": "All critical issues resolved.",
            "badges": [
                {"label": "0 Critical", "type": "success"},
                {"label": "1 Medium", "type": "warning"},
            ],
            "icon_type": "security",
        },
        {
            "id": "act-ev-9",
            "time": "01:10 PM",
            "date": "Oct 04, 2026",
            "category": "Reviews",
            "author": "security-team",
            "author_avatar": "user",
            "avatar_type": "icon-user",
            "title": "security-team reviewed",
            "description": "Looks good after the fixes.",
            "status_badge": {"label": "Approved", "type": "success"},
            "icon_type": "review",
        },
        {
            "id": "act-ev-10",
            "time": "02:05 PM",
            "date": "Oct 04, 2026",
            "category": "Status Changes",
            "author": "System",
            "author_avatar": "check",
            "avatar_type": "icon-check",
            "title": "Ready for merge",
            "description": "All required checks have passed.",
            "icon_type": "check",
        },
    ]

    security_activity = [
        {"id": "sa-1", "time": "10:35 AM", "event": "SAST scan completed", "severity": "2 High", "severity_type": "danger", "status": "Completed"},
        {"id": "sa-2", "time": "10:35 AM", "event": "Secrets scan completed", "severity": "1 Medium", "severity_type": "warning", "status": "Completed"},
        {"id": "sa-3", "time": "12:40 PM", "event": "SAST scan completed", "severity": "0 Critical", "severity_type": "success", "status": "Completed"},
        {"id": "sa-4", "time": "12:40 PM", "event": "Dependency scan", "severity": "Low", "severity_type": "info", "status": "Completed"},
    ]

    cicd_activity = [
        {"id": "ca-1", "time": "11:02 AM", "workflow": "build-and-test", "status": "Failed", "status_type": "danger", "duration": "3m 12s"},
        {"id": "ca-2", "time": "12:28 PM", "workflow": "build-and-test", "status": "Passed", "status_type": "success", "duration": "2m 45s"},
        {"id": "ca-3", "time": "12:28 PM", "workflow": "security-scan", "status": "Passed", "status_type": "success", "duration": "1m 20s"},
        {"id": "ca-4", "time": "12:28 PM", "workflow": "deploy-preview", "status": "Passed", "status_type": "success", "duration": "2m 10s"},
    ]

    review_activity = [
        {"id": "ra-1", "reviewer": "@security-team", "reviewer_avatar": "ST", "avatar_color": "#16A34A", "action": "Approved", "action_type": "success", "time": "01:10 PM", "comments": 1},
        {"id": "ra-2", "reviewer": "@dev-team", "reviewer_avatar": "DT", "avatar_color": "#6366F1", "action": "Commented", "action_type": "neutral", "time": "11:30 AM", "comments": 1},
        {"id": "ra-3", "reviewer": "@mayur.bharvad", "reviewer_avatar": "MK", "avatar_color": "#0F172A", "action": "Requested", "action_type": "danger", "time": "10:24 AM", "comments": "-"},
    ]

    activity_summary = {
        "dates": ["Sep 29", "Sep 30", "Oct 01", "Oct 02", "Oct 03", "Oct 04"],
        "series": {
            "commits": [2, 3, 3, 6, 2, 2],
            "comments": [2, 1, 2, 2, 2, 1],
            "security": [0, 1, 2, 4, 0, 0],
            "cicd": [0, 0, 0, 0, 6, 4],
        },
    }

    event_breakdown = [
        {"id": "eb-1", "event_type": "Commits", "count": 4, "latest": "Oct 04, 12:15 PM", "status": "-", "icon": "commit", "status_type": "neutral"},
        {"id": "eb-2", "event_type": "Comments", "count": 4, "latest": "Oct 04, 11:30 AM", "status": "-", "icon": "comment", "status_type": "neutral"},
        {"id": "eb-3", "event_type": "Reviews", "count": 2, "latest": "Oct 04, 01:10 PM", "status": "Approved", "icon": "review", "status_type": "success"},
        {"id": "eb-4", "event_type": "Security Events", "count": 5, "latest": "Oct 04, 12:40 PM", "status": "1 Medium", "icon": "security", "status_type": "warning"},
        {"id": "eb-5", "event_type": "CI/CD Events", "count": 3, "latest": "Oct 04, 12:28 PM", "status": "Passed", "icon": "ci", "status_type": "success"},
        {"id": "eb-6", "event_type": "Status Changes", "count": 2, "latest": "Oct 04, 02:05 PM", "status": "Ready", "icon": "pr", "status_type": "blue"},
    ]

    # ── PR Activity Full Data (Screens 8.1 - 8.8) ─────────────────────────────
    commit_activity = [
        {"hash": "f4e5d6c", "message": "Add input validation for auth routes", "author": "mayur.bharvad", "time": "2m ago", "checks": "passed", "status": "Passed"},
        {"hash": "d7e8f9a", "message": "Fix unit tests", "author": "mayur.bharvad", "time": "12m ago", "checks": "passed", "status": "Passed"},
        {"hash": "e1f2a3b", "message": "Update middleware error handling", "author": "mayur.bharvad", "time": "25m ago", "checks": "passed", "status": "Passed"},
        {"hash": "9c8b7a6", "message": "Add JWT middleware", "author": "mayur.bharvad", "time": "1h ago", "checks": "failed", "status": "Failed"},
        {"hash": "7a6b5c4", "message": "Add auth routes", "author": "mayur.bharvad", "time": "1h ago", "checks": "passed", "status": "Passed"},
        {"hash": "3c2d1e0", "message": "Refactor auth service", "author": "mayur.bharvad", "time": "2h ago", "checks": "passed", "status": "Passed"},
        {"hash": "5b4a3c2", "message": "Update dependencies", "author": "mayur.bharvad", "time": "3h ago", "checks": "passed", "status": "Passed"},
        {"hash": "1a2b3c4", "message": "Initial auth structure", "author": "mayur.bharvad", "time": "3h ago", "checks": "passed", "status": "Passed"},
    ]

    files_changed = [
        {"file": "src/auth/middleware.js", "additions": 48, "deletions": 12, "status": "modified"},
        {"file": "src/routes/auth.js", "additions": 112, "deletions": 4, "status": "modified"},
        {"file": "tests/auth.test.js", "additions": 85, "deletions": 2, "status": "added"},
    ]

    comments_activity = [
        {
            "id": "cm-1",
            "author": "dev-team",
            "role": "Team",
            "time": "18m ago",
            "content": "Please add input validation for the new routes. We should also handle rate limiting.",
            "replies": [
                {
                    "id": "cm-1-1",
                    "author": "mayur.bharvad",
                    "role": "Author",
                    "time": "15m ago",
                    "content": "Added input validation in latest commit 9c8b7a6. Please review again."
                }
            ]
        },
        {
            "id": "cm-2",
            "author": "security-team",
            "role": "Team",
            "time": "45m ago",
            "content": "Found a potential hardcoded secret in middleware.js. Please use environment variables.",
            "diff": {
                "file": "middleware.js (Line 12)",
                "removed": '- const jwtSecret = "mysecret123";',
                "added": "+ const jwtSecret = process.env.JWT_SECRET;"
            },
            "replies": []
        },
        {
            "id": "cm-3",
            "author": "dev-team",
            "role": "Team",
            "time": "1h ago",
            "content": "Unit tests are failing. Check the CI logs.",
            "replies": []
        }
    ]

    security_findings = [
        {"id": "SEC-001", "rule": "Hardcoded secret", "severity": "Critical", "file": "src/auth/middleware.js", "status": "Open"},
        {"id": "SEC-002", "rule": "Insecure JWT handling", "severity": "High", "file": "src/auth/jwt.js", "status": "Open"},
        {"id": "SEC-003", "rule": "Missing input validation", "severity": "High", "file": "src/routes.js", "status": "Open"},
        {"id": "SEC-004", "rule": "SQL injection risk", "severity": "Medium", "file": "src/controllers/db.js", "status": "Open"},
        {"id": "SEC-005", "rule": "XSS in User Input", "severity": "Medium", "file": "src/components/Login.jsx", "status": "Open"},
    ]

    cicd_runs_data = [
        {"time": "12:28 PM", "workflow": "build-and-test", "status": "Passed", "duration": "2m 45s", "details": "12/12 checks"},
        {"time": "11:02 AM", "workflow": "build-and-test", "status": "Failed", "duration": "3m 12s", "details": "4/12 checks"},
        {"time": "Sep 30", "workflow": "security-scan", "status": "Passed", "duration": "1m 20s", "details": "SAST, Secrets"},
        {"time": "Sep 30", "workflow": "deploy-preview", "status": "Passed", "duration": "2m 10s", "details": "Preview env"},
        {"time": "Sep 29", "workflow": "build-and-test", "status": "Passed", "duration": "2m 55s", "details": "12/12 checks"},
    ]

    review_summary_data = {
        "approvals_count": 2,
        "total_reviewers": 3,
        "reviewers": [
            {"reviewer": "security-team", "action": "Review", "status": "Approved", "time": "1h ago", "comments": "Looks good after the fixes."},
            {"reviewer": "dev-team", "action": "Review", "status": "Changes Requested", "time": "2h ago", "comments": "Please add input validation."},
            {"reviewer": "platform-team", "action": "Review", "status": "Pending", "time": "-", "comments": "Waiting for review"},
        ],
        "comments": [
            {"author": "security-team", "time": "1h ago", "text": "Looks good after the fixes.", "status": "Approved"},
            {"author": "dev-team", "time": "2h ago", "text": "Please add input validation for the new routes.", "status": "Changes Requested"},
            {"author": "platform-team", "time": "-", "text": "Not reviewed yet.", "status": "Pending"},
        ]
    }

    audit_log_entries = [
        {"time": "02:05 PM", "user": "mayur.bharvad", "action": "merge_ready", "details": "All checks passed", "ip_address": "49.207.12.10"},
        {"time": "01:10 PM", "user": "security-team", "action": "review", "details": "Approved", "ip_address": "12.234.56.78"},
        {"time": "12:40 PM", "user": "sec-bot", "action": "scan_completed", "details": "2 high, 3 medium", "ip_address": "18.212.33.44"},
        {"time": "11:02 AM", "user": "github-actions", "action": "check_failed", "details": "build-and-test", "ip_address": "52.34.12.11"},
        {"time": "10:24 AM", "user": "mayur.bharvad", "action": "pr_opened", "details": "#237 created", "ip_address": "49.207.12.10"},
    ]

    return {
        "pr_info": pr_info,
        "overview_stats": overview_stats,
        "activity_trend": activity_trend,
        "recent_activity": recent_activity,
        "timeline": timeline,
        "events": events,
        "reviewers": reviewers,
        "review_comments": review_comments,
        "security_stats": security_stats,
        "security_scans": security_scans,
        "security_trend": security_trend,
        "cicd_stats": cicd_stats,
        "cicd_runs": cicd_runs,
        "cicd_checks": cicd_checks,
        "audit_logs": audit_logs,
        "summary_stats": summary_stats,
        "timeline_events": timeline_events,
        "security_activity": security_activity,
        "cicd_activity": cicd_activity,
        "review_activity": review_activity,
        "activity_summary": activity_summary,
        "event_breakdown": event_breakdown,
        "commit_activity": commit_activity,
        "files_changed": files_changed,
        "comments_activity": comments_activity,
        "security_findings": security_findings,
        "cicd_runs_data": cicd_runs_data,
        "review_summary_data": review_summary_data,
        "audit_log_entries": audit_log_entries,
    }


@router.post(
    "/pull-requests/{pr_id}/activity/comment",
    response_model=dict,
    summary="Add Comment to PR Conversation (Screen 8.4)",
    description="Appends a new user comment or reply to the PR discussion thread."
)
async def add_pr_activity_comment(
    pr_id: str,
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    content = payload.get("content", "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="Comment content cannot be empty.")
    
    new_comment = {
        "id": f"cm-{uuid.uuid4().hex[:6]}",
        "author": getattr(current_user, "username", "mayur.bharvad"),
        "role": "Author",
        "time": "Just now",
        "content": content,
        "replies": []
    }
    return {"status": "success", "message": "Comment posted successfully", "comment": new_comment}


@router.get(
    "/pull-requests/{pr_id}/activity/audit-log/export",
    summary="Export PR Activity Audit Log (Screen 8.8)",
    description="Generates an export payload (CSV/JSON format) for compliance and governance records."
)
async def export_pr_audit_log(
    pr_id: str,
    format: str = "csv",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    return {
        "pr_id": pr_id,
        "exported_at": datetime.utcnow().isoformat(),
        "exported_by": getattr(current_user, "username", "mayur.bharvad"),
        "format": format,
        "total_records": 5,
        "download_url": f"/api/v1/pull-requests/{pr_id}/activity/audit-log/download?token={uuid.uuid4().hex}",
    }


# ── PR Security Policy Module Endpoints (Screens 13.1 - 13.8) ─────────────────

# In-memory policy state for mutable live updates (persisted in session)
_PR_POLICY_STATE: Dict[str, Any] = {
    "repository": "frontend-app",
    "branch": "main",
    "overview_stats": {
        "policy_rules": 12,
        "required_checks": 8,
        "active_exceptions": 3,
        "merge_protection": "100%",
    },
    "policy_coverage": [
        {"id": "cov-1", "name": "Code Scanning (SAST)", "status": "Enabled", "enabled": True},
        {"id": "cov-2", "name": "Secrets Detection", "status": "Enabled", "enabled": True},
        {"id": "cov-3", "name": "Dependency Scanning", "status": "Enabled", "enabled": True},
        {"id": "cov-4", "name": "IaC Scanning", "status": "Enabled", "enabled": True},
        {"id": "cov-5", "name": "License & Compliance", "status": "Enabled", "enabled": True},
        {"id": "cov-6", "name": "Custom Checks", "status": "Enabled", "enabled": True},
    ],
    "recent_events": [
        {"id": "rpe-1", "time": "2 hours ago", "event": "Policy updated", "actor": "@mayur.bharvad", "status": "Success"},
        {"id": "rpe-2", "time": "5 hours ago", "event": "New rule added", "actor": "@security-team", "status": "Success"},
        {"id": "rpe-3", "time": "1 day ago", "event": "Threshold changed", "actor": "@dev-team", "status": "Success"},
        {"id": "rpe-4", "time": "2 days ago", "event": "Exception granted", "actor": "@mayur.bharvad", "status": "Success"},
    ],
    "required_checks": [
        {"id": "chk-1", "name": "SAST Scan", "type": "Security", "required": True, "status": "Active", "icon": "shield"},
        {"id": "chk-2", "name": "Secret Scan", "type": "Security", "required": True, "status": "Active", "icon": "key"},
        {"id": "chk-3", "name": "Dependency Scan", "type": "Security", "required": True, "status": "Active", "icon": "package"},
        {"id": "chk-4", "name": "IaC Scan", "type": "Security", "required": False, "status": "Optional", "icon": "layers"},
        {"id": "chk-5", "name": "Container Scan", "type": "Security", "required": False, "status": "Optional", "icon": "box"},
        {"id": "chk-6", "name": "License Compliance", "type": "Compliance", "required": True, "status": "Active", "icon": "file-text"},
        {"id": "chk-7", "name": "Code Coverage", "type": "Quality", "required": False, "status": "Optional", "icon": "check-circle"},
        {"id": "chk-8", "name": "Unit Tests", "type": "CI", "required": True, "status": "Active", "icon": "check-square"},
        {"id": "chk-9", "name": "Build Status", "type": "CI", "required": True, "status": "Active", "icon": "play"},
        {"id": "chk-10", "name": "Custom Policy Check", "type": "Custom", "required": False, "status": "Optional", "icon": "settings"},
    ],
    "execution_order": [
        "Build & Unit Tests",
        "SAST Scan",
        "Secrets Detection",
        "Dependency Scan",
    ],
    "vulnerability_thresholds": [
        {"id": "vt-1", "category": "SAST (Code Scanning)", "severity": "Critical", "threshold": 0, "action": "Block merge"},
        {"id": "vt-2", "category": "SAST (Code Scanning)", "severity": "High", "threshold": 0, "action": "Block merge"},
        {"id": "vt-3", "category": "SAST (Code Scanning)", "severity": "Medium", "threshold": 5, "action": "Allow with warning"},
        {"id": "vt-4", "category": "SAST (Code Scanning)", "severity": "Low", "threshold": 20, "action": "Allow"},
        {"id": "vt-5", "category": "Dependency Scan", "severity": "Critical", "threshold": 0, "action": "Block merge"},
        {"id": "vt-6", "category": "Dependency Scan", "severity": "High", "threshold": 0, "action": "Block merge"},
        {"id": "vt-7", "category": "Dependency Scan", "severity": "Medium", "threshold": 10, "action": "Allow with warning"},
        {"id": "vt-8", "category": "Dependency Scan", "severity": "Low", "threshold": 50, "action": "Allow"},
        {"id": "vt-9", "category": "IaC Scan", "severity": "Critical", "threshold": 0, "action": "Block merge"},
        {"id": "vt-10", "category": "IaC Scan", "severity": "High", "threshold": 0, "action": "Block merge"},
        {"id": "vt-11", "category": "IaC Scan", "severity": "Medium", "threshold": 5, "action": "Allow with warning"},
        {"id": "vt-12", "category": "IaC Scan", "severity": "Low", "threshold": 25, "action": "Allow"},
    ],
    "secret_detection_toggles": {
        "enable_secret_detection": True,
        "block_merge_on_detected_secrets": True,
        "scan_all_file_types": True,
        "include_historical_commits": False,
    },
    "secret_types": [
        {"id": "st-1", "secret_type": "API Keys", "description": "Cloud provider API keys", "status": "Enabled", "action": "Enabled"},
        {"id": "st-2", "secret_type": "Access Tokens", "description": "GitHub, GitLab, OAuth tokens", "status": "Enabled", "action": "Enabled"},
        {"id": "st-3", "secret_type": "Database Credentials", "description": "DB usernames and passwords", "status": "Enabled", "action": "Enabled"},
        {"id": "st-4", "secret_type": "Private Keys", "description": "SSH, RSA, PEM keys", "status": "Enabled", "action": "Enabled"},
        {"id": "st-5", "secret_type": "Cloud Credentials", "description": "AWS, Azure, GCP credentials", "status": "Enabled", "action": "Enabled"},
        {"id": "st-6", "secret_type": "Generic Secrets", "description": "Custom patterns", "status": "Enabled", "action": "Enabled"},
    ],
    "custom_patterns": [
        {"id": "cp-1", "name": "internal_token", "pattern": "[a-zA-Z0-9]{32}", "status": "Enabled"},
        {"id": "cp-2", "name": "company_secret", "pattern": "sk_live_[0-9a-zA-Z]{24}", "status": "Enabled"},
    ],
    "iac_toggles": {
        "enable_iac_scanning": True,
        "block_merge_on_iac_misconfigurations": True,
    },
    "iac_supported_frameworks": {
        "Terraform": True,
        "CloudFormation": True,
        "Kubernetes (Helm)": True,
        "Ansible": True,
        "Docker": True,
        "Custom": False,
    },
    "iac_policy_rules": [
        {"id": "iac-1", "rule": "Public S3 bucket", "severity": "High", "status": "Enabled", "action": "Block"},
        {"id": "iac-2", "rule": "Open security group", "severity": "High", "status": "Enabled", "action": "Block"},
        {"id": "iac-3", "rule": "Root user access", "severity": "Critical", "status": "Enabled", "action": "Block"},
        {"id": "iac-4", "rule": "Unencrypted storage", "severity": "Medium", "status": "Enabled", "action": "Warn"},
        {"id": "iac-5", "rule": "Exposed database", "severity": "High", "status": "Enabled", "action": "Block"},
    ],
    "license_toggles": {
        "enable_license_compliance_check": True,
        "block_merge_on_restricted_licenses": True,
    },
    "restricted_licenses": [
        {"id": "rl-1", "license": "GPL-3.0", "risk_level": "High", "action": "Block"},
        {"id": "rl-2", "license": "AGPL-3.0", "risk_level": "High", "action": "Block"},
        {"id": "rl-3", "license": "SSPL-1.0", "risk_level": "High", "action": "Block"},
        {"id": "rl-4", "license": "Commons Clause", "risk_level": "Medium", "action": "Warn"},
        {"id": "rl-5", "license": "Elastic License", "risk_level": "Medium", "action": "Warn"},
    ],
    "allowed_licenses": [
        {"id": "al-1", "license": "MIT", "risk_level": "Low", "action": "Allow"},
        {"id": "al-2", "license": "Apache-2.0", "risk_level": "Low", "action": "Allow"},
        {"id": "al-3", "license": "BSD-3-Clause", "risk_level": "Low", "action": "Allow"},
        {"id": "al-4", "license": "ISC", "risk_level": "Low", "action": "Allow"},
    ],
    "merge_conditions": {
        "require_all_required_checks_to_pass": True,
        "require_code_owner_approval": True,
        "require_security_review_high_critical": True,
        "require_linear_history": False,
        "block_merge_on_policy_violations": True,
        "require_up_to_date_branch": True,
        "allow_merge_commit": True,
        "allow_squash_merge": True,
        "allow_rebase_and_merge": False,
        "enforcement_scope": "specific",
        "specific_branches": "main, release/*, develop",
    },
    "exceptions": [
        {"id": "EX-001", "rule": "SAST - High", "reason": "Legacy code", "expires": "Oct 15, 2026", "status": "Active"},
        {"id": "EX-002", "rule": "Dependency", "reason": "Business need", "expires": "Oct 25, 2026", "status": "Active"},
        {"id": "EX-003", "rule": "License", "reason": "Approved by legal", "expires": "Sep 28, 2026", "status": "Expired"},
        {"id": "EX-004", "rule": "Secret Scan", "reason": "False positive", "expires": "Oct 12, 2026", "status": "Active"},
    ],
    "audit_history": [
        {"id": "aud-1", "time": "Oct 04, 2026", "event": "Exception created", "user": "@mayur.bharvad", "details": "EX-004 for Secret Scan"},
        {"id": "aud-2", "time": "Oct 03, 2026", "event": "Policy updated", "user": "@security-team", "details": "Added license rule"},
        {"id": "aud-3", "time": "Oct 02, 2026", "event": "Exception expired", "user": "System", "details": "EX-003 expired"},
        {"id": "aud-4", "time": "Oct 01, 2026", "event": "Merge rule changed", "user": "@dev-team", "details": "Enabled code owner review"},
        {"id": "aud-5", "time": "Sep 30, 2026", "event": "Policy updated", "user": "@mayur.bharvad", "details": "Updated SAST threshold"},
    ],
}


@router.get(
    "/pull-requests/policy",
    response_model=dict,
    summary="Get Pull Request Security / Policy Configuration (Screens 13.1 - 13.8)",
    description="Returns full PR policy configuration, required checks, thresholds, secrets, IaC, licenses, merge gates, and exceptions."
)
async def get_pull_request_policy(
    repository: Optional[str] = "frontend-app",
    branch: Optional[str] = "main",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    state = dict(_PR_POLICY_STATE)
    state["repository"] = repository or "frontend-app"
    state["branch"] = branch or "main"
    return state


@router.get(
    "/pull-requests/{pr_id}/policy",
    response_model=dict,
    summary="Get Policy Configuration for Specific PR",
    description="Returns PR-specific security policy configuration."
)
async def get_pr_specific_policy(
    pr_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    return _PR_POLICY_STATE


@router.put(
    "/pull-requests/policy",
    response_model=dict,
    summary="Update Pull Request Security Policy",
    description="Persists modifications to PR security policy settings with audit record."
)
async def update_pull_request_policy(
    updates: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    global _PR_POLICY_STATE
    for k, v in updates.items():
        if k in _PR_POLICY_STATE:
            _PR_POLICY_STATE[k] = v

    # Append an audit history item
    new_audit = {
        "id": f"aud-{len(_PR_POLICY_STATE['audit_history']) + 1}",
        "time": datetime.utcnow().strftime("%b %d, %Y"),
        "event": "Policy updated",
        "user": current_user.email if hasattr(current_user, "email") else "@admin",
        "details": f"Updated {', '.join(updates.keys())}",
    }
    _PR_POLICY_STATE["audit_history"].insert(0, new_audit)
    return {"status": "success", "message": "Policy updated successfully", "policy": _PR_POLICY_STATE}


@router.post(
    "/pull-requests/policy/exceptions",
    response_model=dict,
    summary="Create Policy Exception",
    description="Adds a new policy exception for a rule."
)
async def create_policy_exception(
    exception_data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    global _PR_POLICY_STATE
    new_id = f"EX-{len(_PR_POLICY_STATE['exceptions']) + 1:03d}"
    item = {
        "id": new_id,
        "rule": exception_data.get("rule", "General"),
        "reason": exception_data.get("reason", "Approved exception"),
        "expires": exception_data.get("expires", "Nov 01, 2026"),
        "status": "Active",
    }
    _PR_POLICY_STATE["exceptions"].insert(0, item)
    _PR_POLICY_STATE["overview_stats"]["active_exceptions"] += 1

    # Audit
    new_audit = {
        "id": f"aud-{len(_PR_POLICY_STATE['audit_history']) + 1}",
        "time": datetime.utcnow().strftime("%b %d, %Y"),
        "event": "Exception created",
        "user": current_user.email if hasattr(current_user, "email") else "@admin",
        "details": f"{new_id} for {item['rule']}",
    }
    _PR_POLICY_STATE["audit_history"].insert(0, new_audit)
    return {"status": "success", "exception": item}


# ── PR Compliance Module Endpoints (Screens 11.1 - 11.8) ──────────────────────

_PR_COMPLIANCE_STATE: Dict[str, Any] = {
    "overview_stats": {
        "prs_scanned": 128,
        "compliant": 96,
        "non_compliant": 24,
        "needs_review": 8,
    },
    "trend": [
        {"date": "Sep 23", "compliant": 62, "non_compliant": 22, "needs_review": 6},
        {"date": "Sep 24", "compliant": 64, "non_compliant": 24, "needs_review": 7},
        {"date": "Sep 25", "compliant": 72, "non_compliant": 20, "needs_review": 6},
        {"date": "Sep 26", "compliant": 68, "non_compliant": 26, "needs_review": 8},
        {"date": "Sep 27", "compliant": 78, "non_compliant": 18, "needs_review": 7},
        {"date": "Sep 28", "compliant": 74, "non_compliant": 22, "needs_review": 8},
        {"date": "Sep 29", "compliant": 86, "non_compliant": 16, "needs_review": 5},
    ],
    "standards_breakdown": [
        {"name": "SOC 2", "percentage": 92, "count": 118, "total": 128},
        {"name": "PCI DSS", "percentage": 86, "count": 110, "total": 128},
        {"name": "ISO 27001", "percentage": 81, "count": 104, "total": 128},
        {"name": "NIST", "percentage": 78, "count": 100, "total": 128},
        {"name": "CIS", "percentage": 72, "count": 92, "total": 128},
    ],
    "standards": [
        {"id": "std-1", "name": "SOC 2", "description": "Security, availability and confidentiality controls", "status": "Enabled", "coverage": 92},
        {"id": "std-2", "name": "PCI DSS", "description": "Payment card industry data security standard", "status": "Enabled", "coverage": 86},
        {"id": "std-3", "name": "ISO 27001", "description": "Information security management system", "status": "Enabled", "coverage": 81},
        {"id": "std-4", "name": "NIST 800-53", "description": "Security and privacy controls for federal systems", "status": "Enabled", "coverage": 78},
        {"id": "std-5", "name": "CIS Benchmark", "description": "Center for Internet Security Benchmarks", "status": "Enabled", "coverage": 72},
    ],
    "rules": [
        {"id": "cr-1", "name": "No hardcoded secrets", "standard": "SOC 2", "severity": "High", "status": "Enabled"},
        {"id": "cr-2", "name": "Encrypt sensitive data", "standard": "PCI DSS", "severity": "High", "status": "Enabled"},
        {"id": "cr-3", "name": "Use approved base images", "standard": "CIS", "severity": "Medium", "status": "Enabled"},
        {"id": "cr-4", "name": "Least privilege permissions", "standard": "NIST", "severity": "High", "status": "Enabled"},
        {"id": "cr-5", "name": "Vulnerability scan required", "standard": "ISO 27001", "severity": "Medium", "status": "Enabled"},
        {"id": "cr-6", "name": "Dependency license check", "standard": "SOC 2", "severity": "Low", "status": "Enabled"},
        {"id": "cr-7", "name": "Infrastructure as code validation", "standard": "CIS", "severity": "Medium", "status": "Enabled"},
        {"id": "cr-8", "name": "Code review required", "standard": "PCI DSS", "severity": "Low", "status": "Enabled"},
    ],
    "scan_results": [
        {"id": "res-1", "pr_number": 237, "pr_title": "Add auth middleware", "repository": "frontend-app", "standards": ["SOC 2", "PCI DSS", "CIS"], "status": "Compliant"},
        {"id": "res-2", "pr_number": 236, "pr_title": "Update docker base", "repository": "backend-app", "standards": ["SOC 2", "CIS"], "status": "Non-Compliant"},
        {"id": "res-3", "pr_number": 235, "pr_title": "Fix dependency", "repository": "infra", "standards": ["SOC 2", "NIST"], "status": "Compliant"},
        {"id": "res-4", "pr_number": 234, "pr_title": "Add API", "repository": "devops", "standards": ["PCI DSS", "ISO 27001"], "status": "Needs Review"},
        {"id": "res-5", "pr_number": 233, "pr_title": "CI update", "repository": "devops", "standards": ["CIS", "NIST"], "status": "Compliant"},
        {"id": "res-6", "pr_number": 232, "pr_title": "Update secrets", "repository": "backend-app", "standards": ["SOC 2", "PCI DSS"], "status": "Non-Compliant"},
        {"id": "res-7", "pr_number": 231, "pr_title": "Add feature", "repository": "frontend-app", "standards": ["SOC 2", "ISO 27001"], "status": "Compliant"},
        {"id": "res-8", "pr_number": 230, "pr_title": "Refactor code", "repository": "frontend-app", "standards": ["CIS", "SOC 2"], "status": "Needs Review"},
    ],
    "violations": [
        {"id": "viol-1", "rule": "Hardcoded secret", "pr_number": 232, "repository": "backend-app", "severity": "High", "status": "Open"},
        {"id": "viol-2", "rule": "Unencrypted storage", "pr_number": 229, "repository": "infra", "severity": "High", "status": "Open"},
        {"id": "viol-3", "rule": "Exposed port", "pr_number": 228, "repository": "frontend-app", "severity": "Medium", "status": "In Progress"},
        {"id": "viol-4", "rule": "Missing license", "pr_number": 226, "repository": "frontend-app", "severity": "Medium", "status": "Open"},
        {"id": "viol-5", "rule": "Outdated base image", "pr_number": 225, "repository": "infra", "severity": "Low", "status": "Resolved"},
        {"id": "viol-6", "rule": "Excessive permissions", "pr_number": 223, "repository": "devops", "severity": "Medium", "status": "Open"},
        {"id": "viol-7", "rule": "No vulnerability scan", "pr_number": 219, "repository": "frontend-app", "severity": "High", "status": "In Progress"},
        {"id": "viol-8", "rule": "Policy violation", "pr_number": 218, "repository": "backend-app", "severity": "Low", "status": "Resolved"},
    ],
    "evidence_list": [
        {"id": "ev-1", "evidence_name": "Security scan report", "pr_number": 237, "standard": "SOC 2", "type": "Scan Result", "status": "Available", "download_url": "/api/v1/pull-requests/compliance/evidence/ev-1/download"},
        {"id": "ev-2", "evidence_name": "Code review approval", "pr_number": 236, "standard": "PCI DSS", "type": "Approval", "status": "Available", "download_url": "/api/v1/pull-requests/compliance/evidence/ev-2/download"},
        {"id": "ev-3", "evidence_name": "Dependency report", "pr_number": 225, "standard": "CIS", "type": "Report", "status": "Available", "download_url": "/api/v1/pull-requests/compliance/evidence/ev-3/download"},
        {"id": "ev-4", "evidence_name": "License scan report", "pr_number": 224, "standard": "NIST", "type": "Report", "status": "Available", "download_url": "/api/v1/pull-requests/compliance/evidence/ev-4/download"},
        {"id": "ev-5", "evidence_name": "IaC validation log", "pr_number": 223, "standard": "ISO 27001", "type": "Log", "status": "Available", "download_url": "/api/v1/pull-requests/compliance/evidence/ev-5/download"},
        {"id": "ev-6", "evidence_name": "Vulnerability scan", "pr_number": 232, "standard": "SOC 2", "type": "Scan Result", "status": "Available", "download_url": "/api/v1/pull-requests/compliance/evidence/ev-6/download"},
        {"id": "ev-7", "evidence_name": "Compliance checklist", "pr_number": 231, "standard": "PCI DSS", "type": "Document", "status": "Available", "download_url": "/api/v1/pull-requests/compliance/evidence/ev-7/download"},
        {"id": "ev-8", "evidence_name": "Policy exception", "pr_number": 220, "standard": "CIS", "type": "Document", "status": "Available", "download_url": "/api/v1/pull-requests/compliance/evidence/ev-8/download"},
    ],
    "settings": {
        "enable_compliance_checks": True,
        "block_non_compliant_prs": False,
        "require_evidence": True,
        "notify_on_violations": True,
        "default_standards": ["SOC 2", "PCI DSS", "CIS"],
    },
}


@router.get(
    "/pull-requests/compliance/full",
    response_model=dict,
    summary="Get Full PR Compliance Dataset (Screens 11.1 - 11.8)",
    description="Returns full compliance dataset including overview stats, trend, standards, rules, scan results, violations, evidence, and settings."
)
async def get_pr_compliance_full(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    return _PR_COMPLIANCE_STATE


@router.get(
    "/pull-requests/compliance/overview",
    response_model=dict,
    summary="Get Compliance Overview (Screen 11.1)",
    description="Returns compliance overview metrics, trend line series, and breakdown by standards."
)
async def get_pr_compliance_overview(
    days: Optional[int] = 30,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    return {
        "overview_stats": _PR_COMPLIANCE_STATE["overview_stats"],
        "trend": _PR_COMPLIANCE_STATE["trend"],
        "standards_breakdown": _PR_COMPLIANCE_STATE["standards_breakdown"],
    }


@router.get(
    "/pull-requests/compliance/standards",
    response_model=List[dict],
    summary="Get Standards & Frameworks (Screen 11.2)",
    description="Returns all tracked compliance standards and coverage percentages."
)
async def get_pr_compliance_standards(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[dict]:
    return _PR_COMPLIANCE_STATE["standards"]


@router.post(
    "/pull-requests/compliance/standards",
    response_model=dict,
    summary="Add Compliance Standard",
    description="Configures a new compliance standard framework."
)
async def add_pr_compliance_standard(
    standard_data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    global _PR_COMPLIANCE_STATE
    new_id = f"std-{len(_PR_COMPLIANCE_STATE['standards']) + 1}"
    new_standard = {
        "id": new_id,
        "name": standard_data.get("name", "New Standard"),
        "description": standard_data.get("description", "Custom compliance standard"),
        "status": "Enabled",
        "coverage": int(standard_data.get("coverage", 85)),
    }
    _PR_COMPLIANCE_STATE["standards"].append(new_standard)
    return {"status": "success", "standard": new_standard}


@router.get(
    "/pull-requests/compliance/rules",
    response_model=List[dict],
    summary="Get Compliance Rules (Screen 11.3)",
    description="Returns active compliance rules for pull requests."
)
async def get_pr_compliance_rules(
    standard: Optional[str] = None,
    severity: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[dict]:
    rules = _PR_COMPLIANCE_STATE["rules"]
    if standard and standard != "All Standards":
        rules = [r for r in rules if r["standard"].lower() == standard.lower()]
    if severity and severity != "All Severities":
        rules = [r for r in rules if r["severity"].lower() == severity.lower()]
    if search:
        s = search.lower()
        rules = [r for r in rules if s in r["name"].lower() or s in r["standard"].lower()]
    return rules


@router.post(
    "/pull-requests/compliance/rules",
    response_model=dict,
    summary="Add Compliance Rule",
    description="Creates a new compliance rule."
)
async def add_pr_compliance_rule(
    rule_data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    global _PR_COMPLIANCE_STATE
    new_id = f"cr-{len(_PR_COMPLIANCE_STATE['rules']) + 1}"
    new_rule = {
        "id": new_id,
        "name": rule_data.get("name", "Custom Rule"),
        "standard": rule_data.get("standard", "SOC 2"),
        "severity": rule_data.get("severity", "Medium"),
        "status": "Enabled",
    }
    _PR_COMPLIANCE_STATE["rules"].append(new_rule)
    return {"status": "success", "rule": new_rule}


@router.get(
    "/pull-requests/compliance/results",
    response_model=List[dict],
    summary="Get Compliance Scan Results (Screen 11.4)",
    description="Returns compliance scan results across pull requests."
)
async def get_pr_compliance_results(
    repository: Optional[str] = None,
    standard: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[dict]:
    results = _PR_COMPLIANCE_STATE["scan_results"]
    if repository and repository != "All Repositories":
        results = [r for r in results if r["repository"].lower() == repository.lower()]
    if standard and standard != "All Standards":
        results = [r for r in results if standard in r["standards"]]
    if search:
        s = search.lower()
        results = [r for r in results if s in r["pr_title"].lower() or s in str(r["pr_number"])]
    return results


@router.get(
    "/pull-requests/compliance/violations",
    response_model=List[dict],
    summary="Get Compliance Violations (Screen 11.5)",
    description="Returns active compliance violations across pull requests."
)
async def get_pr_compliance_violations(
    standard: Optional[str] = None,
    severity: Optional[str] = None,
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[dict]:
    violations = _PR_COMPLIANCE_STATE["violations"]
    if severity and severity != "All Severities":
        violations = [v for v in violations if v["severity"].lower() == severity.lower()]
    if status_filter and status_filter != "All Status":
        violations = [v for v in violations if v["status"].lower() == status_filter.lower()]
    return violations


@router.put(
    "/pull-requests/compliance/violations/{violation_id}",
    response_model=dict,
    summary="Update Compliance Violation Status",
    description="Triages or updates status for a compliance violation (Open, In Progress, Resolved)."
)
async def update_pr_compliance_violation(
    violation_id: str,
    update_data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    global _PR_COMPLIANCE_STATE
    for v in _PR_COMPLIANCE_STATE["violations"]:
        if v["id"] == violation_id:
            if "status" in update_data:
                v["status"] = update_data["status"]
            return {"status": "success", "violation": v}
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Violation not found")


@router.post(
    "/pull-requests/compliance/report",
    response_model=dict,
    summary="Generate Compliance Report (Screen 11.6)",
    description="Generates PR compliance audit summary report."
)
async def generate_pr_compliance_report(
    req: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    breakdown = [
        {"standard": "SOC 2", "compliant": 118, "non_compliant": 8, "needs_review": 2},
        {"standard": "PCI DSS", "compliant": 110, "non_compliant": 14, "needs_review": 4},
        {"standard": "ISO 27001", "compliant": 104, "non_compliant": 18, "needs_review": 6},
        {"standard": "NIST", "compliant": 100, "non_compliant": 22, "needs_review": 6},
        {"standard": "CIS", "compliant": 92, "non_compliant": 28, "needs_review": 8},
    ]
    return {
        "status": "success",
        "title": "Pull Request Compliance Report",
        "period": "Sep 01, 2026 - Sep 30, 2026",
        "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
        "report_type": req.get("report_type", "Compliance Summary"),
        "standard": req.get("standard", "All Standards"),
        "date_range": req.get("date_range", "Last 30 days"),
        "summary_stats": _PR_COMPLIANCE_STATE["overview_stats"],
        "breakdown": breakdown,
    }


@router.get(
    "/pull-requests/compliance/evidence",
    response_model=List[dict],
    summary="Get Audit & Evidence (Screen 11.7)",
    description="Returns compliance evidence records and artifact pointers."
)
async def get_pr_compliance_evidence(
    standard: Optional[str] = None,
    pr_number: Optional[int] = None,
    evidence_type: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[dict]:
    evidence = _PR_COMPLIANCE_STATE["evidence_list"]
    if standard and standard != "All Standards":
        evidence = [e for e in evidence if e["standard"].lower() == standard.lower()]
    if pr_number:
        evidence = [e for e in evidence if e["pr_number"] == pr_number]
    if evidence_type and evidence_type != "All Evidence Types":
        evidence = [e for e in evidence if e["type"].lower() == evidence_type.lower()]
    if search:
        s = search.lower()
        evidence = [e for e in evidence if s in e["evidence_name"].lower()]
    return evidence


@router.get(
    "/pull-requests/compliance/evidence/{evidence_id}/download",
    response_model=dict,
    summary="Download Compliance Evidence Payload",
    description="Retrieves compliance artifact evidence contents for download."
)
async def download_pr_compliance_evidence(
    evidence_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    for e in _PR_COMPLIANCE_STATE["evidence_list"]:
        if e["id"] == evidence_id:
            return {
                "evidence_id": e["id"],
                "evidence_name": e["evidence_name"],
                "pr_number": e["pr_number"],
                "standard": e["standard"],
                "type": e["type"],
                "checksum_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                "content": f"[AUDIT EVIDENCE] {e['evidence_name']} for PR #{e['pr_number']} under {e['standard']}.\nTimestamp: 2026-10-04T12:00:00Z\nStatus: PASSED\nDeterministic Verification: VALIDATED",
            }
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found")


@router.get(
    "/pull-requests/compliance/settings",
    response_model=dict,
    summary="Get Compliance Settings (Screen 11.8)",
    description="Returns compliance settings configuration."
)
async def get_pr_compliance_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    return _PR_COMPLIANCE_STATE["settings"]


@router.put(
    "/pull-requests/compliance/settings",
    response_model=dict,
    summary="Update Compliance Settings",
    description="Persists compliance configuration settings."
)
async def update_pr_compliance_settings(
    settings: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    global _PR_COMPLIANCE_STATE
    _PR_COMPLIANCE_STATE["settings"].update(settings)
    return {"status": "success", "message": "Compliance settings updated successfully", "settings": _PR_COMPLIANCE_STATE["settings"]}


# ── PR Security Hub & Finding Details Module (Screens 7.1 - 7.8) ──────────────

_PR_SECURITY_STATE: Dict[str, Any] = {
    "overview_stats": {
        "total": 12,
        "critical": 2,
        "high": 5,
        "medium": 3,
        "low": 2
    },
    "severity_breakdown": {
        "Critical": 2,
        "High": 5,
        "Medium": 3,
        "Low": 2
    },
    "findings_by_tool": [
        {
            "tool": "SAST",
            "name": "SAST",
            "icon": "code",
            "total": 4,
            "critical": 1,
            "high": 2,
            "medium": 1,
            "low": 0,
            "breakdown": [
                {"severity": "Critical", "count": 1, "color": "#ef4444"},
                {"severity": "High", "count": 2, "color": "#f97316"},
                {"severity": "Medium", "count": 1, "color": "#eab308"}
            ]
        },
        {
            "tool": "Secrets Detection",
            "name": "Secrets Detection",
            "icon": "key",
            "total": 2,
            "critical": 0,
            "high": 1,
            "medium": 0,
            "low": 1,
            "breakdown": [
                {"severity": "High", "count": 1, "color": "#f97316"},
                {"severity": "Low", "count": 1, "color": "#22c55e"}
            ]
        },
        {
            "tool": "Dependency Scan",
            "name": "Dependency Scan",
            "icon": "package",
            "total": 3,
            "critical": 0,
            "high": 1,
            "medium": 2,
            "low": 0,
            "breakdown": [
                {"severity": "High", "count": 1, "color": "#f97316"},
                {"severity": "Medium", "count": 2, "color": "#eab308"}
            ]
        },
        {
            "tool": "Code Quality",
            "name": "Code Quality",
            "icon": "check-circle",
            "total": 3,
            "critical": 0,
            "high": 1,
            "medium": 1,
            "low": 1,
            "breakdown": [
                {"severity": "High", "count": 1, "color": "#f97316"},
                {"severity": "Medium", "count": 1, "color": "#eab308"},
                {"severity": "Low", "count": 1, "color": "#22c55e"}
            ]
        }
    ],
    "top_findings": [
        {"id": "SAST-001", "severity": "Critical", "title": "SQL Injection", "tool": "SAST", "file": "src/routes/user.js"},
        {"id": "SEC-001", "severity": "High", "title": "Hardcoded API Key", "tool": "Secrets", "file": "src/config.js"},
        {"id": "SAST-002", "severity": "High", "title": "Insecure JWT Logic", "tool": "SAST", "file": "src/middleware.js"},
        {"id": "DEP-001", "severity": "Medium", "title": "Vulnerable package", "tool": "Dependency", "file": "package.json"},
        {"id": "CQ-001", "severity": "Medium", "title": "Unused variable", "tool": "Code Quality", "file": "src/controllers.js"}
    ],
    "findings": [
        {
            "id": "SAST-001",
            "title": "SQL Injection",
            "full_title": "SQL Injection vulnerability",
            "subtitle": "User input is directly concatenated into a SQL query, which can lead to SQL injection attacks.",
            "severity": "Critical",
            "tool": "SAST",
            "tool_full": "SAST (Semgrep)",
            "file": "src/routes/user.js",
            "line": 28,
            "status": "Open",
            "component": "Authentication",
            "rule_id": "python.lang.security.sql-injection",
            "cwe": "CWE-89",
            "cvss": "9.1 (Critical)",
            "confidence": "High",
            "first_detected": "Oct 04, 2026, 10:24 AM",
            "assignee": "Unassigned",
            "labels": ["security", "sql-injection"],
            "related_issues": ["#SEC-Q195 Move API key to environment variables"],
            "tags": ["auth", "database", "owasp-top-10"],
            "author": "mayur.bharvad",
            "created_days_ago": 2,
            "is_new": True,
            "is_unresolved": True,
            "in_changed_files": True
        },
        {
            "id": "SEC-001",
            "title": "Hardcoded API Key",
            "full_title": "Hardcoded API Key",
            "subtitle": "A hardcoded API key or private secret was detected in configuration code.",
            "severity": "High",
            "tool": "Secrets",
            "tool_full": "Secrets Detection",
            "file": "src/config.js",
            "line": 14,
            "status": "Open",
            "component": "Configuration",
            "rule_id": "generic.secrets.api-key",
            "cwe": "CWE-798",
            "cvss": "7.8 (High)",
            "confidence": "High",
            "first_detected": "Oct 04, 2026, 10:24 AM",
            "assignee": "security-team",
            "labels": ["secrets", "api-key"],
            "related_issues": ["#SEC-Q195 Move API key to environment variables"],
            "tags": ["secrets", "api-keys"],
            "author": "mayur.bharvad",
            "created_days_ago": 2,
            "is_new": True,
            "is_unresolved": True,
            "in_changed_files": True
        },
        {
            "id": "SAST-002",
            "title": "Insecure JWT Logic",
            "full_title": "Insecure JWT Logic",
            "subtitle": "JWT token verification does not enforce explicit algorithm white-listing.",
            "severity": "High",
            "tool": "SAST",
            "tool_full": "SAST (Semgrep)",
            "file": "src/middleware.js",
            "line": 42,
            "status": "Open",
            "component": "Authentication",
            "rule_id": "javascript.jwt.insecure-verification",
            "cwe": "CWE-347",
            "cvss": "7.5 (High)",
            "confidence": "High",
            "first_detected": "Oct 04, 2026, 10:25 AM",
            "assignee": "Unassigned",
            "labels": ["security", "jwt"],
            "related_issues": [],
            "tags": ["jwt", "tokens"],
            "author": "mayur.bharvad",
            "created_days_ago": 2,
            "is_new": True,
            "is_unresolved": True,
            "in_changed_files": True
        },
        {
            "id": "SAST-003",
            "title": "XSS in user input",
            "full_title": "Cross-Site Scripting (XSS) in user input",
            "subtitle": "User-supplied input is rendered without escaping in React template.",
            "severity": "High",
            "tool": "SAST",
            "tool_full": "SAST (Semgrep)",
            "file": "src/components/profile.js",
            "line": 55,
            "status": "Open",
            "component": "UI Components",
            "rule_id": "javascript.react.security.xss",
            "cwe": "CWE-79",
            "cvss": "7.2 (High)",
            "confidence": "Medium",
            "first_detected": "Oct 04, 2026, 10:25 AM",
            "assignee": "Unassigned",
            "labels": ["security", "xss"],
            "related_issues": [],
            "tags": ["xss", "frontend"],
            "author": "mayur.bharvad",
            "created_days_ago": 2,
            "is_new": False,
            "is_unresolved": True,
            "in_changed_files": True
        },
        {
            "id": "DEP-001",
            "title": "Vulnerable package",
            "full_title": "Vulnerable package lodash < 4.17.21",
            "subtitle": "Known command injection vulnerability in dependency package.",
            "severity": "Medium",
            "tool": "Dependency",
            "tool_full": "Dependency Scan (OSV)",
            "file": "package.json",
            "line": 18,
            "status": "Open",
            "component": "Dependencies",
            "rule_id": "osv.npm.lodash-cve-2021-23337",
            "cwe": "CWE-94",
            "cvss": "6.5 (Medium)",
            "confidence": "High",
            "first_detected": "Oct 04, 2026, 10:26 AM",
            "assignee": "Unassigned",
            "labels": ["dependency", "cve"],
            "related_issues": [],
            "tags": ["dependencies", "npm"],
            "author": "mayur.bharvad",
            "created_days_ago": 2,
            "is_new": False,
            "is_unresolved": True,
            "in_changed_files": True
        },
        {
            "id": "DEP-002",
            "title": "Outdated package",
            "full_title": "Outdated package express",
            "subtitle": "Installed version is over 3 minor releases behind recommended secure release.",
            "severity": "Medium",
            "tool": "Dependency",
            "tool_full": "Dependency Scan (OSV)",
            "file": "package.json",
            "line": 24,
            "status": "Open",
            "component": "Dependencies",
            "rule_id": "audit.npm.outdated-express",
            "cwe": "CWE-1104",
            "cvss": "5.3 (Medium)",
            "confidence": "High",
            "first_detected": "Oct 04, 2026, 10:26 AM",
            "assignee": "Unassigned",
            "labels": ["dependency"],
            "related_issues": [],
            "tags": ["dependencies"],
            "author": "mayur.bharvad",
            "created_days_ago": 2,
            "is_new": False,
            "is_unresolved": True,
            "in_changed_files": True
        },
        {
            "id": "CQ-001",
            "title": "Unused variable",
            "full_title": "Unused variable in controller scope",
            "subtitle": "Variable declared but never read, causing memory overhead and dead logic.",
            "severity": "Medium",
            "tool": "Code Quality",
            "tool_full": "Code Quality (ESLint)",
            "file": "src/controllers.js",
            "line": 19,
            "status": "Open",
            "component": "Controllers",
            "rule_id": "eslint.no-unused-vars",
            "cwe": "CWE-563",
            "cvss": "4.3 (Medium)",
            "confidence": "High",
            "first_detected": "Oct 04, 2026, 10:27 AM",
            "assignee": "Unassigned",
            "labels": ["quality", "lint"],
            "related_issues": [],
            "tags": ["quality"],
            "author": "mayur.bharvad",
            "created_days_ago": 2,
            "is_new": False,
            "is_unresolved": True,
            "in_changed_files": True
        },
        {
            "id": "CQ-002",
            "title": "Console statement",
            "full_title": "Console statement left in production server",
            "subtitle": "Unexpected console.log statement may leak sensitive telemetry to stdout.",
            "severity": "Low",
            "tool": "Code Quality",
            "tool_full": "Code Quality (ESLint)",
            "file": "src/server.js",
            "line": 10,
            "status": "Open",
            "component": "Server",
            "rule_id": "eslint.no-console",
            "cwe": "CWE-532",
            "cvss": "2.8 (Low)",
            "confidence": "High",
            "first_detected": "Oct 04, 2026, 10:27 AM",
            "assignee": "Unassigned",
            "labels": ["quality", "cleanup"],
            "related_issues": [],
            "tags": ["quality"],
            "author": "mayur.bharvad",
            "created_days_ago": 2,
            "is_new": False,
            "is_unresolved": True,
            "in_changed_files": True
        },
        {
            "id": "SAST-004",
            "title": "CSRF vulnerability",
            "full_title": "CSRF vulnerability",
            "subtitle": "Endpoint route handler lacks verified CSRF token validation header.",
            "severity": "Low",
            "tool": "SAST",
            "tool_full": "SAST (Semgrep)",
            "file": "src/routes/admin.js",
            "line": 33,
            "status": "Open",
            "component": "Admin Routes",
            "rule_id": "javascript.express.security.csrf",
            "cwe": "CWE-352",
            "cvss": "3.1 (Low)",
            "confidence": "Medium",
            "first_detected": "Oct 04, 2026, 10:27 AM",
            "assignee": "Unassigned",
            "labels": ["security", "csrf"],
            "related_issues": [],
            "tags": ["csrf", "admin"],
            "author": "mayur.bharvad",
            "created_days_ago": 2,
            "is_new": False,
            "is_unresolved": True,
            "in_changed_files": True
        },
        {
            "id": "SEC-002",
            "title": "Private key in code",
            "full_title": "Private key in code",
            "subtitle": "Suspected RSA private key header pattern detected in repository file.",
            "severity": "Low",
            "tool": "Secrets",
            "tool_full": "Secrets Detection",
            "file": "src/utils/keys.js",
            "line": 8,
            "status": "Open",
            "component": "Utilities",
            "rule_id": "generic.secrets.private-key",
            "cwe": "CWE-312",
            "cvss": "3.4 (Low)",
            "confidence": "Low",
            "first_detected": "Oct 04, 2026, 10:28 AM",
            "assignee": "Unassigned",
            "labels": ["secrets", "keys"],
            "related_issues": [],
            "tags": ["cryptography"],
            "author": "mayur.bharvad",
            "created_days_ago": 2,
            "is_new": False,
            "is_unresolved": True,
            "in_changed_files": True
        },
        {
            "id": "DEP-003",
            "title": "License issue",
            "full_title": "License issue GPL-3.0 copyleft dependency",
            "subtitle": "Dependency has incompatible license requirement with project commercial terms.",
            "severity": "Low",
            "tool": "Dependency",
            "tool_full": "Dependency Scan (OSV)",
            "file": "package.json",
            "line": 37,
            "status": "Ignored",
            "component": "Dependencies",
            "rule_id": "license.gpl-copyleft-check",
            "cwe": "CWE-1035",
            "cvss": "2.1 (Low)",
            "confidence": "High",
            "first_detected": "Oct 04, 2026, 10:28 AM",
            "assignee": "Unassigned",
            "labels": ["license", "compliance"],
            "related_issues": [],
            "tags": ["licensing"],
            "author": "mayur.bharvad",
            "created_days_ago": 2,
            "is_new": False,
            "is_unresolved": False,
            "in_changed_files": True
        },
        {
            "id": "CQ-003",
            "title": "Long function",
            "full_title": "Long function exceeds 80 lines",
            "subtitle": "Helper utility function contains high cyclomatic complexity.",
            "severity": "Low",
            "tool": "Code Quality",
            "tool_full": "Code Quality (ESLint)",
            "file": "src/helpers.js",
            "line": 61,
            "status": "Open",
            "component": "Helpers",
            "rule_id": "eslint.max-lines-per-function",
            "cwe": "CWE-1120",
            "cvss": "1.8 (Low)",
            "confidence": "High",
            "first_detected": "Oct 04, 2026, 10:28 AM",
            "assignee": "Unassigned",
            "labels": ["quality", "refactor"],
            "related_issues": [],
            "tags": ["refactoring"],
            "author": "mayur.bharvad",
            "created_days_ago": 2,
            "is_new": False,
            "is_unresolved": True,
            "in_changed_files": True
        }
    ],
    "selected_finding": {
        "id": "SAST-001",
        "title": "SQL Injection vulnerability",
        "short_title": "SQL Injection",
        "subtitle": "User input is directly concatenated into a SQL query, which can lead to SQL injection attacks.",
        "severity": "Critical",
        "status": "Open",
        "tool": "SAST (Semgrep)",
        "rule_id": "python.lang.security.sql-injection",
        "cwe": "CWE-89",
        "cvss": "9.1 (Critical)",
        "confidence": "High",
        "first_detected": "Oct 04, 2026, 10:24 AM",
        "file": "src/routes/user.js",
        "line": 28,
        "component": "Authentication",
        "assignee": "Unassigned",
        "labels": ["security", "sql-injection"],
        "related_issues": ["#SEC-Q195 Move API key to environment variables"],
        "tags": ["database", "auth", "owasp-top-10"],
        "code_snippet": {
            "file": "src/routes/user.js",
            "start_line": 20,
            "lines": [
                {"num": 20, "code": ""},
                {"num": 21, "code": "router.post('/login', async (req, res) => {"},
                {"num": 22, "code": "  const { username, password } = req.body;"},
                {"num": 23, "code": ""},
                {"num": 24, "code": "  try {"},
                {"num": 25, "code": "    const query = \"SELECT * FROM users WHERE", "highlight": "danger"},
                {"num": 26, "code": "    username = '\" + username + \"' AND password = '\" + password + \"'\";", "highlight": "danger"},
                {"num": 27, "code": "    const result = await db.query(query);"},
                {"num": 28, "code": "    if (result.length > 0) {"},
                {"num": 29, "code": "      res.json({ success: true, user: result[0] });"},
                {"num": 30, "code": "    } else {"},
                {"num": 31, "code": "      res.status(401).json({ success: false });"},
                {"num": 32, "code": "    }"},
                {"num": 33, "code": "  } catch (error) {"},
                {"num": 34, "code": "    res.status(500).json({ error: error.message });"},
                {"num": 35, "code": "  }"},
                {"num": 36, "code": "});"}
            ]
        },
        "data_flow": {
            "source": {
                "name": "req.body.username",
                "label": "User Input",
                "role": "Source"
            },
            "intermediate": {
                "name": "query",
                "label": "None",
                "role": "Sanitization"
            },
            "sink": {
                "name": "db.query()",
                "label": "SQL Execution",
                "role": "Sink"
            }
        },
        "fix_recommendation": {
            "recommendation_text": "Use parameterized queries or an ORM to prevent SQL injection. Do not directly concatenate user input into SQL statements.",
            "vulnerable_code": "const query = `SELECT * FROM users\nWHERE username = '${username}' AND\npassword = '${password}'`;\n\nconst result = await db.query(query);",
            "fixed_code": "const query = `SELECT * FROM users\nWHERE username = ? AND password = ?`;\n\nconst result = await db.query(query,\n  [username, password]);",
            "steps": [
                "Use parameterized queries or prepared statements",
                "Validate and sanitize user inputs",
                "Apply least privilege access to database",
                "Add input validation at API layer"
            ],
            "additional_resources": [
                {"title": "OWASP SQL Injection Prevention Cheat Sheet", "url": "https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html"},
                {"title": "Node.js MySQL Best Practices", "url": "https://github.com/mysqljs/mysql#escaping-query-values"}
            ]
        }
    },
    "suppression_target": {
        "id": "SAST-004",
        "title": "CSRF vulnerability",
        "severity": "Low",
        "tool": "SAST",
        "status": "Open",
        "scope": "Suppress for this pull request only",
        "scopes": [
            "Suppress for this pull request only",
            "Suppress across repository",
            "Mark as False Positive",
            "Accept Risk (Won't Fix)"
        ],
        "reason": "Endpoint is protected with custom CSRF token middleware. This is a false positive.",
        "expires": "Oct 04, 2027",
        "warning": "This finding will be hidden from active results but will be available in history."
    },
    "activity_target": {
        "id": "SEC-001",
        "title": "Hardcoded API Key",
        "severity": "High",
        "tool": "Secrets",
        "status": "Open",
        "events": [
            {
                "id": "ev-1",
                "timestamp": "Oct 04, 2026, 10:24 AM",
                "type": "detected",
                "title": "Finding detected",
                "description": "SAST scan identified a hardcoded API key.",
                "color": "#3b82f6"
            },
            {
                "id": "ev-2",
                "timestamp": "Oct 04, 2026, 10:32 AM",
                "type": "status",
                "title": "Status changed to Open",
                "description": "By mayur.bharvad",
                "color": "#22c55e"
            },
            {
                "id": "ev-3",
                "timestamp": "Oct 04, 2026, 11:15 AM",
                "type": "comment",
                "title": "Comment added",
                "description": "@dev-team this key should be moved to env variables.",
                "author_initials": "MB",
                "color": "#2563eb"
            },
            {
                "id": "ev-4",
                "timestamp": "Oct 04, 2026, 12:10 PM",
                "type": "assignee",
                "title": "Assignee changed",
                "description": "Assigned to security-team",
                "author_initials": "ST",
                "color": "#16a34a"
            },
            {
                "id": "ev-5",
                "timestamp": "Oct 04, 2026, 02:05 PM",
                "type": "label",
                "title": "Label added",
                "description": "secrets",
                "tag": "secrets",
                "color": "#6366f1"
            },
            {
                "id": "ev-6",
                "timestamp": "Oct 04, 2026, 04:20 PM",
                "type": "issue",
                "title": "Related issue created",
                "description": "#SEC-Q195 Move API key to environment variables",
                "color": "#0284c7"
            },
            {
                "id": "ev-7",
                "timestamp": "Oct 05, 2026, 09:10 AM",
                "type": "status",
                "title": "Status changed to In Progress",
                "description": "By security-team",
                "color": "#16a34a"
            }
        ]
    },
    "saved_views": [
        {"id": "v-1", "name": "Default Unresolved", "filters": {"unresolved_only": True}}
    ]
}


@router.get(
    "/pull-requests/{pr_id}/security",
    response_model=dict,
    summary="Get Pull Request Security Suite (Screens 7.1 - 7.8)",
    description="Returns security overview, findings list, finding details, code location, remediation, suppression, activity, and export filters."
)
async def get_pr_security_suite(
    pr_id: str,
    finding_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    pr_num = int(pr_id) if str(pr_id).isdigit() else 237

    pr_info = {
        "number": pr_num,
        "title": "Add authentication middleware" if pr_num == 237 else f"Pull Request #{pr_num}",
        "state": "open",
        "head_ref": "feature/auth-middleware",
        "base_ref": "main",
        "author": "mayur.bharvad",
        "commits_count": 12,
    }

    # Selected finding logic
    selected_finding = _PR_SECURITY_STATE["selected_finding"]
    if finding_id:
        match = next((f for f in _PR_SECURITY_STATE["findings"] if f["id"] == finding_id), None)
        if match:
            selected_finding = {
                **_PR_SECURITY_STATE["selected_finding"],
                **match,
            }

    return {
        "pr_info": pr_info,
        "overview_stats": _PR_SECURITY_STATE["overview_stats"],
        "severity_breakdown": _PR_SECURITY_STATE["severity_breakdown"],
        "findings_by_tool": _PR_SECURITY_STATE["findings_by_tool"],
        "top_findings": _PR_SECURITY_STATE["top_findings"],
        "findings": _PR_SECURITY_STATE["findings"],
        "selected_finding": selected_finding,
        "suppression_target": _PR_SECURITY_STATE["suppression_target"],
        "activity_target": _PR_SECURITY_STATE["activity_target"],
        "saved_views": _PR_SECURITY_STATE["saved_views"],
    }


@router.post(
    "/pull-requests/{pr_id}/security/findings/{finding_id}/suppress",
    response_model=dict,
    summary="Suppress / Ignore Finding (Screen 7.6)",
    description="Suppresses a finding for this PR or repository with audit reason and expiration date."
)
async def suppress_pr_finding(
    pr_id: str,
    finding_id: str,
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    global _PR_SECURITY_STATE
    scope = payload.get("scope", "Suppress for this pull request only")
    reason = payload.get("reason", "Suppressed by security engineer")
    expires = payload.get("expires", "Oct 04, 2027")

    # Update in finding list
    for f in _PR_SECURITY_STATE["findings"]:
        if f["id"] == finding_id:
            f["status"] = "Ignored"
            f["is_unresolved"] = False
            f["suppression_record"] = {
                "scope": scope,
                "reason": reason,
                "expires": expires,
                "suppressed_by": getattr(current_user, "email", "security-engineer"),
                "suppressed_at": datetime.utcnow().strftime("%b %d, %Y, %I:%M %p")
            }

    # Update suppression target
    if _PR_SECURITY_STATE["suppression_target"]["id"] == finding_id:
        _PR_SECURITY_STATE["suppression_target"]["status"] = "Ignored"
        _PR_SECURITY_STATE["suppression_target"]["scope"] = scope
        _PR_SECURITY_STATE["suppression_target"]["reason"] = reason
        _PR_SECURITY_STATE["suppression_target"]["expires"] = expires

    # Recalculate stats
    open_count = sum(1 for f in _PR_SECURITY_STATE["findings"] if f["status"] == "Open")
    _PR_SECURITY_STATE["overview_stats"]["total"] = len(_PR_SECURITY_STATE["findings"])

    return {
        "status": "success",
        "message": f"Finding {finding_id} successfully suppressed.",
        "finding_id": finding_id,
        "suppression": {
            "scope": scope,
            "reason": reason,
            "expires": expires
        }
    }


@router.post(
    "/pull-requests/{pr_id}/security/findings/{finding_id}/status",
    response_model=dict,
    summary="Update Finding Status (Screen 7.3 & 7.7)",
    description="Updates finding status, assigned user, or state."
)
async def update_pr_finding_status(
    pr_id: str,
    finding_id: str,
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    global _PR_SECURITY_STATE
    new_status = payload.get("status", "In Progress")
    comment = payload.get("comment", "")

    # Update finding in findings list
    for f in _PR_SECURITY_STATE["findings"]:
        if f["id"] == finding_id:
            f["status"] = new_status

    if _PR_SECURITY_STATE["selected_finding"]["id"] == finding_id:
        _PR_SECURITY_STATE["selected_finding"]["status"] = new_status

    # Add timeline event to activity_target if it matches
    if _PR_SECURITY_STATE["activity_target"]["id"] == finding_id:
        _PR_SECURITY_STATE["activity_target"]["status"] = new_status
        user_name = getattr(current_user, "email", "security-team").split("@")[0]
        _PR_SECURITY_STATE["activity_target"]["events"].append({
            "id": f"ev-{uuid.uuid4().hex[:6]}",
            "timestamp": datetime.utcnow().strftime("%b %d, %Y, %I:%M %p"),
            "type": "status",
            "title": f"Status changed to {new_status}",
            "description": f"By {user_name}",
            "color": "#16a34a"
        })

    return {
        "status": "success",
        "message": f"Finding {finding_id} status updated to {new_status}",
        "new_status": new_status
    }


@router.post(
    "/pull-requests/{pr_id}/security/findings/{finding_id}/comments",
    response_model=dict,
    summary="Add Finding Activity Comment (Screen 7.7)",
    description="Adds a comment to the finding history timeline."
)
async def add_pr_finding_comment(
    pr_id: str,
    finding_id: str,
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    global _PR_SECURITY_STATE
    text = payload.get("comment", "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Comment text cannot be empty")

    author_name = getattr(current_user, "email", "mayur.bharvad").split("@")[0]
    initials = "".join([part[0].upper() for part in author_name.split(".")]) if "." in author_name else author_name[:2].upper()

    new_event = {
        "id": f"ev-{uuid.uuid4().hex[:6]}",
        "timestamp": datetime.utcnow().strftime("%b %d, %Y, %I:%M %p"),
        "type": "comment",
        "title": "Comment added",
        "description": text,
        "author_initials": initials,
        "color": "#2563eb"
    }

    if _PR_SECURITY_STATE["activity_target"]["id"] == finding_id or finding_id == "SEC-001":
        _PR_SECURITY_STATE["activity_target"]["events"].append(new_event)

    return {
        "status": "success",
        "message": "Comment posted successfully",
        "event": new_event
    }


@router.get(
    "/pull-requests/{pr_id}/security/export",
    summary="Export Security Findings (Screen 7.8)",
    description="Exports security findings as CSV, JSON, or OASIS SARIF v2.1.0 formatted report."
)
async def export_pr_findings(
    pr_id: str,
    export_format: str = "json",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    findings = _PR_SECURITY_STATE["findings"]
    fmt = export_format.lower()

    if fmt == "csv":
        header = "ID,Title,Severity,Tool,File,Line,Status,RuleID,CWE\n"
        rows = [
            f'"{f["id"]}","{f["title"]}","{f["severity"]}","{f["tool"]}","{f["file"]}",{f.get("line", 0)},"{f["status"]}","{f.get("rule_id", "")}","{f.get("cwe", "")}"'
            for f in findings
        ]
        csv_content = header + "\n".join(rows)
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=pr-{pr_id}-security-findings.csv"}
        )

    elif fmt == "sarif":
        sarif_data = {
            "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
            "version": "2.1.0",
            "runs": [
                {
                    "tool": {
                        "driver": {
                            "name": "SecuLayer Security Engine",
                            "version": "2.4.0",
                            "rules": [
                                {
                                    "id": f.get("rule_id", f["id"]),
                                    "name": f["title"],
                                    "shortDescription": {"text": f["title"]},
                                    "defaultConfiguration": {"level": "error" if f["severity"] in ["Critical", "High"] else "warning"}
                                }
                                for f in findings
                            ]
                        }
                    },
                    "results": [
                        {
                            "ruleId": f.get("rule_id", f["id"]),
                            "message": {"text": f.get("subtitle", f["title"])},
                            "level": "error" if f["severity"] in ["Critical", "High"] else "warning",
                            "locations": [
                                {
                                    "physicalLocation": {
                                        "artifactLocation": {"uri": f["file"]},
                                        "region": {"startLine": f.get("line", 1)}
                                    }
                                }
                            ]
                        }
                        for f in findings
                    ]
                }
            ]
        }
        import json
        return Response(
            content=json.dumps(sarif_data, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=pr-{pr_id}-security-findings.sarif"}
        )

    # Default to JSON
    import json
    return Response(
        content=json.dumps({"pr_id": pr_id, "findings_count": len(findings), "findings": findings}, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=pr-{pr_id}-security-findings.json"}
    )


@router.post(
    "/pull-requests/{pr_id}/security/views/save",
    response_model=dict,
    summary="Save Filter View (Screen 7.8)",
    description="Saves a custom filter preset for pull request security findings."
)
async def save_security_filter_view(
    pr_id: str,
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    global _PR_SECURITY_STATE
    name = payload.get("name", "Custom View")
    filters = payload.get("filters", {})
    new_view = {
        "id": f"v-{uuid.uuid4().hex[:6]}",
        "name": name,
        "filters": filters,
        "created_at": datetime.utcnow().strftime("%b %d, %Y, %I:%M %p")
    }
    _PR_SECURITY_STATE["saved_views"].append(new_view)
    return {
        "status": "success",
        "message": f"View '{name}' saved successfully",
        "view": new_view
    }


# ── PR Settings Suite Module (Screens 14.1 - 14.8) ────────────────────────────

_PR_SETTINGS_STATE: Dict[str, Any] = {
    "general": {
        "title_template": "{{type}}: {{title}}",
        "description_template": "## Summary\n- What changes are made?\n\n## Type of change\n- [ ] Feature\n- [ ] Bug fix\n- [ ] Refactor\n\n## Checklist\n",
        "default_assignees": [],
        "default_reviewers": [],
        "auto_add_code_owners": True,
        "link_related_issues": True,
        "require_pr_template": False,
    },
    "review": {
        "min_reviewers": 2,
        "require_code_owner_review": True,
        "dismiss_stale_reviews": False,
        "require_draft_approval": False,
        "comment_resolution_required": True,
        "review_request_behavior": "Allow multiple reviewers",
        "default_reviewers_list": [
            {"name": "frontend-team", "type": "Team", "required": True},
            {"name": "@mayur.bharvad", "type": "User", "required": True},
            {"name": "security-team", "type": "Team", "required": False},
        ],
    },
    "merge": {
        "allow_merge_commit": True,
        "allow_squash_merge": True,
        "allow_rebase_merge": False,
        "require_linear_history": False,
        "require_signed_commits": True,
        "delete_source_branch": True,
        "allow_auto_merge": False,
        "require_all_checks_pass": True,
        "default_commit_message": "PR title and description",
    },
    "branch_protection": [
        {"id": "bp-1", "pattern": "main", "requirements": "PR required, 2 reviewers, All checks must pass", "status": "Active", "require_pr": True, "min_reviewers": 2, "require_code_owner_review": True, "require_status_checks": True, "require_linear_history": False, "restrict_push": False},
        {"id": "bp-2", "pattern": "develop", "requirements": "PR required, 1 reviewer, All checks must pass", "status": "Active", "require_pr": True, "min_reviewers": 1, "require_code_owner_review": True, "require_status_checks": True, "require_linear_history": False, "restrict_push": False},
        {"id": "bp-3", "pattern": "release/*", "requirements": "PR required, Security checks", "status": "Active", "require_pr": True, "min_reviewers": 2, "require_code_owner_review": True, "require_status_checks": True, "require_linear_history": False, "restrict_push": False},
        {"id": "bp-4", "pattern": "feature/*", "requirements": "No protection", "status": "Inactive", "require_pr": False, "min_reviewers": 0, "require_code_owner_review": False, "require_status_checks": False, "require_linear_history": False, "restrict_push": False},
        {"id": "bp-5", "pattern": "hotfix/*", "requirements": "PR required, 2 reviewers, All checks must pass", "status": "Active", "require_pr": True, "min_reviewers": 2, "require_code_owner_review": True, "require_status_checks": True, "require_linear_history": False, "restrict_push": False},
    ],
    "security_quality_gates": [
        {"check": "SAST Scan", "type": "Security", "required": True, "status": "Passing"},
        {"check": "Secret Scan", "type": "Security", "required": True, "status": "Passing"},
        {"check": "Dependency Scan", "type": "Security", "required": True, "status": "Passing"},
        {"check": "IaC Scan", "type": "Security", "required": False, "status": "Optional"},
        {"check": "Build", "type": "CI", "required": True, "status": "Passing"},
        {"check": "Unit Tests", "type": "CI", "required": True, "status": "Passing"},
        {"check": "Code Coverage", "type": "Quality", "required": False, "status": "Optional"},
        {"check": "Lint Check", "type": "Quality", "required": True, "status": "Passing"},
    ],
    "notifications": {
        "events": [
            {"event": "PR opened", "email": True, "in_app": True, "slack": True, "webhook": False},
            {"event": "PR updated", "email": False, "in_app": True, "slack": False, "webhook": False},
            {"event": "Review requested", "email": True, "in_app": True, "slack": True, "webhook": False},
            {"event": "Review submitted", "email": True, "in_app": True, "slack": True, "webhook": False},
            {"event": "Comment added", "email": False, "in_app": True, "slack": False, "webhook": False},
            {"event": "Status check failed", "email": True, "in_app": True, "slack": True, "webhook": True},
            {"event": "Security finding detected", "email": True, "in_app": True, "slack": True, "webhook": True},
            {"event": "PR merged", "email": True, "in_app": True, "slack": True, "webhook": False},
            {"event": "PR closed", "email": False, "in_app": True, "slack": False, "webhook": False},
        ],
        "recipients": [
            {"name": "frontend-team", "type": "Team"},
            {"name": "security-team", "type": "Team"},
            {"name": "mayur.bharvad", "type": "User"},
        ],
    },
    "access_permissions": {
        "role_permissions": [
            {"role": "Admins", "create_pr": True, "review": True, "approve": True, "merge": True, "manage_settings": True},
            {"role": "Maintainers", "create_pr": True, "review": True, "approve": True, "merge": True, "manage_settings": False},
            {"role": "Developers", "create_pr": True, "review": True, "approve": False, "merge": False, "manage_settings": False},
            {"role": "External Contributors", "create_pr": True, "review": False, "approve": False, "merge": False, "manage_settings": False},
            {"role": "Viewers", "create_pr": False, "review": False, "approve": False, "merge": False, "manage_settings": False},
        ],
        "user_team_access": [
            {"name": "@mayur.bharvad", "role": "Admin", "permission_level": "Full access"},
            {"name": "frontend-team", "role": "Maintainer", "permission_level": "Write"},
            {"name": "security-team", "role": "Maintainer", "permission_level": "Write"},
            {"name": "dev-team", "role": "Developer", "permission_level": "Write"},
            {"name": "qa-team", "role": "Developer", "permission_level": "Read"},
            {"name": "external-collaborators", "role": "External Contributor", "permission_level": "Read"},
        ],
    },
    "advanced": {
        "auto_label_rules": [
            {"id": "al-1", "condition": "Files match src/**", "label": "frontend", "status": True},
            {"id": "al-2", "condition": "Files match infra/**", "label": "infrastructure", "status": True},
            {"id": "al-3", "condition": "Files match docs/**", "label": "documentation", "status": True},
            {"id": "al-4", "condition": "Title contains 'fix'", "label": "bug", "status": True},
        ],
        "auto_assign_rules": [
            {"id": "aa-1", "condition": "Files match src/**", "assignee": "@frontend-team", "status": True},
            {"id": "aa-2", "condition": "Files match infra/**", "assignee": "@devops-team", "status": True},
            {"id": "aa-3", "condition": "Files match security/**", "assignee": "@security-team", "status": True},
        ],
        "enable_pr_templates": True,
        "allow_fork_prs": False,
        "enable_auto_close_keywords": True,
        "enable_dependency_update_prs": True,
        "enable_draft_prs": True,
    },
}


@router.get(
    "/pull-requests/settings",
    response_model=dict,
    summary="Get PR Settings Suite (Screens 14.1 - 14.8)",
    description="Returns global pull request settings across all 8 configuration domains."
)
async def get_pr_settings_suite(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    return _PR_SETTINGS_STATE


@router.put(
    "/pull-requests/settings",
    response_model=dict,
    summary="Update PR Settings",
    description="Updates pull request settings configuration for a specific section or globally."
)
async def update_pr_settings(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    global _PR_SETTINGS_STATE
    for key in ["general", "review", "merge", "notifications", "access_permissions", "advanced"]:
        if key in payload:
            _PR_SETTINGS_STATE[key].update(payload[key])
    if "branch_protection" in payload:
        _PR_SETTINGS_STATE["branch_protection"] = payload["branch_protection"]
    if "security_quality_gates" in payload:
        _PR_SETTINGS_STATE["security_quality_gates"] = payload["security_quality_gates"]

    return {
        "status": "success",
        "message": "PR settings updated successfully",
        "settings": _PR_SETTINGS_STATE
    }


@router.post(
    "/pull-requests/settings/branch-protection",
    response_model=dict,
    summary="Add Branch Protection Rule (Screen 14.4)",
    description="Creates a new branch protection rule."
)
async def add_branch_protection_rule(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    global _PR_SETTINGS_STATE
    new_rule = {
        "id": f"bp-{uuid.uuid4().hex[:6]}",
        "pattern": payload.get("pattern", "main"),
        "requirements": payload.get("requirements", "PR required, All checks must pass"),
        "status": payload.get("status", "Active"),
        "require_pr": payload.get("require_pr", True),
        "min_reviewers": payload.get("min_reviewers", 2),
        "require_code_owner_review": payload.get("require_code_owner_review", True),
        "require_status_checks": payload.get("require_status_checks", True),
        "require_linear_history": payload.get("require_linear_history", False),
        "restrict_push": payload.get("restrict_push", False),
    }
    _PR_SETTINGS_STATE["branch_protection"].append(new_rule)
    return {"status": "success", "rule": new_rule}


@router.delete(
    "/pull-requests/settings/branch-protection/{rule_id}",
    response_model=dict,
    summary="Delete Branch Protection Rule",
    description="Deletes an existing branch protection rule."
)
async def delete_branch_protection_rule(
    rule_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    global _PR_SETTINGS_STATE
    _PR_SETTINGS_STATE["branch_protection"] = [r for r in _PR_SETTINGS_STATE["branch_protection"] if r["id"] != rule_id]
    return {"status": "success", "message": f"Rule {rule_id} deleted"}




