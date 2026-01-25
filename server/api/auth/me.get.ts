// server/api/auth/me.get.ts
import { getCurrentUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)

  if (!user) {
    return { authenticated: false, user: null }
  }

  return {
    authenticated: true,
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
})
