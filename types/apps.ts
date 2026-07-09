export interface AppListItem {
  id: string
  slug: string
  title: string
  description: string
  details: string | null
  version: string
  categories: string[]
  webUrl: string | null
  playStoreUrl: string | null
  iconUrl: string | null
  hasApk: boolean
  hasMsix: boolean
  updatedAt: string | null
}
