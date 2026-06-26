"""
otp_email.py — Professional HTML email templates for OTP delivery
==================================================================
• Inlined CSS (email-client safe)
• Includes expiry warning
• Prevents header injection by sanitizing subject/recipient
• Supports Gmail SMTP and Brevo SMTP out of the box
"""

from __future__ import annotations

import os
import re
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

try:
    from dotenv import load_dotenv as _ldenv
    _ep = Path(__file__).resolve().parents[2] / ".env"
    if _ep.exists():
        _ldenv(dotenv_path=str(_ep), override=False)
except ImportError:
    pass

logger = logging.getLogger("krishi.email")

_HEADER_INJECTION_RE = re.compile(r"[\r\n]")


def _safe(value: str) -> str:
    """Strip CR/LF to prevent email header injection."""
    return _HEADER_INJECTION_RE.sub("", str(value))


# ── HTML template ─────────────────────────────────────────────────────────────

def build_otp_email_html(otp: str, purpose: str, expiry_minutes: int = 5) -> str:
    label = purpose.replace("_", " ").title()
    purpose_map = {
        "registration":    ("Verify your email address", "Complete your Krishi AI registration"),
        "login":           ("Login verification code", "Sign in to your Krishi AI account"),
        "password_reset":  ("Reset your password", "You requested a password reset"),
        "verify_secondary":("Verify contact", "Verify your contact information"),
    }
    title, subtitle = purpose_map.get(purpose, (f"{label} code", f"Your {label} OTP"))

    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title}</title></head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:Inter,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:20px;
             border:1px solid #d1fae5;box-shadow:0 4px 24px rgba(0,0,0,0.07);" cellpadding="0" cellspacing="0">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#15803d,#16a34a);border-radius:20px 20px 0 0;padding:32px 40px;text-align:center;">
          <p style="margin:0;font-size:2.4rem;line-height:1;">&#127807;</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:1.6rem;font-weight:800;letter-spacing:-0.5px;">Krishi AI</h1>
          <p style="margin:4px 0 0;color:#bbf7d0;font-size:0.85rem;">Empowering Indian Farmers with AI</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 40px 28px;">
          <h2 style="margin:0 0 8px;color:#15803d;font-size:1.2rem;font-weight:700;">{title}</h2>
          <p style="margin:0 0 24px;color:#475569;font-size:0.95rem;line-height:1.6;">{subtitle}. Use the code below to continue:</p>

          <!-- OTP Box -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);
                   border-radius:16px;border:2px solid #86efac;padding:28px 16px;margin-bottom:4px;">
              <p style="margin:0;font-size:3rem;font-weight:900;letter-spacing:18px;color:#15803d;
                         font-family:'Courier New',monospace;">{otp}</p>
            </td></tr>
          </table>

          <!-- Expiry warning -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
            <tr><td style="background:#fef9c3;border:1px solid #fde047;border-radius:10px;padding:12px 16px;">
              <p style="margin:0;color:#854d0e;font-size:0.82rem;text-align:center;">
                &#9200;&nbsp;<strong>This code expires in {expiry_minutes} minutes.</strong>
                Never share this code with anyone, including Krishi AI support.
              </p>
            </td></tr>
          </table>

          <p style="margin:20px 0 0;color:#94a3b8;font-size:0.78rem;line-height:1.5;">
            If you did not request this code, you can safely ignore this email. 
            Your account is not at risk unless you enter this code on a site you did not visit.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;border-radius:0 0 20px 20px;
                       padding:20px 40px;text-align:center;">
          <p style="margin:0;color:#94a3b8;font-size:0.7rem;">
            &copy; 2024 Krishi AI &middot; Empowering Indian Farmers<br>
            This is an automated message &mdash; please do not reply.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


# ── SMTP configuration ────────────────────────────────────────────────────────

def _get_smtp_config() -> dict:
    provider = os.getenv("EMAIL_PROVIDER", "").lower()
    if not provider:
        provider = "gmail" if os.getenv("GMAIL_USER") else "smtp" if os.getenv("SMTP_USER") else "gmail"

    if provider == "gmail":
        return {
            "host": "smtp.gmail.com",
            "port": 465,
            "user": os.getenv("GMAIL_USER", ""),
            "password": os.getenv("GMAIL_APP_PASSWORD", "").replace(" ", ""),
            "from_name": "Krishi AI",
            "from_addr": os.getenv("GMAIL_USER", ""),
            "use_ssl": True,
            "provider": "gmail",
        }
    else:  # brevo or generic smtp
        user = os.getenv("SMTP_USER", "")
        return {
            "host": os.getenv("SMTP_HOST", "smtp-relay.brevo.com"),
            "port": int(os.getenv("SMTP_PORT", "587")),
            "user": user,
            "password": os.getenv("SMTP_PASSWORD", ""),
            "from_name": os.getenv("SMTP_FROM_NAME", "Krishi AI"),
            "from_addr": os.getenv("SMTP_FROM", user),
            "use_ssl": os.getenv("SMTP_USE_SSL", "false").lower() in ("true", "1", "yes"),
            "provider": provider,
        }


