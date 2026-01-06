// server/utils/auth.ts
import type { H3Event } from 'h3'
import { getCookie, setCookie, deleteCookie, getHeader } from 'h3'
import crypto from 'crypto'
import bcrypt from 'bcrypt'
import { authenticator, totp } from 'otplib'
import { query } from './db'
import { getClientIP } from './getClientIP'
import { UAParser } from 'ua-parser-js'

const SESSION_COOKIE = 'session_token'
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
const SESSION_REFRESH_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000 // Refresh if less than 7 days remaining
const UTILITY_PASSCODE_DURATION_MS = 90 * 24 * 60 * 60 * 1000 // 90 days (3 months)

// Configure TOTP
authenticator.options = {
  window: [1, 1], // Allow 1 time step before and after current time
}

export interface User {
  id: number
  email: string
  name: string | null
  picture: string | null
  password_hash: string | null
  mfa_secret: string | null
  auth_provider: 'email' | 'google'
  google_sub: string | null
  mfa_enabled: boolean
  email_verified: boolean
  created_at: Date
  last_login_at: Date | null
}

export interface Session {
  id: number
  user_id: number
  session_token: string
  device_id: number | null
  expires_at: Date
  last_accessed_at: Date
}

export interface Device {
  id: number
  user_id: number
  device_fingerprint: string
  device_name: string | null
  device_type: string | null
  browser: string | null
  os: string | null
  is_trusted: boolean
  created_at: Date
  last_seen_at: Date
}

/**
 * Generate a secure random token
 */
export function generateToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Generate TOTP secret for MFA
 */
export function generateMFASecret(email: string): string {
  return totp.generateSecret({
    name: `Sid's Blog (${email})`,
    issuer: "Sid's Blog",
  }).secret
}

/**
 * Verify TOTP code
 */
export function verifyMFACode(secret: string, code: string): boolean {
  try {
    return authenticator.check(code, secret)
  } catch {
    return false
  }
}

/**
 * Generate QR code data URL for MFA setup
 */
export async function generateMFAQRCode(email: string, secret: string): Promise<string> {
  const { default: QRCode } = await import('qrcode')
  const otpauth = authenticator.keyuri(email, "Sid's Blog", secret)
  return QRCode.toDataURL(otpauth)
}

/**
 * Create or get device fingerprint
 */
export function getDeviceFingerprint(event: H3Event): string {
  const userAgent = getHeader(event, 'user-agent') || ''
  const ip = getClientIP(event)

  // Create a simple fingerprint from user agent and IP
  // In production, you might want a more sophisticated fingerprinting
  const fingerprint = crypto.createHash('sha256').update(`${userAgent}:${ip}`).digest('hex')

  return fingerprint
}

/**
 * Parse user agent to extract device info
 */
export function parseUserAgent(userAgent: string | null) {
  if (!userAgent) {
    return {
      deviceName: 'Unknown Device',
      deviceType: 'unknown',
      browser: 'Unknown',
      os: 'Unknown',
    }
  }

  const parser = new UAParser(userAgent)
  const result = parser.getResult()

  const deviceType =
    result.device.type === 'mobile'
      ? 'mobile'
      : result.device.type === 'tablet'
        ? 'tablet'
        : 'desktop'

  const deviceName = result.device.model || result.os.name || 'Unknown Device'
  const browser = result.browser.name || 'Unknown'
  const os = result.os.name || 'Unknown'

  return {
    deviceName,
    deviceType,
    browser,
    os,
  }
}

/**
 * Get or create device record
 */
