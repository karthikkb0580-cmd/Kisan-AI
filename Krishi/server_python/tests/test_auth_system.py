"""
test_auth_system.py — Production auth system tests
====================================================
Run with:  python -m pytest tests/test_auth_system.py -v
Covers:
  - Unit: OTP generation, hashing, verification
  - Integration: registration flow, login flow
  - Security: rate limiting, OTP expiry, enumeration prevention
  - Rate limit tests
"""

from __future__ import annotations

import time
import pytest
from unittest.mock import patch, AsyncMock


# ════════════════════════════════════════════════════════════════════════
# UNIT TESTS — OTP Security module
# ════════════════════════════════════════════════════════════════════════

class TestOTPSecurity:
    def test_otp_is_6_digits(self):
        from app.security.otp_security import generate_otp
        otp = generate_otp()
        assert len(otp) == 6
        assert otp.isdigit()

    def test_otp_custom_length(self):
        from app.security.otp_security import generate_otp
        assert len(generate_otp(8)) == 8

    def test_otp_uniqueness(self):
        from app.security.otp_security import generate_otp
        otps = {generate_otp() for _ in range(100)}
        # With 6 digits (1M possibilities), 100 should all differ
        assert len(otps) > 95  # allow tiny collision probability

    def test_hash_is_not_plaintext(self):
        from app.security.otp_security import generate_otp, hash_otp
        otp = generate_otp()
        hashed = hash_otp(otp)
        assert otp not in hashed
        assert len(hashed) > 20  # Argon2 hashes are long

    def test_verify_correct_otp(self):
        from app.security.otp_security import generate_otp, hash_otp, verify_otp_hash
        otp = generate_otp()
        hashed = hash_otp(otp)
        assert verify_otp_hash(otp, hashed) is True

    def test_verify_wrong_otp(self):
        from app.security.otp_security import hash_otp, verify_otp_hash
        hashed = hash_otp("123456")
        assert verify_otp_hash("654321", hashed) is False

    def test_verify_tampered_hash(self):
        from app.security.otp_security import verify_otp_hash
        assert verify_otp_hash("123456", "not-a-valid-hash") is False

    def test_different_otps_produce_different_hashes(self):
        from app.security.otp_security import hash_otp
        h1 = hash_otp("111111")
        h2 = hash_otp("111111")
        # Argon2 adds random salt — same input produces different hashes
        assert h1 != h2

    def test_both_hashes_verify_correctly(self):
        from app.security.otp_security import hash_otp, verify_otp_hash
        h1 = hash_otp("111111")
        h2 = hash_otp("111111")
        assert verify_otp_hash("111111", h1) is True
        assert verify_otp_hash("111111", h2) is True


# ════════════════════════════════════════════════════════════════════════
# UNIT TESTS — Rate limiter
# ════════════════════════════════════════════════════════════════════════

class TestRateLimiter:
    def setup_method(self):
        # Import fresh windows for isolation
        from app.security.rate_limiter import SlidingWindow
        self.window = SlidingWindow()

    def test_allows_requests_under_limit(self):
        from fastapi import HTTPException
        try:
            for _ in range(5):
                self.window.hit("test_key", max_requests=10, window_secs=60)
        except HTTPException:
            pytest.fail("Should not raise under the limit")

    def test_blocks_at_limit(self):
        from fastapi import HTTPException
        for _ in range(10):
            self.window.hit("block_key", max_requests=10, window_secs=60)
        with pytest.raises(HTTPException) as exc_info:
            self.window.hit("block_key", max_requests=10, window_secs=60)
        assert exc_info.value.status_code == 429

    def test_lockout_triggers(self):
        from fastapi import HTTPException
        for _ in range(3):
            try:
                self.window.hit("lock_key", max_requests=3, window_secs=60, lockout_secs=900)
            except HTTPException:
                pass  # expected on hit 3+

        with pytest.raises(HTTPException) as exc_info:
            self.window.hit("lock_key", max_requests=3, window_secs=60, lockout_secs=900)
        detail = exc_info.value.detail
        assert "RATE_LIMIT" in (detail.get("code", "") if isinstance(detail, dict) else detail)

    def test_lockout_check(self):
        from app.security.rate_limiter import SlidingWindow
        w = SlidingWindow()
        w._lockout["my_key"] = time.time() + 900
        locked, remaining = w.is_locked("my_key")
        assert locked is True
        assert remaining > 0

    def test_expired_lockout_clears(self):
        from app.security.rate_limiter import SlidingWindow
        w = SlidingWindow()
        w._lockout["old_key"] = time.time() - 1  # already expired
        locked, _ = w.is_locked("old_key")
        assert locked is False


