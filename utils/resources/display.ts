import type { ResourceListItem, ResourceType } from '~/types/resources'

export function slugFromContentPath(path: string): string {
  const segment = path.split('/').filter(Boolean).pop() || ''
  return segment.replace(/\.mdx?$/, '')
}

export function toResourceListItem(doc: {
  id: string
  path: string
  title?: string
  resourceType?: ResourceType
  description?: string
  link?: string
  category?: string
  author?: string
  publisher?: string
  year?: string
  status?: string
  rating?: string | number
  tags?: string[]
  icon?: string
  coverImageUrl?: string
  published?: boolean
  updatedAt?: string
}): ResourceListItem | null {
  if (!doc.published || !doc.resourceType) return null

  return {
    id: doc.id,
    slug: slugFromContentPath(doc.path),
    title: doc.title || 'Untitled',
    resourceType: doc.resourceType,
    description: doc.description || '',
    link: doc.link || '',
    category: doc.category || '',
    author: doc.author,
    publisher: doc.publisher,
    year: doc.year,
    status: doc.status,
    rating: doc.rating,
    tags: doc.tags || [],
    icon: doc.icon,
    coverImageUrl: doc.coverImageUrl,
    updatedAt: doc.updatedAt || null,
  }
}

export function formatResourceUpdatedAt(updatedAt: string | null): string | null {
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

export function getResourceLinkHost(link: string): string | null {
  if (!link) return null
  try {
    return new URL(link).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

export function getResourceTypeIcon(type: ResourceType, customIcon?: string): string {
  if (customIcon) return customIcon
  switch (type) {
    case 'book':
      return 'mdi:book-open-variant'
    case 'tool':
      return 'mdi:tools'
    case 'learning':
      return 'mdi:school'
    default:
      return 'mdi:link'
  }
}
