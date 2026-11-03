from typing import Dict
from pydantic import BaseModel


class CoverageDetail(BaseModel):
    covered: int
    total: int
    unit: str
    status: str = "PARTIAL"  # COMPLETE, PARTIAL, NOT_CONFIGURED, UNKNOWN


class HomeCoverageResponse(BaseModel):
    code: CoverageDetail
    cloud: CoverageDetail
    protect: CoverageDetail
    agent: CoverageDetail
    data: CoverageDetail
