from abc import ABC, abstractmethod
from typing import List
from app.engines.intent.models import NormalizedIntent
from app.engines.blueprint.models import BlueprintRequirementCandidate


class BaseBlueprintRule(ABC):
    """
    Abstract base class for all deterministic security blueprint rules.
    Every rule inspects NormalizedIntent characteristics and produces 0 or more candidate requirements.
    Rules must be versioned, explainable, and strictly evidence-based.
    """
    rule_id: str
    name: str
    version: str = "1.0.0"
    description: str

    @abstractmethod
    def evaluate(self, intent: NormalizedIntent) -> List[BlueprintRequirementCandidate]:
        """
        Evaluate intent facts and return generated security requirements.
        If conditions are not met, return an empty list. Never generate negative or irrelevant requirements.
        """
        pass
