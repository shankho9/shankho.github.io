import pg from 'pg'
import { useRuntimeConfig } from '#imports'

const { Pool } = pg

let pool: pg.Pool | null = null

function getPool(): pg.Pool {
  if (!pool) {
    const config = useRuntimeConfig()
    
    // Get DATABASE_URL from runtime config or fallback to process.env
    let databaseUrl = config.databaseUrl || process.env.DATABASE_URL

    if (!databaseUrl) {
      throw new Error(
        'DATABASE_URL is not configured. Please set DATABASE_URL environment variable.',
      )
    }

    // Remove quotes if present (sometimes .env files have quotes)
    databaseUrl = databaseUrl.trim().replace(/^["']|["']$/g, '')

    pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      // Add connection timeout and retry settings
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 10, // Maximum number of clients in the pool
    })

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('[DB] Unexpected error on idle client:', err)
    })
  }

  return pool
}

// Generic query function with typed result
export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  let client: pg.PoolClient | null = null
  try {
    const pool = getPool()
    client = await pool.connect()
    const res = await client.query<T>(text, params)
    return res.rows
  } catch (error) {
    console.error('[DB] Database query error:', error)
    if (error instanceof Error) {
      console.error('[DB] Error message:', error.message)
      console.error('[DB] Error stack:', error.stack)
    }
    throw error
  } finally {
    if (client) {
      client.release()
    }
  }
}
