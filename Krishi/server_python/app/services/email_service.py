"""
email_service.py — Krishi AI Email Delivery via Resend
=======================================================
Uses Resend's simple HTTP REST API to send OTP emails.
• Free tier: 3,000 emails/month — no domain verification needed for @resend.dev sender
• No SMTP blocked ports, works perfectly on Render / Railway / Fly.io
• Falls back to console-log in dev mode (when RESEND_API_KEY is not set)

Resend docs: https://resend.com/docs
Get free API key: https://resend.com (no credit card required)
"""

import os
import logging
import httpx

logger = logging.getLogger("krishi.email")

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
# Resend free tier lets you send FROM: onboarding@resend.dev without owning a domain
RESEND_FROM    = os.getenv("RESEND_FROM", "Krishi AI <onboarding@resend.dev>")
RESEND_API_URL = "https://api.resend.com/emails"

# ── OTP Email HTML Template ───────────────────────────────────────────────────

def _otp_html(otp: str, purpose: str) -> str:
    purpose_label = {
        "login":          "sign in to",
        "registration":   "verify your email for",
        "password_reset": "reset your password for",
    }.get(purpose, "access")

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Krishi AI — Verification Code</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:16px;overflow:hidden;
                      box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#16a34a,#15803d);
                       padding:32px 40px;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <div style="width:40px;height:40px;background:rgba(255,255,255,0.2);
                            border-radius:10px;display:inline-block;line-height:40px;
                            text-align:center;font-size:20px;font-weight:900;color:#fff;">K</div>
                <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                  Krishi <span style="color:#bbf7d0;">AI</span>
                </span>
              </div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 20px;">
              <p style="margin:0 0 8px;font-size:15px;color:#6b7280;">
                Use this code to {purpose_label} Krishi AI:
              </p>
              <div style="margin:24px 0;text-align:center;">
                <span style="display:inline-block;font-size:42px;font-weight:900;
                             letter-spacing:12px;color:#16a34a;
                             background:#f0fdf4;border:2px solid #bbf7d0;
                             border-radius:12px;padding:16px 24px;">
                  {otp}
                </span>
              </div>
              <p style="margin:0 0 16px;font-size:14px;color:#6b7280;text-align:center;">
                This code is valid for <strong>10 minutes</strong>. Do not share it with anyone.
              </p>
              <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;" />
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                If you didn't request this code, you can safely ignore this email.<br/>
                &copy; 2025 Krishi AI &mdash; Empowering Indian Farmers
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


# ── Send OTP via Resend ───────────────────────────────────────────────────────

def send_otp_email(to_email: str, otp: str, purpose: str = "login") -> bool:
    """
    Send an OTP to `to_email` using Resend's REST API.
    Returns True on success, False on failure.
    """
    if not RESEND_API_KEY:
        # Dev-mode fallback: print OTP to server console
        logger.warning(
            "[EMAIL DEV-MODE] RESEND_API_KEY not set. "
            f"OTP for {to_email!r} (purpose={purpose}): {otp}"
        )
        return True  # Allow development flow without real emails

    subject_map = {
        "login":          "Your Krishi AI Sign-In Code",
        "registration":   "Verify Your Krishi AI Account",
        "password_reset": "Reset Your Krishi AI Password",
    }
    subject = subject_map.get(purpose, "Your Krishi AI Verification Code")

    payload = {
        "from":    RESEND_FROM,
        "to":      [to_email],
        "subject": subject,
        "html":    _otp_html(otp, purpose),
    }

    try:
        resp = httpx.post(
            RESEND_API_URL,
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type":  "application/json",
            },
            json=payload,
            timeout=15,
        )

        if resp.status_code in (200, 201):
            logger.info(f"[EMAIL] OTP sent to {to_email!r} via Resend (purpose={purpose})")
            return True
        else:
            logger.error(
                f"[EMAIL] Resend API error {resp.status_code}: {resp.text[:300]}"
            )
            return False

    except httpx.TimeoutException:
        logger.error("[EMAIL] Resend request timed out.")
        return False
    except Exception as exc:
        logger.error(f"[EMAIL] Unexpected error sending OTP: {exc}")
        return False
