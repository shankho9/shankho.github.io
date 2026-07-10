import type { AppListItem } from '~/types/apps'

export function getAppDownloadUrl(appSlug: string, format: 'apk' | 'msix'): string {
  return `/api/apps/download?slug=${encodeURIComponent(appSlug)}&format=${format}`
}

export function getAppCategoryIcon(category: string): string {
  const lower = category.toLowerCase()
  if (lower.includes('android')) return 'mdi:android'
  if (lower.includes('ios') || lower.includes('apple')) return 'mdi:apple'
  if (lower.includes('desktop') || lower.includes('windows')) return 'mdi:microsoft-windows'
  if (lower.includes('mac')) return 'mdi:apple'
  if (lower.includes('web')) return 'mdi:web'
  return 'mdi:cellphone'
}

export function formatAppUpdatedAt(updatedAt: string | null): string | null {
  if (!updatedAt) return null
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(updatedAt))
  } catch {
    return null
  }
}

export function getAppModalBody(app: AppListItem): string {
  if (app.details?.trim()) return app.details.trim()
  if (app.description.trim()) return app.description.trim()
  return ''
}

export function appHasAnyAction(app: AppListItem): boolean {
  return Boolean(app.webUrl || app.storeUrl || app.hasApk || app.hasMsix)
}
