"""
Email Service for SecuLayer / SecureAI Control Plane.

Handles real SMTP email delivery (invitations, alerts, security events)
using configured Gmail credentials.
"""

import asyncio
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Dict, Any, Optional

from app.core.config import get_settings

logger = logging.getLogger("secure-control-plane.email")
settings = get_settings()


class EmailService:
    """Manages transactional and operational email delivery via SMTP."""

    def __init__(self):
        self.username = settings.mail_username
        self.password = settings.mail_password
        self.default_sender = settings.mail_default_sender or "noreply@kavachsecurity.me"
        self.alerts_sender = getattr(settings, "mail_alerts_sender", "alerts@kavachsecurity.me")
        self.smtp_server = settings.mail_server
        self.smtp_port = settings.mail_port
        self.starttls = settings.mail_starttls

    def _send_sync(self, msg: MIMEMultipart, recipient: str) -> Dict[str, Any]:
        """Synchronous delivery via standard smtplib."""
        if not self.username or not self.password:
            raise ValueError("SMTP credentials (MAIL_USERNAME / MAIL_PASSWORD) are not configured.")

        # Strip any extra spaces from Gmail app password if present
        clean_password = self.password.replace(" ", "")

        with smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=15) as server:
            if self.starttls:
                server.starttls()
            server.login(self.username, clean_password)
            server.send_message(msg)

        logger.info(f"Email successfully delivered to {recipient} via {self.smtp_server}:{self.smtp_port}")
        return {
            "delivered": True,
            "recipient": recipient,
            "server": f"{self.smtp_server}:{self.smtp_port}",
        }

    async def send_invitation_email(
        self,
        recipient_email: str,
        role: str,
        invite_url: str,
        inviter_name: Optional[str] = None,
        inviter_email: Optional[str] = None,
        organization_name: str = "Kavach Control Plane",
        message: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Sends a real team invitation email with a secure acceptance token.
        """
        sender_display = f"Kavach Security <{self.default_sender}>"
        inviter_display = inviter_name or inviter_email or "An Administrator"

        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Invitation to join {organization_name} on Kavach"
        msg["From"] = sender_display
        msg["To"] = recipient_email

        # Plain text fallback
        text_body = f"""
Hello,

{inviter_display} has invited you to join {organization_name} as a {role.upper()}.

To accept your invitation and access your security workspace, click the link below:
{invite_url}

{f'Message from inviter: {message}' if message else ''}

This invitation link is valid for 7 days.
If you were not expecting this invitation, you can safely ignore this email.

Kavach Security Team
"""

        # HTML body with modern design system styling
        html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #F8FAFC;
      margin: 0;
      padding: 40px 20px;
      color: #0F172A;
    }}
    .container {{
      max-width: 560px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 12px;
      border: 1px solid #EAECF0;
      padding: 36px 32px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }}
    .header {{
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 24px;
    }}
    .badge {{
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      background-color: #EFF6FF;
      color: #2563EB;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }}
    h1 {{
      font-size: 22px;
      font-weight: 700;
      color: #0F172A;
      margin: 16px 0 8px 0;
      line-height: 1.3;
    }}
    p {{
      font-size: 14px;
      line-height: 1.6;
      color: #475569;
      margin: 12px 0;
    }}
    .message-box {{
      background-color: #F1F5F9;
      border-left: 3px solid #2563EB;
      padding: 12px 16px;
      margin: 16px 0;
      border-radius: 0 6px 6px 0;
      font-size: 13px;
      color: #334155;
      font-style: italic;
    }}
    .btn {{
      display: inline-block;
      background-color: #0F172A;
      color: #FFFFFF !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      padding: 12px 28px;
      border-radius: 8px;
      margin: 20px 0;
      text-align: center;
    }}
    .footer {{
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid #F1F5F9;
      font-size: 12px;
      color: #94A3B8;
      line-height: 1.5;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">Team Invitation</div>
    <h1>Join {organization_name}</h1>
    <p>
      <strong>{inviter_display}</strong> has invited you to join the security control plane as a
      <strong><span style="color: #2563EB;">{role.upper()}</span></strong>.
    </p>

    {f'<div class="message-box">"{message}"</div>' if message else ''}

    <p>
      You will have access to repository scans, AST security findings, secrets detection,
      and policy governance workflows.
    </p>

    <div style="text-align: center; margin: 24px 0;">
      <a href="{invite_url}" class="btn" target="_blank">
        Accept Invitation &rarr;
      </a>
    </div>

    <p style="font-size: 12px; color: #64748B;">
      Or copy and paste this link in your browser:<br>
      <a href="{invite_url}" style="color: #2563EB; word-break: break-all;">{invite_url}</a>
    </p>

    <div class="footer">
      <p>
        This link is cryptographically signed and expires in 7 days.<br>
        If you did not request this invitation, no action is required.
      </p>
      <p>&copy; 2026 Kavach Security Inc. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
"""

        msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        try:
            res = await asyncio.to_thread(self._send_sync, msg, recipient_email)
            return {
                "success": True,
                "recipient": recipient_email,
                "role": role,
                "invite_url": invite_url,
                "details": res,
            }
        except Exception as exc:
            logger.error(f"Failed to deliver invitation email to {recipient_email}: {exc}", exc_info=True)
            return {
                "success": False,
                "recipient": recipient_email,
                "error": str(exc),
            }

    async def send_verification_email(
        self,
        recipient_email: str,
        verification_url: str,
        user_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Sends account email verification link with real SMTP delivery.
        """
        display_name = user_name or recipient_email.split('@')[0]
        sender_display = f"Kavach Security <{self.default_sender}>"

        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Verify your Kavach Security Account"
        msg["From"] = sender_display
        msg["To"] = recipient_email

        text_body = f"""
Hello {display_name},

Thank you for registering with Kavach Security Control Plane.
Please verify your email address by opening the following link in your browser:

{verification_url}

This verification link is valid for 15 minutes.
If you did not create an account on Kavach, please disregard this email.

Kavach Security Operations
"""

        html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #F8FAFC;
      margin: 0;
      padding: 40px 20px;
      color: #0F172A;
    }}
    .container {{
      max-width: 560px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 12px;
      border: 1px solid #EAECF0;
      padding: 36px 32px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }}
    .badge {{
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      background-color: #EFF6FF;
      color: #2563EB;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }}
    h1 {{
      font-size: 22px;
      font-weight: 700;
      color: #0F172A;
      margin: 16px 0 8px 0;
    }}
    p {{
      font-size: 14px;
      line-height: 1.6;
      color: #475569;
      margin: 12px 0;
    }}
    .btn {{
      display: inline-block;
      background-color: #2563EB;
      color: #FFFFFF !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      padding: 12px 28px;
      border-radius: 8px;
      margin: 20px 0;
      text-align: center;
    }}
    .footer {{
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid #F1F5F9;
      font-size: 12px;
      color: #94A3B8;
      line-height: 1.5;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">Security Verification</div>
    <h1>Verify Your Email Address</h1>
    <p>Hello <strong>{display_name}</strong>,</p>
    <p>
      Thank you for creating your account on <strong>Kavach</strong>.
      Please verify your email address to activate your security workspace and enable MFA protection.
    </p>

    <div style="text-align: center; margin: 24px 0;">
      <a href="{verification_url}" class="btn" target="_blank">
        Verify Email Address &rarr;
      </a>
    </div>

    <p style="font-size: 12px; color: #64748B;">
      Or copy and paste this link in your browser:<br>
      <a href="{verification_url}" style="color: #2563EB; word-break: break-all;">{verification_url}</a>
    </p>

    <div class="footer">
      <p>
        This link is cryptographically signed and expires in 15 minutes.<br>
        If you did not register for Kavach, no further action is required.
      </p>
      <p>&copy; 2026 Kavach Security Inc. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
"""

        msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        try:
            res = await asyncio.to_thread(self._send_sync, msg, recipient_email)
            return {"success": True, "recipient": recipient_email, "details": res}
        except Exception as exc:
            logger.error(f"Failed to deliver verification email to {recipient_email}: {exc}", exc_info=True)
            return {"success": False, "recipient": recipient_email, "error": str(exc)}

    async def send_password_reset_email(
        self,
        recipient_email: str,
        reset_url: str,
        user_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Sends password reset link with real SMTP delivery.
        """
        display_name = user_name or recipient_email.split('@')[0]
        sender_display = f"Kavach Security <{self.default_sender}>"

        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Password Reset Request — Kavach"
        msg["From"] = sender_display
        msg["To"] = recipient_email

        text_body = f"""
Hello {display_name},

A password reset was requested for your Kavach account.
To reset your password, visit the following URL:

{reset_url}

This link is valid for 30 minutes.
If you did not request a password reset, please secure your account immediately or contact your administrator.

Kavach Security Team
"""

        html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #F8FAFC;
      margin: 0;
      padding: 40px 20px;
      color: #0F172A;
    }}
    .container {{
      max-width: 560px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 12px;
      border: 1px solid #EAECF0;
      padding: 36px 32px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }}
    .badge {{
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      background-color: #FEF2F2;
      color: #DC2626;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }}
    h1 {{
      font-size: 22px;
      font-weight: 700;
      color: #0F172A;
      margin: 16px 0 8px 0;
    }}
    p {{
      font-size: 14px;
      line-height: 1.6;
      color: #475569;
      margin: 12px 0;
    }}
    .btn {{
      display: inline-block;
      background-color: #DC2626;
      color: #FFFFFF !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      padding: 12px 28px;
      border-radius: 8px;
      margin: 20px 0;
      text-align: center;
    }}
    .footer {{
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid #F1F5F9;
      font-size: 12px;
      color: #94A3B8;
      line-height: 1.5;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">Password Reset</div>
    <h1>Reset Your Account Password</h1>
    <p>Hello <strong>{display_name}</strong>,</p>
    <p>
      We received a request to reset the password for your SecuLayer Security account.
      Click the button below to choose a new password:
    </p>

    <div style="text-align: center; margin: 24px 0;">
      <a href="{reset_url}" class="btn" target="_blank">
        Reset Password &rarr;
      </a>
    </div>

    <p style="font-size: 12px; color: #64748B;">
      Or copy and paste this link in your browser:<br>
      <a href="{reset_url}" style="color: #2563EB; word-break: break-all;">{reset_url}</a>
    </p>

    <div class="footer">
      <p>
        This link expires in 30 minutes. If you did not request a password reset, you can safely ignore this email.
      </p>
      <p>&copy; 2026 Kavach Security Inc. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
"""

        msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        try:
            res = await asyncio.to_thread(self._send_sync, msg, recipient_email)
            return {"success": True, "recipient": recipient_email, "details": res}
        except Exception as exc:
            logger.error(f"Failed to deliver password reset email to {recipient_email}: {exc}", exc_info=True)
            return {"success": False, "recipient": recipient_email, "error": str(exc)}

    async def send_mfa_recovery_email(
        self,
        recipient_email: str,
        recovery_code: str,
        user_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Sends emergency MFA recovery code to user via real SMTP.
        """
        display_name = user_name or recipient_email.split('@')[0]
        sender_display = f"Kavach Security <{self.default_sender}>"

        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Emergency MFA Recovery Code — Kavach"
        msg["From"] = sender_display
        msg["To"] = recipient_email

        text_body = f"""
Hello {display_name},

Here is your emergency MFA recovery code for Kavach:

{recovery_code}

Use this one-time code on the MFA Recovery page to bypass 2FA and access your account.
This code is valid for 15 minutes.

Kavach Security Team
"""

        html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #F8FAFC;
      margin: 0;
      padding: 40px 20px;
      color: #0F172A;
    }}
    .container {{
      max-width: 560px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 12px;
      border: 1px solid #EAECF0;
      padding: 36px 32px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }}
    .code-box {{
      font-family: monospace;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 0.15em;
      text-align: center;
      background-color: #F1F5F9;
      border: 1px dashed #CBD5E1;
      padding: 16px;
      border-radius: 8px;
      color: #0F172A;
      margin: 20px 0;
    }}
  </style>
</head>
<body>
  <div class="container">
    <h2 style="margin: 0 0 16px; color: #0F172A;">Emergency MFA Recovery Code</h2>
    <p>Hello <strong>{display_name}</strong>,</p>
    <p>You requested emergency access to your SecuLayer account:</p>
    <div class="code-box">{recovery_code}</div>
    <p style="font-size: 13px; color: #64748B;">Enter this one-time code on the MFA Recovery screen to restore access.</p>
    <p style="font-size: 12px; color: #94A3B8; margin-top: 24px;">&copy; 2026 SecuLayer Inc.</p>
  </div>
</body>
</html>
"""

        msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        try:
            res = await asyncio.to_thread(self._send_sync, msg, recipient_email)
            return {"success": True, "recipient": recipient_email, "details": res}
        except Exception as exc:
            logger.error(f"Failed to deliver MFA recovery code to {recipient_email}: {exc}", exc_info=True)
            return {"success": False, "recipient": recipient_email, "error": str(exc)}

    async def send_verification_email(
        self,
        recipient_email: str,
        verification_url: str,
        user_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Sends an email address verification link to new user via SMTP.
        """
        display_name = user_name or recipient_email.split('@')[0]
        sender_display = f"SecuLayer Accounts <{self.default_sender}>"

        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Verify Your Email Address — SecuLayer"
        msg["From"] = sender_display
        msg["To"] = recipient_email

        text_body = f"""
Hello {display_name},

Thank you for signing up for SecuLayer. Please click the link below to verify your email address:
{verification_url}

This link is valid for 24 hours.
If you did not register for SecuLayer, you can safely ignore this message.

SecuLayer Security Team
"""

        html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #F8FAFC;
      margin: 0;
      padding: 40px 20px;
      color: #0F172A;
    }}
    .container {{
      max-width: 560px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 12px;
      border: 1px solid #EAECF0;
      padding: 36px 32px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }}
    .btn {{
      display: inline-block;
      background-color: #2563EB;
      color: #FFFFFF !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      padding: 12px 28px;
      border-radius: 8px;
      margin: 20px 0;
      text-align: center;
    }}
  </style>
</head>
<body>
  <div class="container">
    <h2 style="margin: 0 0 16px; color: #0F172A;">Verify Your Email Address</h2>
    <p>Hello <strong>{display_name}</strong>,</p>
    <p>Click the button below to verify your email address and activate your SecuLayer workspace:</p>
    <div style="text-align: center;">
      <a href="{verification_url}" class="btn" target="_blank">Verify Email Address &rarr;</a>
    </div>
    <p style="font-size: 12px; color: #64748B;">Or paste this URL in your browser:<br><a href="{verification_url}" style="color: #2563EB; word-break: break-all;">{verification_url}</a></p>
    <p style="font-size: 12px; color: #94A3B8; margin-top: 24px;">This link expires in 24 hours. &copy; 2026 SecuLayer Inc.</p>
  </div>
</body>
</html>
"""

        msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        try:
            res = await asyncio.to_thread(self._send_sync, msg, recipient_email)
            return {"success": True, "recipient": recipient_email, "details": res}
        except Exception as exc:
            logger.error(f"Failed to deliver verification email to {recipient_email}: {exc}", exc_info=True)
            return {"success": False, "recipient": recipient_email, "error": str(exc)}

    async def send_account_unlock_otp_email(
        self,
        recipient_email: str,
        otp_code: str,
        user_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Dispatches a 6-digit security verification OTP to unlock a locked account.
        """
        display_name = user_name or recipient_email.split('@')[0]
        sender_display = f"Kavach Security <{self.default_sender}>"

        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"{otp_code} is your Kavach account unlock code"
        msg["From"] = sender_display
        msg["To"] = recipient_email

        text_body = f"""Hello {display_name},

Your one-time security unlock code for Kavach is:

{otp_code}

This code is valid for 10 minutes. Enter it on the Account Locked screen to restore access.

If you did not initiate this request, someone may be attempting to access your account. Please inspect your login history or contact your administrator immediately.

Kavach Security Team
"""

        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #F8FAFC;
      margin: 0;
      padding: 40px 20px;
      color: #0F172A;
    }}
    .container {{
      max-width: 520px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 12px;
      border: 1px solid #E2E8F0;
      padding: 36px 32px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
    }}
    .otp-box {{
      font-size: 32px;
      font-weight: 800;
      letter-spacing: 0.25em;
      color: #09090B;
      background-color: #F1F5F9;
      border: 1px solid #CBD5E1;
      padding: 16px 24px;
      border-radius: 8px;
      text-align: center;
      margin: 24px 0;
      font-family: 'Consolas', 'Monaco', monospace;
    }}
  </style>
</head>
<body>
  <div class="container">
    <h2 style="margin: 0 0 12px; color: #0F172A; font-size: 20px;">Kavach Account Security Verification</h2>
    <p style="font-size: 14px; color: #475569; line-height: 1.5;">Hello <strong>{display_name}</strong>,</p>
    <p style="font-size: 14px; color: #475569; line-height: 1.5;">Use the one-time code below to verify your identity and unlock your Kavach Control Plane account:</p>
    <div class="otp-box">{otp_code}</div>
    <p style="font-size: 13px; color: #64748B; margin-top: 20px;">This code expires in <strong>10 minutes</strong>. Never share this code with anyone.</p>
    <p style="font-size: 12px; color: #94A3B8; margin-top: 28px; border-top: 1px solid #F1F5F9; padding-top: 16px;">&copy; 2026 Kavach Enterprise Security. All rights reserved.</p>
  </div>
</body>
</html>
"""
        msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        try:
            res = await asyncio.to_thread(self._send_sync, msg, recipient_email)
            return {"success": True, "recipient": recipient_email, "details": res}
        except Exception as exc:
            logger.error(f"Failed to deliver unlock OTP to {recipient_email}: {exc}", exc_info=True)
            return {"success": False, "recipient": recipient_email, "error": str(exc)}

    async def send_security_alert_email(
        self,
        recipient_email: str,
        alert_title: str,
        alert_details: str,
        severity: str = "HIGH",
    ) -> Dict[str, Any]:
        """
        Dispatches real-time security alerts via alerts@kavachsecurity.me.
        """
        sender_display = f"Kavach Security Alerts <{self.alerts_sender}>"
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"[{severity.upper()}] Kavach Security Alert: {alert_title}"
        msg["From"] = sender_display
        msg["To"] = recipient_email

        text_body = f"""Kavach Security Alert Notification
Severity: {severity.upper()}
Title: {alert_title}

Details:
{alert_details}

Review and triage this security event immediately in your Kavach Control Plane dashboard.
Kavach Automated Security Engine
alerts@kavachsecurity.me
"""
        html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0F172A;
      margin: 0;
      padding: 40px 20px;
      color: #F8FAFC;
    }}
    .container {{
      max-width: 560px;
      margin: 0 auto;
      background-color: #1E293B;
      border-radius: 12px;
      border: 1px solid #334155;
      padding: 32px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    }}
    .badge {{
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      background-color: #EF4444;
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }}
    h1 {{
      font-size: 18px;
      font-weight: 700;
      color: #F8FAFC;
      margin: 14px 0 8px 0;
    }}
    .alert-box {{
      background-color: #0F172A;
      border-left: 4px solid #EF4444;
      padding: 16px;
      margin: 16px 0;
      border-radius: 0 6px 6px 0;
      font-size: 13px;
      color: #E2E8F0;
      line-height: 1.6;
      font-family: monospace;
      white-space: pre-wrap;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">Security Alert &bull; {severity.upper()}</div>
    <h1>{alert_title}</h1>
    <div class="alert-box">{alert_details}</div>
    <p style="font-size: 13px; color: #94A3B8; margin-top: 24px;">
      Dispatched by Kavach Security Automation Engine. For inquiries: alerts@kavachsecurity.me.
    </p>
  </div>
</body>
</html>
"""
        msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        try:
            res = await asyncio.to_thread(self._send_sync, msg, recipient_email)
            return {"success": True, "recipient": recipient_email, "details": res}
        except Exception as exc:
            logger.error(f"Failed to deliver security alert to {recipient_email}: {exc}", exc_info=True)
            return {"success": False, "recipient": recipient_email, "error": str(exc)}


# Singleton instance
email_service = EmailService()
