from fastapi import APIRouter
from app.api.v1.health import router as health_router
from app.api.v1.auth import router as auth_router
from app.api.v1.projects import router as projects_router
from app.api.v1.agents import router as agents_router
from app.api.v1.audit import router as audit_router
from app.api.v1.intents import router as intents_router
from app.api.v1.blueprints import router as blueprints_router
from app.api.v1.scans import router as scans_router

v1_router = APIRouter()
v1_router.include_router(health_router)
v1_router.include_router(auth_router)
v1_router.include_router(projects_router)
v1_router.include_router(agents_router)
v1_router.include_router(audit_router)
v1_router.include_router(intents_router)
v1_router.include_router(blueprints_router)
v1_router.include_router(scans_router)

__all__ = ["v1_router"]
