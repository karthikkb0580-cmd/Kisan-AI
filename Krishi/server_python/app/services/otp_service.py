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

# ── Gmail SMTP credentials (from .env) ────────────────────────────────────────
GMAIL_USER         = os.getenv("GMAIL_USER", "")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "")


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


# ── Gmail SMTP sender ─────────────────────────────────────────────────────────

async def _send_via_gmail(to_email: str, subject: str, html_body: str) -> bool:
    """
    Send email via Gmail SMTP with an App Password.
    Works for ALL recipient email addresses — no domain restrictions.
    """
    if not GMAIL_USER or not GMAIL_APP_PASSWORD or GMAIL_USER == "your_gmail@gmail.com":
        print("[Gmail SMTP] WARNING: GMAIL_USER / GMAIL_APP_PASSWORD not configured in .env")
        print("[Gmail SMTP] OTP is printed to the terminal above (dev mode).")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"Krishi AI <{GMAIL_USER}>"
        msg["To"]      = to_email
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
            server.sendmail(GMAIL_USER, to_email, msg.as_string())

        print(f"[Gmail SMTP] Email delivered to {to_email}")
        return True

    except smtplib.SMTPAuthenticationError:
        print("[Gmail SMTP] Authentication failed — verify GMAIL_USER and GMAIL_APP_PASSWORD in .env")
        print("[Gmail SMTP] Ensure you use a 16-char App Password, not your regular Gmail password.")
        return False

    except Exception as exc:
        print(f"[Gmail SMTP] Error sending to {to_email}: {exc}")
        return False


# ── Public API ────────────────────────────────────────────────────────────────

async def send_otp(channel: str, contact: str, code: str, purpose: str) -> None:
    """
    Sends OTP via Gmail SMTP (any email) with terminal fallback for dev mode.

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

    sent = await _send_via_gmail(contact, subject, html_body)
    if not sent:
        print(f"[OTP] Gmail not configured — code is visible in the terminal above.")
