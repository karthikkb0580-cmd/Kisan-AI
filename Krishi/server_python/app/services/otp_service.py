import os
import httpx
from app.config import RESEND_API_KEY

async def send_otp(channel: str, contact: str, code: str, purpose: str) -> None:
    """
    Prints OTP to terminal (dev fallback).
    If RESEND_API_KEY is set and doesn't look like a placeholder,
    also attempts to email the code via Resend.
    """
    sep = "-" * 56
    print(f"\n+{sep}+")
    print(f"|  [DEV] OTP for {contact}")
    print(f"|  Channel : {channel.upper()}")
    print(f"|  Purpose : {purpose.upper()}")
    print(f"|  Code    : {code}   <-- copy this")
    print(f"+{sep}+\n")

    resend_key = RESEND_API_KEY
    if channel == "email" and resend_key and not resend_key.startswith("re_your"):
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                r = await client.post(
                    "https://api.resend.com/emails",
                    headers={"Authorization": f"Bearer {resend_key}",
                             "Content-Type": "application/json"},
                    json={
                        "from": "Krishi AI <onboarding@resend.dev>",
                        "to": contact,
                        "subject": f"Your Krishi AI OTP: {code}",
                        "html": (
                            f"<p>Hi,</p>"
                            f"<p>Your <strong>{purpose}</strong> OTP is:</p>"
                            f"<h1 style='letter-spacing:6px'>{code}</h1>"
                            f"<p>Valid for 5 minutes. Do not share it.</p>"
                        ),
                    },
                )
                if r.status_code in (200, 201):
                    print(f"[Resend] Email delivered to {contact}")
                else:
                    print(f"[Resend] Failed ({r.status_code}): {r.text}")
        except Exception as exc:
            print(f"[Resend] Error: {exc}")
