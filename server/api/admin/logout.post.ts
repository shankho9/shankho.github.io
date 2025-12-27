// server/api/admin/logout.post.ts
import { clearAdminToken } from '~/server/utils/adminAuth'

export default defineEventHandler(async (event) => {
  clearAdminToken(event)
  return { success: true }
})
