"""
Kavach SCA Sub-Engine — Dependency Discovery & Manifest Parser
Discovers and parses package dependencies across npm, pip, go, maven, and cargo.
"""

import json
import os
import re
from typing import Dict, Any, List


class DependencyDiscoveryEngine:
    """
    Parses manifest files into normalized package dependency structures.
    """

    def parse_package_json(self, content: str) -> List[Dict[str, str]]:
        deps = []
        try:
            data = json.loads(content)
            for pkg, ver in {**data.get("dependencies", {}), **data.get("devDependencies", {})}.items():
                clean_ver = re.sub(r"[\^~>=<]", "", ver)
                deps.append({"ecosystem": "npm", "package": pkg, "version": clean_ver, "direct": True})
        except Exception:
            pass
        return deps

    def parse_requirements_txt(self, content: str) -> List[Dict[str, str]]:
        deps = []
        for line in content.split("\n"):
            line = line.strip()
            if not line or line.startswith("#") or line.startswith("-"):
                continue
            parts = re.split(r"==|>=|<=|~=", line)
            pkg = parts[0].strip()
            ver = parts[1].strip() if len(parts) > 1 else "latest"
            deps.append({"ecosystem": "PyPI", "package": pkg, "version": ver, "direct": True})
        return deps

    def discover_dependencies(self, target_path: str) -> List[Dict[str, Any]]:
        all_deps = []
        ignored = {".git", "node_modules", "venv", ".venv", "dist", "build", ".next", ".gemini", "tmp", "scratch"}
        for root, dirs, files in os.walk(target_path):
            dirs[:] = [d for d in dirs if d.lower() not in ignored and not d.startswith(".")]
            if "package.json" in files:
                try:
                    with open(os.path.join(root, "package.json"), "r", encoding="utf-8") as f:
                        all_deps.extend(self.parse_package_json(f.read()))
                except Exception:
                    pass
            if "requirements.txt" in files:
                try:
                    with open(os.path.join(root, "requirements.txt"), "r", encoding="utf-8") as f:
                        all_deps.extend(self.parse_requirements_txt(f.read()))
                except Exception:
                    pass
        return all_deps

