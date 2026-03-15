import os
import logging
import httpx
from datetime import datetime, timezone
from typing import Optional
from dotenv import load_dotenv

# Ensure this helper exists in your project to handle the secure locking links
from app.core.security import create_access_token 

load_dotenv()
logger = logging.getLogger(__name__)

class GeonEmailService:
    def __init__(self):
        # 1. Configuration from .env ONLY - no hardcoded fallbacks
        self.api_key = os.getenv("RESEND_API_KEY")
        self.from_email = os.getenv("RESEND_FROM_EMAIL")
        self.from_name = os.getenv("RESEND_FROM_NAME", "GeonPayGuard Security")
        self.reply_to = os.getenv("RESEND_REPLY_TO")
        
        # Critical: These MUST come from .env
        self.frontend_url = os.getenv("FRONTEND_URL")
        self.backend_url = os.getenv("BACKEND_URL")
        
        # For production, use APP_URL as fallback if BACKEND_URL not set
        environment = os.getenv("ENVIRONMENT", "development").lower()
        if not self.backend_url and environment == "production":
            self.backend_url = os.getenv("APP_URL", "https://geonpayguard.onrender.com")
        elif not self.backend_url:
            self.backend_url = "http://localhost:8000"

        # Validate required environment variables
        # Note: BACKEND_URL has a fallback, so we only warn about it
        missing_vars = []
        if not self.api_key:
            missing_vars.append("RESEND_API_KEY")
        if not self.from_email:
            missing_vars.append("RESEND_FROM_EMAIL")
        if not self.frontend_url:
            missing_vars.append("FRONTEND_URL")
        if not self.backend_url:
            logger.warning("BACKEND_URL not set - using fallback (check in production!)")

        self.enabled = False
        if self.api_key and self.from_email and self.frontend_url and self.backend_url:
            try:
                import resend
                resend.api_key = self.api_key
                self.enabled = True
                logger.info(f"✅ GeonPayGuard Email System Online: {self.from_name}")
                logger.info(f"   Frontend: {self.frontend_url}")
                logger.info(f"   Backend: {self.backend_url}")
            except ImportError:
                logger.error("❌ Critical: 'resend' python library not installed. Run 'pip install resend'")
        else:
            logger.error(f"❌ Email Service Disabled - Missing environment variables: {', '.join(missing_vars)}")

    async def _get_geo_context(self, ip: str) -> str:
        """Translates boring IP addresses into real city/country names."""
        if ip in ("127.0.0.1", "localhost", "::1"):
            return "Your Private Network"
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                response = await client.get(f"http://ip-api.com/json/{ip}")
                data = response.json()
                if data.get("status") == "success":
                    return f"{data.get('city')}, {data.get('country')}"
        except Exception:
            pass
        return "A new device"

    def _get_html_wrapper(self, content: str) -> str:
        """The master design template with GeonPayGuard branding."""
        year = datetime.now(timezone.utc).year
        return f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                @media only screen and (max-width: 600px) {{
                    .inner-card {{ width: 100% !important; border-radius: 0 !important; }}
                    .content-area {{ padding: 30px 20px !important; }}
                }}
                .geon-logo {{
                    position: relative;
                    width: 48px;
                    height: 48px;
                    margin: 0 auto 15px;
                }}
                .geon-logo .outer-ring {{
                    position: absolute;
                    inset: 0;
                    border: 2px solid #f43f5e;
                    border-radius: 12px;
                    opacity: 0.2;
                }}
                .geon-logo .inner-ring {{
                    position: absolute;
                    inset: 4px;
                    border: 1px solid #f43f5e;
                    border-radius: 8px;
                    opacity: 0.4;
                }}
                .geon-logo .letter {{
                    position: relative;
                    font-size: 24px;
                    font-weight: bold;
                    color: #f43f5e;
                    line-height: 48px;
                }}
                .geon-logo .dot-left {{
                    position: absolute;
                    bottom: 6px;
                    left: 6px;
                    width: 6px;
                    height: 6px;
                    background: #10b981;
                    border-radius: 50%;
                }}
                .geon-logo .dot-right {{
                    position: absolute;
                    top: 6px;
                    right: 6px;
                    width: 6px;
                    height: 6px;
                    background: #10b981;
                    border-radius: 50%;
                }}
            </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 10px;">
                <tr>
                    <td align="center">
                        <table class="inner-card" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 550px; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0;">
                            <tr>
                                <td align="center" style="background: #0f172a; padding: 40px 20px;">
                                    <div class="geon-logo" style="position: relative; width: 48px; height: 48px; margin: 0 auto 15px;">
                                        <div class="outer-ring" style="position: absolute; inset: 0; border: 2px solid #f43f5e; border-radius: 12px; opacity: 0.2;"></div>
                                        <div class="inner-ring" style="position: absolute; inset: 4px; border: 1px solid #f43f5e; border-radius: 8px; opacity: 0.4;"></div>
                                        <div class="dot-left" style="position: absolute; bottom: 6px; left: 6px; width: 6px; height: 6px; background: #10b981; border-radius: 50%;"></div>
                                        <div class="dot-right" style="position: absolute; top: 6px; right: 6px; width: 6px; height: 6px; background: #10b981; border-radius: 50%;"></div>
                                        <span class="letter" style="position: relative; font-size: 24px; font-weight: bold; color: #f43f5e; line-height: 48px;">G</span>
                                    </div>
                                    <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: 2px;">GEON<span style="font-weight: 300;">PAYGUARD</span></h1>
                                    <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">Secure Payment Vaults</p>
                                </td>
                            </tr>
                            <tr>
                                <td class="content-area" style="padding: 50px 40px; color: #334155; line-height: 1.6;">
                                    {content}
                                </td>
                            </tr>
                            <tr>
                                <td align="center" style="background: #f8fafc; padding: 30px; border-top: 1px solid #f1f5f9;">
                                    <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 600;">&copy; {year} GeonPayGuard. All rights reserved.</p>
                                    <p style="margin: 8px 0 0 0; font-size: 11px; color: #94a3b8; line-height: 1.4;">
                                        This is a secure automated message from GeonPayGuard.<br>
                                        Never share your recovery phrase or login credentials.
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """

    # --- ACTION TEMPLATES ---

    def send_verification_email(self, to_email: str, code: str, full_name: str = "Friend") -> bool:
        """Send email verification code"""
        if not self.enabled:
            logger.warning(f"📧 [TEST MODE] Verification email to: {to_email} | Code: {code}")
            return False
            
        subject = f"{code} is your GeonPayGuard verification code"
        content = f"""
            <div style="text-align: center;">
                <h2 style="font-size: 22px; color: #0f172a; margin-top: 0; font-weight: 800;">Verify Your Identity</h2>
                <p style="font-size: 16px; color: #475569;">Hello {full_name}, use the code below to complete your sign-in.</p>
                <div style="background: #f8fafc; border: 2px solid #f43f5e; padding: 30px; border-radius: 16px; margin: 30px 0;">
                    <span style="font-family: 'Courier New', monospace; font-size: 40px; font-weight: 900; color: #0f172a; letter-spacing: 10px;">{code}</span>
                </div>
                <p style="font-size: 13px; color: #94a3b8;">This code expires in 5 minutes for your security.</p>
            </div>
        """
        return self._send_email(to_email, subject, self._get_html_wrapper(content))

    def send_welcome_email(self, to_email: str, full_name: str = "Friend") -> bool:
        """Send welcome email after successful verification"""
        if not self.enabled:
            logger.warning(f"📧 [TEST MODE] Welcome email to: {to_email}")
            return False
            
        subject = "Welcome to GeonPayGuard - Account Ready"
        content = f"""
            <h2 style="font-size: 22px; color: #0f172a; margin-top: 0; font-weight: 800;">Welcome Aboard, {full_name}!</h2>
            <p style="font-size: 16px; color: #475569;">Your account has been successfully verified. You're now part of the GeonPayGuard network.</p>
            
            <div style="background: #fff1f2; border-left: 4px solid #f43f5e; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <p style="margin: 0; font-size: 14px; color: #9f1239; font-weight: 800;">⚠️ Critical Security Reminder:</p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #be123c;">Your 12-word recovery phrase is the ONLY way to recover your account. Store it offline, never share it, and never enter it online except during recovery.</p>
            </div>

            <div style="text-align: center; margin-top: 40px;">
                <a href="{self.frontend_url}/dashboard" style="background: #f43f5e; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 15px; display: inline-block;">Access My Dashboard</a>
            </div>
        """
        return self._send_email(to_email, subject, self._get_html_wrapper(content))

    async def send_security_alert(self, to_email: str, ip: str, ua: str) -> bool:
        """Send security alert for new device login"""
        if not self.enabled:
            logger.warning(f"📧 [TEST MODE] Security alert to: {to_email} | IP: {ip}")
            return False
            
        location = await self._get_geo_context(ip)
        subject = "🔐 Security Alert: New Login Detected"
        
        token = create_access_token(subject=to_email) 
        lock_link = f"{self.backend_url}/api/v1/auth/lock-account/{token}"

        content = f"""
            <div style="border: 1px solid #fecaca; border-radius: 16px; padding: 30px; background: #fff5f5;">
                <h2 style="color: #b91c1c; font-size: 20px; font-weight: 800; margin-top: 0;">New Login Detected</h2>
                <p style="color: #475569; font-size: 15px;">We detected a login to your GeonPayGuard account from an unrecognized device:</p>
                
                <p style="background: #ffffff; border: 1px solid #f1f5f9; padding: 15px; border-radius: 10px; font-size: 14px; color: #1e293b; margin: 20px 0;">
                    📍 <b>Location:</b> {location}<br>
                    🌐 <b>IP Address:</b> {ip}<br>
                    📱 <b>Device:</b> {ua[:50]}...
                </p>

                <p style="color: #475569; font-size: 15px;"><b>If this wasn't you</b>, secure your account immediately using the button below.</p>
                
                <div style="text-align: center; margin-top: 30px;">
                    <a href="{lock_link}" style="background: #b91c1c; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">🔒 Freeze My Account</a>
                </div>
                <p style="margin-top: 20px; font-size: 13px; color: #64748b;">If this was you, you can safely ignore this email.</p>
            </div>
        """
        return self._send_email(to_email, subject, self._get_html_wrapper(content))

    def send_account_locked_confirmation(self, to_email: str) -> bool:
        """Send confirmation that account has been locked"""
        if not self.enabled:
            logger.warning(f"📧 [TEST MODE] Account locked email to: {to_email}")
            return False
            
        subject = "Your GeonPayGuard account has been frozen"
        content = f"""
            <h2 style="color: #0f172a; font-weight: 800;">Account Securely Frozen</h2>
            <p style="color: #475569; font-size: 16px;">Per your security request, your GeonPayGuard account has been <b>locked</b>. All access is temporarily suspended.</p>
            <div style="background: #f1f5f9; padding: 25px; border-radius: 12px; margin-top: 30px;">
                <p style="margin: 0; font-size: 15px; font-weight: bold; color: #0f172a;">To restore access:</p>
                <p style="margin: 8px 0 0 0; font-size: 14px; color: #64748b;">Contact our security team at <b>{self.reply_to or 'security@geonpayguard.com'}</b>. We'll verify your identity and help you regain access.</p>
            </div>
        """
        return self._send_email(to_email, subject, self._get_html_wrapper(content))

    def send_account_restored_notification(self, to_email: str) -> bool:
        """Send notification that account has been unlocked"""
        if not self.enabled:
            logger.warning(f"📧 [TEST MODE] Account restored email to: {to_email}")
            return False
            
        subject = "Your GeonPayGuard account has been restored"
        content = f"""
            <h2 style="color: #059669; font-weight: 800;">Account Access Restored</h2>
            <p style="color: #475569; font-size: 16px;">Great news! Our security team has completed the verification process. Your account is now <b>unlocked</b> and ready to use.</p>
            <div style="text-align: center; margin-top: 40px;">
                <a href="{self.frontend_url}/login" style="background: #059669; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">Login to GeonPayGuard</a>
            </div>
        """
        return self._send_email(to_email, subject, self._get_html_wrapper(content))

    def _send_email(self, to: str, subject: str, html: str) -> bool:
        """Internal method to send email via Resend"""
        if not self.enabled:
            logger.warning(f"📧 [TEST MODE] To: {to} | Subject: {subject}")
            return False
        try:
            import resend
            response = resend.Emails.send({
                "from": f"{self.from_name} <{self.from_email}>",
                "to": [to],
                "subject": subject,
                "html": html,
                "reply_to": self.reply_to
            })
            logger.info(f"✅ Email sent to {to}: {subject}")
            return True
        except Exception as e:
            logger.error(f"❌ Resend API Error: {e}")
            return False

# --- FIXED EXPORTS ---
email_service = GeonEmailService()

def send_verification_email(to_email: str, code: str, user_name: str = "Friend") -> bool:
    """Send verification code email"""
    return email_service.send_verification_email(to_email, code, user_name)

def send_welcome_email(to_email: str, user_name: Optional[str] = "Friend") -> bool:
    """Send welcome email after verification"""
    return email_service.send_welcome_email(to_email, user_name or "Friend")

async def send_security_alert(to_email: str, ip: str, ua: str) -> bool:
    """Send security alert for new device login"""
    return await email_service.send_security_alert(to_email, ip, ua)

def send_locked_email(to_email: str) -> bool:
    """Send account locked confirmation"""
    return email_service.send_account_locked_confirmation(to_email)

def send_restored_email(to_email: str) -> bool:
    """Send account restored notification"""
    return email_service.send_account_restored_notification(to_email)