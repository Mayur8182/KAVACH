from typing import Dict, Any, Tuple
from app.models.attack import AttackTest

class OracleEngine:
    """
    Determines if the test VERIFIED or VIOLATED the expected behavior.
    """
    
    def evaluate(self, test: AttackTest, actual_behavior: Dict[str, Any]) -> str:
        """
        Evaluate actual against expected behavior.
        Returns: VERIFIED, VIOLATED, or UNKNOWN
        """
        expected = test.expected_behavior
        if not expected or not actual_behavior:
            return "UNKNOWN"
            
        condition = expected.get("condition")
        
        # Determine actual status based on actual_behavior
        # actual_behavior should have structured execution result
        status_code = actual_behavior.get("status_code")
        data_returned = actual_behavior.get("data_returned", False)
        action_allowed = actual_behavior.get("action_allowed", False)
        
        if condition == "requester_tenant_must_match_resource_tenant":
            if status_code in [401, 403, 404] and not data_returned:
                return "VERIFIED"
            if status_code in [200, 201] or data_returned:
                return "VIOLATED"
                
        elif condition == "unauthorized_action_denied":
            if action_allowed or status_code in [200, 201]:
                return "VIOLATED"
            else:
                return "VERIFIED"
                
        elif condition == "reject_after_limit":
            # rate limit
            rate_limited = actual_behavior.get("rate_limited", False)
            if rate_limited:
                return "VERIFIED"
            else:
                return "VIOLATED"
                
        elif condition == "reject_second_request":
            # replay
            second_request_allowed = actual_behavior.get("second_request_allowed", False)
            if second_request_allowed:
                return "VIOLATED"
            else:
                return "VERIFIED"
                
        return "UNKNOWN"
