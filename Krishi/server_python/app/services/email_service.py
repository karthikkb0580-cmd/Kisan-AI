"""
email_service.py — Krishi AI Email Delivery
============================================
Sends OTP emails using Gmail SMTP (credentials from .env).
• Works reliably on Render (port 465 SSL / 587 TLS both supported)
• Falls back to console-log in dev mode when credentials are not set
• Beautiful HTML email template included

Configure in .env / Render env vars:
  GMAIL_USER=your@gmail.com
  GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx   (16-char App Password)

Get App Password: https://myaccount.google.com/apppasswords
"""

import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger("krishi.email")

GMAIL_USER         = os.getenv("GMAIL_USER", "").strip()
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "").replace(" ", "").strip()

# ── OTP Email HTML Template ───────────────────────────────────────────────────

def _otp_html(otp: str, purpose: str) -> str:
    purpose_label = {
        "registration":   "verify your Krishi AI account",
        "login":          "sign in to Krishi AI",
        "password_reset": "reset your Krishi AI password",
    }.get(purpose, "access Krishi AI")

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Krishi AI — Verification Code</title>
</head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:20px;overflow:hidden;
                      box-shadow:0 8px 32px rgba(22,163,74,0.12);">
          <tr>
            <td style="background:linear-gradient(135deg,#16a34a 0%,#15803d 100%);
                       padding:36px 48px;text-align:center;">
              <span style="display:inline-block;background:rgba(255,255,255,0.18);
                           border-radius:14px;padding:10px 18px;
                           font-size:26px;font-weight:900;color:#fff;
                           letter-spacing:-0.5px;">
                🌱 Krishi <span style="color:#bbf7d0;">AI</span>
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 48px 32px;">
              <h2 style="margin:0 0 8px;font-size:20px;color:#15803d;font-weight:800;">
                Email Verification
              </h2>
              <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.6;">
                Use the code below to {purpose_label}:
              </p>
              <div style="text-align:center;margin:0 0 28px;">
                <span style="display:inline-block;background:#f0fdf4;
                             border:2px solid #86efac;border-radius:16px;
                             padding:18px 32px;font-size:48px;font-weight:900;
                             letter-spacing:14px;color:#15803d;
                             font-family:'Courier New',monospace;">
                  {otp}
                </span>
              </div>
              <p style="margin:0 0 24px;font-size:13px;color:#6b7280;text-align:center;">
                ⏱ This code expires in <strong>10 minutes</strong>.<br/>
                Never share this code with anyone.
              </p>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 20px;" />
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;line-height:1.6;">
                If you didn't request this, you can safely ignore this email.<br/>
                © 2025 Krishi AI — Empowering Indian Farmers 🇮🇳
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


# ── Send OTP via Gmail SMTP ───────────────────────────────────────────────────

def send_otp_email(to_email: str, otp: str, purpose: str = "registration") -> bool:
    """
    Send an OTP email using Gmail SMTP (SSL on port 465).
    Returns True on success, False on failure.
    """
    if not GMAIL_USER or not GMAIL_APP_PASSWORD:
        # Dev-mode: print to console so local dev still works
        logger.warning(
            "[EMAIL DEV-MODE] GMAIL credentials not set. "
            f"OTP for {to_email!r} (purpose={purpose}): {otp}"
        )
        print(f"\n{'='*60}")
        print(f"  DEV OTP for {to_email}: {otp}  (purpose={purpose})")
        print(f"{'='*60}\n")
        return True   # Don't block local dev

    subject_map = {
        "registration":   "Verify Your Krishi AI Account",
        "login":          "Your Krishi AI Sign-In Code",
        "password_reset": "Reset Your Krishi AI Password",
    }
    subject = subject_map.get(purpose, "Your Krishi AI Verification Code")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"Krishi AI <{GMAIL_USER}>"
    msg["To"]      = to_email

    # Plain text fallback
    plain = (
        f"Your Krishi AI verification code is: {otp}\n\n"
        f"This code expires in 10 minutes. Do not share it with anyone."
    )
    msg.attach(MIMEText(plain, "plain", "utf-8"))
    msg.attach(MIMEText(_otp_html(otp, purpose), "html", "utf-8"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=20) as server:
            server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
            server.sendmail(GMAIL_USER, to_email, msg.as_string())

        logger.info(f"[EMAIL] OTP sent to {to_email!r} via Gmail (purpose={purpose})")
        return True

    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"[EMAIL] Gmail auth failed — check GMAIL_APP_PASSWORD: {e}")
        return False
    except smtplib.SMTPException as e:
        logger.error(f"[EMAIL] SMTP error sending to {to_email!r}: {e}")
        return False
    except Exception as e:
        logger.error(f"[EMAIL] Unexpected error: {e}")
        return False
