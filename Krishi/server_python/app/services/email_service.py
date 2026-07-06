"""
email_service.py — Krishi AI Email Delivery via Resend
=======================================================
Uses Resend's FREE HTTP API instead of Gmail SMTP.

Why Resend instead of Gmail SMTP?
  - Render's free tier BLOCKS outbound SMTP ports (465 / 587)
  - Resend uses plain HTTPS → never blocked, works everywhere
  - 3,000 emails / month free, no credit card required
  - Sign up: https://resend.com  → API Keys → Create Key

Setup (one-time):
  1. Go to https://resend.com and sign up (free)
  2. Go to API Keys → Create API Key → copy it
  3. Add it to Render Dashboard → Environment → RESEND_API_KEY
  4. Set RESEND_FROM to something like: Krishi AI <onboarding@resend.dev>
     (Use onboarding@resend.dev on the free plan — no domain needed!)

Local dev: set RESEND_API_KEY in server_python/.env
"""

import os
import logging
import threading

logger = logging.getLogger("krishi.email")

# Resend free API endpoint
_RESEND_API = "https://api.resend.com/emails"


def _get_credentials():
    """Read Resend API key from env at call time (safe for Render)."""
    api_key  = os.environ.get("RESEND_API_KEY", "").strip()
    from_addr = os.environ.get(
        "RESEND_FROM",
        "Krishi AI <onboarding@resend.dev>"
    ).strip()
    return api_key, from_addr


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


# ── Core HTTP send via Resend API ─────────────────────────────────────────────

def _resend_send(to_email: str, otp: str, purpose: str, api_key: str, from_addr: str) -> bool:
    """Send email via Resend HTTP API — works on Render free tier (plain HTTPS)."""
    import httpx

    subject_map = {
        "registration":   "Verify Your Krishi AI Account",
        "login":          "Your Krishi AI Sign-In Code",
        "password_reset": "Reset Your Krishi AI Password",
    }
    subject = subject_map.get(purpose, "Your Krishi AI Verification Code")

    plain_text = (
        f"Your Krishi AI verification code is: {otp}\n\n"
        "This code expires in 10 minutes. Do not share it with anyone."
    )

    payload = {
        "from":    from_addr,
        "to":      [to_email],
        "subject": subject,
        "html":    _otp_html(otp, purpose),
        "text":    plain_text,
    }

    try:
        resp = httpx.post(
            _RESEND_API,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type":  "application/json",
            },
            json=payload,
            timeout=20,
        )

        if resp.status_code in (200, 201):
            logger.info(f"[EMAIL] OTP sent via Resend to {to_email!r} (purpose={purpose})")
            return True
        else:
            logger.error(
                f"[EMAIL] Resend API error {resp.status_code}: {resp.text[:300]}"
            )
            return False

    except Exception as e:
        logger.error(f"[EMAIL] Resend request failed: {e}")
        return False


# ── Public API ────────────────────────────────────────────────────────────────

def send_otp_email(to_email: str, otp: str, purpose: str = "registration") -> bool:
    """
    Send an OTP email using the Resend HTTP API.
    - Reads RESEND_API_KEY from env at call time (safe for Render)
    - Runs in a thread so it never blocks FastAPI's async event loop
    - Returns True on success, False on failure
    - Falls back to console-log in dev mode when no API key is set
    """
    api_key, from_addr = _get_credentials()

    if not api_key:
        # Dev-mode: print OTP to console so local dev works without credentials
        logger.warning(
            f"[EMAIL DEV-MODE] No RESEND_API_KEY set. "
            f"OTP for {to_email!r} (purpose={purpose}): {otp}"
        )
        print(f"\n{'='*60}")
        print(f"  DEV OTP for {to_email}: {otp}  (purpose={purpose})")
        print(f"  → Set RESEND_API_KEY in .env to enable real emails")
        print(f"{'='*60}\n")
        return True  # Don't block dev — pretend it worked

    # Run HTTP call in a thread to avoid blocking the async event loop
    result = [False]
    error  = [None]

    def _worker():
        try:
            result[0] = _resend_send(to_email, otp, purpose, api_key, from_addr)
        except Exception as e:
            error[0] = e
            result[0] = False

    thread = threading.Thread(target=_worker, daemon=True)
    thread.start()
    thread.join(timeout=30)

    if thread.is_alive():
        logger.error("[EMAIL] Resend HTTP thread timed out after 30s")
        return False

    if error[0]:
        logger.error(f"[EMAIL] Thread error: {error[0]}")
        return False

    return result[0]