export async function getOrCreateDevice(
  userId: number,
  fingerprint: string,
  userAgent: string | null,
  ipAddress: string,
): Promise<Device> {
  // Check if device exists
  const existing = await query<Device>(
    'SELECT * FROM devices WHERE user_id = $1 AND device_fingerprint = $2',
    [userId, fingerprint],
  )

  if (existing.length > 0) {
    // Update last_seen_at
    await query('UPDATE devices SET last_seen_at = CURRENT_TIMESTAMP WHERE id = $1', [
      existing[0].id,
    ])
    return existing[0]
  }

  // Create new device
  const { deviceName, deviceType, browser, os } = parseUserAgent(userAgent)

  const result = await query<Device>(
    `INSERT INTO devices (user_id, device_fingerprint, device_name, device_type, browser, os, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [userId, fingerprint, deviceName, deviceType, browser, os, ipAddress],
  )

  return result[0]
}

/**
 * Create a new session
 */
export async function createSession(
  userId: number,
  event: H3Event,
  deviceId?: number,
): Promise<Session> {
  const sessionToken = generateToken()
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)
  const userAgent = getHeader(event, 'user-agent')
  const ipAddress = getClientIP(event)

  const result = await query<Session>(
    `INSERT INTO sessions (user_id, session_token, device_id, ip_address, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, sessionToken, deviceId || null, ipAddress, userAgent, expiresAt],
  )

  // Set session cookie
  setCookie(event, SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_MS / 1000,
  })

  return result[0]
}

/**
 * Get session from token
 */
export async function getSessionByToken(token: string): Promise<Session | null> {
  const sessions = await query<Session>(
    `SELECT * FROM sessions 
     WHERE session_token = $1 
     AND expires_at > CURRENT_TIMESTAMP 
     AND revoked = false`,
    [token],
  )

  if (sessions.length === 0) {
    return null
  }

  const session = sessions[0]

  // Update last_accessed_at
  await query('UPDATE sessions SET last_accessed_at = CURRENT_TIMESTAMP WHERE id = $1', [
    session.id,
  ])

  // Refresh session if needed
  const timeUntilExpiry = new Date(session.expires_at).getTime() - Date.now()
  if (timeUntilExpiry < SESSION_REFRESH_THRESHOLD_MS) {
    const newExpiresAt = new Date(Date.now() + SESSION_DURATION_MS)
    await query('UPDATE sessions SET expires_at = $1 WHERE id = $2', [newExpiresAt, session.id])
    session.expires_at = newExpiresAt
  }

  return session
}

/**
 * Get current user from session
 */
export async function getCurrentUser(event: H3Event): Promise<User | null> {
  const token = getCookie(event, SESSION_COOKIE)
  if (!token) {
    return null
  }

  const session = await getSessionByToken(token)
  if (!session) {
    return null
  }

  const users = await query<User>(
    'SELECT id, email, name, picture, password_hash, mfa_secret, auth_provider, google_sub, mfa_enabled, email_verified, created_at, last_login_at FROM users WHERE id = $1',
    [session.user_id],
  )
  return users.length > 0 ? users[0] : null
}

/**
 * Revoke a session
 */
export async function revokeSession(token: string): Promise<void> {
  await query('UPDATE sessions SET revoked = true WHERE session_token = $1', [token])
}

/**
 * Revoke all sessions for a user
 */
export async function revokeAllUserSessions(userId: number): Promise<void> {
  await query('UPDATE sessions SET revoked = true WHERE user_id = $1', [userId])
}

/**
 * Clear session cookie
 */
