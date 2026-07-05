import { createError, defineEventHandler, readBody } from 'h3'
import { confirmRoleChangeOtp, requireAdminUser } from '~/server/utils/adminUsers'

interface ConfirmBody {
  targetUserId: string | number
  newRole: 'visitor' | 'admin'
  otp: string
}

export default defineEventHandler(async (event) => {
  const admin = await requireAdminUser(event)
  const body = await readBody<ConfirmBody>(event)

  const targetUserId = body?.targetUserId
  const newRole = body?.newRole
  const otp = (body?.otp || '').trim()

  if (
    targetUserId === undefined ||
    targetUserId === null ||
    targetUserId === '' ||
    (newRole !== 'visitor' && newRole !== 'admin') ||
    !otp
  ) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid request body' })
  }

  await confirmRoleChangeOtp(admin.id, targetUserId, newRole, otp)

  return {
    success: true,
    message: `User role updated to ${newRole}`,
  }
})
