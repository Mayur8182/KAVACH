from fastapi import APIRouter
from app.api.v1 import v1_router

main_router = APIRouter()
main_router.include_router(v1_router, prefix="/v1")

__all__ = ["main_router"]
