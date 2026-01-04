import pg from 'pg'
import { useRuntimeConfig } from '#imports'

const { Pool } = pg

let pool: pg.Pool | null = null
let poolInitialized = false
let lastConnectionAttempt = 0
let isReconnecting = false
const CONNECTION_RETRY_DELAY = 5000 // 5 seconds between connection attempts
const MAX_RECONNECT_ATTEMPTS = 10 // Maximum reconnection attempts before giving up
let reconnectAttempts = 0

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
  // Only block if we have explicit build flags - don't rely on NITRO_PRESET
  // as it might be undefined in dev mode too
  const isBuildMode =
    typeof process !== 'undefined' &&
    (process.env.NUXT_BUILD === 'true' || process.env.BUILD === 'true')

  if (isBuildMode) {
    throw new Error(
      'Database pool cannot be created during build. This should only be called at runtime.',
    )
  }

  // Only recreate pool if it doesn't exist or is actually closed
  // Don't recreate on every check - pool persists across requests
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

    // Validate connection string format
    try {
      const url = new URL(databaseUrl)
      if (!url.protocol.startsWith('postgres')) {
        console.warn('[DB] DATABASE_URL does not appear to be a PostgreSQL connection string')
      }
    } catch (urlError) {
      console.warn('[DB] DATABASE_URL format validation failed:', urlError)
      // Continue anyway as the connection string might be in a different format
    }

    pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      // Add connection timeout and retry settings
      connectionTimeoutMillis: 10000, // 10 seconds to establish connection
      idleTimeoutMillis: 30000, // 30 seconds before closing idle connections
      max: 20, // Increased max connections for better concurrency
      min: 2, // Keep at least 2 connections warm
      // Allow pool to retry connections
      // Set to true to allow Node.js to exit when pool is idle (important for build processes)
      allowExitOnIdle: true,
      // Keep connections alive
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      // Application name for better monitoring
      application_name: 'planner-app',
      // Note: statement_timeout must be set via SQL, not as a Pool option
    })

    // Handle pool errors - only log, don't reset pool immediately
    // The pool will automatically retry connections, and we only reset on persistent failures
    pool.on('error', (err) => {
      const errorMessage = err instanceof Error ? err.message : String(err)

      // Only log critical errors that indicate a real problem
      // Don't reset pool on transient errors - pg-pool handles these automatically
      if (
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('ENOTFOUND') ||
        errorMessage.includes('getaddrinfo')
      ) {
        console.warn('[DB] Pool connection error (will retry automatically):', errorMessage)
        // Don't reset pool - let pg-pool handle retries
        // Only mark as uninitialized if we get multiple consecutive failures
      } else {
        // For other errors, just log - they might be transient
        console.debug('[DB] Pool error (likely transient):', errorMessage)
      }
    })

    // Handle successful connections
    pool.on('connect', () => {
      poolInitialized = true
      reconnectAttempts = 0 // Reset on successful connection
      isReconnecting = false
      // Connection established - no logging to avoid disruption
    })

    poolInitialized = true
  } else if (!poolInitialized && pool) {
    // Pool exists but wasn't marked as initialized - mark it now
    // This handles cases where pool was created but initialization flag was reset
    poolInitialized = true
  }

  return pool
}

/**
 * Reset the database pool (useful for connection issues)
 */
export function resetPool(): void {
  if (pool) {
    pool.end().catch((err) => {
      console.error('[DB] Error closing pool:', err)
    })
    pool = null
    poolInitialized = false
  }
}

// Track consecutive health check failures
let consecutiveHealthCheckFailures = 0
const MAX_CONSECUTIVE_FAILURES = 3 // Only reset after 3 consecutive failures

/**
 * Test database connection health
 * More tolerant - allows transient failures without resetting pool
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT 1 as health_check')
    const isHealthy = result.length > 0 && result[0].health_check === 1
    if (isHealthy) {
      consecutiveHealthCheckFailures = 0 // Reset counter on success
    }
    return isHealthy
  } catch (error) {
    consecutiveHealthCheckFailures++
    // Only log if we have multiple consecutive failures
    if (consecutiveHealthCheckFailures >= MAX_CONSECUTIVE_FAILURES) {
      console.warn(`[DB] Health check failed ${consecutiveHealthCheckFailures} times:`, error)
    } else {
      console.debug('[DB] Health check failed (transient, will retry):', error)
    }
    return false
  }
}

/**
 * Start automatic reconnection attempts
 */
function startReconnectionAttempts(): void {
  if (isReconnecting) {
    return // Already reconnecting
  }

  isReconnecting = true
  console.log('[DB] Starting automatic reconnection attempts...')

  const attemptReconnect = async () => {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error(
        `[DB] Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Stopping automatic reconnection.`,
      )
      isReconnecting = false
      return
    }

    reconnectAttempts++
    console.log(`[DB] Reconnection attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`)

    try {
      // Reset pool to force new connection
      resetPool()

      // Wait a bit before attempting new connection
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Try to get a new pool and test connection
      getPool() // Ensure pool is initialized
      const isHealthy = await testConnection()

      if (isHealthy) {
        console.log('[DB] Reconnection successful!')
        isReconnecting = false
        reconnectAttempts = 0
      } else {
        console.warn('[DB] Reconnection attempt failed, will retry...')
      }
    } catch (error) {
      console.warn(`[DB] Reconnection attempt ${reconnectAttempts} failed:`, error)
    }
  }

  // Start immediate reconnection attempt
  attemptReconnect()

  // Periodic reconnection attempts removed to avoid setInterval on server
  // Reconnection now only happens on actual query failures
  // This avoids Nuxt setInterval warnings and improves performance
}

