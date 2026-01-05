// server/api/auth/logout.post.ts
import { getCookie } from 'h3'
import { revokeSession, clearSessionCookie } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'session_token')

  if (token) {
    await revokeSession(token)
  }

  clearSessionCookie(event)

  return { success: true }
})
