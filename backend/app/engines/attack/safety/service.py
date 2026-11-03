from typing import Dict, Any, List
from app.models.attack import AttackCampaign, AttackTarget, AttackTest

class SafetyValidator:
    """
    Prevents unauthorized or unsafe execution (Rules 22, 23, 24).
    """
    
    def validate_campaign(self, campaign: AttackCampaign, target: AttackTarget) -> bool:
        """
        Validates scope, target, environment, authorization, policy, and safety.
        Returns True if safe, False if blocked.
        """
        # Rule 22: No unauthorized attacking of production
        if campaign.environment == "PRODUCTION":
            # Production execution requires explicit approval / policy decision
            if not campaign.policy_decision_id:
                return False
                
        # Target must be ACTIVE
        if target.status != "ACTIVE":
            return False
            
        # Environment mismatch
        if campaign.environment != target.environment:
            return False
            
        return True
        
    def validate_test(self, test: AttackTest) -> bool:
        """
        Safety validation of a specific test.
        """
        # Rule 24: No destructive attacks by default
        dangerous_types = ["DATA_DESTRUCTION", "DOS", "RESOURCE_DELETION"]
        if test.test_type in dangerous_types:
            return False
            
        return True
