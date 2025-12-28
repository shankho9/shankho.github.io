import pg from 'pg'
import { useRuntimeConfig } from '#imports'

const { Pool } = pg

let pool: pg.Pool | null = null

function getPool(): pg.Pool {
  // Prevent pool creation during build
  // During build, NITRO_PRESET is set, and we shouldn't create database connections
  // Check if we're in a build context by checking for build-related env vars and process args
  const isBuildContext = 
    process.env.NITRO_PRESET || 
    process.env.NUXT_BUILD ||
    // Check if we're running in a build context (npm run build, nuxt build, etc.)
    (typeof process !== 'undefined' && process.argv && (
      process.argv.some(arg => arg.includes('build') || arg.includes('nuxt')) &&
      !process.argv.some(arg => arg.includes('preview') || arg.includes('start'))
    ))
  
  if (isBuildContext) {
    throw new Error('Database pool cannot be created during build. This should only be called at runtime.')
  }

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

/**
 * Execute a function within a database transaction
 * The transaction is automatically committed on success or rolled back on error
 */
export async function withTransaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const pool = getPool()
  let client: pg.PoolClient | null = null
  let originalError: unknown = null
  let rollbackAttempted = false
  try {
    client = await pool.connect()
    await client.query('BEGIN')
    const result = await callback(client)
    try {
      await client.query('COMMIT')
    } catch (commitError) {
      // If COMMIT fails, try to rollback and log both errors
      console.error('[DB] Transaction commit failed:', commitError)
      rollbackAttempted = true
      try {
        await client.query('ROLLBACK')
      } catch (rollbackError) {
        console.error('[DB] Transaction rollback also failed after commit error:', rollbackError)
      }
      throw commitError
    }
    return result
  } catch (error) {
    // Store the original error before attempting rollback
    originalError = error
    // Only attempt rollback if we haven't already tried (e.g., after a failed COMMIT)
    if (!rollbackAttempted && client) {
      try {
        await client.query('ROLLBACK')
      } catch (rollbackError) {
        // Log rollback failure but preserve the original error
        console.error('[DB] Transaction rollback failed:', rollbackError)
        console.error('[DB] Original error that triggered rollback:', originalError)
        // Still throw the original error, not the rollback error
      }
    }
    throw originalError
  } finally {
    if (client) {
      client.release()
    }
  }
}
