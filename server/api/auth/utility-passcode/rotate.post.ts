// server/api/auth/utility-passcode/rotate.post.ts
import { readBody, setResponseStatus } from 'h3'
import { getCurrentUser, verifyUtilityPasscode, setUtilityPasscode } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)

  if (!user) {
    setResponseStatus(event, 401)
    return { success: false, error: 'Not authenticated' }
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

  // Verify old passcode
  const isValid = await verifyUtilityPasscode(user.id, oldPasscode)

  if (!isValid) {
    setResponseStatus(event, 401)
    return { success: false, error: 'Invalid old passcode' }
  }

  // Set new passcode
  await setUtilityPasscode(user.id, newPasscode)

  return { success: true, message: 'Utility passcode rotated successfully' }
})
