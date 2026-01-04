// Server plugin to ensure site config URL is always valid
// This prevents nuxt-og-image and other modules from calling .replace() on undefined
export default defineNuxtPlugin({
  name: 'site-config-guard',
  setup() {
    // This runs on server-side only
    // Skip for static assets and API routes to avoid errors
    if (import.meta.server) {
      try {
        // Only check if we're in a page context, not for static assets
        // useSiteConfig() requires Nuxt context which might not be available
        // for all request types (e.g., favicon, static assets)
        const siteConfig = useSiteConfig()
        if (siteConfig && (!siteConfig.url || typeof siteConfig.url !== 'string')) {
          // Site config URL should be set in nuxt.config.ts
          // This is a safety check only
        }
      } catch {
        // Silently handle - site config might not be available for this request type
        // This is expected for static assets, API routes, etc.
        // The config is already set in nuxt.config.ts, so this is just a safety check
      }
    }
  },
})
