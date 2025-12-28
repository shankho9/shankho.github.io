// server/utils/adminAuth.ts
import type { H3Event } from 'h3'
import { getCookie, setCookie } from 'h3'
import { useRuntimeConfig } from '#imports'
import crypto from 'crypto'
import bcrypt from 'bcrypt'
import { authenticator } from 'otplib'

const ADMIN_TOKEN_COOKIE = 'admin_token'
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

// In-memory token store: token -> { createdAt: timestamp, expiresAt: timestamp }
// In production, consider using Redis or a database for distributed systems
const tokenStore = new Map<string, { createdAt: number; expiresAt: number }>()

// Guard flag to ensure cleanup interval is only initialized once
let cleanupIntervalInitialized = false

// Clean up expired tokens periodically (every hour)
// Only run cleanup in Node.js runtime environment (not during build)
// Guard ensures interval is only created once, even if module is imported multiple times
// IMPORTANT: Only initialize in serverless function context, not during build/prerender
// During build, NITRO_PRESET is set by Nitro - this is the reliable indicator
// We only check environment variables, not process.argv, to avoid false positives
// (e.g., paths containing 'nuxt' or 'build' would incorrectly trigger this)
const isBuildContext = !!process.env.NITRO_PRESET

if (
  typeof process !== 'undefined' &&
  typeof setInterval !== 'undefined' &&
  !cleanupIntervalInitialized &&
  !isBuildContext
) {
  cleanupIntervalInitialized = true
  const interval = setInterval(
    () => {
      const now = Date.now()
      for (const [token, data] of tokenStore.entries()) {
        if (now > data.expiresAt) {
          tokenStore.delete(token)
        }
      }
    },
    60 * 60 * 1000,
  ) // Every hour

  // Unref the interval so it doesn't prevent Node.js from exiting
  // This is important for build processes that should exit after completion
  if (typeof interval.unref === 'function') {
    interval.unref()
  }
}

// Configure TOTP
authenticator.options = {
  window: [1, 1], // Allow 1 time step before and after current time
}

/**
 * Generate a secure token for admin authentication
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Verify admin password (encrypted) and 2FA code
 */
export async function verifyAdminPassword(
  password: string,
  totpCode: string | null,
): Promise<{ valid: boolean; requires2FA: boolean; token?: string }> {
  const config = useRuntimeConfig()
  const adminPasswordHash = config.adminPasswordHash || process.env.ADMIN_PASSWORD_HASH
  const admin2FASecret = config.admin2FASecret || process.env.ADMIN_2FA_SECRET

  if (!adminPasswordHash) {
    console.warn('[AdminAuth] ADMIN_PASSWORD_HASH not configured')
    return { valid: false, requires2FA: false }
  }

  // Verify password using bcrypt
  const passwordValid = await bcrypt.compare(password, adminPasswordHash)

  if (!passwordValid) {
    return { valid: false, requires2FA: false }
  }

  // Check if 2FA is configured
  if (admin2FASecret) {
    // If 2FA is configured, require TOTP code
    if (!totpCode) {
      return { valid: false, requires2FA: true }
    }

    // Verify TOTP code
    const totpValid = authenticator.check(totpCode, admin2FASecret)

    if (!totpValid) {
      return { valid: false, requires2FA: true }
    }
  }

  // Password (and 2FA if configured) are valid
  return { valid: true, requires2FA: !!admin2FASecret, token: generateToken() }
}

/**
 * Verify if the request has a valid admin token
 * Validates token existence, expiry, and authenticity
 */
export function verifyAdminToken(event: H3Event): boolean {
  const config = useRuntimeConfig()
  const adminPasswordHash = config.adminPasswordHash || process.env.ADMIN_PASSWORD_HASH

  if (!adminPasswordHash) {
    return false
  }

  const token = getCookie(event, ADMIN_TOKEN_COOKIE)
  if (!token) {
    return false
  }

  // Validate token exists in store
  const tokenData = tokenStore.get(token)
  if (!tokenData) {
    return false
  }

  // Check if token has expired
  const now = Date.now()
  if (now > tokenData.expiresAt) {
    // Token expired, remove it from store
    tokenStore.delete(token)
    return false
  }

  // Token is valid
  return true
}

/**
 * Set admin token cookie and store token with expiry
 */
export function setAdminToken(event: H3Event, token: string): void {
  const now = Date.now()
  const expiresAt = now + TOKEN_EXPIRY_MS

  // Store token with expiry information
  tokenStore.set(token, {
    createdAt: now,
    expiresAt,
  })

  setCookie(event, ADMIN_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: TOKEN_EXPIRY_MS / 1000, // Convert to seconds
  })
}

/**
 * Clear admin token cookie and remove from store
 */
export function clearAdminToken(event: H3Event): void {
  const token = getCookie(event, ADMIN_TOKEN_COOKIE)
  if (token) {
    tokenStore.delete(token)
  }

  setCookie(event, ADMIN_TOKEN_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
  })
}

/**
 * Check if 2FA is configured
 */
export function is2FAConfigured(): boolean {
  const config = useRuntimeConfig()
  const admin2FASecret = config.admin2FASecret || process.env.ADMIN_2FA_SECRET
  return !!admin2FASecret
}