# ════════════════════════════════════════════════════════════════════════
# UNIT TESTS — Email template
# ════════════════════════════════════════════════════════════════════════

class TestEmailTemplate:
    def test_html_contains_otp(self):
        from app.services.otp_email import build_otp_email_html
        html = build_otp_email_html("123456", "registration")
        assert "123456" in html

    def test_html_contains_expiry(self):
        from app.services.otp_email import build_otp_email_html
        html = build_otp_email_html("000000", "login", expiry_minutes=5)
        assert "5 minutes" in html

    def test_html_no_header_injection(self):
        from app.services.otp_email import build_otp_email_html, _safe
        injected = "test\r\nBCC: evil@attacker.com"
        safe = _safe(injected)
        assert "\r" not in safe
        assert "\n" not in safe

    def test_all_purposes_render(self):
        from app.services.otp_email import build_otp_email_html
        for purpose in ["registration", "login", "password_reset", "verify_secondary"]:
            html = build_otp_email_html("000000", purpose)
            assert "000000" in html
            assert "Krishi AI" in html


# ════════════════════════════════════════════════════════════════════════
# INTEGRATION TESTS — Registration + OTP flow (in-memory DB)
# ════════════════════════════════════════════════════════════════════════

import anyio

@pytest.fixture(scope="module")
def test_client():
    """
    Synchronous wrapper around httpx.AsyncClient for the FastAPI ASGI app.
    ASGITransport only supports async; we run it via anyio.from_thread.
    """
    import os
    os.environ["DATABASE_URL"] = ""   # force SQLite
    os.environ["GMAIL_USER"] = ""      # disable real email delivery
    os.environ["JWT_SECRET"] = "test_secret_key_for_pytest_only"

    import httpx
    from main import app
    from app import database
    database.init_db()

    class SyncWrapper:
        """Calls async httpx routes synchronously via anyio.run."""

        def _call(self, method, *args, **kwargs):
            import anyio
            import httpx

            async def _inner():
                async with httpx.AsyncClient(
                    transport=httpx.ASGITransport(app=app),
                    base_url="http://testserver",
                ) as ac:
                    return await getattr(ac, method)(*args, **kwargs)

            return anyio.from_thread.run_sync(
                lambda: None  # ensure event loop available
            ) if False else __import__("asyncio").new_event_loop().run_until_complete(_inner())

        def get(self, *a, **k):    return self._call("get", *a, **k)
        def post(self, *a, **k):   return self._call("post", *a, **k)
        def patch(self, *a, **k):  return self._call("patch", *a, **k)
        def delete(self, *a, **k): return self._call("delete", *a, **k)

    return SyncWrapper()


