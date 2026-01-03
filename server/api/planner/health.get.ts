import { defineEventHandler } from 'h3'
import { testConnection } from '~/server/utils/db'

export default defineEventHandler(async (_event) => {
  try {
    const isHealthy = await testConnection()
    return {
      status: isHealthy ? 'connected' : 'disconnected',
      healthy: isHealthy,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error('[Health] Database health check failed:', error)
    return {
      status: 'error',
      healthy: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
})
