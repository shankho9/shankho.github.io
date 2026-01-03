// Server-side plugin to initialize database connection monitoring
// This runs on the server side to start health checks

export default defineNuxtPlugin({
  name: 'db-connection-monitoring',
  setup() {
    // Only run on server side
    if (import.meta.server) {
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
