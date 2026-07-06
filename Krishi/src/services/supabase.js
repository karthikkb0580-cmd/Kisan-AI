/**
 * supabase.js — Supabase client for Krishi AI
 *
 * Used ONLY for OTP email verification during registration (Get Started tab).
 * Login still uses our own backend with email + password.
 *
 * Setup:
 *   1. Go to https://supabase.com → Create project (free)
 *   2. Settings → API → copy Project URL and anon key
 *   3. Add to Krishi/.env:
 *        VITE_SUPABASE_URL=https://xxxx.supabase.co
 *        VITE_SUPABASE_ANON_KEY=eyJhbGci...
 *   4. In Supabase Dashboard → Authentication → Providers → Email
 *      • Enable "Email OTP" (disable "Email + Password" if you want OTP only)
 *      • Set OTP expiry to 600 seconds (10 min)
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  || ''
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnon) {
  console.warn(
    '[Supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set.\n' +
    'OTP registration will not work until you add these to Krishi/.env'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    // Don't persist Supabase session — we use our own JWT after registration
    persistSession: false,
    autoRefreshToken: false,
  },
})
