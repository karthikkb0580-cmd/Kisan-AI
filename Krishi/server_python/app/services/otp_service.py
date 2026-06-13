import os
import smtplib
import httpx
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.config import RESEND_API_KEY

# ── Gmail SMTP settings (read from .env) ──────────────────────────────────────
GMAIL_USER = os.getenv("GMAIL_USER", "")          # your Gmail address
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "")  # 16-char App Password


def _build_html(purpose: str, code: str) -> str:
    return f"""
    <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;
                padding:32px 24px;border-radius:16px;border:1px solid #e2e8f0;
                background:#ffffff;">
      <div style="text-align:center;margin-bottom:24px;">
        <span style="font-size:2.5rem;">🌿</span>
        <h2 style="margin:8px 0 0;color:#15803d;font-size:1.3rem;font-weight:800;">
          Krishi AI
        </h2>
      </div>
      <p style="color:#334155;font-size:0.9rem;margin:0 0 12px;">
        Your <strong>{purpose.replace('_',' ').title()}</strong> verification code is:
      </p>
      <div style="text-align:center;background:linear-gradient(135deg,#f0fdf4,#dcfce7);
                  border-radius:12px;padding:24px;margin:16px 0;">
        <span style="font-size:2.8rem;font-weight:900;letter-spacing:10px;color:#15803d;">
          {code}
        </span>
      </div>
      <p style="color:#64748b;font-size:0.78rem;margin:16px 0 0;text-align:center;">
        ⏱ Valid for <strong>5 minutes</strong>. Do not share this code with anyone.
      </p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
      <p style="color:#94a3b8;font-size:0.7rem;text-align:center;margin:0;">
        © Krishi AI · Empowering Indian Farmers
      </p>
    </div>
    """


async def _send_via_gmail(to_email: str, subject: str, html_body: str) -> bool:
    """Send email using Gmail SMTP with an App Password. Works for all recipients."""
    if not GMAIL_USER or not GMAIL_APP_PASSWORD:
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"Krishi AI <{GMAIL_USER}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
            server.sendmail(GMAIL_USER, to_email, msg.as_string())
        print(f"[Gmail SMTP] Email delivered to {to_email}")
        return True
    except Exception as exc:
        print(f"[Gmail SMTP] Error: {exc}")
        return False


async def _send_via_resend(to_email: str, subject: str, html_body: str) -> bool:
    """Send email via Resend API (free plan: only to verified address)."""
    resend_key = RESEND_API_KEY
    if not resend_key or resend_key.startswith("re_your"):
        return False
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {resend_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": "Krishi AI <onboarding@resend.dev>",
                    "to": to_email,
                    "subject": subject,
                    "html": html_body,
                },
            )
        if r.status_code in (200, 201):
            print(f"[Resend] Email delivered to {to_email}")
            return True
        else:
            print(f"[Resend] Failed ({r.status_code}): {r.text}")
            return False
    except Exception as exc:
        print(f"[Resend] Error: {exc}")
        return False


async def send_otp(channel: str, contact: str, code: str, purpose: str) -> None:
    """
    Sends OTP via the best available channel.
    Priority: Gmail SMTP → Resend → terminal fallback (dev mode).
    """
    # Always print to terminal for dev visibility
    sep = "-" * 56
    print(f"\n+{sep}+")
    print(f"|  OTP for {contact}")
    print(f"|  Channel : {channel.upper()}")
    print(f"|  Purpose : {purpose.upper()}")
    print(f"|  Code    : {code}   <-- copy this")
    print(f"+{sep}+\n")

    if channel != "email":
        # SMS not implemented; OTP visible in terminal
        return

    subject = f"Your Krishi AI OTP: {code}"
    html_body = _build_html(purpose, code)

    # Try Gmail SMTP first (works for ALL email addresses)
    sent = await _send_via_gmail(contact, subject, html_body)
    if sent:
        return

    # Fallback: Resend (free plan limited to verified address only)
    sent = await _send_via_resend(contact, subject, html_body)
    if sent:
        return

    print(f"[OTP] No email provider configured. Code printed to terminal above.")
