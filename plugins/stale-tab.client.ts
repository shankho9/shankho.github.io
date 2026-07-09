import { isChunkLoadError, showAppUpdatePrompt } from '~/utils/app/updatePrompt'

const VERSION_STORAGE_KEY = 'app_build_id'
let hasShownUpdatePrompt = false

function getStoredBuildId(): string | null {
  return sessionStorage.getItem(VERSION_STORAGE_KEY)
}

function storeBuildId(buildId: string) {
  sessionStorage.setItem(VERSION_STORAGE_KEY, buildId)
}

async function checkForNewBuild(currentBuildId: string) {
  if (hasShownUpdatePrompt || currentBuildId === 'dev') return

  try {
    const { buildId } = await $fetch<{ buildId: string }>('/api/version', {
      cache: 'no-store',
      timeout: 5000,
    })

    const storedBuildId = getStoredBuildId()
    if (!storedBuildId) {
      storeBuildId(buildId)
      return
    }

    if (buildId !== storedBuildId) {
      hasShownUpdatePrompt = true
      showAppUpdatePrompt()
    }
  } catch (error) {
    console.warn('[StaleTab] Version check failed:', error)
  }
}

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const currentBuildId = String(config.public.buildId || 'dev')
  storeBuildId(currentBuildId)

  const router = useRouter()

  router.onError((error) => {
    const message = error instanceof Error ? error.message : String(error)
    if (isChunkLoadError(message)) {
      showAppUpdatePrompt('This page needs a refresh after a site update.')
    }
  })

  const handleVisibilityChange = () => {
    if (document.visibilityState !== 'visible') return
    void checkForNewBuild(currentBuildId)
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)
})
