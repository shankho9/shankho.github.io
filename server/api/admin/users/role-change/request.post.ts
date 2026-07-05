import { createError, defineEventHandler, readBody } from 'h3'
import { createRoleChangeOtp, getAdminEmails, requireAdminUser } from '~/server/utils/adminUsers'
import { sendAdminRoleChangeOtp } from '~/server/utils/email'
import { query } from '~/server/utils/db'

interface RequestBody {
  targetUserId: string | number
  newRole: 'visitor' | 'admin'
}

function normalizeUserId(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null
  return String(value)
}

function isDbSetupError(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('admin_role_change_requests') ||
    (lower.includes('relation') && lower.includes('does not exist')) ||
    lower.includes('foreign key') ||
    lower.includes('datatype mismatch')
  )
}

export default defineEventHandler(async (event) => {
  try {
    const admin = await requireAdminUser(event)
    const body = await readBody<RequestBody>(event)

    const targetUserId = normalizeUserId(body?.targetUserId)
    const newRole = body?.newRole

    if (!targetUserId || (newRole !== 'visitor' && newRole !== 'admin')) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid targetUserId or newRole' })
    }

    const targets = await query<{ id: string | number; email: string; role: string }>(
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

    if (newRole === 'visitor' && targetUserId === String(admin.id)) {
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

    const adminEmails = await getAdminEmails()
    if (adminEmails.length === 0) {
      throw createError({
        statusCode: 500,
        statusMessage: 'No admin email addresses found in the database',
      })
    }

    const otp = await createRoleChangeOtp(admin.id, targetUserId, newRole)

    try {
      await sendAdminRoleChangeOtp(adminEmails, admin.email, admin.name, target.email, newRole, otp)
    } catch (error) {
      console.error('[Admin Users] Failed to send OTP email:', error)
      const detail =
        error instanceof Error && error.message ? error.message : 'Unknown email delivery error'
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to send verification email: ${detail}`,
      })
    }

    return {
      success: true,
      message: `Verification code sent to all admins: ${adminEmails.join(', ')}`,
      sentTo: adminEmails,
      expiresInMinutes: 10,
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    console.error('[Admin Users] role-change request failed:', error)
    const message = error instanceof Error ? error.message : 'Role change request failed'

    if (isDbSetupError(message)) {
      throw createError({
        statusCode: 503,
        statusMessage:
          'Admin role change database table is missing or misconfigured. Run the admin_role_change_requests migration on production.',
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: message,
    })
  }
})
