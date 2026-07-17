export interface AppListItem {
  id: string
  slug: string
  title: string
  description: string
  techSpec: string | null
  details: string | null
  version: string
  categories: string[]
  webUrl: string | null
  storeUrl: string | null
  iconUrl: string | null
  hasApk: boolean
  hasMsix: boolean
  updatedAt: string | null
  likeCount?: number
  commentCount?: number
}
