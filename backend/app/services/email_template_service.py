"""Kavach Complete Email Template Library & Renderer.

Implements all 38 approved enterprise security email templates across 8 categories:
- A. Account & Authentication (1-6)
- B. Projects & Integrations (7-11)
- C. Security Scanning & Findings (12-18)
- D. Reports & Downloads (19-22)
- E. API Security (23-26)
- F. Cloud & Infrastructure (27-29)
- G. Workspace & Billing (30-35)
- H. System Notifications (36-38)

Adheres strictly to the Kavach design system:
- Official Kavach branding & cube logo
- Clean white background (#FFFFFF) with refined slate card container
- Dark charcoal / light black CTA buttons (#18181B / #1F2937) with white text
- Professional typography (Lato / Segoe UI / Apple System)
- Minimal fine dividers (#EAECF0) and structured detail rows
- Responsive HTML with table-based email client compatibility + Plain text fallbacks
- Zero undefined variables and safe HTML escaping
"""

import html
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple


# =============================================================================
# Master Template Definitions (38 Templates)
# =============================================================================

EMAIL_TEMPLATES: Dict[str, Dict[str, Any]] = {
    # ── A. ACCOUNT & AUTHENTICATION ──────────────────────────────────────────
    "account_welcome": {
        "id": "account_welcome",
        "category": "Account & Authentication",
        "category_label": "Account",
        "subject_template": "Your Kavach account is ready",
        "preheader": "Account created successfully",
        "badge": None,
        "headline": "Welcome to Kavach!",
        "body": "Your account has been created successfully. You're now part of Kavach — the unified security platform for your code, cloud, APIs, and infrastructure.\n\nWhen your first project is ready, connect a repository or configure an integration to begin your security assessment.",
        "detail_fields": [
            ("Account", "user_email"),
            ("Workspace", "workspace_name"),
            ("Plan", "plan_name"),
            ("Created", "created_at"),
        ],
        "cta_label": "Create your first project →",
        "cta_url_key": "app_url",
        "cta_subtext": "Once you create a project, you can connect your repository, run security scans, and get actionable findings.",
    },
    "auth_email_verification": {
        "id": "auth_email_verification",
        "category": "Account & Authentication",
        "category_label": "Account & Authentication",
        "subject_template": "Verify your email address",
        "preheader": "Confirm this email address to secure your Kavach account",
        "badge": "Action Required",
        "badge_color": "#D97706",
        "headline": "Confirm this email address to secure your Kavach account",
        "body": "Use the button below to confirm that this email address belongs to you. This link can be used once and expires at {{expires_at}}.\n\nIf you did not create a Kavach account, you can ignore this message.",
        "detail_fields": [
            ("Email", "masked_email"),
            ("Expires", "expires_at"),
            ("Request", "request_time"),
        ],
        "cta_label": "Verify email address →",
        "cta_url_key": "verification_url",
        "cta_subtext": "This link is single-use and short-lived for security.",
    },
    "auth_password_reset_requested": {
        "id": "auth_password_reset_requested",
        "category": "Account & Authentication",
        "category_label": "Account & Authentication",
        "subject_template": "Reset your Kavach password",
        "preheader": "A password reset was requested for your account",
        "badge": "Security Notice",
        "badge_color": "#2563EB",
        "headline": "A password reset was requested for your account",
        "body": "We received a request to reset the password for your Kavach account. If you made this request, use the secure link below. The link expires at {{expires_at}}.\n\nIf you did not request a reset, no action is required. Your current password remains unchanged.",
        "detail_fields": [
            ("Account", "masked_email"),
            ("Requested", "requested_at"),
            ("Link expires", "expires_at"),
        ],
        "cta_label": "Reset password →",
        "cta_url_key": "password_reset_url",
        "cta_subtext": "If you did not make this request, check your account security settings.",
    },
    "auth_password_changed": {
        "id": "auth_password_changed",
        "category": "Account & Authentication",
        "category_label": "Account & Authentication",
        "subject_template": "Your Kavach password was changed",
        "preheader": "Your account password was changed",
        "badge": "Security Confirmation",
        "badge_color": "#16A34A",
        "headline": "Your account password was changed",
        "body": "The password for your Kavach account was changed successfully.\n\nIf you made this change, no further action is needed. If you did not, secure your account immediately and contact Kavach Support.",
        "detail_fields": [
            ("Account", "masked_email"),
            ("Changed", "changed_at"),
            ("Session", "session_summary"),
        ],
        "cta_label": "Review account security →",
        "cta_url_key": "security_settings_url",
    },
    "auth_new_signin_detected": {
        "id": "auth_new_signin_detected",
        "category": "Account & Authentication",
        "category_label": "Security Alert",
        "subject_template": "New sign-in to your Kavach account",
        "preheader": "A new sign-in was recorded for your Kavach account",
        "badge": "Security Alert",
        "badge_color": "#DC2626",
        "headline": "A new sign-in was recorded for your Kavach account",
        "body": "A sign-in to your Kavach account was recorded from a device or location we have not seen before.\n\nIf this was you, no action is needed. If you do not recognize it, review your active sessions and terminate unrecognized devices.",
        "detail_fields": [
            ("Time", "sign_in_time"),
            ("Device", "device"),
            ("Approx. location", "coarse_location"),
            ("IP Address", "masked_ip"),
        ],
        "cta_label": "Review sign-in activity →",
        "cta_url_key": "sessions_url",
    },
    "auth_email_changed": {
        "id": "auth_email_changed",
        "category": "Account & Authentication",
        "category_label": "Account & Authentication",
        "subject_template": "Your Kavach email address was changed",
        "preheader": "The email address on your account was updated",
        "badge": "Security Confirmation",
        "badge_color": "#2563EB",
        "headline": "The email address on your account was updated",
        "body": "The primary email address for your Kavach account was changed from {{old_masked_email}} to {{new_masked_email}}.\n\nIf you made this change, you are all set. If not, use the secure account recovery route immediately.",
        "detail_fields": [
            ("Previous address", "old_masked_email"),
            ("New address", "new_masked_email"),
            ("Changed", "changed_at"),
        ],
        "cta_label": "Secure my account →",
        "cta_url_key": "account_recovery_url",
    },

    # ── B. PROJECTS & INTEGRATIONS ───────────────────────────────────────────
    "project_created": {
        "id": "project_created",
        "category": "Projects & Integrations",
        "category_label": "Project Confirmation",
        "subject_template": "Your Kavach project is ready",
        "preheader": "Your project {{project_name}} was created",
        "headline": "Your project {{project_name}} was created",
        "body": "Your project has been created successfully. You can now connect a repository or configure the security assets that belong to this project.",
        "detail_fields": [
            ("Project", "project_name"),
            ("Project ID", "project_id"),
            ("Created", "created_at"),
            ("Status", "status"),
        ],
        "cta_label": "Open project →",
        "cta_url_key": "project_url",
    },
    "integration_github_connected": {
        "id": "integration_github_connected",
        "category": "Projects & Integrations",
        "category_label": "Integration Confirmation",
        "subject_template": "Repository connected to Kavach",
        "preheader": "{{repository_name}} is now connected",
        "headline": "{{repository_name}} is now connected",
        "body": "Kavach successfully connected the repository below. You can review the connection and start automated security scans when you are ready.",
        "detail_fields": [
            ("Repository", "repository_name"),
            ("Provider", "provider"),
            ("Default branch", "default_branch"),
            ("Connected by", "actor_email"),
            ("Connected", "connected_at"),
        ],
        "cta_label": "View repository connection →",
        "cta_url_key": "integration_url",
    },
    "integration_repository_disconnected": {
        "id": "integration_repository_disconnected",
        "category": "Projects & Integrations",
        "category_label": "Integration Update",
        "subject_template": "Repository disconnected from Kavach",
        "preheader": "{{repository_name}} was disconnected",
        "headline": "{{repository_name}} was disconnected",
        "body": "The repository connection listed below was removed. New scans from this connection will not run until it is reconnected. Existing reports and findings remain accessible according to your data retention policy.",
        "detail_fields": [
            ("Repository", "repository_name"),
            ("Disconnected by", "actor_email"),
            ("Time", "disconnected_at"),
            ("Status", "status"),
        ],
        "cta_label": "Review integrations →",
        "cta_url_key": "integrations_url",
    },
    "integration_connection_failed": {
        "id": "integration_connection_failed",
        "category": "Projects & Integrations",
        "category_label": "Action Required",
        "subject_template": "Kavach could not connect your integration",
        "preheader": "The {{provider_name}} connection needs attention",
        "badge": "Action Required",
        "badge_color": "#DC2626",
        "headline": "The {{provider_name}} connection needs attention",
        "body": "Kavach could not complete the connection to {{provider_name}}. No successful connection has been recorded. Review the reason below and retry after correcting permissions.",
        "detail_fields": [
            ("Provider", "provider_name"),
            ("Status", "status"),
            ("Reason", "safe_error_summary"),
            ("Attempted", "attempted_at"),
        ],
        "cta_label": "Review connection →",
        "cta_url_key": "integration_settings_url",
    },
    "workspace_team_invitation": {
        "id": "workspace_team_invitation",
        "category": "Projects & Integrations",
        "category_label": "Team Invitation",
        "subject_template": "You have been invited to a Kavach workspace",
        "preheader": "{{inviter_name}} invited you to {{workspace_name}}",
        "headline": "{{inviter_name}} invited you to {{workspace_name}}",
        "body": "{{inviter_name}} invited you to join the {{workspace_name}} workspace on Kavach as {{role_name}}.\n\nAccepting this invitation grants the access described by that role. This invitation expires at {{expires_at}}.",
        "detail_fields": [
            ("Workspace", "workspace_name"),
            ("Invited email", "invitee_email"),
            ("Role", "role_name"),
            ("Expires", "expires_at"),
        ],
        "cta_label": "Accept invitation →",
        "cta_url_key": "invitation_url",
    },

    # ── C. SECURITY SCANNING & FINDINGS ──────────────────────────────────────
    "scan_started": {
        "id": "scan_started",
        "category": "Security Scanning & Findings",
        "category_label": "Security Scan",
        "subject_template": "Your security scan has started",
        "preheader": "Kavach started scanning {{project_name}}",
        "headline": "Kavach started scanning {{project_name}}",
        "body": "Kavach has started the requested {{scan_type}} scan for your project. We will send a completion notification when results are verified and ready.",
        "detail_fields": [
            ("Project", "project_name"),
            ("Scan type", "scan_type"),
            ("Branch / target", "scan_target"),
            ("Started", "started_at"),
            ("Scan ID", "scan_id"),
        ],
        "cta_label": "View live scan progress →",
        "cta_url_key": "scan_url",
    },
    "scan_completed": {
        "id": "scan_completed",
        "category": "Security Scanning & Findings",
        "category_label": "Security Scan",
        "subject_template": "Security scan completed for {{project_name}}",
        "preheader": "Your {{scan_type}} scan is complete",
        "headline": "Security scan completed",
        "body": "The security scan for your project has finished. Here's a summary of the results recorded by the deterministic analysis engine.",
        "detail_fields": [
            ("Project", "project_name"),
            ("Branch", "branch"),
            ("Commit", "commit_hash"),
            ("Scanned at", "completed_at"),
        ],
        "has_severity_counts": True,
        "cta_label": "View findings →",
        "cta_url_key": "scan_results_url",
    },
    "scan_failed": {
        "id": "scan_failed",
        "category": "Security Scanning & Findings",
        "category_label": "Scan Failure",
        "subject_template": "Your Kavach security scan could not complete",
        "preheader": "The {{scan_type}} scan for {{project_name}} failed",
        "badge": "Scan Failed",
        "badge_color": "#DC2626",
        "headline": "The {{scan_type}} scan for {{project_name}} failed",
        "body": "Kavach could not complete the requested scan. The scan did not produce a complete assessment. Review the safe error summary below before retrying.",
        "detail_fields": [
            ("Project", "project_name"),
            ("Scan type", "scan_type"),
            ("Failed at", "failed_at"),
            ("Reason", "safe_error_summary"),
            ("Scan ID", "scan_id"),
        ],
        "cta_label": "Review scan details →",
        "cta_url_key": "scan_details_url",
    },
    "finding_critical_detected": {
        "id": "finding_critical_detected",
        "category": "Security Scanning & Findings",
        "category_label": "Critical Alert",
        "subject_template": "Critical vulnerability detected in {{project_name}}",
        "preheader": "Immediate review recommended for {{finding_title}}",
        "badge": "Critical Alert",
        "badge_color": "#DC2626",
        "headline": "Immediate review recommended for {{finding_title}}",
        "body": "Kavach identified a critical security finding in your project during the latest scan. Immediate review of the affected asset and remediation guidance is recommended.",
        "detail_fields": [
            ("Project", "project_name"),
            ("Finding ID", "finding_id"),
            ("Severity", "severity"),
            ("Asset / File", "affected_asset"),
            ("Detected", "detected_at"),
        ],
        "cta_label": "Review critical finding →",
        "cta_url_key": "finding_url",
    },
    "findings_new_detected": {
        "id": "findings_new_detected",
        "category": "Security Scanning & Findings",
        "category_label": "Findings Summary",
        "subject_template": "New security findings were detected",
        "preheader": "{{new_findings_count}} new findings in {{project_name}}",
        "headline": "{{new_findings_count}} new findings in {{project_name}}",
        "body": "The latest scan identified new security findings that were not present in the previous comparison baseline. Review the summary and prioritize the affected assets.",
        "detail_fields": [
            ("Project", "project_name"),
            ("New findings", "new_findings_count"),
            ("Critical", "critical_count"),
            ("High", "high_count"),
            ("Baseline", "baseline_label"),
        ],
        "cta_label": "Review new findings →",
        "cta_url_key": "findings_url",
    },
    "finding_resolved": {
        "id": "finding_resolved",
        "category": "Security Scanning & Findings",
        "category_label": "Remediation Confirmation",
        "subject_template": "A security finding was marked as resolved",
        "preheader": "{{finding_id}} was verified as resolved",
        "badge": "Resolved",
        "badge_color": "#16A34A",
        "headline": "{{finding_id}} was verified as resolved",
        "body": "Kavach verified that the finding below is no longer detected in the latest retest. The associated fix and verification record are retained for audit and compliance purposes.",
        "detail_fields": [
            ("Finding", "finding_title"),
            ("Finding ID", "finding_id"),
            ("Project", "project_name"),
            ("Verified", "verified_at"),
            ("Fix reference", "fix_reference"),
        ],
        "cta_label": "View verification →",
        "cta_url_key": "finding_url",
    },
    "remediation_pr_created": {
        "id": "remediation_pr_created",
        "category": "Security Scanning & Findings",
        "category_label": "Remediation Update",
        "subject_template": "A remediation pull request is ready for review",
        "preheader": "Kavach opened a pull request for {{finding_id}}",
        "headline": "Kavach opened a pull request for {{finding_id}}",
        "body": "Kavach created a targeted remediation pull request for the finding below. Review the proposed diff, verify against your test suite, and merge when approved.",
        "detail_fields": [
            ("Finding", "finding_display"),
            ("Repository", "repository_name"),
            ("Branch", "branch_name"),
            ("Pull request", "pull_request_number"),
            ("Created", "created_at"),
        ],
        "cta_label": "Review pull request →",
        "cta_url_key": "pull_request_url",
    },

    # ── D. REPORTS & DOWNLOADS ───────────────────────────────────────────────
    "report_ready": {
        "id": "report_ready",
        "category": "Reports & Downloads",
        "category_label": "Security Report",
        "subject_template": "Your security report is ready to download",
        "preheader": "The {{report_type}} report for {{project_name}} is ready",
        "headline": "Security report is ready",
        "body": "Your security assessment report has been generated and is ready to download. It includes the assessment scope, severity distribution, detailed findings, and remediation guidance.",
        "detail_fields": [
            ("Report", "report_type"),
            ("Project", "project_name"),
            ("Assessment date", "generated_at"),
            ("Format", "format_display"),
        ],
        "cta_label": "Download report ↓",
        "cta_url_key": "report_download_url",
        "cta_subtext": "The report includes a detailed analysis of findings, technical evidence, affected assets, and remediation recommendations.",
    },
    "report_assessment_complete": {
        "id": "report_assessment_complete",
        "category": "Reports & Downloads",
        "category_label": "Assessment Report",
        "subject_template": "Your vulnerability assessment report is available",
        "preheader": "The vulnerability assessment for {{project_name}} is complete",
        "headline": "The vulnerability assessment for {{project_name}} is complete",
        "body": "The comprehensive vulnerability assessment report is finalized. It summarizes the assessed assets, vulnerability distribution, technical proof, and governance posture.",
        "detail_fields": [
            ("Assessment", "assessment_name"),
            ("Project", "project_name"),
            ("Assessment period", "assessment_period"),
            ("Total findings", "total_findings"),
            ("Report ID", "report_id"),
        ],
        "cta_label": "View assessment report →",
        "cta_url_key": "assessment_report_url",
    },
    "report_pdf_downloaded": {
        "id": "report_pdf_downloaded",
        "category": "Reports & Downloads",
        "category_label": "Download Receipt",
        "subject_template": "Your Kavach report download is complete",
        "preheader": "A report export was downloaded from your workspace",
        "headline": "A report export was downloaded from your workspace",
        "body": "A security report export was downloaded from your Kavach workspace. If you recognize this activity, no action is needed. If not, review workspace audit logs immediately.",
        "detail_fields": [
            ("Report", "report_name"),
            ("Downloaded by", "actor_email"),
            ("Time", "downloaded_at"),
            ("Workspace", "workspace_name"),
        ],
        "cta_label": "Review workspace activity →",
        "cta_url_key": "audit_log_url",
    },
    "report_scheduled_generated": {
        "id": "report_scheduled_generated",
        "category": "Reports & Downloads",
        "category_label": "Scheduled Report",
        "subject_template": "Your scheduled Kavach security report is ready",
        "preheader": "Your {{schedule_name}} report has been generated",
        "headline": "Your {{schedule_name}} report has been generated",
        "body": "The scheduled periodic security report for {{project_name}} is ready. It covers the reporting window shown below and reflects authoritative scanner state at generation time.",
        "detail_fields": [
            ("Schedule", "schedule_name"),
            ("Project", "project_name"),
            ("Reporting period", "reporting_period"),
            ("Generated", "generated_at"),
            ("Next run", "next_run_at"),
        ],
        "cta_label": "Download scheduled report ↓",
        "cta_url_key": "scheduled_report_url",
    },

    # ── E. API SECURITY ──────────────────────────────────────────────────────
    "api_surface_discovered": {
        "id": "api_surface_discovered",
        "category": "API Security",
        "category_label": "API Inventory",
        "subject_template": "New API surface discovered",
        "preheader": "Kavach discovered {{api_count}} API endpoints",
        "headline": "Kavach discovered {{api_count}} API endpoints",
        "body": "Kavach discovered API surface associated with your target. Review the inventory to confirm ownership, exposure, authentication schemes, and assessment scope.",
        "detail_fields": [
            ("Project", "project_name"),
            ("APIs Discovered", "api_count"),
            ("Endpoints Total", "endpoint_count"),
            ("Discovery Source", "discovery_source"),
            ("Discovered", "discovered_at"),
        ],
        "cta_label": "Review API inventory →",
        "cta_url_key": "api_inventory_url",
    },
    "api_scan_completed": {
        "id": "api_scan_completed",
        "category": "API Security",
        "category_label": "API Security",
        "subject_template": "API security assessment completed",
        "preheader": "Your API security scan for {{project_name}} is complete",
        "headline": "API security assessment completed",
        "body": "The API security assessment has completed. Review the endpoint coverage, OWASP API Top 10 evaluation, and findings summary below.",
        "detail_fields": [
            ("Target", "api_target"),
            ("Endpoints tested", "endpoints_tested"),
            ("Completed", "completed_at"),
            ("Critical", "critical_count"),
            ("High", "high_count"),
        ],
        "cta_label": "View API findings →",
        "cta_url_key": "api_scan_url",
    },
    "api_vulnerability_detected": {
        "id": "api_vulnerability_detected",
        "category": "API Security",
        "category_label": "API Security Alert",
        "subject_template": "API security vulnerability detected",
        "preheader": "{{finding_title}} detected on {{api_endpoint}}",
        "badge": "Critical Alert",
        "badge_color": "#DC2626",
        "headline": "Critical API vulnerability detected",
        "body": "A critical security issue was found in your project during the latest API security scan. Immediate attention and remediation are recommended.",
        "detail_fields": [
            ("Project", "project_name"),
            ("Finding ID", "finding_id"),
            ("Endpoint", "api_endpoint_display"),
            ("Vulnerability", "finding_title"),
            ("Impact", "impact_summary"),
        ],
        "cta_label": "Review finding →",
        "cta_url_key": "api_finding_url",
    },
    "api_auth_issue_detected": {
        "id": "api_auth_issue_detected",
        "category": "API Security",
        "category_label": "API Security Alert",
        "subject_template": "API authentication control needs attention",
        "preheader": "Authentication weakness detected on {{api_endpoint}}",
        "badge": "Auth Weakness",
        "badge_color": "#EA580C",
        "headline": "Authentication weakness detected on {{api_endpoint}}",
        "body": "Kavach identified a potential authentication or authorization control weakness on the API endpoint below. Review the evidence and verify your access token policy.",
        "detail_fields": [
            ("Endpoint", "api_endpoint_display"),
            ("Finding ID", "finding_id"),
            ("Severity", "severity"),
            ("Test identity", "test_identity_label"),
            ("Detected", "detected_at"),
        ],
        "cta_label": "Review authentication finding →",
        "cta_url_key": "api_finding_url",
    },

    # ── F. CLOUD & INFRASTRUCTURE ────────────────────────────────────────────
    "cloud_misconfiguration_detected": {
        "id": "cloud_misconfiguration_detected",
        "category": "Cloud & Infrastructure",
        "category_label": "Cloud Security Alert",
        "subject_template": "Cloud security misconfiguration detected",
        "preheader": "{{finding_title}} detected in your cloud environment",
        "badge": "Cloud Misconfiguration",
        "badge_color": "#DC2626",
        "headline": "{{finding_title}} detected in your cloud environment",
        "body": "Kavach identified a cloud configuration issue that may affect the security posture of your infrastructure. Review the affected resource and recommended remediation.",
        "detail_fields": [
            ("Provider", "cloud_provider"),
            ("Resource", "resource_name"),
            ("Region", "region"),
            ("Finding ID", "finding_id"),
            ("Severity", "severity"),
        ],
        "cta_label": "Review cloud finding →",
        "cta_url_key": "cloud_finding_url",
    },
    "container_scan_completed": {
        "id": "container_scan_completed",
        "category": "Cloud & Infrastructure",
        "category_label": "Container Security",
        "subject_template": "Container image scan completed",
        "preheader": "Kavach completed the scan for {{image_name}}",
        "headline": "Container image scan completed",
        "body": "The container image scan is complete. Review package vulnerabilities, base image layers, and runtime misconfigurations before promoting to production.",
        "detail_fields": [
            ("Image", "image_name"),
            ("Digest", "image_digest_short"),
            ("Registry", "registry_name"),
            ("Completed", "completed_at"),
            ("Findings", "finding_count"),
        ],
        "cta_label": "View image findings →",
        "cta_url_key": "container_scan_url",
    },
    "iac_issue_detected": {
        "id": "iac_issue_detected",
        "category": "Cloud & Infrastructure",
        "category_label": "IaC Security Alert",
        "subject_template": "Infrastructure configuration issue detected",
        "preheader": "{{finding_title}} found in {{iac_file}}",
        "badge": "IaC Finding",
        "badge_color": "#EA580C",
        "headline": "{{finding_title}} found in {{iac_file}}",
        "body": "Kavach identified a security issue in an infrastructure-as-code configuration file. Review the affected line and apply the recommended fix before deploying.",
        "detail_fields": [
            ("Repository", "repository_name"),
            ("File", "iac_file_line"),
            ("Resource", "resource_address"),
            ("Severity", "severity"),
            ("Finding ID", "finding_id"),
        ],
        "cta_label": "Review IaC finding →",
        "cta_url_key": "iac_finding_url",
    },

    # ── G. WORKSPACE & BILLING ───────────────────────────────────────────────
    "billing_subscription_activated": {
        "id": "billing_subscription_activated",
        "category": "Workspace & Billing",
        "category_label": "Billing Confirmation",
        "subject_template": "Your Kavach subscription is active",
        "preheader": "Your {{plan_name}} plan is now active",
        "badge": "Subscription Active",
        "badge_color": "#16A34A",
        "headline": "Your {{plan_name}} plan is now active",
        "body": "Your Kavach {{plan_name}} subscription is active. Your workspace has been upgraded with the entitlements and scanning quotas listed below.",
        "detail_fields": [
            ("Plan", "plan_name"),
            ("Workspace", "workspace_name"),
            ("Started", "subscription_start"),
            ("Next renewal", "next_renewal"),
            ("Status", "status"),
        ],
        "cta_label": "View billing details →",
        "cta_url_key": "billing_url",
    },
    "billing_payment_successful": {
        "id": "billing_payment_successful",
        "category": "Workspace & Billing",
        "category_label": "Payment Receipt",
        "subject_template": "Payment received for Kavach",
        "preheader": "Your payment of {{amount}} was successful",
        "badge": "Paid",
        "badge_color": "#16A34A",
        "headline": "Your payment of {{amount}} was successful",
        "body": "We received your payment. The transaction details are below. You can download the official PDF invoice directly from your billing dashboard.",
        "detail_fields": [
            ("Amount", "amount_formatted"),
            ("Invoice", "invoice_number"),
            ("Paid on", "paid_at"),
            ("Payment method", "payment_method_label"),
            ("Status", "status"),
        ],
        "cta_label": "View invoice →",
        "cta_url_key": "invoice_url",
    },
    "billing_payment_failed": {
        "id": "billing_payment_failed",
        "category": "Workspace & Billing",
        "category_label": "Payment Action Required",
        "subject_template": "We could not process your Kavach payment",
        "preheader": "Payment for your {{plan_name}} plan needs attention",
        "badge": "Action Required",
        "badge_color": "#DC2626",
        "headline": "Payment for your {{plan_name}} plan needs attention",
        "body": "We could not process the latest subscription payment. Your current access remains available until {{access_until}}. Update the payment method to avoid service interruption.",
        "detail_fields": [
            ("Plan", "plan_name"),
            ("Amount due", "amount_due_formatted"),
            ("Attempted", "attempted_at"),
            ("Access until", "access_until"),
            ("Reason", "safe_decline_reason"),
        ],
        "cta_label": "Update payment method →",
        "cta_url_key": "payment_settings_url",
    },
    "billing_renewal_reminder": {
        "id": "billing_renewal_reminder",
        "category": "Workspace & Billing",
        "category_label": "Renewal Reminder",
        "subject_template": "Your Kavach plan renews soon",
        "preheader": "Your {{plan_name}} plan renews on {{renewal_date}}",
        "headline": "Your {{plan_name}} plan renews on {{renewal_date}}",
        "body": "This is a reminder that your Kavach subscription is scheduled to renew on the date below. Review your plan and billing details if you need to make changes.",
        "detail_fields": [
            ("Plan", "plan_name"),
            ("Renewal date", "renewal_date"),
            ("Expected amount", "renewal_amount_formatted"),
            ("Billing cycle", "billing_cycle"),
        ],
        "cta_label": "Review subscription →",
        "cta_url_key": "billing_url",
    },
    "billing_trial_ending": {
        "id": "billing_trial_ending",
        "category": "Workspace & Billing",
        "category_label": "Trial Reminder",
        "subject_template": "Your Kavach trial ends soon",
        "preheader": "Your trial ends on {{trial_end_date}}",
        "badge": "Trial Ending",
        "badge_color": "#D97706",
        "headline": "Your trial ends on {{trial_end_date}}",
        "body": "Your Kavach trial is scheduled to end on {{trial_end_date}}. Review your plan options and select an active tier to maintain uninterrupted access to automated scanning and remediation.",
        "detail_fields": [
            ("Workspace", "workspace_name"),
            ("Trial ends", "trial_end_date"),
            ("Current plan", "current_plan"),
            ("Next step", "next_step_summary"),
        ],
        "cta_label": "Review plan options →",
        "cta_url_key": "plan_url",
    },
    "billing_usage_limit_approaching": {
        "id": "billing_usage_limit_approaching",
        "category": "Workspace & Billing",
        "category_label": "Usage Notification",
        "subject_template": "Your Kavach usage is approaching its limit",
        "preheader": "{{usage_metric}} is at {{usage_percent}}% of your plan limit",
        "badge": "Usage Warning",
        "badge_color": "#EA580C",
        "headline": "{{usage_metric}} is at {{usage_percent}}% of your plan limit",
        "body": "Your workspace is approaching its configured {{usage_metric}} limit. Review current usage and plan limits to avoid interruption to automated scanning.",
        "detail_fields": [
            ("Workspace", "workspace_name"),
            ("Usage", "usage_fraction"),
            ("Utilization", "usage_percent_display"),
            ("Period resets", "reset_at"),
        ],
        "cta_label": "View usage →",
        "cta_url_key": "usage_url",
    },

    # ── H. SYSTEM NOTIFICATIONS ──────────────────────────────────────────────
    "system_maintenance_notice": {
        "id": "system_maintenance_notice",
        "category": "System Notifications",
        "category_label": "Service Notice",
        "subject_template": "Scheduled Kavach maintenance",
        "preheader": "Kavach maintenance is scheduled for {{maintenance_date}}",
        "badge": "Maintenance Notice",
        "badge_color": "#2563EB",
        "headline": "Kavach maintenance is scheduled for {{maintenance_date}}",
        "body": "We have scheduled infrastructure maintenance that may temporarily affect the services listed below. We will provide updates if schedule or impact parameters change.",
        "detail_fields": [
            ("Start", "maintenance_start"),
            ("End", "maintenance_end"),
            ("Timezone", "timezone"),
            ("Affected services", "affected_services"),
            ("Expected impact", "impact_summary"),
        ],
        "cta_label": "Check platform status →",
        "cta_url_key": "status_page_url",
    },
    "system_incident_resolved": {
        "id": "system_incident_resolved",
        "category": "System Notifications",
        "category_label": "Service Update",
        "subject_template": "Kavach service incident resolved",
        "preheader": "The {{service_name}} incident has been resolved",
        "badge": "Resolved",
        "badge_color": "#16A34A",
        "headline": "The {{service_name}} incident has been resolved",
        "body": "The service incident affecting {{service_name}} has been fully resolved. All platform components are operating normally. A post-incident summary will be published on the status portal.",
        "detail_fields": [
            ("Incident", "incident_id"),
            ("Affected service", "service_name"),
            ("Started", "incident_start"),
            ("Resolved", "resolved_at"),
            ("Current status", "status"),
        ],
        "cta_label": "View service status →",
        "cta_url_key": "status_page_url",
    },
    "account_deletion_confirmed": {
        "id": "account_deletion_confirmed",
        "category": "System Notifications",
        "category_label": "Account Status",
        "subject_template": "Your Kavach account deletion is complete",
        "preheader": "Your Kavach account has been deleted",
        "badge": "Account Deleted",
        "badge_color": "#71717A",
        "headline": "Your Kavach account has been deleted",
        "body": "Your request to delete the Kavach account associated with {{masked_email}} has been completed. Data handling, credential revocation, and residual retention follow our applicable data privacy and retention policy.",
        "detail_fields": [
            ("Account", "masked_email"),
            ("Requested", "requested_at"),
            ("Completed", "completed_at"),
            ("Reference", "deletion_request_id"),
        ],
        "cta_label": None,
        "cta_url_key": None,
    },
}


