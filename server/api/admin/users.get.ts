import { getQuery } from 'h3'
import { requireAdminUser } from '~/server/utils/adminUsers'
import { query } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)

  const q = getQuery(event)
  const page = Math.max(1, parseInt((q.page as string) || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt((q.limit as string) || '50', 10)))
  const offset = (page - 1) * limit
  const search = ((q.search as string) || '').trim().toLowerCase()

  let whereClause = ''
  const params: unknown[] = [limit, offset]

  if (search) {
    whereClause = `WHERE LOWER(email) LIKE $3 OR LOWER(COALESCE(name, '')) LIKE $3`
    params.push(`%${search}%`)
  }

  const users = await query<{
    id: number
    email: string
    name: string | null
    role: string
    auth_provider: string
    created_at: Date
    last_login_at: Date | null
  }>(
    `SELECT id, email, name, role, auth_provider, created_at, last_login_at
     FROM users
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    params,
  )

  const countParams = search ? [`%${search}%`] : []
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM users ${search ? `WHERE LOWER(email) LIKE $1 OR LOWER(COALESCE(name, '')) LIKE $1` : ''}`,
    countParams,
  )

  return {
    success: true,
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      authProvider: u.auth_provider,
      createdAt: u.created_at,
      lastLoginAt: u.last_login_at,
    })),
    pagination: {
      page,
      limit,
      total: parseInt(countResult[0]?.count || '0', 10),
    },
  }
})
