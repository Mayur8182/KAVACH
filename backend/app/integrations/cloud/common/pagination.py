"""
Step 18 Paginated Discovery Helper.

RULE 43 — CLOUD RESOURCE DISCOVERY MUST BE PAGINATED.
Never assume one API call returns all resources.
"""

from typing import Dict, Any, List, Optional, Callable, Awaitable
from dataclasses import dataclass, field


@dataclass
class PageResult:
    items: List[Dict[str, Any]] = field(default_factory=list)
    next_token: Optional[str] = None
    has_more: bool = False
    total_count: Optional[int] = None


async def paginate_all(
    fetch_page: Callable[[Optional[str]], Awaitable[PageResult]],
    max_pages: int = 50,
) -> List[Dict[str, Any]]:
    """
    Exhaustively paginates a fetch_page function until next_token is None or max_pages reached.
    """
    all_items: List[Dict[str, Any]] = []
    token: Optional[str] = None
    page_count = 0

    while page_count < max_pages:
        page = await fetch_page(token)
        all_items.extend(page.items)
        page_count += 1

        if not page.has_more or not page.next_token:
            break
        token = page.next_token

    return all_items
