import sqlite3
import os
from datetime import datetime, timedelta

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

IS_POSTGRES = DATABASE_URL is not None and DATABASE_URL.startswith("postgresql://")

if IS_POSTGRES:
    print("[DB] Using PostgreSQL database connection.")
else:
    print("[DB] Using local SQLite database connection.")

# DB file should remain in the root directory server_python
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "krishi.db")

def get_db_connection():
    if IS_POSTGRES:
        try:
            import psycopg2
        except ImportError:
            raise RuntimeError(
                "psycopg2 is required for PostgreSQL but is not installed. "
                "Either install it or remove DATABASE_URL to use SQLite."
            )
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    else:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

def get_cursor(conn):
    if IS_POSTGRES:
        try:
            from psycopg2.extras import RealDictCursor
        except ImportError:
            raise RuntimeError("psycopg2 not installed")
        return conn.cursor(cursor_factory=RealDictCursor)
    else:
        return conn.cursor()

def execute_query(cursor, sql, params=None):
    if IS_POSTGRES:
        sql = sql.replace("?", "%s")
        sql = sql.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY")
    if params:
        cursor.execute(sql, params)
    else:
        cursor.execute(sql)

def init_db():
    conn = get_db_connection()
    cursor = get_cursor(conn)

    # Users table
    execute_query(cursor, """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            email TEXT UNIQUE,
            phone TEXT UNIQUE,
            password_hash TEXT,
            profile_photo_url TEXT,
            email_verified INTEGER DEFAULT 0,
            phone_verified INTEGER DEFAULT 0,
            totp_secret TEXT,
            totp_enabled INTEGER DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Migrate: silently add columns added after initial schema
    for col_sql in [
        "ALTER TABLE users ADD COLUMN totp_secret TEXT",
        "ALTER TABLE users ADD COLUMN totp_enabled INTEGER DEFAULT 0",
        "ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
    ]:
        try:
            execute_query(cursor, col_sql)
        except Exception:
            pass

    # Legacy OTPs table (kept for backward compat)
    execute_query(cursor, """
        CREATE TABLE IF NOT EXISTS otps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contact TEXT NOT NULL,
            code TEXT NOT NULL,
            purpose TEXT NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            verified INTEGER DEFAULT 0
        )
    """)

    # ── SECURE OTPs table ─────────────────────────────────────────────────
    # Production table: stores Argon2-hashed OTPs, tracks attempts & IP
    execute_query(cursor, """
        CREATE TABLE IF NOT EXISTS secure_otps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            email TEXT NOT NULL,
            otp_hash TEXT NOT NULL,
            purpose TEXT NOT NULL,
            ip_address TEXT,
            user_agent TEXT,
            attempts INTEGER DEFAULT 0,
            used INTEGER DEFAULT 0,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    # ── Rate limit log table ──────────────────────────────────────────────
    execute_query(cursor, """
        CREATE TABLE IF NOT EXISTS rate_limit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT,
            ip_address TEXT,
            event_type TEXT NOT NULL,
            details TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # ── Pending registrations (unchanged) ─────────────────────────────────
    execute_query(cursor, """
        CREATE TABLE IF NOT EXISTS pending_registrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            full_name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            expires_at TIMESTAMP NOT NULL
        )
    """)

    conn.commit()
    conn.close()

def create_user(full_name, email=None, phone=None, password_hash=None, totp_secret=None):
    conn = get_db_connection()
    cursor = get_cursor(conn)
    try:
        if IS_POSTGRES:
            cursor.execute(
                "INSERT INTO users (full_name, email, phone, password_hash, totp_secret) VALUES (%s, %s, %s, %s, %s) RETURNING id",
                (full_name, email, phone, password_hash, totp_secret)
            )
            row = cursor.fetchone()
            user_id = row['id'] if row else None
        else:
            cursor.execute(
                "INSERT INTO users (full_name, email, phone, password_hash, totp_secret) VALUES (?, ?, ?, ?, ?)",
                (full_name, email, phone, password_hash, totp_secret)
            )
            user_id = cursor.lastrowid
        conn.commit()
        return user_id
    except Exception as e:
        err_msg = str(e).lower()
        if "unique" in err_msg or "duplicate" in err_msg or "integrity" in err_msg:
            return None
        raise e
    finally:
        conn.close()

def get_user_by_id(user_id):
    conn = get_db_connection()
    cursor = get_cursor(conn)
    execute_query(cursor, "SELECT * FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_user_by_email(email):
    if not email:
        return None
    conn = get_db_connection()
    cursor = get_cursor(conn)
    execute_query(cursor, "SELECT * FROM users WHERE email = ?", (email,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_user_by_phone(phone):
    if not phone:
        return None
    conn = get_db_connection()
    cursor = get_cursor(conn)
    execute_query(cursor, "SELECT * FROM users WHERE phone = ?", (phone,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def update_user_verification(user_id, email_verified=None, phone_verified=None):
    conn = get_db_connection()
    cursor = get_cursor(conn)
    if email_verified is not None:
        execute_query(cursor, "UPDATE users SET email_verified = ? WHERE id = ?", (1 if email_verified else 0, user_id))
    if phone_verified is not None:
        execute_query(cursor, "UPDATE users SET phone_verified = ? WHERE id = ?", (1 if phone_verified else 0, user_id))
    conn.commit()
    conn.close()

def update_user_totp(user_id, totp_secret=None, totp_enabled=None):
    conn = get_db_connection()
    cursor = get_cursor(conn)
    if totp_secret is not None:
        execute_query(cursor, "UPDATE users SET totp_secret = ? WHERE id = ?", (totp_secret, user_id))
    if totp_enabled is not None:
        execute_query(cursor, "UPDATE users SET totp_enabled = ? WHERE id = ?", (1 if totp_enabled else 0, user_id))
    conn.commit()
    conn.close()

def update_user_profile(user_id, full_name=None, phone=None, email=None,
                        profile_photo_url=None, password_hash=None):
    conn = get_db_connection()
    cursor = get_cursor(conn)
    updates = []
    params = []

    if full_name is not None:
        updates.append("full_name = ?")
        params.append(full_name)
    if phone is not None:
        updates.append("phone = ?")
        params.append(phone)
    if email is not None:
        updates.append("email = ?")
        params.append(email)
    if profile_photo_url is not None:
        updates.append("profile_photo_url = ?")
        params.append(profile_photo_url)
    if password_hash is not None:
        updates.append("password_hash = ?")
        params.append(password_hash)

    if updates:
        params.append(user_id)
        sql = f"UPDATE users SET {', '.join(updates)} WHERE id = ?"
        execute_query(cursor, sql, tuple(params))
        conn.commit()
    conn.close()

def save_otp(contact, code, purpose, expires_in_seconds=300):
    conn = get_db_connection()
    cursor = get_cursor(conn)
    # Delete old unexpired OTPs for the same contact and purpose
    execute_query(cursor, "DELETE FROM otps WHERE contact = ? AND purpose = ?", (contact, purpose))
    
    expires_at = datetime.now() + timedelta(seconds=expires_in_seconds)
    execute_query(cursor,
        "INSERT INTO otps (contact, code, purpose, expires_at) VALUES (?, ?, ?, ?)",
        (contact, code, purpose, expires_at.isoformat())
    )
    conn.commit()
    conn.close()

def verify_otp(contact, code, purpose):
    conn = get_db_connection()
    cursor = get_cursor(conn)
    now = datetime.now().isoformat()
    execute_query(cursor,
        "SELECT * FROM otps WHERE contact = ? AND code = ? AND purpose = ? AND expires_at > ? AND verified = 0",
        (contact, code, purpose, now)
    )
    row = cursor.fetchone()
    
    if row:
        # Mark OTP as verified (or delete it)
        execute_query(cursor, "UPDATE otps SET verified = 1 WHERE id = ?", (row['id'],))
        conn.commit()
        conn.close()
        return True
    
    conn.close()
    return False


# ── Pending Registration helpers ──────────────────────────────────────────────

def upsert_pending_registration(email: str, full_name: str, password_hash: str, ttl_seconds: int = 600):
    """Store or replace a pending registration row (expires in ttl_seconds)."""
    conn = get_db_connection()
    cursor = get_cursor(conn)
    expires_at = (datetime.now() + timedelta(seconds=ttl_seconds)).isoformat()
    # Delete any existing row for this email first
    execute_query(cursor, "DELETE FROM pending_registrations WHERE email = ?", (email,))
    execute_query(
        cursor,
        "INSERT INTO pending_registrations (email, full_name, password_hash, expires_at) VALUES (?, ?, ?, ?)",
        (email, full_name, password_hash, expires_at),
    )
    conn.commit()
    conn.close()


def get_pending_registration(email: str):
    """Return non-expired pending registration row or None."""
    conn = get_db_connection()
    cursor = get_cursor(conn)
    now = datetime.now().isoformat()
    execute_query(
        cursor,
        "SELECT * FROM pending_registrations WHERE email = ? AND expires_at > ?",
        (email, now),
    )
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def delete_pending_registration(email: str):
    """Remove the pending registration row after successful account creation."""
    conn = get_db_connection()
    cursor = get_cursor(conn)
    execute_query(cursor, "DELETE FROM pending_registrations WHERE email = ?", (email,))
    conn.commit()
    conn.close()


# ── Secure OTP helpers ────────────────────────────────────────────────────────

def create_secure_otp(email: str, otp_hash: str, purpose: str,
                      ip_address: str = "", user_agent: str = "",
                      expires_in_seconds: int = 300,
                      user_id: int = None) -> int:
    """
    Invalidate any existing OTPs for this email+purpose, then create a new one.
    Returns the new OTP row id.
    """
    conn = get_db_connection()
    cursor = get_cursor(conn)

    # Invalidate all previous OTPs for this email + purpose (one-time use, replace)
    execute_query(cursor,
        "UPDATE secure_otps SET used = 1 WHERE email = ? AND purpose = ? AND used = 0",
        (email, purpose),
    )

    expires_at = (datetime.now() + timedelta(seconds=expires_in_seconds)).isoformat()

    if IS_POSTGRES:
        cursor.execute(
            """INSERT INTO secure_otps
               (user_id, email, otp_hash, purpose, ip_address, user_agent, expires_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id""",
            (user_id, email, otp_hash, purpose, ip_address, user_agent, expires_at),
        )
        row = cursor.fetchone()
        new_id = row["id"] if row else None
    else:
        cursor.execute(
            """INSERT INTO secure_otps
               (user_id, email, otp_hash, purpose, ip_address, user_agent, expires_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (user_id, email, otp_hash, purpose, ip_address, user_agent, expires_at),
        )
        new_id = cursor.lastrowid

    conn.commit()
    conn.close()
    return new_id


def get_active_secure_otp(email: str, purpose: str) -> dict | None:
    """Return the most recent non-expired, non-used OTP row for this email+purpose."""
    conn = get_db_connection()
    cursor = get_cursor(conn)
    now = datetime.now().isoformat()
    execute_query(
        cursor,
        """SELECT * FROM secure_otps
           WHERE email = ? AND purpose = ? AND used = 0 AND expires_at > ?
           ORDER BY created_at DESC LIMIT 1""",
        (email, purpose, now),
    )
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def increment_otp_attempt(otp_id: int) -> int:
    """Increment attempts counter; return new attempt count."""
    conn = get_db_connection()
    cursor = get_cursor(conn)
    execute_query(cursor,
        "UPDATE secure_otps SET attempts = attempts + 1 WHERE id = ?",
        (otp_id,),
    )
    execute_query(cursor, "SELECT attempts FROM secure_otps WHERE id = ?", (otp_id,))
    row = cursor.fetchone()
    conn.commit()
    conn.close()
    return dict(row).get("attempts", 1) if row else 1


def mark_otp_used(otp_id: int) -> None:
    """Mark OTP as used (one-time use enforcement)."""
    conn = get_db_connection()
    cursor = get_cursor(conn)
    execute_query(cursor,
        "UPDATE secure_otps SET used = 1 WHERE id = ?", (otp_id,))
    conn.commit()
    conn.close()


def purge_expired_otps() -> None:
    """Delete all expired OTPs — call periodically for hygiene."""
    conn = get_db_connection()
    cursor = get_cursor(conn)
    now = datetime.now().isoformat()
    execute_query(cursor,
        "DELETE FROM secure_otps WHERE expires_at < ? OR used = 1", (now,))
    conn.commit()
    conn.close()


# ── Rate limit log helpers ────────────────────────────────────────────────────

def log_rate_limit_event(event_type: str, email: str = "", ip_address: str = "",
                         details: str = "") -> None:
    """Persist a rate-limit / suspicious-activity event to the DB."""
    conn = get_db_connection()
    cursor = get_cursor(conn)
    try:
        execute_query(cursor,
            """INSERT INTO rate_limit_log (email, ip_address, event_type, details)
               VALUES (?, ?, ?, ?)""",
            (email, ip_address, event_type, details),
        )
        conn.commit()
    except Exception:
        pass  # Never crash the app over audit logging
    finally:
        conn.close()