class TestRegistrationFlow:
    def test_send_otp_returns_generic_message(self, test_client):
        resp = test_client.post("/api/v1/auth/register/send-otp", json={
            "full_name": "Test Farmer",
            "email": "newfarmer@example.com",
            "password": "securepass123",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "detail" in data
        # Generic message — doesn't leak whether email exists
        assert "email" not in data["detail"].lower() or "sent" in data["detail"].lower()

    def test_confirm_otp_with_wrong_code(self, test_client):
        resp = test_client.post("/api/v1/auth/register/confirm-otp", json={
            "email": "newfarmer@example.com",
            "code": "000000",
        })
        assert resp.status_code == 400

    def test_existing_email_returns_generic_response(self, test_client):
        """Email enumeration prevention: existing email gets same response."""
        resp1 = test_client.post("/api/v1/auth/register/send-otp", json={
            "full_name": "Test",
            "email": "demo@krishi.ai",   # seeded user
            "password": "somepass123",
        })
        assert resp1.status_code == 200
        # Same HTTP 200 regardless — enumeration prevented

    def test_password_too_short_rejected(self, test_client):
        resp = test_client.post("/api/v1/auth/register/send-otp", json={
            "full_name": "Test",
            "email": "short@example.com",
            "password": "12",
        })
        assert resp.status_code in (400, 422)

    def test_invalid_email_rejected(self, test_client):
        resp = test_client.post("/api/v1/auth/register/send-otp", json={
            "full_name": "Test",
            "email": "not-an-email",
            "password": "password123",
        })
        assert resp.status_code == 422


class TestLoginFlow:
    def test_login_seeded_user(self, test_client):
        resp = test_client.post("/api/v1/auth/login", json={
            "identifier": "demo@krishi.ai",
            "password": "password",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == "demo@krishi.ai"
        assert data["user"]["email_verified"] is True

    def test_login_wrong_password(self, test_client):
        resp = test_client.post("/api/v1/auth/login", json={
            "identifier": "demo@krishi.ai",
            "password": "wrongpassword",
        })
        assert resp.status_code == 401
        # Generic error message
        assert "email or password" in resp.json()["detail"].lower()

    def test_login_nonexistent_user(self, test_client):
        resp = test_client.post("/api/v1/auth/login", json={
            "identifier": "ghost@nobody.com",
            "password": "anything",
        })
        # Same 401 as wrong password — enumeration prevention
        assert resp.status_code == 401

    def test_me_endpoint_requires_auth(self, test_client):
        resp = test_client.get("/api/v1/auth/me")
        assert resp.status_code == 401

    def test_me_endpoint_with_token(self, test_client):
        login = test_client.post("/api/v1/auth/login", json={
            "identifier": "demo@krishi.ai",
            "password": "password",
        })
        token = login.json()["access_token"]
        resp = test_client.get("/api/v1/auth/me",
                               headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert resp.json()["email"] == "demo@krishi.ai"


class TestOTPExpiry:
    def test_expired_otp_fails(self, test_client):
        """OTPs stored with past expiry should fail verification."""
        from app import database
        from app.security.otp_security import hash_otp
        from datetime import datetime, timedelta

        # Manually insert an already-expired OTP
        conn = database.get_db_connection()
        cursor = database.get_cursor(conn)
        expired_at = (datetime.now() - timedelta(seconds=1)).isoformat()
        cursor.execute(
            "INSERT INTO secure_otps (email, otp_hash, purpose, expires_at) VALUES (?, ?, ?, ?)",
            ("expire@test.com", hash_otp("999999"), "registration", expired_at),
        )
        conn.commit()
        conn.close()

        resp = test_client.post("/api/v1/auth/register/confirm-otp", json={
            "email": "expire@test.com",
            "code": "999999",
        })
        assert resp.status_code == 400

    def test_used_otp_cannot_be_reused(self, test_client):
        """One-time use: mark an OTP used and verify it cannot be reused."""
        from app import database
        from app.security.otp_security import hash_otp
        from datetime import datetime, timedelta

        expires_at = (datetime.now() + timedelta(seconds=300)).isoformat()
        conn = database.get_db_connection()
        cursor = database.get_cursor(conn)
        cursor.execute(
            "INSERT INTO secure_otps (email, otp_hash, purpose, expires_at, used) VALUES (?, ?, ?, ?, 1)",
            ("used@test.com", hash_otp("123456"), "registration", expires_at),
        )
        conn.commit()
        conn.close()

        resp = test_client.post("/api/v1/auth/register/confirm-otp", json={
            "email": "used@test.com",
            "code": "123456",
        })
        assert resp.status_code == 400


class TestSecurityHeaders:
    def test_security_headers_present(self, test_client):
        resp = test_client.get("/health")
        assert resp.headers.get("X-Content-Type-Options") == "nosniff"


class TestSendOTPGenericResponse:
    def test_send_otp_for_unknown_email_is_generic(self, test_client):
        """Anti-enumeration: unknown email returns same HTTP 200 as known."""
        resp = test_client.post("/api/v1/auth/send-otp", json={
            "channel": "email",
            "contact": "completely_unknown_12345@noemail.com",
            "purpose": "login",
        })
        assert resp.status_code == 200
        # Same generic message
        assert "detail" in resp.json()