/**
 * Initialize connection health monitoring
 * DISABLED: Removed periodic health checks to avoid setInterval on server
 * Reconnection is now only triggered on actual query failures
 */
export function initializeConnectionMonitoring(): void {
  // Health monitoring disabled - reconnection happens on query failures only
  // This avoids Nuxt setInterval warnings and improves performance
  return
}

// Generic query function with typed result
export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  let client: pg.PoolClient | null = null
  let retries = 0
  const maxRetries = 3 // Maximum 3 retry attempts (4 total attempts: initial + 3 retries)

  while (retries <= maxRetries) {
    try {
      // Rate limit connection attempts
      if (retries > 0) {
        const now = Date.now()
        const timeSinceLastAttempt = now - lastConnectionAttempt
        if (timeSinceLastAttempt < CONNECTION_RETRY_DELAY) {
          // Wait for the remaining time to meet the delay requirement
          await new Promise((resolve) =>
            setTimeout(resolve, CONNECTION_RETRY_DELAY - timeSinceLastAttempt),
          )
        }
        // Update after wait to ensure proper rate limiting for next retry
        lastConnectionAttempt = Date.now()
      } else {
        // First attempt - just update timestamp
        lastConnectionAttempt = Date.now()
      }

      const pool = getPool()

      // Try to connect with timeout
      client = await Promise.race([
        pool.connect(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout')), 15000),
        ),
      ])

      // Set statement timeout to prevent queries from hanging indefinitely
      await ensureStatementTimeout(client)
      const res = await client.query<T>(text, params)

      // CRITICAL: Always release the client back to the pool, even on success
      // This prevents connection leaks that would exhaust the pool
      try {
        client.release()
      } catch (releaseError) {
        // Log release errors for debugging pool issues
        console.warn('[DB] Error releasing client after successful query:', releaseError)
      }

      return res.rows
    } catch (error) {
      // Release client if we got one (during error recovery)
      if (client) {
        try {
          client.release()
        } catch (releaseError) {
          // Log release errors during error recovery for debugging pool issues
          console.warn('[DB] Error releasing client during error recovery:', releaseError)
        }
        client = null
      }

      const errorName = error instanceof Error ? error.name : ''
      const errorMessage = error instanceof Error ? error.message : String(error)

      // Check if it's a connection error that might benefit from retry
      const isConnectionError =
        errorName === 'AggregateError' ||
        errorMessage.includes('ETIMEDOUT') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('ENOTFOUND') ||
        errorMessage.includes('Connection terminated')

      // Retry connection errors up to maxRetries times
      if (isConnectionError && retries < maxRetries) {
        retries++
        console.warn(`[DB] Connection error (attempt ${retries}/${maxRetries + 1}), retrying...`)

        // Reset pool if we've had multiple failures
        if (retries === 2) {
          console.warn('[DB] Resetting pool due to connection failures')
          resetPool()
          // Start automatic reconnection if not already running
          if (!isReconnecting) {
            startReconnectionAttempts()
          }
        }

        // Wait a bit before retrying (exponential backoff)
        const backoffDelay = Math.min(2000 * retries, 10000) // Max 10 seconds
        await new Promise((resolve) => setTimeout(resolve, backoffDelay))
        continue
      }

      // If all retries failed and it's a connection error, start reconnection attempts
      if (isConnectionError && retries >= maxRetries && !isReconnecting) {
        console.warn('[DB] All retries exhausted, starting automatic reconnection...')
        poolInitialized = false
        startReconnectionAttempts()
      }

      // Log error details
      console.error('[DB] Database query error:', error)
      if (error instanceof Error) {
        console.error('[DB] Error name:', errorName)
        console.error('[DB] Error message:', errorMessage)
        console.error('[DB] Error stack:', error.stack)

        // Provide more helpful error messages for common issues
        if (
          errorMessage.includes('ETIMEDOUT') ||
          errorMessage.includes('timeout') ||
          errorName === 'AggregateError'
        ) {
          console.error('[DB] Connection timeout detected')
          console.error('[DB] Troubleshooting steps:')
          console.error('[DB] 1. Check if database server is running and accessible')
          console.error('[DB] 2. Verify DATABASE_URL is correct in environment variables')
          console.error('[DB] 3. Check network connectivity to database host')
          console.error('[DB] 4. Verify database credentials are correct')
          console.error('[DB] 5. Check if database firewall allows connections from this IP')
        } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo')) {
          console.error('[DB] DNS resolution failed - database hostname cannot be resolved')
          console.error('[DB] Verify DATABASE_URL hostname is correct')
        } else if (errorMessage.includes('ECONNREFUSED')) {
          console.error(
            '[DB] Connection refused - database server may not be running or port is incorrect',
          )
        }
      }
      throw error
    }
  }

  // This should never be reached in practice, but TypeScript requires a return/throw
  // The while loop will always either return or throw before reaching here
  // However, we keep this as a safety net for type checking
  throw new Error('Query failed after maximum retries')
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
