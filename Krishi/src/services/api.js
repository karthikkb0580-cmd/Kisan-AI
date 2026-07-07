/**
 * Krishi AI — Backend API Service
 *
 * URL resolution order:
 *  1. VITE_API_URL env var (set via GitHub Actions secret — preferred)
 *  2. Localhost for local development
 *
 * To configure production URL:
 *   GitHub repo → Settings → Secrets → Actions → VITE_API_URL
 *   Value: https://your-service.onrender.com/api/v1
 */

const getBaseUrl = () => {
  // Injected at build time by GitHub Actions from the VITE_API_URL secret
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  // Local development fallback
  return 'http://localhost:8000/api/v1'
}

const BASE_URL = getBaseUrl()

// ── Token management ──────────────────────────────────────────────────────────

export const TokenStore = {
  getAccess: () => localStorage.getItem('krishi_access_token'),
  getRefresh: () => localStorage.getItem('krishi_refresh_token'),
  set: (access, refresh) => {
    localStorage.setItem('krishi_access_token', access)
    if (refresh) localStorage.setItem('krishi_refresh_token', refresh)
  },
  clear: () => {
    localStorage.removeItem('krishi_access_token')
    localStorage.removeItem('krishi_refresh_token')
    localStorage.removeItem('krishi_user')
  },
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────

async function apiFetch(path, options = {}, retry = true) {
  const token = TokenStore.getAccess()
  // Do NOT set Content-Type for FormData — browser sets it with the correct multipart boundary
  const isFormData = options.body instanceof FormData
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  // Auto-refresh on 401
  if (res.status === 401 && retry) {
    const refreshToken = TokenStore.getRefresh()
    if (refreshToken) {
      const refreshed = await refreshAccessToken(refreshToken)
      if (refreshed) return apiFetch(path, options, false)
    }
    TokenStore.clear()
    throw new APIError(401, 'Session expired. Please log in again.')
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    let errMsg = 'Something went wrong.'
    if (typeof data.detail === 'string') {
      errMsg = data.detail
    } else if (Array.isArray(data.detail)) {
      errMsg = data.detail.map(err => {
        const field = err.loc && err.loc.length > 1 ? err.loc[err.loc.length - 1] : ''
        return `${field ? field + ': ' : ''}${err.msg}`
      }).join(', ')
    }
    throw new APIError(res.status, errMsg)
  }
  return data
}

async function refreshAccessToken(refreshToken) {
  try {
    const res = await fetch(`${BASE_URL}/auth/token/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    if (!res.ok) return false
    const data = await res.json()
    TokenStore.set(data.access_token, data.refresh_token)
    return true
  } catch {
    return false
  }
}

// ── Custom error class ────────────────────────────────────────────────────────

export class APIError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
    this.name = 'APIError'
  }
}

// ── Auth API ──────────────────────────────────────────────────────────────────

export const AuthAPI = {
  /**
   * Supabase OTP registration — after Supabase verifies the email OTP,
   * send the Supabase access token + user details to our backend.
   * payload = { supabase_token, full_name, password }
   * Returns { access_token, refresh_token, user }
   */
  registerSupabase: (payload) =>
    apiFetch('/auth/register/supabase', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /**
   * Login with email and password — returns { access_token, refresh_token, user }
   * payload = { email, password }
   */
  login: (payload) =>
    apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /**
   * Get current user profile (requires auth token)
   */
  getMe: () => apiFetch('/auth/me'),

  /**
   * Logout (clears local tokens)
   */
  logout: () => {
    TokenStore.clear()
    return Promise.resolve()
  },
}

// ── Users API ─────────────────────────────────────────────────────────────────

export const UsersAPI = {
  updateProfile: (data) =>
    apiFetch('/users/me', { method: 'PATCH', body: JSON.stringify(data) }),

  uploadPhoto: (file) => {
    const form = new FormData()
    form.append('file', file)
    return apiFetch('/users/me/photo', {
      method: 'POST',
      headers: { Authorization: `Bearer ${TokenStore.getAccess()}` },
      body: form,
    })
  },

  sendContactVerifyOTP: (channel, contact) =>
    apiFetch('/users/me/verify-contact/send', {
      method: 'POST',
      body: JSON.stringify({ channel, contact, purpose: 'verify_secondary' }),
    }),

  confirmContactVerifyOTP: (channel, contact, code) =>
    apiFetch('/users/me/verify-contact/confirm', {
      method: 'POST',
      body: JSON.stringify({ channel, contact, code, purpose: 'verify_secondary' }),
    }),
}

// ── AI API ────────────────────────────────────────────────────────────────────

export const AIAPI = {
  chat: (message, history = [], language = 'en') =>
    apiFetch('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history, language }),
    }),

  diagnose: (imageFile, cropName, description, location, language = 'en') => {
    const form = new FormData()
    form.append('image', imageFile)
    form.append('crop_name', cropName)
    if (description) form.append('description', description)
    if (location) form.append('location', location)
    form.append('language', language)
    return apiFetch('/ai/diagnose', {
      method: 'POST',
      headers: { Authorization: `Bearer ${TokenStore.getAccess()}` },
      body: form,
    })
  },

  marketPrice: (cropName, location, language = 'en') =>
    apiFetch('/ai/market-price', {
      method: 'POST',
      body: JSON.stringify({ crop_name: cropName, location, language }),
    }),

  weatherAdvisory: (location, cropName, language = 'en') =>
    apiFetch('/ai/weather-advisory', {
      method: 'POST',
      body: JSON.stringify({ location, crop_name: cropName, language }),
    }),

  analyzeMarkets: (markets, cropName, language = 'en') =>
    apiFetch('/ai/analyze-markets', {
      method: 'POST',
      body: JSON.stringify({ markets, crop_name: cropName, language }),
    }),
}

// ── Health check ──────────────────────────────────────────────────────────────

export const healthCheck = () => {
  const rootUrl = BASE_URL.replace(/\/api\/v\d+$/, '')
  return fetch(`${rootUrl}/health`).then((r) => r.json()).catch(() => null)
}
