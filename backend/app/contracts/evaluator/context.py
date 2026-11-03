from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict, Field

_SENTINEL_MISSING = object()


class EvidenceContext(BaseModel):
    """
    Evidence Context provided to the deterministic contract evaluator.
    Holds authoritative attributes from runtime, identity, authorization, and audit evidence.
    """
    model_config = ConfigDict(extra="allow")

    subject: Dict[str, Any] = Field(default_factory=dict)
    action: Dict[str, Any] = Field(default_factory=dict)
    resource: Dict[str, Any] = Field(default_factory=dict)
    context: Dict[str, Any] = Field(default_factory=dict)
    decision: Dict[str, Any] = Field(default_factory=dict)
    authorization: Dict[str, Any] = Field(default_factory=dict)
    delegation: Dict[str, Any] = Field(default_factory=dict)
    data_flow: Dict[str, Any] = Field(default_factory=dict)
    mcp: Dict[str, Any] = Field(default_factory=dict)
    audit_event: Dict[str, Any] = Field(default_factory=dict)
    evidence: Dict[str, Any] = Field(default_factory=dict)

    def __init__(self, data: Optional[Dict[str, Any]] = None, **kwargs: Any):
        if data is not None and isinstance(data, dict):
            merged = dict(data)
            merged.update(kwargs)
            super().__init__(**merged)
        else:
            super().__init__(**kwargs)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "EvidenceContext":
        return cls(data)

    def set(self, field_path: str, value: Any) -> None:
        """
        Sets a value by dotted path e.g. ctx.set('subject.tenant_id', 't1') or ctx.set('agent.authority', ['READ'])
        """
        if not field_path:
            return

        parts = field_path.split(".")
        if len(parts) == 1:
            setattr(self, parts[0], value)
            return

        root_name = parts[0]
        if hasattr(self, root_name):
            root_val = getattr(self, root_name)
            if not isinstance(root_val, dict):
                root_val = {}
                setattr(self, root_name, root_val)
        else:
            root_val = {}
            setattr(self, root_name, root_val)

        curr = root_val
        for p in parts[1:-1]:
            if p not in curr or not isinstance(curr[p], dict):
                curr[p] = {}
            curr = curr[p]

        curr[parts[-1]] = value

    def resolve_field(self, field_path: str) -> Any:
        """
        Resolves dotted path like 'subject.tenant_id' or 'delegation.id'.
        Returns _SENTINEL_MISSING if the path does not exist.
        """
        if not field_path:
            return _SENTINEL_MISSING

        parts = field_path.split(".")
        root_name = parts[0]

        root_dict = getattr(self, root_name, None)
        if root_dict is None:
            # Check pydantic extra fields
            extra = getattr(self, "__pydantic_extra__", None) or {}
            root_dict = extra.get(root_name)
            if root_dict is None:
                return _SENTINEL_MISSING

        if len(parts) == 1:
            return root_dict

        curr = root_dict
        for p in parts[1:]:
            if isinstance(curr, dict):
                if p not in curr:
                    return _SENTINEL_MISSING
                curr = curr[p]
            elif hasattr(curr, p):
                curr = getattr(curr, p)
            else:
                return _SENTINEL_MISSING
        return curr
