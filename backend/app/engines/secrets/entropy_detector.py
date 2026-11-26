"""
Kavach Secrets Sub-Engine — Entropy Detection Engine
Calculates Shannon Entropy over character distributions to identify high-entropy cryptographic secrets.
"""

import math
import re
from typing import Dict, Any, List


class EntropyDetector:
    """
    Computes Shannon entropy H(X) = -sum(p(x) * log2(p(x))).
    Hex strings: high entropy >= 3.0
    Base64 strings: high entropy >= 4.5
    """

    @staticmethod
    def calculate_shannon_entropy(data: str) -> float:
        if not data:
            return 0.0
        entropy = 0.0
        length = len(data)
        freq: Dict[str, int] = {}
        for c in data:
            freq[c] = freq.get(c, 0) + 1
        for count in freq.values():
            p = count / length
            entropy -= p * math.log2(p)
        return entropy

    def find_high_entropy_strings(self, line: str, min_length: int = 16, threshold: float = 4.2) -> List[Dict[str, Any]]:
        results = []
        tokens = re.findall(r"['\"]([a-zA-Z0-9_\-+/=]{16,})['\"]", line)
        for token in tokens:
            entropy = self.calculate_shannon_entropy(token)
            if entropy >= threshold:
                results.append({
                    "token": token[:6] + "..." + token[-4:],
                    "entropy": round(entropy, 2),
                    "length": len(token),
                })
        return results

