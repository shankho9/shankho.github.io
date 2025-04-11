import pg from 'pg'
import { useRuntimeConfig } from '#imports'

const { Pool } = pg

let pool: pg.Pool | null = null

function getPool(): pg.Pool {
  if (!pool) {
    const config = useRuntimeConfig()

    pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })
  }

  return pool
}

// Generic query function with typed result
export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const client = await getPool().connect()
  try {
    const res = await client.query<T>(text, params)
    return res.rows
  } finally {
    client.release()
  }
}
