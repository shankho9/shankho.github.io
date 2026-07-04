/** Public OAuth client IDs — readable at request time on Vercel (not only at build). */
export default defineEventHandler(() => ({
  googleClientId: process.env.NUXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || '',
  githubClientId: process.env.NUXT_PUBLIC_GITHUB_CLIENT_ID?.trim() || '',
}))
