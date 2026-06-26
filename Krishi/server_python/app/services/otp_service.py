"""
OTP delivery service — Krishi AI
=================================
Uses Gmail SMTP to send OTP emails to ANY recipient email address.

Setup (one-time):
  1. Enable 2-Step Verification on your Google account
     https://myaccount.google.com/security
  2. Go to App Passwords → create a password for "Mail"
     https://myaccount.google.com/apppasswords
  3. Set GMAIL_USER and GMAIL_APP_PASSWORD in server_python/.env

Once configured, OTPs will be delivered to every email address in the world.
"""

import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

# ── Ensure .env is loaded even if this module is imported before main.py ───────
try:
    from dotenv import load_dotenv as _load_dotenv
    _env_path = Path(__file__).resolve().parents[2] / ".env"  # server_python/.env
    if _env_path.exists():
        _load_dotenv(dotenv_path=str(_env_path), override=False)
except ImportError:
    pass  # python-dotenv not installed; rely on OS env vars


def _email_credentials() -> dict:
    """Read email credentials from env."""
    provider = os.getenv("EMAIL_PROVIDER", "").lower()
    
    # Auto-detect provider if not explicitly set
    if not provider:
        if os.getenv("GMAIL_USER"):
            provider = "gmail"
        elif os.getenv("SMTP_USER"):
            provider = "smtp"
        else:
            provider = "gmail"

    creds = {
        "provider": provider,
        "gmail_user": os.getenv("GMAIL_USER", ""),
        "gmail_app_password": os.getenv("GMAIL_APP_PASSWORD", ""),
        "smtp_host": os.getenv("SMTP_HOST", ""),
        "smtp_port": int(os.getenv("SMTP_PORT", "587") if os.getenv("SMTP_PORT") else 587),
        "smtp_user": os.getenv("SMTP_USER", ""),
        "smtp_password": os.getenv("SMTP_PASSWORD", ""),
        "smtp_from": os.getenv("SMTP_FROM", ""),
        "smtp_use_ssl": os.getenv("SMTP_USE_SSL", "False").lower() in ("true", "1", "yes"),
    }

    # Preconfigure Brevo defaults
    if provider == "brevo":
        if not creds["smtp_host"]:
            creds["smtp_host"] = "smtp-relay.brevo.com"
        if not creds["smtp_port"]:
            creds["smtp_port"] = 587
        if not creds["smtp_from"]:
            creds["smtp_from"] = creds["smtp_user"]

    return creds


# ── HTML email template ───────────────────────────────────────────────────────

def _build_html(purpose: str, code: str) -> str:
    """Build a styled HTML email body for the OTP."""
    label = purpose.replace("_", " ").title()
    return (
        '<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;'
        'padding:40px 32px;border-radius:20px;border:1px solid #e2e8f0;background:#ffffff;">'

        # Header
        '<div style="text-align:center;margin-bottom:28px;">'
        '<span style="font-size:2.4rem;">&#127807;</span>'
        '<h2 style="margin:8px 0 0;color:#15803d;font-size:1.5rem;font-weight:800;'
        'letter-spacing:-0.5px;">Krishi AI</h2>'
        '<p style="color:#64748b;font-size:0.85rem;margin:4px 0 0;">'
        'Empowering Indian Farmers with AI</p>'
        '</div>'

        # Body
        f'<p style="color:#334155;font-size:0.95rem;margin:0 0 16px;line-height:1.6;">'
        f'Your <strong>{label}</strong> one-time code is:</p>'

        # OTP Box
        f'<div style="text-align:center;background:linear-gradient(135deg,#f0fdf4,#dcfce7);'
        'border-radius:16px;padding:28px 16px;margin:0 0 20px;border:1.5px solid #86efac;">'
        f'<span style="font-size:3rem;font-weight:900;letter-spacing:14px;color:#15803d;">'
        f'{code}</span>'
        '</div>'

        # Disclaimer
        '<p style="color:#94a3b8;font-size:0.78rem;text-align:center;margin:0 0 24px;">'
        '&#9200; Valid for <strong>5 minutes</strong>. Never share this code with anyone.</p>'

        '<hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px;"/>'

        '<p style="color:#cbd5e1;font-size:0.7rem;text-align:center;margin:0;">'
        '&copy; Krishi AI &middot; This is an automated message, please do not reply.</p>'

        '</div>'
    )


# ── Generic SMTP / Brevo / Gmail sender ──────────────────────────────────────

