"""
Workspace model and membership aliases.
Re-exports Workspace and OrganizationMember for backward compatibility.
"""
from app.models.organization import Workspace
from app.models.invitation import OrganizationMember

__all__ = ["Workspace", "OrganizationMember"]
