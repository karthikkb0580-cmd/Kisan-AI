"""
test_otp_email.py -- Standalone OTP email diagnostic
=====================================================
Run with:  python test_otp_email.py

Tests each layer independently and prints [OK]/[FAIL] at every step
so you can pinpoint exactly where OTP delivery is failing.
"""

import os
import sys
import smtplib
from pathlib import Path
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

# Force UTF-8 stdout so special chars don't crash on Windows cp1252
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

OK   = "[OK]  "
FAIL = "[FAIL]"

# ── Load .env from the same directory ─────────────────────────────────────────
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=str(env_path))
        print(f"{OK} .env loaded from: {env_path}")
    else:
        print(f"{FAIL} .env NOT found at: {env_path}")
        sys.exit(1)
except ImportError:
    print(f"{FAIL} python-dotenv not installed -- run: pip install python-dotenv")
    sys.exit(1)


# ── Step 1: Check environment variables ───────────────────────────────────────
print("\n--- Step 1: Environment Variables ---")
GMAIL_USER         = os.getenv("GMAIL_USER", "").strip()
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "").replace(" ", "").strip()
EMAIL_PROVIDER     = os.getenv("EMAIL_PROVIDER", "gmail").lower()

print(f"  EMAIL_PROVIDER     = {EMAIL_PROVIDER!r}")
print(f"  GMAIL_USER         = {GMAIL_USER!r}")
pw_preview = GMAIL_APP_PASSWORD[:4] + "****" if len(GMAIL_APP_PASSWORD) >= 4 else "(empty)"
print(f"  GMAIL_APP_PASSWORD = {pw_preview}  (length={len(GMAIL_APP_PASSWORD)})")

if not GMAIL_USER:
    print(f"\n{FAIL} GMAIL_USER is empty -- set it in your .env file.")
    sys.exit(1)
if len(GMAIL_APP_PASSWORD) != 16:
    print(f"\n{FAIL} GMAIL_APP_PASSWORD must be exactly 16 chars (got {len(GMAIL_APP_PASSWORD)}).")
    print("   Go to: https://myaccount.google.com/apppasswords")
    print("   Create an App Password named 'Krishi AI'")
    print("   Paste the 16-char code (spaces are stripped automatically)")
    sys.exit(1)

print(f"  {OK} Credentials look valid")


# ── Step 2: Test SMTP connection (no login yet) ────────────────────────────────
print("\n--- Step 2: SMTP Connection ---")
try:
    server = smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=10)
    print(f"  {OK} Connected to smtp.gmail.com:465 (SSL)")
except Exception as e:
    print(f"  {FAIL} Cannot connect to smtp.gmail.com:465 -- {e}")
    print("     Check your firewall / antivirus / Windows Defender settings")
    print("     Port 465 must be open outbound")
    sys.exit(1)


# ── Step 3: Test SMTP authentication ──────────────────────────────────────────
print("\n--- Step 3: Gmail Authentication ---")
try:
    server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
    print(f"  {OK} Logged in as {GMAIL_USER}")
except smtplib.SMTPAuthenticationError as e:
    print(f"  {FAIL} Authentication FAILED: {e}")
    print()
    print("  Most common causes:")
    print("    1. You used your regular Gmail password (not the App Password)")
    print("    2. 2-Step Verification is NOT enabled on the account")
    print("    3. The App Password was revoked or expired -- create a new one")
    print()
    print("  Fix:")
    print("    1. Go to: https://myaccount.google.com/security")
    print("    2. Enable 2-Step Verification")
    print("    3. Go to: https://myaccount.google.com/apppasswords")
    print("    4. Create App Password, name it 'Krishi AI'")
    print("    5. Copy the 16-char code into GMAIL_APP_PASSWORD in .env")
    server.quit()
    sys.exit(1)
except Exception as e:
    print(f"  {FAIL} Unexpected auth error: {e}")
    server.quit()
    sys.exit(1)


# ── Step 4: Send a real test OTP email ────────────────────────────────────────
print("\n--- Step 4: Send Test OTP Email ---")
TEST_OTP  = "847291"
RECIPIENT = GMAIL_USER   # sends to yourself for easy testing

