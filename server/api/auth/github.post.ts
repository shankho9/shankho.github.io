// server/api/auth/github.post.ts
import { readBody, getHeader } from 'h3'
import {
  getUserByEmail,
  getUserByGitHubId,
  createUser,
  createSession,
  getOrCreateDevice,
  getDeviceFingerprint,
  updateUserLastLogin,
} from '~/server/utils/auth'
import { getClientIP } from '~/server/utils/getClientIP'
import { sendNewUserNotification, sendLoginNotification } from '~/server/utils/email'
import { query } from '~/server/utils/db'

interface GitHubTokenResponse {
  access_token: string
  token_type: string
  scope: string
}

interface GitHubUserInfo {
  id: number
  login: string
  email: string
  name: string
  avatar_url: string
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
    const clientId = config.public.githubClientId
    const clientSecret = config.githubClientSecret

    if (!clientId || !clientSecret) {
      throw createError({
        statusCode: 500,
        message: 'GitHub OAuth not configured',
      })
    }

    // Get the redirect URI from the request to match what was used in the initial OAuth request
    // The redirect_uri must match exactly what was sent to GitHub in the authorization request
    let origin = getHeader(event, 'origin')

    // If no origin header, try to extract from referer
    if (!origin) {
      const referer = getHeader(event, 'referer')
      if (referer) {
        try {
          const refererUrl = new URL(referer)
          origin = refererUrl.origin
        } catch {
          // If referer is not a valid URL, try to extract origin manually
          const match = referer.match(/^(https?:\/\/[^/]+)/)
          if (match) {
            origin = match[1]
          }
        }
      }
    }

    // If still no origin, construct from host header (for localhost development)
    if (!origin) {
      const host = getHeader(event, 'host')
      if (host) {
        // Determine protocol from headers (X-Forwarded-Proto for proxies, or default to http for localhost)
        const protocol =
          getHeader(event, 'x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
        origin = `${protocol}://${host}`
      }
    }

    // Final fallback to siteUrl
    if (!origin) {
      origin = config.public.siteUrl
    }

    const redirectUri = `${origin}/auth/github/callback`

    // Exchange authorization code for access token
    let tokenResponse: GitHubTokenResponse
    try {
      tokenResponse = await $fetch<GitHubTokenResponse>(
        'https://github.com/login/oauth/access_token',
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: {
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: redirectUri,
          },
        },
      )
    } catch (fetchError: unknown) {
      // Try to extract more details from the error
      let errorDetails: unknown = fetchError
      if (fetchError && typeof fetchError === 'object') {
        if ('data' in fetchError) {
          errorDetails = fetchError.data
        } else if ('response' in fetchError) {
          errorDetails = (fetchError as { response?: unknown }).response
        }
      }

      // Extract error message from GitHub's response
      let errorMessage = 'Failed to obtain access token from GitHub'
      if (errorDetails && typeof errorDetails === 'object') {
        if ('error_description' in errorDetails) {
          errorMessage = String(errorDetails.error_description)
        } else if ('error' in errorDetails) {
          errorMessage = `GitHub error: ${String(errorDetails.error)}`
          if ('error_description' in errorDetails) {
            errorMessage += ` - ${String(errorDetails.error_description)}`
          }
        } else if ('message' in errorDetails) {
          errorMessage = String(errorDetails.message)
        }
      }

      throw createError({
        statusCode: 401,
        message: errorMessage,
      })
    }

    if (!tokenResponse || !tokenResponse.access_token) {
      throw createError({
        statusCode: 401,
        message: 'Failed to obtain access token from GitHub',
      })
    }

    // Get user info from GitHub API
    const userInfo = await $fetch<GitHubUserInfo>('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenResponse.access_token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    })

    // Get user email (may need to fetch from emails endpoint if not public)
    let email = userInfo.email
    if (!email) {
      const emails = await $fetch<Array<{ email: string; primary: boolean; verified: boolean }>>(
        'https://api.github.com/user/emails',
        {
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        },
      )
      const primaryEmail = emails.find((e) => e.primary && e.verified)
      email = primaryEmail?.email || emails.find((e) => e.verified)?.email || emails[0]?.email
    }

    if (!email) {
      throw createError({
        statusCode: 401,
        message: 'Unable to retrieve user email from GitHub',
      })
    }

    const name = userInfo.name || userInfo.login

    // Get or create user
    let user = await getUserByGitHubId(userInfo.id.toString())
    const isNewUser = !user

    if (!user) {
      // Check if user exists with email (might have registered with email/password)
      const existingUser = await getUserByEmail(email)
      if (existingUser) {
        // Update existing user to link GitHub account
        await query('UPDATE users SET github_id = $1, auth_provider = $2 WHERE id = $3', [
          userInfo.id.toString(),
          'github',
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
          picture: userInfo.avatar_url,
          authProvider: 'github',
          githubId: userInfo.id.toString(),
        })
      }

      // Send new user notification
      sendNewUserNotification(user.email, user.name, 'github').catch(console.error)
    } else {
      // Update user to link GitHub account if not already linked
      if (user.auth_provider !== 'github') {
        await query('UPDATE users SET auth_provider = $1, github_id = $2 WHERE id = $3', [
          'github',
          userInfo.id.toString(),
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
        'UPDATE users SET name = COALESCE($1, name), picture = COALESCE($2, picture), last_login_at = CURRENT_TIMESTAMP WHERE id = $3',
        [name, userInfo.avatar_url, user.id],
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
      },
    }
  } catch (error: unknown) {
    console.error('[Auth] GitHub OAuth error:', error)

    if (error && typeof error === 'object' && 'statusCode' in error && 'message' in error) {
      throw error
    }

    let errorMessage = 'GitHub authentication failed. Please try again.'

    if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = String(error.message)
    } else if (error instanceof Error) {
      errorMessage = error.message
    }

    if (!errorMessage || errorMessage === 'true' || errorMessage === 'false') {
      errorMessage = 'GitHub authentication failed. Please check your configuration or try again.'
    }

    throw createError({
      statusCode: 401,
      message: errorMessage,
    })
  }
})
