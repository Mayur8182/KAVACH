from typing import Dict, List, Optional
from app.engines.scanner.base import SecurityScanner
from app.engines.scanner.semgrep import SemgrepScanner
from app.engines.scanner.gitleaks import GitleaksScanner
from app.engines.scanner.osv import OsvScanner
from app.engines.scanner.trivy import TrivyScanner
from app.engines.scanner.checkov import CheckovScanner
from app.engines.scanner.builtin import BuiltinSecurityScanner


class ScannerRegistry:
    """Central registry of production security scanners."""

    def __init__(self) -> None:
        self._scanners: Dict[str, SecurityScanner] = {
            "seculayer-builtin": BuiltinSecurityScanner(),
            "semgrep": SemgrepScanner(),
            "gitleaks": GitleaksScanner(),
            "osv-scanner": OsvScanner(),
            "trivy": TrivyScanner(),
            "checkov": CheckovScanner(),
        }

    def get_scanner(self, name: str) -> Optional[SecurityScanner]:
        norm = name.lower().replace("_", "-")
        if norm == "osv":
            norm = "osv-scanner"
        return self._scanners.get(norm)

    def get_all_scanners(self) -> List[SecurityScanner]:
        return list(self._scanners.values())

    def get_scanners_by_names(self, names: Optional[List[str]] = None) -> List[SecurityScanner]:
        if not names:
            return self.get_all_scanners()
        selected = []
        for name in names:
            s = self.get_scanner(name)
            if s:
                selected.append(s)
        return selected

    async def get_all_health(self) -> List[Dict]:
        import asyncio
        from datetime import datetime, timezone
        coros = [scanner.health() for scanner in self._scanners.values()]
        raw_results = await asyncio.gather(*coros, return_exceptions=True)
        results = []
        for i, scanner in enumerate(self._scanners.values()):
            res = raw_results[i]
            if isinstance(res, Exception):
                results.append({
                    "scanner_name": scanner.scanner_name,
                    "scanner_type": scanner.scanner_type,
                    "tool_name": scanner.tool_name,
                    "status": "not_configured",
                    "is_available": False,
                    "version": None,
                    "message": f"Health check failed: {str(res)}",
                    "last_health_check": datetime.now(timezone.utc).isoformat(),
                })
            else:
                results.append(res)
        return results


# Global singleton registry
default_scanner_registry = ScannerRegistry()
