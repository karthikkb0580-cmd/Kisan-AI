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
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
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
    
    conn.commit()
    conn.close()

def create_user(full_name, email=None, phone=None, password_hash=None):
    conn = get_db_connection()
    cursor = get_cursor(conn)
    try:
        if IS_POSTGRES:
            cursor.execute(
                "INSERT INTO users (full_name, email, phone, password_hash) VALUES (%s, %s, %s, %s) RETURNING id",
                (full_name, email, phone, password_hash)
            )
            row = cursor.fetchone()
            user_id = row['id'] if row else None
        else:
            cursor.execute(
                "INSERT INTO users (full_name, email, phone, password_hash) VALUES (?, ?, ?, ?)",
                (full_name, email, phone, password_hash)
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
