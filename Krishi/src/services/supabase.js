/**
 * supabase.js — Supabase Auth Client for Krishi AI
 *
 * Used for OTP email verification during registration.
 * Your Supabase project ID: xuziasvfbylirdgxvnpq
 *
 * ── Setup (one-time) ──────────────────────────────────────────────────────────
 * 1. Go to https://supabase.com/dashboard/project/xuziasvfbylirdgxvnpq
 * 2. Settings → API → copy "Project URL" and "anon / public" key
 * 3. Add as GitHub Secrets:
 *      VITE_SUPABASE_URL  = https://xuziasvfbylirdgxvnpq.supabase.co
 *      VITE_SUPABASE_ANON_KEY = eyJhbGci...  (anon key)
 *
 * ── Supabase Auth Settings ────────────────────────────────────────────────────
 * Dashboard → Authentication → Providers → Email:
 *   • Enable OTP (magic link) — or enable both Email OTP + Password
 *   • OTP expiry: 600 seconds (10 min)
 *   • Disable "Confirm email" redirect (we handle everything ourselves)
 *
 * ── Safety ───────────────────────────────────────────────────────────────────
 * createClient('', '') throws "supabaseUrl is required" and crashes the app.
 * We only create the client when real credentials are detected.
 * `supabase` will be null when not configured — all callers must guard this.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  || ''
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Only initialize when we have a real Supabase project URL
const isConfigured =
  supabaseUrl.startsWith('https://') &&
  supabaseUrl.includes('.supabase.co') &&
  supabaseAnon.startsWith('eyJ')    // all Supabase anon keys are JWTs

if (!isConfigured) {
  console.warn(
    '[Supabase] Not configured — OTP registration unavailable.\n' +
    'Add these GitHub Secrets to enable:\n' +
    '  VITE_SUPABASE_URL  = https://xuziasvfbylirdgxvnpq.supabase.co\n' +
    '  VITE_SUPABASE_ANON_KEY = <your anon key from Supabase → Settings → API>'
  )
}

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnon, {
      auth: {
        // Don't persist Supabase session — we issue our own JWT after registration
        persistSession:   false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : null

export const supabaseConfigured = isConfigured
