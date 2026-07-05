import { readBody } from 'h3'
import { getCurrentUser, setAdminPasscode } from '~/server/utils/auth'
import { createErrorResponse, createSuccessResponse } from '~/server/utils/errorHandler'

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  if (!user) {
    return createErrorResponse(event, 401, 'Not authenticated')
  }
  if (user.role !== 'admin') {
    return createErrorResponse(event, 403, 'Admin access required')
  }

  const body = await readBody(event)
  const { passcode } = body
  if (!passcode) {
    return createErrorResponse(event, 400, 'Passcode is required')
  }
  if (passcode.length < 6) {
    return createErrorResponse(event, 400, 'Passcode must be at least 6 characters long')
  }

  try {
    await setAdminPasscode(user.id, passcode)
    return createSuccessResponse(event, undefined, 'Admin passcode set successfully')
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Admin Passcode Set] Failed:', message)
    const hint = message.includes('admin_passcodes')
      ? ' Run the create_admin_passcodes.sql migration on your database.'
      : ''
    return createErrorResponse(event, 500, `Failed to save admin passcode.${hint}`)
  }
})
