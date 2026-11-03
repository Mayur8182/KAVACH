import uuid
from typing import Dict, Any, List, Optional
from app.models.attack import AttackCampaign, AttackTest, AttackTarget

class AttackPlanner:
    """
    Determines what should be tested based on requirements/contracts.
    """
    
    def generate_tests_for_campaign(self, campaign: AttackCampaign, target: AttackTarget, contracts: List[Dict[str, Any]] = None) -> List[AttackTest]:
        """
        Mock implementation of dynamic attack generation.
        In a real system, this takes the application intent, interfaces, data domains, 
        security requirements, contracts, architecture, and technology into account.
        """
        tests = []
        if not contracts:
            contracts = []
            
        # Example generation based on contracts
        for contract in contracts:
            invariant = contract.get("invariant", "")
            if "tenant_id" in invariant:
                tests.append(
                    AttackTest(
                        campaign_id=campaign.id,
                        project_id=campaign.project_id,
                        test_type="TENANT_ISOLATION",
                        name="tenant-isolation-test",
                        description=f"Verify invariant: {invariant}",
                        target_type=target.target_type,
                        target_id=target.id,
                        environment=campaign.environment,
                        expected_behavior={
                            "condition": "requester_tenant_must_match_resource_tenant"
                        },
                        status="PLANNED"
                    )
                )
            elif "authority" in invariant.lower() or "delegation" in invariant.lower():
                tests.append(
                    AttackTest(
                        campaign_id=campaign.id,
                        project_id=campaign.project_id,
                        test_type="AGENT_AUTHORITY",
                        name="agent-authority-test",
                        description=f"Verify invariant: {invariant}",
                        target_type=target.target_type,
                        target_id=target.id,
                        environment=campaign.environment,
                        expected_behavior={
                            "condition": "unauthorized_action_denied"
                        },
                        status="PLANNED"
                    )
                )
            elif "rate_limit" in invariant.lower():
                tests.append(
                    AttackTest(
                        campaign_id=campaign.id,
                        project_id=campaign.project_id,
                        test_type="RATE_LIMIT",
                        name="rate-limit-test",
                        description=f"Verify invariant: {invariant}",
                        target_type=target.target_type,
                        target_id=target.id,
                        environment=campaign.environment,
                        expected_behavior={
                            "condition": "reject_after_limit"
                        },
                        status="PLANNED"
                    )
                )
            elif "replay" in invariant.lower():
                tests.append(
                    AttackTest(
                        campaign_id=campaign.id,
                        project_id=campaign.project_id,
                        test_type="REPLAY_PROTECTION",
                        name="replay-protection-test",
                        description=f"Verify invariant: {invariant}",
                        target_type=target.target_type,
                        target_id=target.id,
                        environment=campaign.environment,
                        expected_behavior={
                            "condition": "reject_second_request"
                        },
                        status="PLANNED"
                    )
                )
        
        # If no specific contracts match, generate a generic test for safety
        if not tests:
            tests.append(
                AttackTest(
                    campaign_id=campaign.id,
                    project_id=campaign.project_id,
                    test_type="AUTHORIZATION_BYPASS",
                    name="generic-auth-bypass-test",
                    description="Verify generic authorization boundaries",
                    target_type=target.target_type,
                    target_id=target.id,
                    environment=campaign.environment,
                    expected_behavior={
                        "condition": "unauthorized_action_denied"
                    },
                    status="PLANNED"
                )
            )
            
        return tests
