import { readBody, setResponseStatus } from 'h3'
import { getCurrentUser, verifyAdminPasscode, setAdminPasscode } from '~/server/utils/auth'

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
  const { oldPasscode, newPasscode } = body
  if (!oldPasscode || !newPasscode) {
    setResponseStatus(event, 400)
    return { success: false, error: 'Old passcode and new passcode are required' }
  }
  if (newPasscode.length < 6) {
    setResponseStatus(event, 400)
    return { success: false, error: 'New passcode must be at least 6 characters long' }
  }

  const isValid = await verifyAdminPasscode(user.id, oldPasscode)
  if (!isValid) {
    setResponseStatus(event, 401)
    return { success: false, error: 'Invalid old passcode' }
  }

  await setAdminPasscode(user.id, newPasscode)
  return { success: true, message: 'Admin passcode rotated successfully' }
})
