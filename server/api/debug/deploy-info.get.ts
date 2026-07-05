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
    githubSha: process.env.GITHUB_SHA || null,
    checkedAt: new Date().toISOString(),
    pipeline: {
      note: 'GitHub Actions CI (lint/format/build) does not deploy by itself; production updates require Vercel Git integration or the deploy job in build.yml.',
    },
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
      githubSha: info.githubSha,
      matchesExpected:
        Boolean(info.vercel.gitCommitSha) &&
        (info.vercel.gitCommitSha === info.githubSha ||
          info.vercel.gitCommitSha?.startsWith((info.githubSha || '').slice(0, 7)) === true),
    },
    'A',
  )
  // #endregion

  setHeader(event, 'Cache-Control', 'no-store')
  return info
})
