"""
SecuLayer - Standardized Pagination Schemas & Helpers
Provides reusable, enterprise-grade pagination metadata and response wrappers.
"""

from typing import Generic, List, Optional, TypeVar
from pydantic import BaseModel, Field, ConfigDict

T = TypeVar("T")


class PaginationMeta(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    page: int = Field(..., description="Current 1-based page number")
    page_size: int = Field(..., alias="pageSize", description="Items per page")
    total_items: int = Field(..., alias="totalItems", description="Total number of items")
    total_pages: int = Field(..., alias="totalPages", description="Total number of pages")
    has_next_page: bool = Field(..., alias="hasNextPage", description="Whether next page exists")
    has_previous_page: bool = Field(..., alias="hasPreviousPage", description="Whether previous page exists")


def build_pagination_meta(total: int, page: int, page_size: int) -> PaginationMeta:
    """Builds a verified, boundary-safe PaginationMeta instance."""
    safe_size = min(max(int(page_size), 1), 100)
    safe_page = max(int(page), 1)
    total_items = max(int(total), 0)
    total_pages = (total_items + safe_size - 1) // safe_size if total_items > 0 else 0
    return PaginationMeta(
        page=safe_page,
        pageSize=safe_size,
        totalItems=total_items,
        totalPages=total_pages,
        hasNextPage=safe_page < total_pages,
        hasPreviousPage=safe_page > 1 and total_pages > 0,
    )


class PaginatedResponse(BaseModel, Generic[T]):
    model_config = ConfigDict(populate_by_name=True)

    items: List[T]
    total: int = Field(..., description="Legacy flat total items count for backwards compatibility")
    pagination: PaginationMeta = Field(..., description="Detailed pagination metadata")
