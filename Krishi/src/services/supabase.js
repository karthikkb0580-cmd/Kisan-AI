/**
 * supabase.js — DEPRECATED
 *
 * Authentication now uses our own backend OTP endpoints:
 *   POST /auth/register/send-otp  (step 1 — sends email)
 *   POST /auth/register/verify    (step 2 — verifies code, creates account)
 *
 * Supabase is no longer required. This file exports null to prevent
 * import errors in any legacy code that may still reference it.
 */
export const supabase = null
