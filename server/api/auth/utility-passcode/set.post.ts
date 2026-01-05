// server/api/auth/utility-passcode/set.post.ts
import { readBody, setResponseStatus } from 'h3'
import { getCurrentUser, setUtilityPasscode } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)

  if (!user) {
    setResponseStatus(event, 401)
    return { success: false, error: 'Not authenticated' }
  }

  const body = await readBody(event)
  const { passcode } = body

  if (!passcode) {
    setResponseStatus(event, 400)
    return { success: false, error: 'Passcode is required' }
  }

  if (passcode.length < 6) {
    setResponseStatus(event, 400)
    return { success: false, error: 'Passcode must be at least 6 characters long' }
  }

  await setUtilityPasscode(user.id, passcode)

  return { success: true, message: 'Utility passcode set successfully' }
})
