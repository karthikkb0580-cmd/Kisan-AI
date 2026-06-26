"""
otp_email.py — Async OTP email delivery for Krishi AI
=======================================================
Uses fastapi-mail (aiosmtplib) — proper async SMTP, no event-loop blocking.

Provider priority:
  1. RESEND_API_KEY  → Resend HTTP API   (best for cloud, uses port 443)
  2. GMAIL_USER      → Gmail SMTP 587    (fastapi-mail / aiosmtplib async)
  3. SMTP_USER       → Custom SMTP relay (fastapi-mail / aiosmtplib async)
"""

from __future__ import annotations

import os
import re
import logging
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


# ── HTML template ──────────────────────────────────────────────────────────────

def build_otp_email_html(otp: str, purpose: str, expiry_minutes: int = 5) -> str:
    label = purpose.replace("_", " ").title()
    purpose_map = {
        "registration":    ("Verify your email address",  "Complete your Krishi AI registration"),
        "login":           ("Login verification code",    "Sign in to your Krishi AI account"),
        "password_reset":  ("Reset your password",        "You requested a password reset"),
        "verify_secondary":("Verify contact",             "Verify your contact information"),
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
                   border-radius:16px;border:2px solid #86efac;padding:28px 16px;">
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


# ── Provider 1: Resend HTTP API ────────────────────────────────────────────────

async def _send_via_resend(to_email: str, subject: str, html_body: str) -> bool:
    """Send via Resend REST API (HTTPS port 443 — never blocked on any cloud host)."""
    api_key = os.getenv("RESEND_API_KEY", "").strip()
    if not api_key:
        return False

    from_addr = (os.getenv("RESEND_FROM") or
                 os.getenv("SMTP_FROM") or
                 "onboarding@resend.dev")
    from_name = os.getenv("SMTP_FROM_NAME") or "Krishi AI"

    try:
        import httpx
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type":  "application/json",
                },
                json={
                    "from":    f"{from_name} <{from_addr}>",
                    "to":      [to_email],
                    "subject": subject,
                    "html":    html_body,
                },
            )
        if resp.status_code in (200, 201, 202):
            logger.info("[Email] ✅ Sent to %s via Resend", to_email)
            return True
        logger.error("[Email] ❌ Resend HTTP %s: %s", resp.status_code, resp.text[:300])
        return False
    except Exception as exc:
        logger.error("[Email] ❌ Resend exception: %s — %s", type(exc).__name__, exc)
        return False


# ── Provider 2: Async SMTP via fastapi-mail / aiosmtplib ──────────────────────

async def _send_via_fastapi_mail(to_email: str, subject: str, html_body: str) -> bool:
    """
    Send via fastapi-mail (uses aiosmtplib — fully async, no event-loop blocking).
    Supports Gmail port 587 STARTTLS and any custom SMTP relay.
    """
    try:
        from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
    except ImportError:
        logger.error("[Email] fastapi-mail not installed — run: pip install fastapi-mail")
        return False

    provider = os.getenv("EMAIL_PROVIDER", "").lower()

    # Determine SMTP settings
    if provider in ("gmail", "") and os.getenv("GMAIL_USER"):
        mail_user     = os.getenv("GMAIL_USER", "")
        mail_password = os.getenv("GMAIL_APP_PASSWORD", "").replace(" ", "")
        mail_server   = "smtp.gmail.com"
        mail_port     = 587
        mail_from     = mail_user
        starttls      = True
        ssl_tls       = False
    elif os.getenv("SMTP_USER"):
        mail_user     = os.getenv("SMTP_USER", "")
        mail_password = os.getenv("SMTP_PASSWORD", "")
        mail_server   = os.getenv("SMTP_HOST", "smtp-relay.brevo.com")
        mail_port     = int(os.getenv("SMTP_PORT", "587"))
        mail_from     = os.getenv("SMTP_FROM") or mail_user
        use_ssl_env   = os.getenv("SMTP_USE_SSL", "false").lower() in ("true", "1", "yes")
        starttls      = not use_ssl_env
        ssl_tls       = use_ssl_env
    else:
        logger.warning("[Email] No SMTP credentials configured (GMAIL_USER or SMTP_USER)")
        return False

    if not mail_user or not mail_password:
        logger.warning("[Email] SMTP credentials are empty — check GMAIL_USER/GMAIL_APP_PASSWORD in env")
        return False

    try:
        conf = ConnectionConfig(
            MAIL_USERNAME   = mail_user,
            MAIL_PASSWORD   = mail_password,
            MAIL_FROM       = mail_from,
            MAIL_FROM_NAME  = os.getenv("SMTP_FROM_NAME", "Krishi AI"),
            MAIL_PORT       = mail_port,
            MAIL_SERVER     = mail_server,
            MAIL_STARTTLS   = starttls,
            MAIL_SSL_TLS    = ssl_tls,
            USE_CREDENTIALS = True,
            VALIDATE_CERTS  = True,
        )

        message = MessageSchema(
            subject    = subject,
            recipients = [to_email],
            body       = html_body,
            subtype    = MessageType.html,
        )

        fm = FastMail(conf)
        await fm.send_message(message)
        logger.info("[Email] ✅ Sent to %s via fastapi-mail (%s:%s)", to_email, mail_server, mail_port)
        return True

    except Exception as exc:
        logger.error("[Email] ❌ fastapi-mail error sending to %s: %s — %s",
                     to_email, type(exc).__name__, exc)
        return False


# ── Public API ─────────────────────────────────────────────────────────────────

async def send_otp_email(to_email: str, otp: str, purpose: str,
                         expiry_minutes: int = 5) -> bool:
    """
    Send OTP email. Tries Resend first (best for cloud), then fastapi-mail SMTP.
    Returns True on success.
    """
    safe_to   = _safe(to_email)
    safe_subj = _safe(f"Krishi AI — Your OTP: {otp}")
    html_body = build_otp_email_html(otp, purpose, expiry_minutes)

    # ── Try Resend first (HTTPS, never blocked on any cloud platform) ──────────
    resend_key = os.getenv("RESEND_API_KEY", "").strip()
    if resend_key:
        ok = await _send_via_resend(safe_to, safe_subj, html_body)
        if ok:
            return True
        logger.warning("[Email] Resend failed — falling back to SMTP")

    # ── Fall back to async SMTP (fastapi-mail) ─────────────────────────────────
    ok = await _send_via_fastapi_mail(safe_to, safe_subj, html_body)
    if ok:
        return True

    logger.warning(
        "[Email] ❌ All providers failed for %s — OTP=%s (check Render env vars)", to_email, otp
    )
    return False
