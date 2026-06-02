# Krishi AI - Precision Agriculture & Disease Diagnostics

Krishi AI is a high-performance, security-hardened agricultural intelligence platform designed to empower farmers with instant, high-fidelity plant pathology diagnostics. By combining React/Vite with a secure **Python FastAPI** microservice architecture, the platform delivers real-time leaf analysis, agronomic treatment plans, and location-aware expert connections.

---

## 🛡️ Security & Architectural Hardening

The backend of Krishi AI has been migrated from Node.js to **FastAPI (Python 3.14+)** to establish an enterprise-grade security posture. The core security features include:

1. **Cryptographical Hashing**: All user passwords are dynamically salted and hashed using `bcrypt` (12 work factors) to protect credentials at rest.
2. **In-Memory Rate Limiting**: Lightweight, high-performance in-memory rate limiters protect the `/api/auth/send-otp` (5 requests/min) and `/api/auth/login` (10 requests/min) endpoints, preventing Brute-Force and Denial of Service (DoS) attacks without requiring heavy Redis dependencies.
3. **Pydantic Data Sanitization**: Strict input schemas and format validation via regular expressions block SQL injections, command injections, and malformed payload crashes before code execution.
4. **Parameter-Bound SQL Queries**: Fully parameterized SQLite operations prevent SQL Injection vulnerabilities completely.
5. **Secure Browser HTTP Headers**: Integrated middleware automatically injects defense-in-depth headers into every response:
   - `X-Frame-Options: DENY` (Mitigates Clickjacking)
   - `X-Content-Type-Options: nosniff` (Mitigates MIME sniffing)
   - `X-XSS-Protection: 1; mode=block` (Blocks Cross-Site Scripting)
   - `Content-Security-Policy` (Restricts frame execution and source trusted domains)
   - `Referrer-Policy: strict-origin-when-cross-origin`
6. **Robust Environment Exclusion**: Centralized `.gitignore` patterns strictly exclude SQLite `.db` databases and private `.env` configuration files to prevent credential theft.

---

## 🔑 OTP Delivery & Sandbox Fallback

### The "OTP Not Sending" Root Cause
If you noticed that OTP verification codes were not being delivered during local testing with the old Node.js backend, it was due to a strict **Resend API Security Restriction**:
- On the free/testing tier of Resend, you are **only permitted to send emails to your registered account owner address** (`opkarthik2005@gmail.com`).
- Trying to sign up with any other email address would result in a `403 Forbidden` API rejection.
- The Node.js server crashed or returned `502 Bad Gateway` when this happened, halting the entire user registration flow.

### The FastAPI Developer Solution
Our Python backend introduces a **Graceful Sandbox Fallback**:
- When the Resend API rejects an email (due to testing sandbox limitations, missing variables, or unverified domains), **the server intercepts the warning gracefully and prints the generated OTP inside a high-visibility console box on your backend terminal!**
- The server then returns a `200 OK` status with a developer notification, allowing you to instantly grab the code from your server console and proceed with testing.
- *Real email delivery will still succeed automatically if you register using the owner email or verify a custom domain in your Resend account dashboard.*

---

## 🚀 Setup & Execution Guide

### 1. Backend Server (Python FastAPI)

The Python server resides in the `server_python` directory.

```bash
# 1. Navigate to the python server directory
cd server_python

# 2. Install all required dependencies
pip install -r requirements.txt

# 3. Start the FastAPI development server
python main.py
```

The server will initialize the SQLite database securely and bind to `http://localhost:5000`. You can monitor live, colored, and secure API event logs directly in your terminal console!

#### Server Environment Settings (`server_python/.env`)
Copy your existing keys or configure them inside your local environment:
```env
PORT=5000
RESEND_API_KEY=re_your_resend_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

---

### 2. Frontend Application (React/Vite)

The main React application resides in the root directory.

```bash
# 1. Install frontend node modules
npm install

# 2. Start the Vite hot-reloading dev server
npm run dev
```

The frontend will start up and run on `http://localhost:5173`. It is configured to forward backend calls directly to the FastAPI server at `http://localhost:5000`.

---

## 🌿 Technical Stack Summary

- **Frontend**: React 18, Vite, HSL-themed TailwindCSS / Vanilla CSS styling.
- **Backend**: Python 3.14+, FastAPI, Uvicorn (StatReload server engine).
- **Security**: Bcrypt, Starlette Security Middleware, custom IP Rate Limiters.
- **Integrations**: Google Gemini 1.5 Flash REST client, Resend REST API, Twilio REST API.
- **Database**: Thread-safe SQLite relational database.
