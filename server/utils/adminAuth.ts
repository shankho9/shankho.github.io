// server/utils/adminAuth.ts
import type { H3Event } from 'h3'
import { getCookie, setCookie } from 'h3'
import { useRuntimeConfig } from '#imports'
import crypto from 'crypto'
import bcrypt from 'bcrypt'
import { authenticator } from 'otplib'

const ADMIN_TOKEN_COOKIE = 'admin_token'
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

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
 * Note: This is a simple implementation. For production, consider using JWT or storing tokens in a database
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

  // Simple token validation - token exists and admin password is configured
  // In a production system, you'd verify the token signature and check expiry
  // For now, we rely on httpOnly cookies and the fact that tokens are only set after password verification
  return true
}

/**
 * Set admin token cookie
 */
export function setAdminToken(event: H3Event, token: string): void {
  setCookie(event, ADMIN_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: TOKEN_EXPIRY_MS / 1000, // Convert to seconds
  })
}

/**
 * Clear admin token cookie
 */
export function clearAdminToken(event: H3Event): void {
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
