// server/api/auth/login.post.ts
import { readBody, setResponseStatus, getHeader } from 'h3'
import {
  getUserByEmail,
  verifyPassword,
  verifyMFACode,
  createSession,
  getOrCreateDevice,
  getDeviceFingerprint,
  updateUserLastLogin,
} from '~/server/utils/auth'
import { getClientIP } from '~/server/utils/getClientIP'
import { sendLoginNotification } from '~/server/utils/email'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, password, mfaCode } = body

  if (!email || !password) {
    setResponseStatus(event, 400)
    return { success: false, error: 'Email and password are required' }
  }

  try {
    // Get user
    const user = await getUserByEmail(email)
    if (!user) {
      setResponseStatus(event, 401)
      return { success: false, error: 'Invalid email or password' }
    }

    // Check if user has password (not OAuth-only)
    if (!user.password_hash) {
      setResponseStatus(event, 401)
      return {
        success: false,
        error: 'This account uses Google sign-in. Please use Google to log in.',
      }
    }

    // Verify password
    const passwordValid = await verifyPassword(password, user.password_hash)
    if (!passwordValid) {
      setResponseStatus(event, 401)
      return { success: false, error: 'Invalid email or password' }
    }

    // Check MFA
    if (user.mfa_enabled) {
      if (!mfaCode) {
        setResponseStatus(event, 401)
        return { success: false, error: 'MFA code required', requiresMFA: true }
      }

      const mfaValid = verifyMFACode(user.mfa_secret!, mfaCode)
      if (!mfaValid) {
        setResponseStatus(event, 401)
        return { success: false, error: 'Invalid MFA code', requiresMFA: true }
      }
    }

    // Create session
    const fingerprint = getDeviceFingerprint(event)
    const device = await getOrCreateDevice(
      user.id,
      fingerprint,
      getHeader(event, 'user-agent'),
      getClientIP(event),
    )

    const isNewDevice =
      device.created_at && new Date(device.created_at).getTime() > Date.now() - 60000 // Created within last minute

    await createSession(user.id, event, device.id)
    await updateUserLastLogin(user.id)

    // Track login for analytics
    await query(
      `INSERT INTO user_logins (user_email, user_name, login_location, user_agent, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        user.email,
        user.name || 'Unknown',
        event.node.req.url || '/',
        getHeader(event, 'user-agent') || null,
        getClientIP(event),
      ],
    )

    // Send notification (async, don't wait)
    const { parseUserAgent } = await import('~/server/utils/auth')
    const userAgent = getHeader(event, 'user-agent')
    const deviceInfo = parseUserAgent(userAgent)
    sendLoginNotification(
      user.email,
      user.name,
      {
        ...deviceInfo,
        ipAddress: getClientIP(event),
      },
      !!isNewDevice,
    ).catch(console.error)

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        auth_provider: user.auth_provider,
        mfa_enabled: user.mfa_enabled,
      },
    }
  } catch (error) {
    console.error('[Auth] Login error:', error)
    setResponseStatus(event, 500)
    return { success: false, error: 'Login failed. Please try again.' }
  }
})
