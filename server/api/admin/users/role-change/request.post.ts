import { createError, defineEventHandler, readBody } from 'h3'
import { createRoleChangeOtp, requireAdminUser } from '~/server/utils/adminUsers'
import { sendAdminRoleChangeOtp } from '~/server/utils/email'
import { query } from '~/server/utils/db'

interface RequestBody {
  targetUserId: number
  newRole: 'visitor' | 'admin'
}

export default defineEventHandler(async (event) => {
  const admin = await requireAdminUser(event)
  const body = await readBody<RequestBody>(event)

  const targetUserId = Number(body?.targetUserId)
  const newRole = body?.newRole

  if (!targetUserId || (newRole !== 'visitor' && newRole !== 'admin')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid targetUserId or newRole' })
  }

  const targets = await query<{ id: number; email: string; role: string }>(
    'SELECT id, email, role FROM users WHERE id = $1',
    [targetUserId],
  )

  if (targets.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  const target = targets[0]
  if (target.role === newRole) {
    throw createError({ statusCode: 400, statusMessage: `User is already a ${newRole}` })
  }

  if (newRole === 'visitor' && targetUserId === admin.id) {
    const adminCount = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM users WHERE role = 'admin'`,
    )
    if (parseInt(adminCount[0]?.count || '0', 10) <= 1) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Cannot demote the last admin account',
      })
    }
  }

  const otp = await createRoleChangeOtp(admin.id, targetUserId, newRole)

  try {
    await sendAdminRoleChangeOtp(admin.email, admin.name, target.email, newRole, otp)
  } catch (error) {
    console.error('[Admin Users] Failed to send OTP email:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to send verification email. Check Resend configuration.',
    })
  }

  return {
    success: true,
    message: `Verification code sent to ${admin.email}`,
    expiresInMinutes: 10,
  }
})