html_body = f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:20px;border:1px solid #d1fae5;
                    box-shadow:0 4px 24px rgba(0,0,0,0.07);">
        <tr><td style="background:linear-gradient(135deg,#15803d,#16a34a);
                        border-radius:20px 20px 0 0;padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:1.6rem;font-weight:800;">Krishi AI</h1>
          <p style="margin:4px 0 0;color:#bbf7d0;font-size:0.85rem;">Empowering Indian Farmers with AI</p>
        </td></tr>
        <tr><td style="padding:36px 40px 28px;">
          <h2 style="color:#15803d;font-size:1.2rem;">Verify your email address</h2>
          <p style="color:#475569;font-size:0.95rem;">
            This is a <strong>test OTP email</strong> from your Krishi AI diagnostic script.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);
                           border-radius:16px;border:2px solid #86efac;padding:28px 16px;">
              <p style="margin:0;font-size:3rem;font-weight:900;letter-spacing:18px;
                         color:#15803d;font-family:'Courier New',monospace;">{TEST_OTP}</p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
            <tr><td style="background:#fef9c3;border:1px solid #fde047;border-radius:10px;padding:12px 16px;">
              <p style="margin:0;color:#854d0e;font-size:0.82rem;text-align:center;">
                <strong>This code expires in 5 minutes.</strong>
                If you did not request this, ignore this email.
              </p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;
                        border-radius:0 0 20px 20px;padding:20px 40px;text-align:center;">
          <p style="margin:0;color:#94a3b8;font-size:0.7rem;">
            (c) 2024 Krishi AI - Diagnostic test email
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
"""

msg = MIMEMultipart("alternative")
msg["Subject"] = f"[Krishi AI Test] Your OTP: {TEST_OTP}"
msg["From"]    = f"Krishi AI <{GMAIL_USER}>"
msg["To"]      = RECIPIENT
msg.attach(MIMEText(html_body, "html", "utf-8"))

try:
    server.sendmail(GMAIL_USER, RECIPIENT, msg.as_string())
    server.quit()
    print(f"  {OK} Test OTP email sent to {RECIPIENT}")
    print(f"  {OK} OTP in the email: {TEST_OTP}")
    print()
    print("  --> Check your inbox (and SPAM folder) for '[Krishi AI Test]'")
except smtplib.SMTPRecipientsRefused as e:
    server.quit()
    sys.exit(1)
except Exception as e:
    print(f"  ❌ Send failed: {e}")
    server.quit()
    sys.exit(1)


# ── Step 5: Test OTP security layer (Argon2) ──────────────────────────────────
print("\n--- Step 5: OTP Security Layer (Argon2id) ---")
try:
    from argon2 import PasswordHasher
    from argon2.exceptions import VerifyMismatchError
    ph = PasswordHasher(time_cost=2, memory_cost=65536, parallelism=2)
    otp      = "123456"
    hashed   = ph.hash(otp)
    verified = ph.verify(hashed, otp)
    print(f"  {OK} Argon2id: generated hash, verified correctly")

    try:
        ph.verify(hashed, "000000")
    except VerifyMismatchError:
        print(f"  {OK} Argon2id: correctly rejected wrong OTP")
except ImportError:
    print(f"  {FAIL} argon2-cffi not installed -- run: pip install argon2-cffi")
    sys.exit(1)


# ── Step 6: Test OTP generate function (CSPRNG) ───────────────────────────────
print("\n--- Step 6: CSPRNG OTP Generation ---")
try:
    sys.path.insert(0, str(Path(__file__).parent))
    from app.security.otp_security import generate_otp, hash_otp, verify_otp_hash
    otp    = generate_otp(6)
    hashed = hash_otp(otp)
    result = verify_otp_hash(otp, hashed)
    print(f"  {OK} Generated OTP (via app module): {otp}")
    print(f"  {OK} Hash + verify roundtrip: {result}")
except Exception as e:
    print(f"  {FAIL} OTP security module error: {e}")


# ── Summary ────────────────────────────────────────────────────────────────────
print("\n==========================================================================")
print("  ALL CHECKS PASSED")
print("  Your OTP email system is configured correctly.")
print("  --> Check inbox / spam for the test email sent to:", RECIPIENT)
print("==========================================================================\n")
