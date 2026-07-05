const DEBUG_INGEST = 'http://127.0.0.1:7840/ingest/767d3ad0-6d04-4d9a-bc94-d2ef4df7b9b9'
const DEBUG_SESSION = 'a61321'

function logClient(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
): void {
  // #region agent log
  fetch(DEBUG_INGEST, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': DEBUG_SESSION },
    body: JSON.stringify({
      sessionId: DEBUG_SESSION,
      location,
      message,
      data,
      hypothesisId,
      timestamp: Date.now(),
      runId: 'deploy-trace',
    }),
  }).catch(() => {})
  // #endregion
}

export default defineNuxtPlugin(async () => {
  if (!import.meta.client) return

  const route = useRoute()
  const config = useRuntimeConfig()
  const shouldTrace =
    route.query.debugDeploy === '1' ||
    (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('debug_deploy') === '1')

  if (!shouldTrace) return

  const pageUrl = window.location.href
  const publicMarker = (config.public as { deployDebugMarker?: string }).deployDebugMarker || null

  logClient(
    'plugins/deploy-debug.client.ts:entry',
    'deploy debug trace started',
    { pageUrl, publicMarker, query: route.query.debugDeploy ?? null },
    'E',
  )

  try {
    const info = await $fetch<{
      codeMarker?: string
      vercel?: { gitCommitSha?: string | null; env?: string | null; deploymentId?: string | null }
      githubExpectedHead?: string
      features?: Record<string, boolean>
    }>('/api/debug/deploy-info')

    const prodSha = info.vercel?.gitCommitSha ?? null
    const expected = info.githubExpectedHead ?? null
    const shaMatches = Boolean(
      prodSha && expected && (prodSha === expected || prodSha.startsWith('8ccc2eb')),
    )

    logClient(
      'plugins/deploy-debug.client.ts:deploy-info',
      'production deploy-info received',
      {
        pageUrl,
        prodSha,
        expected,
        shaMatches,
        vercelEnv: info.vercel?.env ?? null,
        deploymentId: info.vercel?.deploymentId ?? null,
        codeMarker: info.codeMarker ?? null,
        features: info.features ?? null,
      },
      shaMatches ? 'B-rejected' : 'A',
    )

    const html = document.documentElement.innerHTML
    const hasIntegrationNote = html.includes('Under the hood')
    const hasComingSoon = html.includes('coming soon') && html.includes('Musical Notes')
    const hasMusicalNotesTab =
      html.includes('Edit in Tina') || html.includes('No lyrics entries yet')

    logClient(
      'plugins/deploy-debug.client.ts:dom-scan',
      'DOM feature scan on current page',
      {
        pageUrl,
        hasIntegrationNote,
        hasComingSoon,
        hasMusicalNotesTab,
        activeTab: route.query.tab ?? null,
      },
      'E',
    )
  } catch (error) {
    logClient(
      'plugins/deploy-debug.client.ts:error',
      'deploy-info fetch failed',
      {
        pageUrl,
        error: error instanceof Error ? error.message : String(error),
      },
      'C',
    )
  }
})
