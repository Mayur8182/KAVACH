from typing import Dict, List, Optional
from app.engines.scanner.base import SecurityScanner
from app.engines.scanner.semgrep import SemgrepScanner
from app.engines.scanner.gitleaks import GitleaksScanner
from app.engines.scanner.osv import OsvScanner
from app.engines.scanner.trivy import TrivyScanner
from app.engines.scanner.checkov import CheckovScanner


class ScannerRegistry:
    """Central registry of production security scanners."""

    def __init__(self) -> None:
        self._scanners: Dict[str, SecurityScanner] = {
            "semgrep": SemgrepScanner(),
            "gitleaks": GitleaksScanner(),
            "osv-scanner": OsvScanner(),
            "trivy": TrivyScanner(),
            "checkov": CheckovScanner(),
        }

    def get_scanner(self, name: str) -> Optional[SecurityScanner]:
        return self._scanners.get(name.lower())

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
        results = []
        for scanner in self._scanners.values():
            results.append(await scanner.health())
        return results


# Global singleton registry
default_scanner_registry = ScannerRegistry()
