import { deployDebugLog } from '~/server/utils/deployDebugLog'

/** Current codebase markers — bump when tracing a specific release. */
const CODE_MARKER = 'deploy-debug-v1-serverIsAdmin-libraryIntegration'

export default defineEventHandler((event) => {
  const info = {
    codeMarker: CODE_MARKER,
    vercel: {
      env: process.env.VERCEL_ENV || null,
      gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
      gitCommitRef: process.env.VERCEL_GIT_COMMIT_REF || null,
      url: process.env.VERCEL_URL || null,
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID || null,
    },
    runtime: {
      nodeEnv: process.env.NODE_ENV || null,
      nitroPreset: process.env.NITRO_PRESET || null,
    },
    features: {
      libraryIntegrationNote: true,
      musicalNotesTab: true,
      settingsServerIsAdmin: true,
      adminPasscode403Hint: true,
    },
    githubExpectedHead: '8ccc2ebd410150ba05c6dd2f9fbaa4810877867a',
    checkedAt: new Date().toISOString(),
  }

  // #region agent log
  deployDebugLog(
    'server/api/debug/deploy-info.get.ts',
    'deploy-info requested',
    {
      vercelEnv: info.vercel.env,
      gitCommitSha: info.vercel.gitCommitSha,
      gitCommitRef: info.vercel.gitCommitRef,
      deploymentId: info.vercel.deploymentId,
      codeMarker: info.codeMarker,
      matchesExpected:
        info.vercel.gitCommitSha === info.githubExpectedHead ||
        info.vercel.gitCommitSha?.startsWith('8ccc2eb') === true,
    },
    'A',
  )
  // #endregion

  setHeader(event, 'Cache-Control', 'no-store')
  return info
})
