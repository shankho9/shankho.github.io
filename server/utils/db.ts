// server/utils/db.ts
import pg from 'pg'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
})

// Replace `any` with `Record<string, unknown>`
export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const client = await pool.connect()
  try {
    const res = await client.query<T>(text, params)
    return res.rows
  } finally {
    client.release()
  }
}
