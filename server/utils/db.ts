import pg from 'pg'
import { useRuntimeConfig } from '#imports'

const { Pool } = pg

let pool: pg.Pool | null = null

// Track clients that have had statement_timeout set to avoid redundant SQL calls
const clientsWithTimeout = new WeakSet<pg.PoolClient>()

// Set statement timeout on a client if not already set
async function ensureStatementTimeout(client: pg.PoolClient): Promise<void> {
  if (!clientsWithTimeout.has(client)) {
    // Set statement timeout to 10 seconds (10000ms)
    await client.query('SET statement_timeout = 10000')
    clientsWithTimeout.add(client)
  }
}

function getPool(): pg.Pool {
  // Prevent pool creation during build
  // NITRO_PRESET is set both during build AND at runtime (e.g., 'vercel' on Vercel)
  // So we check if NITRO_PRESET is set to a build-time value (not a runtime preset)
  // Build-time presets: undefined or values that indicate build process
  // Runtime presets: 'vercel', 'netlify', 'node-server', etc.
  // During actual build (not runtime), NITRO_PRESET might be undefined or set to build-specific values
  // At runtime on Vercel, NITRO_PRESET is 'vercel', so we allow it
  // The key is: if getPool() is called during build, useRuntimeConfig() will fail naturally
  // So we don't need to block it - let it fail naturally if called during build

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
      connectionTimeoutMillis: 15000, // 15 seconds to establish connection (increased from 10s)
      idleTimeoutMillis: 30000, // 30 seconds before closing idle connections
      max: 10, // Maximum number of clients in the pool
      // Note: statement_timeout must be set via SQL, not as a Pool option
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
    // Set statement timeout to prevent queries from hanging indefinitely
    await ensureStatementTimeout(client)
    const res = await client.query<T>(text, params)
    return res.rows
  } catch (error) {
    console.error('[DB] Database query error:', error)
    if (error instanceof Error) {
      console.error('[DB] Error message:', error.message)
      console.error('[DB] Error stack:', error.stack)

      // Provide more helpful error messages for common issues
      if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
        console.error('[DB] Connection timeout detected')
        console.error('[DB] Troubleshooting steps:')
        console.error('[DB] 1. Check if database server is running and accessible')
        console.error('[DB] 2. Verify DATABASE_URL is correct in environment variables')
        console.error('[DB] 3. Check network connectivity to database host')
        console.error('[DB] 4. Verify database credentials are correct')
        console.error('[DB] 5. Check if database firewall allows connections from this IP')
      } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
        console.error('[DB] DNS resolution failed - database hostname cannot be resolved')
        console.error('[DB] Verify DATABASE_URL hostname is correct')
      } else if (error.message.includes('ECONNREFUSED')) {
        console.error(
          '[DB] Connection refused - database server may not be running or port is incorrect',
        )
      }
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
    // Set statement timeout to prevent queries from hanging indefinitely
    await ensureStatementTimeout(client)
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
