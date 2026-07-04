/** Preload OAuth client IDs when missing from the client bundle (e.g. Vercel env set after build). */
export default defineNuxtPlugin(() => {
  resolvePublicOAuthConfig().catch((error) => {
    console.warn('[OAuth] Could not preload public OAuth config:', error)
  })
})
