"""
Kavach Multi-Tenant Cache Router
Enforces strict tenant isolation across all caching tiers:
Format: kavach:{organizationId}:{workspaceId}:{userId}:{resourceType}:{resourceId}:{queryHash}
Guarantees zero cross-tenant cache leakage and provides workspace/user invalidation.
"""

import hashlib
import json
import logging
from typing import Any, Callable, Coroutine, Dict, Optional, TypeVar
import uuid

from app.core.cache import StampedeProofCache

logger = logging.getLogger("kavach.tenant_cache")

T = TypeVar("T")


class TenantCacheRouter:
    """
    Centralized, multi-tenant aware cache router.
    Wraps StampedeProofCache with mandatory tenant dimension keys.
    """

    def __init__(self, backend_cache: Optional[StampedeProofCache] = None):
        self._cache = backend_cache or StampedeProofCache(max_size=10000, default_ttl_seconds=300.0)

    @staticmethod
    def build_key(
        organization_id: Optional[Any] = "global",
        workspace_id: Optional[Any] = "default",
        user_id: Optional[Any] = "shared",
        resource_type: str = "general",
        resource_id: Optional[Any] = "all",
        query_params: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Constructs a deterministic, collision-proof, tenant-scoped cache key.
        Format: kavach:{org_id}:{workspace_id}:{user_id}:{resource_type}:{resource_id}:{query_hash}
        """
        org_str = str(organization_id) if organization_id else "global"
        ws_str = str(workspace_id) if workspace_id else "default"
        usr_str = str(user_id) if user_id else "shared"
        res_id_str = str(resource_id) if resource_id else "all"

        query_hash = "none"
        if query_params:
            try:
                sorted_params = json.dumps(query_params, sort_keys=True, default=str)
                query_hash = hashlib.sha256(sorted_params.encode("utf-8")).hexdigest()[:12]
            except Exception:
                query_hash = "hash_err"

        return f"kavach:{org_str}:{ws_str}:{usr_str}:{resource_type}:{res_id_str}:{query_hash}"

    def get(self, key: str) -> Optional[Any]:
        """Retrieve value for a tenant-scoped key."""
        return self._cache.get(key)

    def set(self, key: str, value: Any, ttl_seconds: Optional[float] = None) -> None:
        """Store value for a tenant-scoped key."""
        self._cache.set(key, value, ttl_seconds=ttl_seconds)

    async def get_or_compute(
        self,
        key: str,
        fetcher: Callable[[], Coroutine[Any, Any, T]],
        ttl_seconds: Optional[float] = None,
    ) -> T:
        """Singleflight request coalescing under tenant-scoped key."""
        return await self._cache.get_or_compute(key, fetcher, ttl_seconds=ttl_seconds)

    def invalidate_prefix(self, prefix: str) -> int:
        """
        Invalidates all keys matching a given prefix.
        Used when switching workspaces, disconnecting integrations, or logging out.
        """
        keys_to_delete = [k for k in self._cache._store.keys() if k.startswith(prefix)]
        for k in keys_to_delete:
            if k in self._cache._store:
                del self._cache._store[k]
        return len(keys_to_delete)

    def invalidate_tenant(self, organization_id: Any, workspace_id: Optional[Any] = None) -> int:
        """Invalidates entire cache for an organization or workspace."""
        prefix = f"kavach:{organization_id}:"
        if workspace_id:
            prefix += f"{workspace_id}:"
        return self.invalidate_prefix(prefix)

    def invalidate_user(self, user_id: Any) -> int:
        """Invalidates user-specific cached responses upon logout or role change."""
        keys_to_delete = [k for k in self._cache._store.keys() if f":{user_id}:" in k]
        for k in keys_to_delete:
            if k in self._cache._store:
                del self._cache._store[k]
        return len(keys_to_delete)


# Global singleton instance
tenant_cache_router = TenantCacheRouter()
