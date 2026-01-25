// server/api/auth/outlook.post.ts
import { readBody, getHeader } from 'h3'
import {
  getUserByEmail,
  getUserByOutlookId,
  createUser,
  createSession,
  getOrCreateDevice,
  getDeviceFingerprint,
  updateUserLastLogin,
} from '~/server/utils/auth'
import { getClientIP } from '~/server/utils/getClientIP'
import { sendNewUserNotification, sendLoginNotification } from '~/server/utils/email'
import { query } from '~/server/utils/db'

interface OutlookTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  id_token?: string
}

interface OutlookUserInfo {
  id: string
  mail: string
  displayName: string
  userPrincipalName: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { code } = body

  if (!code) {
    throw createError({
      statusCode: 400,
      message: 'Authorization code is required',
    })
  }

  try {
    const config = useRuntimeConfig()
    const clientId = config.public.outlookClientId
    const clientSecret = config.outlookClientSecret

    if (!clientId || !clientSecret) {
      throw createError({
        statusCode: 500,
        message: 'Outlook OAuth not configured',
      })
    }

    const redirectUri = `${config.public.siteUrl}/auth/outlook/callback`

    // Exchange authorization code for access token
    const tokenResponse = await $fetch<OutlookTokenResponse>(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      },
    )

    if (!tokenResponse.access_token) {
      throw createError({
        statusCode: 401,
        message: 'Failed to obtain access token',
      })
    }

    // Get user info from Microsoft Graph API
    const userInfo = await $fetch<OutlookUserInfo>('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${tokenResponse.access_token}`,
      },
    })

    if (!userInfo.mail && !userInfo.userPrincipalName) {
      throw createError({
        statusCode: 401,
        message: 'Unable to retrieve user email',
      })
    }

    const email = userInfo.mail || userInfo.userPrincipalName
    const name = userInfo.displayName || null

    // Get or create user
    let user = await getUserByOutlookId(userInfo.id)
    const isNewUser = !user

    if (!user) {
      // Check if user exists with email (might have registered with email/password)
      const existingUser = await getUserByEmail(email)
      if (existingUser) {
        // Update existing user to link Outlook account
        await query('UPDATE users SET outlook_id = $1, auth_provider = $2 WHERE id = $3', [
          userInfo.id,
          'outlook',
          existingUser.id,
        ])
        // Fetch updated user
        user = await getUserByEmail(email)
        if (!user) {
          throw createError({
            statusCode: 500,
            message: 'Failed to update user',
          })
        }
      } else {
        // Create new user
        user = await createUser({
          email,
          name,
          picture: null, // Outlook doesn't provide profile picture in basic scope
          authProvider: 'outlook',
          outlookId: userInfo.id,
        })
      }

      // Send new user notification
      sendNewUserNotification(user.email, user.name, 'outlook').catch(console.error)
    } else {
      // Update user to link Outlook account if not already linked
      if (user.auth_provider !== 'outlook') {
        await query('UPDATE users SET auth_provider = $1, outlook_id = $2 WHERE id = $3', [
          'outlook',
          userInfo.id,
          user.id,
        ])
        // Fetch updated user
        user = await getUserByEmail(email)
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
        [name, user.id],
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
    console.error('[Auth] Outlook OAuth error:', error)

    if (error && typeof error === 'object' && 'statusCode' in error && 'message' in error) {
      throw error
    }

    let errorMessage = 'Outlook authentication failed. Please try again.'

    if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = String(error.message)
    } else if (error instanceof Error) {
      errorMessage = error.message
    }

    if (!errorMessage || errorMessage === 'true' || errorMessage === 'false') {
      errorMessage = 'Outlook authentication failed. Please check your configuration or try again.'
    }

    throw createError({
      statusCode: 401,
      message: errorMessage,
    })
  }
})
