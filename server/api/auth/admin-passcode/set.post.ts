import { readBody, setResponseStatus } from 'h3'
import { getCurrentUser, setAdminPasscode } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  if (!user) {
    setResponseStatus(event, 401)
    return { success: false, error: 'Not authenticated' }
  }
  if (user.role !== 'admin') {
    setResponseStatus(event, 403)
    return { success: false, error: 'Admin access required' }
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

  await setAdminPasscode(user.id, passcode)
  return { success: true, message: 'Admin passcode set successfully' }
})
