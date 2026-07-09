/** Lightweight build identifier for stale-tab detection. */
export default defineEventHandler(() => {
  const buildId =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_DEPLOYMENT_ID ||
    process.env.NUXT_PUBLIC_BUILD_ID ||
    'dev'

  setResponseHeader(event, 'Cache-Control', 'no-store, no-cache, must-revalidate')

  return { buildId }
})
