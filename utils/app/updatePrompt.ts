import { useToast } from '~/composables/useToast'

const UPDATE_TOAST_ID = 'app-update-toast'

/** Show a non-blocking prompt when a newer build is available. */
export function showAppUpdatePrompt(message = 'Site updated — refresh to get the latest version') {
  if (import.meta.server) return

  const { showToast, removeToast } = useToast()

  removeToast(UPDATE_TOAST_ID)

  showToast(message, 'info', 0, {
    id: UPDATE_TOAST_ID,
    action: {
      label: 'Refresh',
      onClick: () => window.location.reload(),
    },
  })
}

/** True when a dynamic import/chunk load failed (common after deploys). */
export function isChunkLoadError(message: string): boolean {
  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('ChunkLoadError') ||
    message.includes('Loading chunk') ||
    message.includes('Importing a module script failed')
  )
}
