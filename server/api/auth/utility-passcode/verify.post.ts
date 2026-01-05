// server/api/auth/utility-passcode/verify.post.ts
import { readBody, setResponseStatus } from 'h3'
import { getCurrentUser, verifyUtilityPasscode } from '~/server/utils/auth'

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

  const isValid = await verifyUtilityPasscode(user.id, passcode)

  if (!isValid) {
    setResponseStatus(event, 401)
    return { success: false, error: 'Invalid passcode' }
  }

  return { success: true }
})
