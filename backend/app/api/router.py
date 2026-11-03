from fastapi import APIRouter
from app.api.v1 import v1_router
from app.api.v1.hotspots import router as hotspots_router
from app.api.v1.integrations_v2 import router as integrations_v2_router
from app.code.sast_router import router as sast_router
from app.api.v1.findings_module import router as findings_module_router

main_router = APIRouter()
main_router.include_router(v1_router, prefix="/v1")
main_router.include_router(hotspots_router)
main_router.include_router(integrations_v2_router)
main_router.include_router(sast_router)
main_router.include_router(findings_module_router, prefix="/findings")

__all__ = ["main_router"]

