"""
otp_service.py — OTP delivery for contact verification (users router)
======================================================================
Uses the same async email stack as otp_email.py.
"""

import os
from pathlib import Path

try:
    from dotenv import load_dotenv as _load_dotenv
    _env_path = Path(__file__).resolve().parents[2] / ".env"
    if _env_path.exists():
        _load_dotenv(dotenv_path=str(_env_path), override=False)
except ImportError:
    pass


def _build_html(purpose: str, code: str) -> str:
    label = purpose.replace("_", " ").title()
    return (
        '<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;'
        'padding:40px 32px;border-radius:20px;border:1px solid #e2e8f0;background:#ffffff;">'
        '<div style="text-align:center;margin-bottom:28px;">'
        '<span style="font-size:2.4rem;">&#127807;</span>'
        '<h2 style="margin:8px 0 0;color:#15803d;font-size:1.5rem;font-weight:800;">Krishi AI</h2>'
        '<p style="color:#64748b;font-size:0.85rem;margin:4px 0 0;">Empowering Indian Farmers with AI</p>'
        '</div>'
        f'<p style="color:#334155;font-size:0.95rem;margin:0 0 16px;line-height:1.6;">'
        f'Your <strong>{label}</strong> one-time code is:</p>'
        f'<div style="text-align:center;background:linear-gradient(135deg,#f0fdf4,#dcfce7);'
        'border-radius:16px;padding:28px 16px;margin:0 0 20px;border:1.5px solid #86efac;">'
        f'<span style="font-size:3rem;font-weight:900;letter-spacing:14px;color:#15803d;">'
        f'{code}</span></div>'
        '<p style="color:#94a3b8;font-size:0.78rem;text-align:center;margin:0 0 24px;">'
        '&#9200; Valid for <strong>5 minutes</strong>. Never share this code with anyone.</p>'
        '<hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px;"/>'
        '<p style="color:#cbd5e1;font-size:0.7rem;text-align:center;margin:0;">'
        '&copy; Krishi AI &middot; Automated message, do not reply.</p>'
        '</div>'
    )


async def _send_email_async(to_email: str, subject: str, html_body: str) -> bool:
    """
    Async email sender — tries Resend first, then fastapi-mail SMTP.
    Never blocks the FastAPI event loop.
    """
    # ── Try Resend (HTTPS, works on all cloud platforms) ──────────────────────
    resend_key = os.getenv("RESEND_API_KEY", "").strip()
    if resend_key:
        try:
            import httpx
            from_addr = (os.getenv("RESEND_FROM") or
                         os.getenv("SMTP_FROM") or
                         "onboarding@resend.dev")
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {resend_key}",
                        "Content-Type":  "application/json",
                    },
                    json={
                        "from":    f"Krishi AI <{from_addr}>",
                        "to":      [to_email],
                        "subject": subject,
                        "html":    html_body,
                    },
                )
            if resp.status_code in (200, 201, 202):
                print(f"[Email] ✅ Sent to {to_email} via Resend")
                return True
            print(f"[Email] ❌ Resend HTTP {resp.status_code}: {resp.text[:200]}")
        except Exception as exc:
            print(f"[Email] ❌ Resend error: {exc}")

    # ── Try fastapi-mail async SMTP ────────────────────────────────────────────
    try:
        from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType

        provider = os.getenv("EMAIL_PROVIDER", "").lower()

        if os.getenv("GMAIL_USER") and provider in ("gmail", ""):
            conf = ConnectionConfig(
                MAIL_USERNAME   = os.getenv("GMAIL_USER", ""),
                MAIL_PASSWORD   = os.getenv("GMAIL_APP_PASSWORD", "").replace(" ", ""),
                MAIL_FROM       = os.getenv("GMAIL_USER", ""),
                MAIL_FROM_NAME  = "Krishi AI",
                MAIL_PORT       = 587,
                MAIL_SERVER     = "smtp.gmail.com",
                MAIL_STARTTLS   = True,
                MAIL_SSL_TLS    = False,
                USE_CREDENTIALS = True,
                VALIDATE_CERTS  = True,
            )
        elif os.getenv("SMTP_USER"):
            use_ssl = os.getenv("SMTP_USE_SSL", "false").lower() in ("true", "1", "yes")
            conf = ConnectionConfig(
                MAIL_USERNAME   = os.getenv("SMTP_USER", ""),
                MAIL_PASSWORD   = os.getenv("SMTP_PASSWORD", ""),
                MAIL_FROM       = os.getenv("SMTP_FROM") or os.getenv("SMTP_USER", ""),
                MAIL_FROM_NAME  = os.getenv("SMTP_FROM_NAME", "Krishi AI"),
                MAIL_PORT       = int(os.getenv("SMTP_PORT", "587")),
                MAIL_SERVER     = os.getenv("SMTP_HOST", "smtp-relay.brevo.com"),
                MAIL_STARTTLS   = not use_ssl,
                MAIL_SSL_TLS    = use_ssl,
                USE_CREDENTIALS = True,
                VALIDATE_CERTS  = True,
            )
        else:
            print("[Email] ⚠️  No email credentials set — OTP only printed to logs")
            return False

        msg = MessageSchema(
            subject    = subject,
            recipients = [to_email],
            body       = html_body,
            subtype    = MessageType.html,
        )
        await FastMail(conf).send_message(msg)
        print(f"[Email] ✅ Sent to {to_email} via fastapi-mail")
        return True

    except Exception as exc:
        print(f"[Email] ❌ fastapi-mail error: {type(exc).__name__}: {exc}")
        return False


# ── Public API (called from users router) ─────────────────────────────────────

async def send_otp(channel: str, contact: str, code: str, purpose: str) -> None:
    """
    Send OTP — always prints to terminal for dev visibility,
    then attempts email delivery asynchronously.
    """
    sep = "-" * 54
    print(f"\n+{sep}+")
    print(f"|  OTP for {contact}")
    print(f"|  Channel : {channel.upper()}")
    print(f"|  Purpose : {purpose.upper()}")
    print(f"|  Code    : {code}   <-- copy this")
    print(f"+{sep}+\n")

    if channel != "email":
        print("[OTP] SMS not configured — code visible in terminal above.")
        return

    subject   = f"Your Krishi AI OTP: {code}"
    html_body = _build_html(purpose, code)
    sent = await _send_email_async(contact, subject, html_body)
    if not sent:
        print(f"[OTP] All delivery methods failed — code is in the terminal above.")
