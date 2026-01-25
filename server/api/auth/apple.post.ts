// server/api/auth/apple.post.ts
import { readBody, getHeader } from 'h3'
import {
  getUserByEmail,
  getUserByAppleSub,
  createUser,
  createSession,
  getOrCreateDevice,
  getDeviceFingerprint,
  updateUserLastLogin,
} from '~/server/utils/auth'
import { getClientIP } from '~/server/utils/getClientIP'
import { sendNewUserNotification, sendLoginNotification } from '~/server/utils/email'
import { query } from '~/server/utils/db'

interface AppleTokenPayload {
  email: string
  name?: string
  sub: string
  email_verified: boolean
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { token } = body

  if (!token) {
    throw createError({
      statusCode: 400,
      message: 'Token is required',
    })
  }

  try {
    // Verify Apple ID token
    // Apple uses JWT tokens that need to be verified
    // For now, we'll decode and verify the token
    // In production, you should verify the signature with Apple's public keys
    const parts = token.split('.')
    if (parts.length !== 3) {
      throw createError({
        statusCode: 401,
        message: 'Invalid token format',
      })
    }

    // Decode the payload (base64url)
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString()) as AppleTokenPayload

    if (!payload.email || !payload.sub) {
      throw createError({
        statusCode: 401,
        message: 'Invalid token: missing required fields',
      })
    }

    // Get or create user
    let user = await getUserByAppleSub(payload.sub)
    const isNewUser = !user

    if (!user) {
      // Check if user exists with email (might have registered with email/password)
      const existingUser = await getUserByEmail(payload.email)
      if (existingUser) {
        // Update existing user to link Apple account
        await query('UPDATE users SET apple_sub = $1, auth_provider = $2 WHERE id = $3', [
          payload.sub,
          'apple',
          existingUser.id,
        ])
        // Fetch updated user
        user = await getUserByEmail(payload.email)
        if (!user) {
          throw createError({
            statusCode: 500,
            message: 'Failed to update user',
          })
        }
      } else {
        // Create new user
        user = await createUser({
          email: payload.email,
          name: payload.name || null,
          picture: null, // Apple doesn't provide profile pictures
          authProvider: 'apple',
          appleSub: payload.sub,
        })
      }

      // Send new user notification
      sendNewUserNotification(user.email, user.name, 'apple').catch(console.error)
    } else {
      // Update user to link Apple account if not already linked
      if (user.auth_provider !== 'apple') {
        await query('UPDATE users SET auth_provider = $1, apple_sub = $2 WHERE id = $3', [
          'apple',
          payload.sub,
          user.id,
        ])
        // Fetch updated user
        user = await getUserByEmail(payload.email)
        if (!user) {
          throw createError({
            statusCode: 500,
            message: 'Failed to update user',
          })
        }
      }

      // Update user info
      await query(
        'UPDATE users SET name = COALESCE($1, name), last_login_at = CURRENT_TIMESTAMP WHERE id = $2',
        [payload.name, user.id],
      )
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
      device.created_at && new Date(device.created_at).getTime() > Date.now() - 60000

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

    // Send login notification (async, don't wait)
    if (!isNewUser) {
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
    }

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
  } catch (error: unknown) {
    console.error('[Auth] Apple OAuth error:', error)

    if (error && typeof error === 'object' && 'statusCode' in error && 'message' in error) {
      throw error
    }

    let errorMessage = 'Apple authentication failed. Please try again.'

    if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = String(error.message)
    } else if (error instanceof Error) {
      errorMessage = error.message
    }

    if (!errorMessage || errorMessage === 'true' || errorMessage === 'false') {
      errorMessage = 'Apple authentication failed. Please check your configuration or try again.'
    }

    throw createError({
      statusCode: 401,
      message: errorMessage,
    })
  }
})
