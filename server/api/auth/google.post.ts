// server/api/auth/google.post.ts
import { readBody, getHeader } from 'h3'
import {
  getUserByGoogleSub,
  getUserByEmail,
  createUser,
  createSession,
  getOrCreateDevice,
  getDeviceFingerprint,
  updateUserLastLogin,
} from '~/server/utils/auth'
import { getClientIP } from '~/server/utils/getClientIP'
import { sendNewUserNotification, sendLoginNotification } from '~/server/utils/email'
import { query } from '~/server/utils/db'

interface GoogleTokenPayload {
  email: string
  name: string
  picture: string
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
    // Verify the Google ID token
    // Note: tokeninfo endpoint is deprecated but still functional
    // Consider migrating to JWT verification in the future
    let response: GoogleTokenPayload
    try {
      response = await $fetch<GoogleTokenPayload>(
        `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${token}`,
      )
    } catch (fetchError: unknown) {
      console.error('[Auth] Google tokeninfo API error:', fetchError)
      const errorMessage =
        fetchError && typeof fetchError === 'object' && 'data' in fetchError
          ? (fetchError.data as { error_description?: string; error?: string })
              ?.error_description || (fetchError.data as { error?: string })?.error
          : fetchError instanceof Error
            ? fetchError.message
            : 'Failed to verify Google token'
      throw createError({
        statusCode: 401,
        message: errorMessage || 'Invalid Google token. Please try again.',
      })
    }

    if (!response.email_verified) {
      throw createError({
        statusCode: 401,
        message: 'Email not verified',
      })
    }

    if (!response.email || !response.sub) {
      throw createError({
        statusCode: 401,
        message: 'Invalid token response: missing required fields',
      })
    }

    // Get or create user
    let user = await getUserByGoogleSub(response.sub)
    const isNewUser = !user

    if (!user) {
      // Check if user exists with email (might have registered with email/password)
      const existingUser = await getUserByEmail(response.email)
      if (existingUser) {
        // Update existing user to link Google account
        await query('UPDATE users SET google_sub = $1, auth_provider = $2 WHERE id = $3', [
          response.sub,
          'google',
          existingUser.id,
        ])
        // Fetch updated user
        user = await getUserByEmail(response.email)
        if (!user) {
          throw createError({
            statusCode: 500,
            message: 'Failed to update user',
          })
        }
      } else {
        // Create new user
        user = await createUser({
          email: response.email,
          name: response.name,
          picture: response.picture,
          authProvider: 'google',
          googleSub: response.sub,
        })

        // Send new user notification
        sendNewUserNotification(user.email, user.name, 'google').catch(console.error)
      }
    } else {
      // Update user info in case it changed
      await query(
        'UPDATE users SET name = $1, picture = $2, last_login_at = CURRENT_TIMESTAMP WHERE id = $3',
        [response.name, response.picture, user.id],
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
    console.error('[Auth] Google OAuth error:', error)
    console.error('[Auth] Google OAuth error type:', typeof error)
    console.error('[Auth] Google OAuth error details:', JSON.stringify(error, null, 2))

    // If it's already a createError, re-throw it with its original message
    if (error && typeof error === 'object' && 'statusCode' in error && 'message' in error) {
      const createErr = error as { statusCode: number; message: string }
      console.error('[Auth] Re-throwing createError:', createErr.message)
      throw error
    }

    // Otherwise, create a user-friendly error
    let errorMessage = 'Authentication failed. Please try again.'

    if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = String(error.message)
    } else if (error instanceof Error) {
      errorMessage = error.message
    }

    // Ensure error message is never empty or just "true"
    if (!errorMessage || errorMessage === 'true' || errorMessage === 'false') {
      errorMessage = 'Google authentication failed. Please check your configuration or try again.'
    }

    console.error('[Auth] Throwing error with message:', errorMessage)
    throw createError({
      statusCode: 401,
      message: errorMessage,
    })
  }
})
