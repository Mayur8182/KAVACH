"""
MongoDB Storage & Persistence Client for SecureAI / Thing Code.

Persists Thing Code repositories, findings, secret detections, scans,
and invitations to MongoDB Atlas.
"""

import logging
import time
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from app.core.config import get_settings

logger = logging.getLogger("secure-control-plane.mongo")
settings = get_settings()

_mongo_client = None


def get_mongo_client():
    """Returns singleton PyMongo client connected to MongoDB Atlas."""
    global _mongo_client
    if _mongo_client is not None:
        return _mongo_client

    mongo_url = settings.mongodb_url or settings.database_url
    if not mongo_url or not mongo_url.startswith(("mongodb://", "mongodb+srv://")):
        return None

    try:
        from pymongo import MongoClient
        _mongo_client = MongoClient(
            mongo_url,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            socketTimeoutMS=10000,
            maxPoolSize=20,
        )
        return _mongo_client
    except ImportError:
        logger.warning("pymongo is not installed in the python environment. MongoDB direct driver unavailable.")
        return None
    except Exception as exc:
        logger.error(f"Failed to initialize MongoDB client: {exc}", exc_info=True)
        return None


def get_mongo_db():
    """Returns the MongoDB database instance."""
    client = get_mongo_client()
    if client is None:
        return None
    db_name = getattr(settings, "mongodb_db_name", "secure_control_plane") or "secure_control_plane"
    return client[db_name]


async def check_mongo_connection() -> Dict[str, Any]:
    """
    Executes a real ping command against MongoDB Atlas cluster.
    Returns health status, latency in ms, and cluster information.
    """
    import asyncio
    mongo_url = settings.mongodb_url or settings.database_url
    if not mongo_url or not mongo_url.startswith(("mongodb://", "mongodb+srv://")):
        return {
            "healthy": False,
            "configured": False,
            "details": "MongoDB URL is not configured.",
        }

    client = get_mongo_client()
    if client is None:
        return {
            "healthy": False,
            "configured": True,
            "details": "PyMongo driver is not initialized or pymongo package is missing.",
        }

    start = time.perf_counter()
    try:
        # Run ping in worker thread to prevent blocking asyncio loop
        def _ping():
            return client.admin.command("ping")

        res = await asyncio.to_thread(_ping)
        latency_ms = round((time.perf_counter() - start) * 1000, 2)
        return {
            "healthy": True,
            "configured": True,
            "latency_ms": latency_ms,
            "details": f"Connected to MongoDB Atlas cluster ({settings.mongodb_db_name}) in {latency_ms}ms",
            "result": res,
        }
    except Exception as exc:
        latency_ms = round((time.perf_counter() - start) * 1000, 2)
        logger.warning(f"MongoDB connection ping failed: {exc}")
        return {
            "healthy": False,
            "configured": True,
            "latency_ms": latency_ms,
            "details": f"MongoDB Atlas ping failed: {str(exc)}",
        }


# ─────────────────────────────────────────────────────────────────────────────
# Real Collections Persistence API
# ─────────────────────────────────────────────────────────────────────────────

async def mongo_save_invitation(invitation_dict: Dict[str, Any]) -> bool:
    """Persists an invitation record into the invitations MongoDB collection."""
    import asyncio
    db = get_mongo_db()
    if db is None:
        return False

    def _save():
        col = db["invitations"]
        doc = dict(invitation_dict)
        if "id" in doc:
            doc["_id"] = str(doc["id"])
        doc["updated_at"] = datetime.now(timezone.utc).isoformat()
        col.replace_one({"_id": doc["_id"]}, doc, upsert=True)
        return True

    try:
        return await asyncio.to_thread(_save)
    except Exception as exc:
        logger.error(f"Failed to persist invitation into MongoDB: {exc}")
        return False


async def mongo_get_invitations(filter_query: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """Retrieves invitations from the invitations MongoDB collection."""
    import asyncio
    db = get_mongo_db()
    if db is None:
        return []

    def _get():
        col = db["invitations"]
        cursor = col.find(filter_query or {}).sort("created_at", -1)
        items = []
        for d in cursor:
            d["id"] = d.get("_id", d.get("id"))
            items.append(d)
        return items

    try:
        return await asyncio.to_thread(_get)
    except Exception as exc:
        logger.error(f"Failed to query invitations from MongoDB: {exc}")
        return []


async def mongo_save_secret_finding(secret_dict: Dict[str, Any]) -> bool:
    """Persists a secret detection into the thing_code_secrets MongoDB collection."""
    import asyncio
    db = get_mongo_db()
    if db is None:
        return False

    def _save():
        col = db["thing_code_secrets"]
        doc = dict(secret_dict)
        doc_id = str(doc.get("id") or doc.get("secret_id") or doc.get("_id") or f"sec_{int(time.time()*1000)}")
        doc["_id"] = doc_id
        doc["id"] = doc_id
        doc["saved_at"] = datetime.now(timezone.utc).isoformat()
        col.replace_one({"_id": doc_id}, doc, upsert=True)
        return True

    try:
        return await asyncio.to_thread(_save)
    except Exception as exc:
        logger.error(f"Failed to persist secret into MongoDB: {exc}")
        return False


async def mongo_get_secret_findings(filter_query: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """Retrieves secret findings from the thing_code_secrets MongoDB collection."""
    import asyncio
    db = get_mongo_db()
    if db is None:
        return []

    def _get():
        col = db["thing_code_secrets"]
        cursor = col.find(filter_query or {}).sort("detected_at", -1)
        items = []
        for d in cursor:
            d["id"] = d.get("_id", d.get("id"))
            items.append(d)
        return items

    try:
        return await asyncio.to_thread(_get)
    except Exception as exc:
        logger.error(f"Failed to query secrets from MongoDB: {exc}")
        return []


async def mongo_save_repository(repo_dict: Dict[str, Any]) -> bool:
    """Persists a connected repository into the thing_code_repositories collection."""
    import asyncio
    db = get_mongo_db()
    if db is None:
        return False

    def _save():
        col = db["thing_code_repositories"]
        doc = dict(repo_dict)
        doc_id = str(doc.get("id") or doc.get("repository_id") or doc.get("_id"))
        doc["_id"] = doc_id
        doc["id"] = doc_id
        col.replace_one({"_id": doc_id}, doc, upsert=True)
        return True

    try:
        return await asyncio.to_thread(_save)
    except Exception as exc:
        logger.error(f"Failed to persist repository into MongoDB: {exc}")
        return False


async def mongo_get_repositories() -> List[Dict[str, Any]]:
    """Retrieves all repositories from the thing_code_repositories collection."""
    import asyncio
    db = get_mongo_db()
    if db is None:
        return []

    def _get():
        col = db["thing_code_repositories"]
        cursor = col.find().sort("created_at", -1)
        items = []
        for d in cursor:
            d["id"] = d.get("_id", d.get("id"))
            items.append(d)
        return items

    try:
        return await asyncio.to_thread(_get)
    except Exception as exc:
        logger.error(f"Failed to query repositories from MongoDB: {exc}")
        return []
