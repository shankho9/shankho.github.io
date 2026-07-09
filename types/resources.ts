export type ResourceType = 'book' | 'tool' | 'learning'

export interface ResourceListItem {
  id: string
  slug: string
  title: string
  resourceType: ResourceType
  description: string
  link: string
  category: string
  author?: string
  publisher?: string
  year?: string
  status?: string
  rating?: string | number
  tags: string[]
  icon?: string
  coverImageUrl?: string
  updatedAt: string | null
}
