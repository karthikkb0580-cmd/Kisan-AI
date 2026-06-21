"""
otp_security.py — Cryptographically secure OTP generation and hashing
=======================================================================
• Generates OTPs using secrets.SystemRandom (CSPRNG) — OWASP compliant.
• Hashes OTPs with Argon2id before storage — never stored in plaintext.
• Constant-time comparison for verification to prevent timing attacks.
"""

from __future__ import annotations

import secrets
import logging
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError

logger = logging.getLogger("krishi.security")

# Argon2id with OWASP-recommended parameters (INTERACTIVE profile)
_ph = PasswordHasher(
    time_cost=2,         # iterations
    memory_cost=65536,   # 64 MiB
    parallelism=2,
    hash_len=32,
    salt_len=16,
)


def generate_otp(length: int = 6) -> str:
    """Generate a cryptographically secure numeric OTP."""
    # secrets.SystemRandom uses os.urandom — CSPRNG guaranteed
    rng = secrets.SystemRandom()
    digits = "".join(str(rng.randint(0, 9)) for _ in range(length))
    return digits


def hash_otp(otp: str) -> str:
    """Hash the OTP with Argon2id for safe database storage."""
    return _ph.hash(otp)


def verify_otp_hash(otp: str, hashed: str) -> bool:
    """
    Constant-time Argon2id verification.
    Returns True if OTP matches, False otherwise — never raises to caller.
    """
    try:
        return _ph.verify(hashed, otp)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False
    except Exception as exc:
        logger.error("[OTPSecurity] Unexpected verify error: %s", exc)
        return False
