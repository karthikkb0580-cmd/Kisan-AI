"""
email_service.py — Krishi AI Email Delivery
============================================
Sends OTP emails using Gmail SMTP (credentials from env vars).

• Credentials are read at SEND time (not import time) so Render env vars work
• SMTP runs in a thread-pool executor so it never blocks the FastAPI event loop
• Falls back to console-log in dev mode when credentials are not set
• Beautiful HTML email template included

Configure in Render dashboard or .env:
  GMAIL_USER=your@gmail.com
  GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx   (16-char App Password)

Get App Password: https://myaccount.google.com/apppasswords
"""

import os
import smtplib
import logging
import threading
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

logger = logging.getLogger("krishi.email")


def _get_credentials():
    """Read credentials fresh from env at call time (not import time)."""
    user = os.environ.get("GMAIL_USER", "").strip()
    password = os.environ.get("GMAIL_APP_PASSWORD", "").replace(" ", "").strip()
    return user, password


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
                &#127807; Krishi <span style="color:#bbf7d0;">AI</span>
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
                &#8987; This code expires in <strong>10 minutes</strong>.<br/>
                Never share this code with anyone.
              </p>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 20px;" />
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;line-height:1.6;">
                If you didn't request this, you can safely ignore this email.<br/>
                &copy; 2025 Krishi AI &mdash; Empowering Indian Farmers &#127470;&#127475;
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


# ── Core SMTP send (runs in a thread) ────────────────────────────────────────

def _smtp_send(to_email: str, otp: str, purpose: str, gmail_user: str, gmail_password: str) -> bool:
    """Blocking SMTP call — always run via send_otp_email() which uses a thread."""
    subject_map = {
        "registration":   "Verify Your Krishi AI Account",
        "login":          "Your Krishi AI Sign-In Code",
        "password_reset": "Reset Your Krishi AI Password",
    }
    subject = subject_map.get(purpose, "Your Krishi AI Verification Code")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"Krishi AI <{gmail_user}>"
    msg["To"]      = to_email

    plain = (
        f"Your Krishi AI verification code is: {otp}\n\n"
        "This code expires in 10 minutes. Do not share it with anyone."
    )
    msg.attach(MIMEText(plain, "plain", "utf-8"))
    msg.attach(MIMEText(_otp_html(otp, purpose), "html", "utf-8"))

    # Try SSL on 465 first, fallback to STARTTLS on 587
    for attempt, use_ssl, port in [(1, True, 465), (2, False, 587)]:
        try:
            if use_ssl:
                server = smtplib.SMTP_SSL("smtp.gmail.com", port, timeout=25)
            else:
                server = smtplib.SMTP("smtp.gmail.com", port, timeout=25)
                server.ehlo()
                server.starttls()
                server.ehlo()

            server.login(gmail_user, gmail_password)
            server.sendmail(gmail_user, to_email, msg.as_string())
            server.quit()
            logger.info(f"[EMAIL] OTP sent to {to_email!r} via Gmail port {port} (purpose={purpose})")
            return True

        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"[EMAIL] Gmail auth FAILED — check GMAIL_APP_PASSWORD is a 16-char App Password (not your Gmail login): {e}")
            return False  # No point retrying if auth fails

        except smtplib.SMTPException as e:
            logger.warning(f"[EMAIL] SMTP attempt {attempt} (port={port}) failed: {e}")
            if attempt == 2:
                logger.error("[EMAIL] All SMTP attempts exhausted.")
                return False

        except Exception as e:
            logger.error(f"[EMAIL] Unexpected error on attempt {attempt}: {e}")
            if attempt == 2:
                return False

    return False


# ── Public API ────────────────────────────────────────────────────────────────

def send_otp_email(to_email: str, otp: str, purpose: str = "registration") -> bool:
    """
    Send an OTP email using Gmail SMTP.
    - Reads credentials fresh from env at call time (safe for Render)
    - Runs SMTP in a thread so it never blocks FastAPI's event loop
    - Returns True on success, False on failure
    """
    gmail_user, gmail_password = _get_credentials()

    if not gmail_user or not gmail_password:
        # Dev-mode: print to console so local dev still works without credentials
        logger.warning(
            f"[EMAIL DEV-MODE] No GMAIL credentials set. "
            f"OTP for {to_email!r} (purpose={purpose}): {otp}"
        )
        print(f"\n{'='*60}")
        print(f"  DEV OTP for {to_email}: {otp}  (purpose={purpose})")
        print(f"{'='*60}\n")
        return True  # Don't block dev — pretend it worked

    # Run blocking SMTP in a thread to avoid blocking the async event loop
    result = [False]
    error  = [None]

    def _worker():
        try:
            result[0] = _smtp_send(to_email, otp, purpose, gmail_user, gmail_password)
        except Exception as e:
            error[0] = e
            result[0] = False

    thread = threading.Thread(target=_worker, daemon=True)
    thread.start()
    thread.join(timeout=35)  # 35s max — Render requests timeout at ~60s

    if thread.is_alive():
        logger.error("[EMAIL] SMTP thread timed out after 35s")
        return False

    if error[0]:
        logger.error(f"[EMAIL] Thread error: {error[0]}")
        return False

    return result[0]
