/**
 * Krishi AI — Backend API Service
 * All calls go to http://localhost:8000/api/v1
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

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
   * Register a new user. Backend sends OTP to email/phone.
   */
  register: (fullName, email, phone, password) =>
    apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        full_name: fullName,
        email: email || undefined,
        phone: phone || undefined,
        password,
      }),
    }),

  /**
   * Send OTP (channel = 'email' | 'sms', purpose = 'login' | 'registration' etc.)
   */
  sendOTP: (channel, contact, purpose = 'login') =>
    apiFetch('/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ channel, contact, purpose }),
    }),

  /**
   * Verify OTP for registration / secondary contact
   */
  verifyOTP: (channel, contact, code, purpose = 'registration') =>
    apiFetch('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ channel, contact, code, purpose }),
    }),

  /**
   * Password login — returns { access_token, refresh_token }
   */
  loginPassword: (identifier, password) =>
    apiFetch('/auth/login/password', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    }),

  /**
   * OTP login — returns { access_token, refresh_token }
   */
  loginOTP: (channel, contact, code) =>
    apiFetch('/auth/login/otp', {
      method: 'POST',
      body: JSON.stringify({ channel, contact, code }),
    }),

  /**
   * Get current user profile (requires auth token)
   */
  getMe: () => apiFetch('/auth/me'),

  /**
   * Request password reset OTP
   */
  requestReset: (channel, contact) =>
    apiFetch('/auth/password/reset', {
      method: 'POST',
      body: JSON.stringify({ channel, contact }),
    }),

  /**
   * Confirm password reset with OTP + new password
   */
  confirmReset: (channel, contact, code, newPassword) =>
    apiFetch('/auth/password/confirm', {
      method: 'POST',
      body: JSON.stringify({ channel, contact, code, new_password: newPassword }),
    }),

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
}

// ── Health check ──────────────────────────────────────────────────────────────

export const healthCheck = () => {
  const rootUrl = BASE_URL.replace(/\/api\/v\d+$/, '')
  return fetch(`${rootUrl}/health`).then((r) => r.json()).catch(() => null)
}