export function clearSessionCookie(event: H3Event): void {
  deleteCookie(event, SESSION_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const users = await query<User>(
    'SELECT id, email, name, picture, password_hash, mfa_secret, auth_provider, google_sub, mfa_enabled, email_verified, created_at, last_login_at FROM users WHERE email = $1',
    [email.toLowerCase()],
  )
  return users.length > 0 ? users[0] : null
}

/**
 * Get user by Google sub
 */
export async function getUserByGoogleSub(googleSub: string): Promise<User | null> {
  const users = await query<User>(
    'SELECT id, email, name, picture, password_hash, mfa_secret, auth_provider, google_sub, mfa_enabled, email_verified, created_at, last_login_at FROM users WHERE google_sub = $1',
    [googleSub],
  )
  return users.length > 0 ? users[0] : null
}

/**
 * Create a new user
 */
export async function createUser(data: {
  email: string
  name?: string
  picture?: string
  passwordHash?: string
  authProvider: 'email' | 'google'
  googleSub?: string
}): Promise<User> {
  try {
    // Note: Sequence should be properly set up during migration.
    // PostgreSQL's SERIAL type with nextval() handles concurrent inserts atomically.
    // We don't fix the sequence here to avoid race conditions where concurrent
    // requests read the same MAX(id) and set the sequence to the same value.
    const result = await query<User>(
      `INSERT INTO users (email, name, picture, password_hash, auth_provider, google_sub, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, name, picture, password_hash, mfa_secret, auth_provider, google_sub, mfa_enabled, email_verified, created_at, last_login_at`,
      [
        data.email.toLowerCase(),
        data.name || null,
        data.picture || null,
        data.passwordHash || null,
        data.authProvider,
        data.googleSub || null,
        data.authProvider === 'google' ? true : false, // Google emails are pre-verified
      ],
    )

    if (!result || result.length === 0) {
      throw new Error('Failed to create user: no data returned from INSERT')
    }

    const user = result[0]
    if (!user || !user.id) {
      console.error('[Auth] User creation failed - result:', result)
      throw new Error('Failed to create user: invalid data returned from INSERT (missing id)')
    }

    return user
  } catch (error) {
    console.error('[Auth] Error creating user:', error)
    console.error('[Auth] User data:', {
      email: data.email,
      authProvider: data.authProvider,
      hasName: !!data.name,
      hasPicture: !!data.picture,
      hasPasswordHash: !!data.passwordHash,
      hasGoogleSub: !!data.googleSub,
    })

    // Re-throw with more context if it's a database constraint error
    if (error && typeof error === 'object' && 'message' in error) {
      const errorMessage = String(error.message)
      if (errorMessage.includes('null value in column "id"')) {
        throw new Error(
          'Database configuration error: User ID sequence is not properly set up. Please run the database migration.',
        )
      }
    }

    throw error
  }
}

/**
 * Update user last login
 */
export async function updateUserLastLogin(userId: number): Promise<void> {
  await query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [userId])
}

/**
 * Verify utility passcode
 */
export async function verifyUtilityPasscode(userId: number, passcode: string): Promise<boolean> {
  const passcodes = await query<{
    passcode_hash: string
    expires_at: Date
  }>('SELECT passcode_hash, expires_at FROM utility_passcodes WHERE user_id = $1', [userId])

  if (passcodes.length === 0) {
    return false
  }

  const passcodeData = passcodes[0]

  // Check if expired
  if (new Date(passcodeData.expires_at) < new Date()) {
    return false
  }

  return verifyPassword(passcode, passcodeData.passcode_hash)
}

/**
 * Set or update utility passcode
 */
export async function setUtilityPasscode(userId: number, passcode: string): Promise<void> {
  const passcodeHash = await hashPassword(passcode)
  const expiresAt = new Date(Date.now() + UTILITY_PASSCODE_DURATION_MS)

  await query(
    `INSERT INTO utility_passcodes (user_id, passcode_hash, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) 
     DO UPDATE SET passcode_hash = $2, expires_at = $3, updated_at = CURRENT_TIMESTAMP`,
    [userId, passcodeHash, expiresAt],
  )
}

/**
 * Check if utility passcode needs rotation
 */
export async function needsUtilityPasscodeRotation(userId: number): Promise<boolean> {
  const passcodes = await query<{ expires_at: Date }>(
    'SELECT expires_at FROM utility_passcodes WHERE user_id = $1',
    [userId],
  )

  if (passcodes.length === 0) {
    return true // No passcode set, needs setup
  }

  // Check if expires within 7 days
  const expiresAt = new Date(passcodes[0].expires_at)
  const daysUntilExpiry = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)

  return daysUntilExpiry <= 7
}

/**
 * Get utility passcode expiry
 */
export async function getUtilityPasscodeExpiry(userId: number): Promise<Date | null> {
  const passcodes = await query<{ expires_at: Date }>(
    'SELECT expires_at FROM utility_passcodes WHERE user_id = $1',
    [userId],
  )

  return passcodes.length > 0 ? passcodes[0].expires_at : null
}