# ── Sender ────────────────────────────────────────────────────────────────────

async def send_otp_email(to_email: str, otp: str, purpose: str,
                         expiry_minutes: int = 5) -> bool:
    """
    Send a production-quality OTP email. Returns True on success.
    Prevents header injection, logs all errors.

    Provider priority:
      1. RESEND_API_KEY  — if set, always preferred (works on all cloud hosts)
      2. Gmail SMTP      — EMAIL_PROVIDER=gmail + GMAIL_USER + GMAIL_APP_PASSWORD
      3. Custom SMTP     — EMAIL_PROVIDER=smtp  + SMTP_HOST/USER/PASSWORD
    """
    resend_api_key = os.getenv("RESEND_API_KEY", "").strip()
    provider = os.getenv("EMAIL_PROVIDER", "").lower()

    # RESEND takes priority if the API key is set — it works on every cloud host
    # including Render, Railway, Fly.io where outbound SMTP port 465 is often blocked.
    use_resend = bool(resend_api_key) and (
        provider in ("resend", "")          # explicitly chosen, or no provider set
        or not os.getenv("GMAIL_USER")       # Gmail chosen but user not configured
        or not os.getenv("SMTP_USER")        # SMTP chosen but user not configured
    )
    # If Gmail is fully configured, prefer it over Resend (unless provider=resend)
    if resend_api_key and provider == "gmail" and os.getenv("GMAIL_USER") and os.getenv("GMAIL_APP_PASSWORD"):
        use_resend = False
    if resend_api_key and provider in ("smtp", "brevo") and os.getenv("SMTP_USER") and os.getenv("SMTP_PASSWORD"):
        use_resend = False
    if provider == "resend":
        use_resend = True  # always honour explicit choice

    # Guard against header injection
    safe_to   = _safe(to_email)
    safe_subj = _safe(f"Krishi AI — Your OTP: {otp}")
    html_body = build_otp_email_html(otp, purpose, expiry_minutes)

    # ── Resend HTTP API (recommended for cloud deployments) ─────────────────────
    if use_resend:
        if not resend_api_key:
            logger.warning("[Email] RESEND_API_KEY not set — cannot send via Resend")
            return False

        from_addr = os.getenv("RESEND_FROM") or os.getenv("SMTP_FROM") or "onboarding@resend.dev"
        from_name = os.getenv("SMTP_FROM_NAME") or "Krishi AI"

        try:
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {resend_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "from": f"{from_name} <{from_addr}>",
                        "to": [safe_to],
                        "subject": safe_subj,
                        "html": html_body,
                    },
                    timeout=15.0
                )
            if response.status_code in (200, 201, 202):
                logger.info("[Email] ✅ OTP email sent to %s via RESEND API", to_email)
                return True
            else:
                logger.error(
                    "[Email] ❌ Resend API failed: HTTP %s — %s",
                    response.status_code, response.text
                )
                return False
        except Exception as exc:
            logger.error("[Email] ❌ Resend exception for %s: %s — %s",
                         to_email, type(exc).__name__, exc)
            return False

    # ── Gmail / custom SMTP fallback ─────────────────────────────────────────────
    cfg = _get_smtp_config()
    if not cfg["user"] or not cfg["password"]:
        logger.warning(
            "[Email] %s credentials not set — OTP printed to terminal only (dev mode).",
            cfg["provider"].upper()
        )
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = safe_subj
    msg["From"]    = f"{cfg['from_name']} <{_safe(cfg['from_addr'])}>"
    msg["To"]      = safe_to
    msg["X-Mailer"] = "KrishiAI/2.0"
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        if cfg["use_ssl"]:
            server = smtplib.SMTP_SSL(cfg["host"], cfg["port"], timeout=15)
        else:
            server = smtplib.SMTP(cfg["host"], cfg["port"], timeout=15)
            server.ehlo()
            server.starttls()
            server.ehlo()

        server.login(cfg["user"], cfg["password"])
        server.sendmail(cfg["from_addr"], safe_to, msg.as_string())
        server.quit()

        logger.info("[Email] ✅ OTP email sent to %s via %s", to_email, cfg["provider"].upper())
        return True

    except smtplib.SMTPAuthenticationError as exc:
        logger.error("[Email] ❌ SMTP auth failed (%s): %s", cfg["provider"].upper(), exc)
    except smtplib.SMTPRecipientsRefused as exc:
        logger.error("[Email] ❌ Recipient refused %s: %s", to_email, exc)
    except smtplib.SMTPException as exc:
        logger.error("[Email] ❌ SMTP error sending to %s: %s", to_email, exc)
    except Exception as exc:
        logger.error("[Email] ❌ Unexpected error sending to %s: %s — %s",
                     to_email, type(exc).__name__, exc)

    return False
