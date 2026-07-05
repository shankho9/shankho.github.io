import { createError } from 'h3'
import type { H3Event } from 'h3'
import { getCurrentUser, hashPassword, verifyPassword, type User } from '~/server/utils/auth'
import { query } from '~/server/utils/db'

const OTP_EXPIRY_MS = 10 * 60 * 1000
const MAX_OTP_ATTEMPTS = 5

export async function requireAdminUser(event: H3Event): Promise<User> {
  const user = await getCurrentUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }
  if (user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Admin access required' })
  }
  return user
}

export function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function getAdminEmails(): Promise<string[]> {
  const rows = await query<{ email: string }>(
    `SELECT email FROM users WHERE role = 'admin' ORDER BY email`,
  )
  return rows.map((row) => row.email).filter(Boolean)
}

export async function createRoleChangeOtp(
  adminUserId: string | number,
  targetUserId: string | number,
  newRole: 'visitor' | 'admin',
): Promise<string> {
  const adminId = String(adminUserId)
  const targetId = String(targetUserId)

  await query('DELETE FROM admin_role_change_requests WHERE target_user_id = $1', [targetId])

  const otp = generateOtpCode()
  const otpHash = await hashPassword(otp)
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS)

  await query(
    `INSERT INTO admin_role_change_requests
     (admin_user_id, target_user_id, new_role, otp_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [adminId, targetId, newRole, otpHash, expiresAt],
  )

  return otp
}

export async function confirmRoleChangeOtp(
  adminUserId: string | number,
  targetUserId: string | number,
  newRole: 'visitor' | 'admin',
  otp: string,
): Promise<void> {
  const confirmingAdminId = String(adminUserId)
  const targetId = String(targetUserId)

  const rows = await query<{
    id: number
    otp_hash: string
    attempts: number
    expires_at: Date
    new_role: string
    target_user_id: string | number
    admin_user_id: string | number
  }>(
    `SELECT id, otp_hash, attempts, expires_at, new_role, target_user_id, admin_user_id
     FROM admin_role_change_requests
     WHERE target_user_id = $1 AND new_role = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [targetId, newRole],
  )

  if (rows.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No pending role change request. Request a new OTP.',
    })
  }

  const request = rows[0]

  if (String(request.target_user_id) !== targetId || request.new_role !== newRole) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Role change details do not match the pending request',
    })
  }

  if (new Date(request.expires_at) < new Date()) {
    await query('DELETE FROM admin_role_change_requests WHERE id = $1', [request.id])
    throw createError({ statusCode: 400, statusMessage: 'OTP has expired. Request a new one.' })
  }

  if (request.attempts >= MAX_OTP_ATTEMPTS) {
    await query('DELETE FROM admin_role_change_requests WHERE id = $1', [request.id])
    throw createError({
      statusCode: 400,
      statusMessage: 'Too many failed attempts. Request a new OTP.',
    })
  }

  const valid = await verifyPassword(otp, request.otp_hash)
  if (!valid) {
    await query('UPDATE admin_role_change_requests SET attempts = attempts + 1 WHERE id = $1', [
      request.id,
    ])
    throw createError({ statusCode: 400, statusMessage: 'Invalid OTP' })
  }

  if (newRole === 'visitor' && targetId === confirmingAdminId) {
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

  await query('UPDATE users SET role = $1 WHERE id = $2', [newRole, targetId])
  await query('DELETE FROM admin_role_change_requests WHERE id = $1', [request.id])

  console.log(
    `[Admin Users] User ${targetId} role changed to ${newRole} (requested by admin ${request.admin_user_id}, confirmed by admin ${confirmingAdminId})`,
  )
}
