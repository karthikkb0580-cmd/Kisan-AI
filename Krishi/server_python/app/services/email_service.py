"""
email_service.py — Krishi AI OTP Email Delivery
================================================

Supports two FREE methods (auto-detected from env vars):

METHOD 1 — Gmail SMTP (PRIMARY)
  • Set env vars: GMAIL_USER and GMAIL_APP_PASSWORD
  • App Password: https://myaccount.google.com/apppasswords
  • Reliable for most production use cases.

METHOD 2 — Resend HTTP API (FALLBACK)
  • Free: 3,000 emails/month, no credit card
  • Sign up: https://resend.com → API Keys → Create Key
  • Set env var: RESEND_API_KEY=re_xxxxxxxxxxxx

Priority: Gmail > Resend > Console (dev-mode fallback)
"""

import os
import logging
import threading

logger = logging.getLogger("krishi.email")


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
                           font-size:26px;font-weight:900;color:#fff;">
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


# ── Method 1: Gmail SMTP (PRIMARY — sends to ANY email address) ──────────────

def _send_via_gmail(to_email: str, otp: str, purpose: str, gmail_user: str, gmail_password: str) -> bool:
    """
    Send via Gmail SMTP.
    ✅ Works on Render free tier — outbound port 587 is NOT blocked.
    ✅ Sends to ANY recipient email address without restriction.
    Requires: GMAIL_USER + GMAIL_APP_PASSWORD env vars.
    """
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

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
    msg.attach(MIMEText(f"Your Krishi AI code: {otp}\nExpires in 10 minutes.", "plain", "utf-8"))
    msg.attach(MIMEText(_otp_html(otp, purpose), "html", "utf-8"))

    # Try port 587 (STARTTLS) first — preferred on Render
    # Fall back to port 465 (SSL)
    for use_ssl, port in [(False, 587), (True, 465)]:
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
            logger.info(f"[EMAIL] ✅ Gmail SMTP delivered OTP to {to_email!r} via port {port}")
            return True
        except smtplib.SMTPAuthenticationError as e:
            logger.error(
                f"[EMAIL] Gmail auth FAILED — GMAIL_APP_PASSWORD is wrong or missing.\n"
                f"  1. Enable 2-Step Verification: https://myaccount.google.com/security\n"
                f"  2. Generate App Password: https://myaccount.google.com/apppasswords\n"
                f"  3. Set GMAIL_APP_PASSWORD in Render → Environment (no spaces).\n"
                f"  Error detail: {e}"
            )
            return False  # Wrong password won't fix on retry
        except Exception as e:
            logger.warning(f"[EMAIL] Gmail port {port} failed: {e}")

    logger.error("[EMAIL] All Gmail SMTP attempts failed.")
    return False


# ── Method 2: Resend HTTP API (FALLBACK) ─────────────────────────────────────

def _send_via_resend(to_email: str, otp: str, purpose: str, api_key: str) -> bool:
    """
    Send via Resend HTTP API.
    ⚠️  With the shared 'onboarding@resend.dev' sender, Resend ONLY delivers
        to email addresses you have verified in your Resend dashboard.
        To send to ALL recipients, verify a custom domain at resend.com/domains.
    """
    import httpx

    from_addr = os.environ.get("RESEND_FROM", "Krishi AI <onboarding@resend.dev>").strip()

    subject_map = {
        "registration":   "Verify Your Krishi AI Account",
        "login":          "Your Krishi AI Sign-In Code",
        "password_reset": "Reset Your Krishi AI Password",
    }

    try:
        resp = httpx.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type":  "application/json",
            },
            json={
                "from":    from_addr,
                "to":      [to_email],
                "subject": subject_map.get(purpose, "Your Krishi AI Code"),
                "html":    _otp_html(otp, purpose),
                "text":    f"Your Krishi AI verification code: {otp}\nExpires in 10 minutes.",
            },
            timeout=20,
        )
        if resp.status_code in (200, 201):
            logger.info(f"[EMAIL] ✅ Resend delivered OTP to {to_email!r}")
            return True
        logger.error(f"[EMAIL] Resend error {resp.status_code}: {resp.text[:300]}")
        return False
    except Exception as e:
        logger.error(f"[EMAIL] Resend request failed: {e}")
        return False


# ── Public API ────────────────────────────────────────────────────────────────

def send_otp_email(to_email: str, otp: str, purpose: str = "registration") -> bool:
    """
    Send an OTP email to any recipient.

    Priority:
      1. Gmail SMTP  — GMAIL_USER + GMAIL_APP_PASSWORD set
                       ✅ Sends to ANY email address, works on Render free tier
      2. Resend API  — RESEND_API_KEY set
                       ⚠️  Shared sender only works for Resend-verified emails
      3. Console log — dev mode only (no credentials)
    """
    gmail_user   = os.environ.get("GMAIL_USER", "").strip()
    gmail_passwd = os.environ.get("GMAIL_APP_PASSWORD", "").replace(" ", "").strip()
    resend_key   = os.environ.get("RESEND_API_KEY", "").strip()

    # ── No credentials: dev-mode console fallback ─────────────────────────────
    if not gmail_user and not resend_key:
        logger.warning(f"[EMAIL DEV] No credentials set. OTP for {to_email!r}: {otp}")
        print(f"\n{'='*60}")
        print(f"  DEV OTP for {to_email}: {otp}  (purpose={purpose})")
        print(f"  To send real OTP emails on Render, add these env vars:")
        print(f"    GMAIL_USER         = yourgmail@gmail.com")
        print(f"    GMAIL_APP_PASSWORD = <16-char App Password>")
        print(f"  Get App Password: https://myaccount.google.com/apppasswords")
        print(f"{'='*60}\n")
        return True  # Don't block local dev

    result = [False]

    def _worker():
        # ── Priority 1: Gmail SMTP (any recipient, Render-compatible) ─────────
        if gmail_user and gmail_passwd:
            result[0] = _send_via_gmail(to_email, otp, purpose, gmail_user, gmail_passwd)
            if result[0]:
                return
            logger.warning("[EMAIL] Gmail failed — trying Resend as fallback...")

        # ── Priority 2: Resend fallback (restricted to verified recipients) ───
        if resend_key:
            result[0] = _send_via_resend(to_email, otp, purpose, resend_key)

    thread = threading.Thread(target=_worker, daemon=True)
    thread.start()
    thread.join(timeout=35)

    if thread.is_alive():
        logger.error("[EMAIL] Email thread timed out after 35s")
        return False

    return result[0]
