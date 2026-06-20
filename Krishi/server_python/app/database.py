import sqlite3
import os
from datetime import datetime, timedelta

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

IS_POSTGRES = DATABASE_URL is not None and DATABASE_URL.startswith("postgresql://")

if IS_POSTGRES:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    print("[DB] Using PostgreSQL database connection.")
else:
    print("[DB] Using local SQLite database connection.")

# DB file should remain in the root directory server_python
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "krishi.db")

def get_db_connection():
    if IS_POSTGRES:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    else:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

def get_cursor(conn):
    if IS_POSTGRES:
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
    
    # Create users table
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
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Migrate: add totp columns if they don't exist (for existing DBs)
    try:
        execute_query(cursor, "ALTER TABLE users ADD COLUMN totp_secret TEXT")
    except Exception:
        pass
    try:
        execute_query(cursor, "ALTER TABLE users ADD COLUMN totp_enabled INTEGER DEFAULT 0")
    except Exception:
        pass
    
    # Create otps table
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

    # Pending registrations — holds data until OTP is confirmed
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
