import fnmatch
import uuid
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ScopeContext(BaseModel):
    """
    Context for the operation being evaluated against scope restrictions.
    """
    project_id: Optional[uuid.UUID] = None
    environment: str = "development"
    repository: Optional[str] = None
    branch: Optional[str] = None
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ScopeEvaluator:
    """
    Evaluates fine-grained scoping constraints:
    - Project boundaries
    - Environments (DEVELOPMENT, TEST, STAGING, PRODUCTION)
    - Branch wildcards (feature/*, main, release/*)
    - Repository URLs
    """

    @staticmethod
    def matches_scope(restriction: Dict[str, Any], context: ScopeContext) -> bool:
        """
        Returns True if the request context satisfies all constraints declared in restriction.
        If restriction is empty, it imposes no constraints and matches everything.
        """
        if not restriction:
            return True

        # 1. Project ID Constraint
        if "project_id" in restriction and restriction["project_id"]:
            allowed_pid = str(restriction["project_id"]).lower()
            current_pid = str(context.project_id).lower() if context.project_id else ""
            if allowed_pid != current_pid:
                return False

        # 2. Environment Constraint (supports 'environment' or 'environments')
        env_constraint = restriction.get("environments") or restriction.get("environment")
        if env_constraint:
            if isinstance(env_constraint, str):
                allowed_envs = [env_constraint.lower()]
            else:
                allowed_envs = [str(e).lower() for e in env_constraint]
            current_env = (context.environment or "development").lower()
            if current_env not in allowed_envs:
                return False

        # 3. Branch Constraint (supports 'branch' or 'branches' with fnmatch)
        branch_constraint = restriction.get("branches") or restriction.get("branch")
        if branch_constraint:
            if isinstance(branch_constraint, str):
                branch_patterns = [branch_constraint]
            else:
                branch_patterns = [str(b) for b in branch_constraint]
            if not context.branch:
                return False
            matched = any(
                fnmatch.fnmatch(context.branch, pattern)
                for pattern in branch_patterns
            )
            if not matched:
                return False

        # 4. Repository Constraint (supports 'repository' or 'repositories')
        repo_constraint = restriction.get("repositories") or restriction.get("repository")
        if repo_constraint:
            if not context.repository:
                return False
            if isinstance(repo_constraint, str):
                allowed_repos = [repo_constraint.lower()]
            else:
                allowed_repos = [str(r).lower() for r in repo_constraint]
            current_repo = context.repository.lower()
            if current_repo not in allowed_repos:
                return False

        # 5. Resource Type Constraint
        if "resource_types" in restriction and restriction["resource_types"]:
            if not context.resource_type:
                return False
            allowed_types = [str(t).upper() for t in restriction["resource_types"]]
            if context.resource_type.upper() not in allowed_types:
                return False

        return True
