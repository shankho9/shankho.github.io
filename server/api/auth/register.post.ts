// server/api/auth/register.post.ts
import { readBody, setResponseStatus, getHeader } from 'h3'
import { getClientIP } from '~/server/utils/getClientIP'
import {
  createUser,
  hashPassword,
  getUserByEmail,
  createSession,
  getOrCreateDevice,
  getDeviceFingerprint,
  updateUserLastLogin,
} from '~/server/utils/auth'
import { sendNewUserNotification } from '~/server/utils/email'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, password, name } = body

  if (!email || !password) {
    setResponseStatus(event, 400)
    return { success: false, error: 'Email and password are required' }
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    setResponseStatus(event, 400)
    return { success: false, error: 'Invalid email format' }
  }

  // Validate password strength
  if (password.length < 8) {
    setResponseStatus(event, 400)
    return { success: false, error: 'Password must be at least 8 characters long' }
  }

  try {
    // Check if user already exists
    const existingUser = await getUserByEmail(email)
    if (existingUser) {
      setResponseStatus(event, 409)
      return { success: false, error: 'User with this email already exists' }
    }

    // Create user
    const passwordHash = await hashPassword(password)
    const user = await createUser({
      email,
      name: name || null,
      passwordHash,
      authProvider: 'email',
    })

    // Create session
    const fingerprint = getDeviceFingerprint(event)
    const device = await getOrCreateDevice(
      user.id,
      fingerprint,
      getHeader(event, 'user-agent'),
      getClientIP(event),
    )

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
    sendNewUserNotification(user.email, user.name, 'email').catch(console.error)

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        auth_provider: user.auth_provider,
        mfa_enabled: user.mfa_enabled,
        role: user.role,
      },
    }
  } catch (error) {
    console.error('[Auth] Registration error:', error)
    setResponseStatus(event, 500)
    return { success: false, error: 'Registration failed. Please try again.' }
  }
})
