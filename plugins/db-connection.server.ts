// Server-side plugin to initialize database connection monitoring
// This runs on the server side to start health checks

export default defineNuxtPlugin({
  name: 'db-connection-monitoring',
  setup() {
    // Only run on server side AND not during build
    // During build, NITRO_PRESET is typically undefined
    // At runtime, NITRO_PRESET is set to the deployment preset (e.g., 'vercel', 'node-server')
    // Check for explicit build flags or missing NITRO_PRESET (which indicates build mode)
    const isBuildMode =
      typeof process !== 'undefined' &&
      (process.env.NITRO_PRESET === undefined ||
        process.env.NUXT_BUILD === 'true' ||
        process.env.BUILD === 'true')

    if (import.meta.server && !isBuildMode) {
      // Use onNuxtReady to ensure we're in the right lifecycle
      // Import and initialize connection monitoring asynchronously
      import('~/server/utils/db')
        .then(({ initializeConnectionMonitoring }) => {
          // Defer initialization to avoid setInterval warnings
          if (typeof process !== 'undefined' && process.nextTick) {
            process.nextTick(() => {
              initializeConnectionMonitoring()
              console.log('[DB] Connection monitoring initialized')
            })
          } else {
            setTimeout(() => {
              initializeConnectionMonitoring()
              console.log('[DB] Connection monitoring initialized')
            }, 100)
          }
        })
        .catch((error) => {
          console.warn('[DB] Failed to initialize connection monitoring:', error)
        })
    }
  },
})