async def _send_via_smtp(to_email: str, subject: str, html_body: str) -> bool:
    """
    Send email via Resend API or SMTP (Gmail, Brevo, custom).

    Provider priority:
      1. RESEND_API_KEY  — preferred if set (works on all cloud hosts)
      2. Gmail SMTP      — EMAIL_PROVIDER=gmail + GMAIL_USER + GMAIL_APP_PASSWORD
      3. Custom SMTP     — EMAIL_PROVIDER=smtp  + SMTP_HOST/USER/PASSWORD
    """
    resend_api_key = os.getenv("RESEND_API_KEY", "").strip()
    provider = os.getenv("EMAIL_PROVIDER", "").lower()

    # Resend takes priority when API key is present — cloud hosts often block SMTP port 465
    use_resend = bool(resend_api_key) and (
        provider in ("resend", "")
        or not os.getenv("GMAIL_USER")
        or not os.getenv("SMTP_USER")
    )
    # Downgrade to SMTP only when the chosen provider is fully configured
    if resend_api_key and provider == "gmail" and os.getenv("GMAIL_USER") and os.getenv("GMAIL_APP_PASSWORD"):
        use_resend = False
    if resend_api_key and provider in ("smtp", "brevo") and os.getenv("SMTP_USER") and os.getenv("SMTP_PASSWORD"):
        use_resend = False
    if provider == "resend":
        use_resend = True  # always honour explicit choice

    if use_resend:
        if not resend_api_key:
            print("[Email] WARNING: RESEND_API_KEY not configured in .env")
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
                        "to": [to_email],
                        "subject": subject,
                        "html": html_body,
                    },
                    timeout=15.0
                )
            if response.status_code in (200, 201, 202):
                print(f"[Email] ✅ OTP email sent to {to_email} via RESEND API")
                return True
            else:
                print(f"[Email] ❌ Resend API error: HTTP {response.status_code} — {response.text}")
                return False
        except Exception as exc:
            print(f"[Email] ❌ Resend exception for {to_email}: {type(exc).__name__}: {exc}")
            return False

    creds = _email_credentials()
    provider = creds["provider"]

    if provider == "gmail":
        gmail_user = creds["gmail_user"]
        gmail_password = creds["gmail_app_password"].replace(" ", "")
        if not gmail_user or not gmail_password or gmail_user == "your_gmail@gmail.com":
            print("[SMTP] WARNING: GMAIL_USER / GMAIL_APP_PASSWORD not configured in .env")
            print("[SMTP] OTP is printed to the terminal (dev mode).")
            return False
        
        host = "smtp.gmail.com"
        port = 465
        user = gmail_user
        password = gmail_password
        from_email = f"Krishi AI <{gmail_user}>"
        use_ssl = True
    elif provider in ("brevo", "smtp"):
        host = creds["smtp_host"]
        port = creds["smtp_port"]
        user = creds["smtp_user"]
        password = creds["smtp_password"]
        from_email = creds["smtp_from"] or user
        use_ssl = creds["smtp_use_ssl"]
        
        if not host or not user or not password:
            print(f"[SMTP] WARNING: {provider.upper()} SMTP credentials not configured in .env")
            print("[SMTP] OTP is printed to the terminal (dev mode).")
            return False
    else:
        print(f"[SMTP] WARNING: Unknown email provider: {provider}")
        return False

    print(f"[SMTP] Attempting to send OTP email to: {to_email} via {provider.upper()}")
    print(f"[SMTP] Sending from: {from_email}")

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = from_email
        msg["To"]      = to_email
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        if use_ssl:
            with smtplib.SMTP_SSL(host, port) as server:
                server.login(user, password)
                server.sendmail(from_email, to_email, msg.as_string())
        else:
            with smtplib.SMTP(host, port) as server:
                server.starttls()
                server.login(user, password)
                server.sendmail(from_email, to_email, msg.as_string())

        print(f"[SMTP] ✅ Email delivered successfully to {to_email}")
        return True

    except smtplib.SMTPAuthenticationError as e:
        print(f"[SMTP] ❌ Authentication failed for {provider.upper()}: {e}")
        print("[SMTP] Please check your credentials in .env")
        return False
    except Exception as exc:
        print(f"[SMTP] ❌ Error sending to {to_email} via {provider.upper()}: {type(exc).__name__}: {exc}")
        return False


# ── Public API ────────────────────────────────────────────────────────────────

async def send_otp(channel: str, contact: str, code: str, purpose: str) -> None:
    """
    Sends OTP via configured SMTP provider with terminal fallback for dev mode.

    channel : "email" | "sms"
    contact : email address or phone number
    code    : 6-digit OTP string
    purpose : "registration" | "login" | "password_reset" | "verify_secondary"
    """
    # Always print to terminal (dev visibility)
    sep = "-" * 54
    print("\n+" + sep + "+")
    print(f"|  OTP for {contact}")
    print(f"|  Channel : {channel.upper()}")
    print(f"|  Purpose : {purpose.upper()}")
    print(f"|  Code    : {code}   <-- copy this")
    print("+" + sep + "+\n")

    if channel != "email":
        # SMS not implemented; code is visible in terminal
        print("[OTP] SMS not configured — code printed to terminal above.")
        return

    subject   = f"Your Krishi AI OTP: {code}"
    html_body = _build_html(purpose, code)

    sent = await _send_via_smtp(contact, subject, html_body)
    if not sent:
        print(f"[OTP] SMTP delivery failed — code is visible in the terminal above.")
