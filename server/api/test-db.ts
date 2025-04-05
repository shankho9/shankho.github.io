// server/api/test-db.ts
import { defineEventHandler } from 'h3'
import { query } from '~/server/utils/db'

export default defineEventHandler(async () => {
  try {
    const result = await query<{ now: string }>('SELECT NOW()')

    return {
      status: 'connected',
      time: result[0].now,
      env: process.env.NODE_ENV,
      db: process.env.NODE_ENV === 'production' ? 'Production DB' : 'Development DB',
    }
  } catch (err: unknown) {
    console.error('DB connection error:', err)

    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Unknown error',
    }
  }
})
