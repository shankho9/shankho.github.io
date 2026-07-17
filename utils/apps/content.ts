import type { AppListItem } from '~/types/apps'
import { slugFromContentPath } from '~/utils/resources/display'

export type { AppListItem }

export interface AppContentDoc {
  id: string
  path: string
  title?: string
  description?: string
  techSpec?: string
  details?: string
  categories?: string[]
  version?: string
  webUrl?: string
  storeUrl?: string
  iconUrl?: string
  apkKey?: string
  msixKey?: string
  published?: boolean
  updatedAt?: string
}

export function toAppListItem(doc: AppContentDoc): AppListItem {
  const slug = slugFromContentPath(doc.path)

  return {
    id: doc.id,
    slug,
    title: doc.title || 'Untitled',
    description: doc.description || '',
    techSpec: doc.techSpec?.trim() || null,
    details: doc.details?.trim() || null,
    version: doc.version || '',
    categories: doc.categories || [],
    webUrl: doc.webUrl?.trim() || null,
    storeUrl: doc.storeUrl?.trim() || null,
    iconUrl: doc.iconUrl?.trim() || null,
    hasApk: Boolean(doc.apkKey?.trim()),
    hasMsix: Boolean(doc.msixKey?.trim()),
    updatedAt: doc.updatedAt || null,
  }
}

export function findAppBySlug(items: AppContentDoc[], slug: string): AppContentDoc | undefined {
  return items.find((item) => slugFromContentPath(item.path) === slug)
}

export function getAppR2Key(doc: AppContentDoc, format: 'apk' | 'msix'): string | null {
  const key = format === 'apk' ? doc.apkKey : doc.msixKey
  return key?.trim() || null
}