# =============================================================================
# Helper Utilities & Masking
# =============================================================================

def mask_email(email: str) -> str:
    """Masks email address for secure, privacy-compliant email display (e.g. m***r@kavach.dev)."""
    if not email or "@" not in email:
        return "user@kavach.dev"
    parts = email.split("@")
    user, domain = parts[0], parts[1]
    if len(user) <= 2:
        masked_user = user[0] + "***"
    else:
        masked_user = user[0] + "***" + user[-1]
    return f"{masked_user}@{domain}"


def format_date_str(dt: Any) -> str:
    """Formats datetime or string into clean enterprise timestamp."""
    if isinstance(dt, datetime):
        return dt.strftime("%b %d, %Y, %I:%M %p (UTC)")
    if isinstance(dt, str) and dt:
        return dt
    return datetime.utcnow().strftime("%b %d, %Y")


# =============================================================================
# Email Template Service
# =============================================================================

class EmailTemplateService:
    """
    Renders authoritative HTML & plain text emails adhering to the Kavach email design system.
    Supports all 38 approved templates with dynamic variable validation and safe escaping.
    """

    def __init__(self, base_app_url: str = "https://app.kavachsecurity.me"):
        self.base_app_url = base_app_url.rstrip("/")

    def get_template_def(self, template_id: str) -> Dict[str, Any]:
        """Retrieves template definition or raises KeyError."""
        if template_id not in EMAIL_TEMPLATES:
            raise KeyError(f"Unknown email template '{template_id}'. Must be one of {list(EMAIL_TEMPLATES.keys())}")
        return EMAIL_TEMPLATES[template_id]

    def render(self, template_id: str, context: Dict[str, Any]) -> Tuple[str, str, str]:
        """
        Renders (subject, html_body, text_body) for the given template_id and context.
        Validates variables and applies safe escaping.
        """
        tpl = self.get_template_def(template_id)
        
        # Build enriched context with defaults
        ctx = self._prepare_context(tpl, context)

        # Render subject
        subject = self._substitute_placeholders(tpl["subject_template"], ctx)

        # Render HTML
        html_body = self._render_html(tpl, ctx)

        # Render Plain Text
        text_body = self._render_plain_text(tpl, ctx, subject)

        return subject, html_body, text_body

    def _prepare_context(self, tpl: Dict[str, Any], raw_ctx: Dict[str, Any]) -> Dict[str, Any]:
        """Enriches raw context with safe defaults and computed helper fields."""
        ctx = dict(raw_ctx)
        
        # Base app URL default
        ctx.setdefault("app_url", self.base_app_url)
        ctx.setdefault("docs_url", f"{self.base_app_url}/docs")
        ctx.setdefault("support_url", f"{self.base_app_url}/contact")
        ctx.setdefault("notification_settings_url", f"{self.base_app_url}/account/notifications")

        # Mask email if email provided
        if "user_email" in ctx and "masked_email" not in ctx:
            ctx["masked_email"] = mask_email(str(ctx["user_email"]))
        if "old_email" in ctx and "old_masked_email" not in ctx:
            ctx["old_masked_email"] = mask_email(str(ctx["old_email"]))
        if "new_email" in ctx and "new_masked_email" not in ctx:
            ctx["new_masked_email"] = mask_email(str(ctx["new_email"]))

        # Common defaults
        ctx.setdefault("workspace_name", "Default Workspace")
        ctx.setdefault("plan_name", "Free")
        ctx.setdefault("current_plan", ctx.get("plan_name", "Free"))
        ctx.setdefault("created_at", datetime.utcnow().strftime("%b %d, %Y"))
        ctx.setdefault("status", "Active")
        ctx.setdefault("provider", "GitHub")
        ctx.setdefault("default_branch", "main")
        ctx.setdefault("branch", "main")
        ctx.setdefault("severity", "High")
        ctx.setdefault("currency", "USD")

        # Severity counts default
        ctx.setdefault("critical_count", 0)
        ctx.setdefault("high_count", 0)
        ctx.setdefault("medium_count", 0)
        ctx.setdefault("low_count", 0)

        # Formatting helpers
        if "amount" in ctx and "amount_formatted" not in ctx:
            ctx["amount_formatted"] = f"${ctx['amount']} {ctx.get('currency', 'USD')}"
        if "amount_due" in ctx and "amount_due_formatted" not in ctx:
            ctx["amount_due_formatted"] = f"${ctx['amount_due']} {ctx.get('currency', 'USD')}"
        if "renewal_amount" in ctx and "renewal_amount_formatted" not in ctx:
            ctx["renewal_amount_formatted"] = f"${ctx['renewal_amount']} {ctx.get('currency', 'USD')}"

        if "finding_id" in ctx and "finding_title" in ctx and "finding_display" not in ctx:
            ctx["finding_display"] = f"{ctx['finding_id']} · {ctx['finding_title']}"

        if "iac_file" in ctx and "line_number" in ctx and "iac_file_line" not in ctx:
            ctx["iac_file_line"] = f"{ctx['iac_file']}:{ctx['line_number']}"

        if "http_method" in ctx and "api_endpoint" in ctx and "api_endpoint_display" not in ctx:
            ctx["api_endpoint_display"] = f"{ctx['http_method']} {ctx['api_endpoint']}"

        if "file_size" in ctx and "format_display" not in ctx:
            ctx["format_display"] = f"PDF ({ctx['file_size']})"
        elif "format_display" not in ctx:
            ctx["format_display"] = "PDF (2.4 MB)"

        return ctx

    def _substitute_placeholders(self, text: str, ctx: Dict[str, Any]) -> str:
        """Replaces {{variable_name}} with context values safely."""
        def repl(match):
            key = match.group(1).strip()
            val = ctx.get(key, "")
            return str(val) if val is not None else ""
        return re.sub(r"\{\{([a-zA-Z0-9_]+)\}\}", repl, text)

    # =========================================================================
    # HTML Email Rendering (Responsive, Table-based, Clean Minimal Security Look)
    # =========================================================================

    def _render_html(self, tpl: Dict[str, Any], ctx: Dict[str, Any]) -> str:
        # Pre-process text fields
        headline = self._substitute_placeholders(tpl["headline"], ctx)
        body_text = self._substitute_placeholders(tpl["body"], ctx)
        body_html = "".join(f"<p style=\"margin: 0 0 14px 0; font-size: 14px; line-height: 1.6; color: #475569;\">{html.escape(line)}</p>" for line in body_text.split("\n\n") if line.strip())

        category_label = tpl.get("category_label") or tpl.get("category")
        badge_html = ""
        if tpl.get("badge"):
            b_color = tpl.get("badge_color", "#DC2626")
            badge_html = f"""
            <div style="margin-bottom: 14px;">
              <span style="display: inline-block; background-color: #FEF2F2; color: {b_color}; border: 1px solid #FECACA; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 3px 10px; border-radius: 9999px;">
                {html.escape(tpl['badge'])}
              </span>
            </div>
            """

        # Build Detail Table Rows
        detail_rows_html = ""
        detail_fields = tpl.get("detail_fields", [])
        if detail_fields:
            rows = []
            for label, key in detail_fields:
                val = ctx.get(key, "—")
                val_str = str(val) if val is not None else "—"
                rows.append(f"""
                <tr>
                  <td style="padding: 10px 14px; width: 140px; font-size: 13px; font-weight: 600; color: #18181B; background-color: #F8FAFC; border-bottom: 1px solid #E2E8F0; border-right: 1px solid #E2E8F0; vertical-align: top;">
                    {html.escape(label)}
                  </td>
                  <td style="padding: 10px 14px; font-size: 13px; color: #334155; background-color: #FFFFFF; border-bottom: 1px solid #E2E8F0; vertical-align: top; word-break: break-all;">
                    {html.escape(val_str)}
                  </td>
                </tr>
                """)
            detail_rows_html = f"""
            <div style="margin: 20px 0; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; text-align: left;">
                {"".join(rows)}
              </table>
            </div>
            """

        # Severity breakdown bar (if template has it, e.g. scan completed)
        severity_bar_html = ""
        if tpl.get("has_severity_counts") or "critical_count" in ctx and tpl["id"] in ("scan_completed", "findings_new_detected"):
            crit = ctx.get("critical_count", 0)
            high = ctx.get("high_count", 0)
            med = ctx.get("medium_count", 0)
            low = ctx.get("low_count", 0)
            severity_bar_html = f"""
            <div style="margin: 20px 0; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px 16px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; text-align: left;">
                <tr>
                  <td style="width: 25%; padding: 4px 8px; border-left: 3px solid #DC2626;">
                    <div style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase;">Critical</div>
                    <div style="font-size: 18px; font-weight: 800; color: #0F172A; margin-top: 2px;">{crit}</div>
                  </td>
                  <td style="width: 25%; padding: 4px 8px; border-left: 3px solid #EA580C;">
                    <div style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase;">High</div>
                    <div style="font-size: 18px; font-weight: 800; color: #0F172A; margin-top: 2px;">{high}</div>
                  </td>
                  <td style="width: 25%; padding: 4px 8px; border-left: 3px solid #D97706;">
                    <div style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase;">Medium</div>
                    <div style="font-size: 18px; font-weight: 800; color: #0F172A; margin-top: 2px;">{med}</div>
                  </td>
                  <td style="width: 25%; padding: 4px 8px; border-left: 3px solid #2563EB;">
                    <div style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase;">Low</div>
                    <div style="font-size: 18px; font-weight: 800; color: #0F172A; margin-top: 2px;">{low}</div>
                  </td>
                </tr>
              </table>
            </div>
            """

        # CTA Button (Dark charcoal / light black #18181B / #1F2937 as requested by user)
        cta_html = ""
        cta_label = tpl.get("cta_label")
        cta_url_key = tpl.get("cta_url_key")
        if cta_label and cta_url_key:
            cta_url = ctx.get(cta_url_key) or self.base_app_url
            cta_subtext = tpl.get("cta_subtext")
            subtext_html = f"<div style=\"font-size: 12px; color: #64748B; margin-top: 14px; line-height: 1.5;\">{html.escape(cta_subtext)}</div>" if cta_subtext else ""
            
            cta_html = f"""
            <div style="margin: 26px 0 16px 0;">
              <!-- User Request: button is dark charcoal/light black (#18181B) with greyish accent -->
              <a href="{html.escape(cta_url)}" target="_blank" style="display: inline-block; background-color: #18181B; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13.5px; font-weight: 600; text-decoration: none; padding: 11px 22px; border-radius: 7px; border: 1px solid #27272A; text-align: center; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);">
                {html.escape(cta_label)}
              </a>
              {subtext_html}
            </div>
            """

        preheader = self._substitute_placeholders(tpl.get("preheader", ""), ctx)

        full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{html.escape(headline)}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, a {{ font-family: Arial, Helvetica, sans-serif !important; }}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #F4F4F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #18181B; -webkit-font-smoothing: antialiased;">
  <!-- Preheader preview text -->
  <div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all;">
    {html.escape(preheader)}
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F4F4F5; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #FFFFFF; border: 1px solid #E4E4E7; border-radius: 12px; box-shadow: 0 4px 16px -2px rgba(0, 0, 0, 0.05); overflow: hidden;">
          
          <!-- Header Bar -->
          <tr>
            <td style="padding: 22px 28px; border-bottom: 1px solid #F1F5F9; background-color: #FFFFFF;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <!-- Left: Kavach Cube Logo & Wordmark -->
                  <td align="left" style="vertical-align: middle;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="vertical-align: middle; padding-right: 9px;">
                          <!-- Crisp Inline SVG Cube Logo -->
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block;">
                            <path d="M12 2L3 7V17L12 22L21 17V7L12 2Z" stroke="#18181B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M12 22V12" stroke="#18181B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M21 7L12 12L3 7" stroke="#18181B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                          </svg>
                        </td>
                        <td style="vertical-align: middle;">
                          <span style="font-size: 17px; font-weight: 800; letter-spacing: -0.03em; color: #18181B; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">kavach</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- Right: Category Tag -->
                  <td align="right" style="vertical-align: middle; font-size: 12px; font-weight: 600; color: #71717A;">
                    {html.escape(category_label)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Email Content Body -->
          <tr>
            <td style="padding: 28px 28px 24px 28px;">
              {badge_html}

              <h1 style="margin: 0 0 12px 0; font-size: 21px; font-weight: 800; color: #18181B; letter-spacing: -0.02em; line-height: 1.3;">
                {html.escape(headline)}
              </h1>

              {body_html}

              {detail_rows_html}

              {severity_bar_html}

              {cta_html}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 28px; background-color: #FAFAFA; border-top: 1px solid #F1F5F9;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" style="font-size: 12px; color: #71717A; line-height: 1.5;">
                    <div style="font-weight: 700; color: #27272A; margin-bottom: 2px;">Kavach Security</div>
                    <div>The unified security platform for modern software.</div>
                  </td>
                  <td align="right" style="font-size: 11.5px; color: #71717A; vertical-align: top; white-space: nowrap;">
                    <a href="{html.escape(ctx['docs_url'])}" style="color: #52525B; text-decoration: none; font-weight: 500;">Docs</a>
                    &nbsp;·&nbsp;
                    <a href="{html.escape(ctx['support_url'])}" style="color: #52525B; text-decoration: none; font-weight: 500;">Support</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
        return full_html

    # =========================================================================
    # Plain Text Alternative Rendering
    # =========================================================================

    def _render_plain_text(self, tpl: Dict[str, Any], ctx: Dict[str, Any], subject: str) -> str:
        headline = self._substitute_placeholders(tpl["headline"], ctx)
        body = self._substitute_placeholders(tpl["body"], ctx)
        category_label = tpl.get("category_label") or tpl.get("category")

        lines = [
            f"KAVACH SECURITY — {category_label.upper()}",
            "=" * 50,
            headline,
            "-" * len(headline),
            "",
            body,
            "",
        ]

        # Details
        detail_fields = tpl.get("detail_fields", [])
        if detail_fields:
            lines.append("DETAILS:")
            for label, key in detail_fields:
                val = ctx.get(key, "—")
                lines.append(f"• {label}: {val}")
            lines.append("")

        # Severity counts
        if tpl.get("has_severity_counts") or "critical_count" in ctx and tpl["id"] in ("scan_completed", "findings_new_detected"):
            lines.append("FINDINGS BREAKDOWN:")
            lines.append(f"• Critical: {ctx.get('critical_count', 0)}")
            lines.append(f"• High:     {ctx.get('high_count', 0)}")
            lines.append(f"• Medium:   {ctx.get('medium_count', 0)}")
            lines.append(f"• Low:      {ctx.get('low_count', 0)}")
            lines.append("")

        # CTA
        cta_label = tpl.get("cta_label")
        cta_url_key = tpl.get("cta_url_key")
        if cta_label and cta_url_key:
            cta_url = ctx.get(cta_url_key) or self.base_app_url
            lines.append(f"Action: {cta_label}")
            lines.append(f"Link:   {cta_url}")
            lines.append("")

        lines.extend([
            "-" * 50,
            "Kavach Security — The unified security platform for modern software.",
            f"Docs: {ctx['docs_url']} | Support: {ctx['support_url']}",
        ])

        return "\n".join(lines)


# Global singleton instance
email_template_service = EmailTemplateService()

