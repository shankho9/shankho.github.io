import { defineEventHandler, readBody } from 'h3'

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
    const response = await $fetch<GoogleTokenPayload>(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${token}`,
    )

    if (!response.email_verified) {
      throw createError({
        statusCode: 401,
        message: 'Email not verified',
      })
    }

    return {
      user: {
        email: response.email,
        name: response.name,
        picture: response.picture,
        sub: response.sub,
      },
    }
  } catch (error: unknown) {
    console.error('Google token verification failed:', error)
    throw createError({
      statusCode: 401,
      message: 'Invalid token',
    })
  }
})
