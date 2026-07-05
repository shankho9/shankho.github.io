import type { NotionItem } from '~/server/utils/notion'
import { getItemCategories, getItemImageUrl, getItemString } from '~/server/utils/notion'

export interface AppListItem {
  id: string
  title: string
  description: string
  version: string
  categories: string[]
  playStoreUrl: string | null
  iconUrl: string | null
  hasApk: boolean
  hasMsix: boolean
  updatedAt: string | null
}

export function getAppR2Key(item: NotionItem, format: 'apk' | 'msix'): string | null {
  const key =
    format === 'apk'
      ? getItemString(item, 'Apk Key', 'ApkKey', 'apkKey', 'APK Key')
      : getItemString(item, 'Msix Key', 'MsixKey', 'msixKey', 'MSIX Key')

  return key || null
}

export function toAppListItem(item: NotionItem): AppListItem {
  const apkKey = getAppR2Key(item, 'apk')
  const msixKey = getAppR2Key(item, 'msix')

  return {
    id: item.id,
    title: getItemString(item, 'Title', 'title', 'Name', 'name') || 'Untitled',
    description: getItemString(item, 'Description', 'description'),
    version: getItemString(item, 'Version', 'version'),
    categories: getItemCategories(item),
    playStoreUrl:
      getItemString(item, 'Play Store URL', 'PlayStoreURL', 'playStoreUrl', 'Play Store Url') ||
      null,
    iconUrl: getItemImageUrl(item),
    hasApk: Boolean(apkKey),
    hasMsix: Boolean(msixKey),
    updatedAt: item.updatedAt || null,
  }
}

export function findAppById(items: NotionItem[], appId: string): NotionItem | undefined {
  const normalizedId = appId.replace(/-/g, '')
  return items.find((item) => item.id.replace(/-/g, '') === normalizedId)
}
