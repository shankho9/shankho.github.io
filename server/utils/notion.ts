export interface NotionItem {
  id: string
  notionUrl: string
  createdAt: string
  updatedAt: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

interface NotionPage {
  id: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties: Record<string, any>
  url: string
  created_time: string
  last_edited_time: string
}

interface NotionQueryResponse {
  results: NotionPage[]
  has_more: boolean
  next_cursor?: string
}

export interface NotionQueryOptions {
  databaseId: string
  notionApiKey: string
  pageSize?: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filter?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sorts?: any[]
}

export interface NotionQueryResult {
  success: boolean
  items: NotionItem[]
  hasMore?: boolean
  nextCursor?: string
  error?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractNotionProperty(prop: any): any {
  if (!prop) return null

  switch (prop.type) {
    case 'title':
      return prop.title?.[0]?.plain_text || ''
    case 'rich_text':
      return prop.rich_text?.[0]?.plain_text || ''
    case 'number':
      return prop.number
    case 'select':
      return prop.select?.name || null
    case 'multi_select':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return prop.multi_select?.map((s: any) => s.name) || []
    case 'date':
      return prop.date?.start || null
    case 'checkbox':
      return prop.checkbox || false
    case 'url':
      return prop.url || null
    case 'email':
      return prop.email || null
    case 'phone_number':
      return prop.phone_number || null
    case 'files': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fileUrls = prop.files?.map((f: any) => f.file?.url || f.external?.url) || []
      return fileUrls.length === 1 ? fileUrls[0] : fileUrls
    }
    case 'relation':
      return prop.relation || []
    case 'formula':
      return prop.formula
    case 'rollup':
      return prop.rollup
    default:
      return prop
  }
}

export function transformNotionPage(page: NotionPage): NotionItem {
  const item: NotionItem = {
    id: page.id,
    notionUrl: page.url,
    createdAt: page.created_time,
    updatedAt: page.last_edited_time,
  }

  Object.keys(page.properties).forEach((key) => {
    const prop = page.properties[key]
    item[key] = extractNotionProperty(prop)
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
    if (camelKey !== key) {
      item[camelKey] = extractNotionProperty(prop)
    }
  })

  return item
}

export function filterPublishedItems(items: NotionItem[]): NotionItem[] {
  return items.filter((item) => {
    const hasPublishedProp = item.Published !== undefined || item.published !== undefined
    if (!hasPublishedProp) return true
    return item.Published === true || item.published === true
  })
}

export function normalizeDatabaseId(databaseId: string): string {
  return databaseId.replace(/-/g, '')
}

export function isValidDatabaseId(databaseId: string): boolean {
  return /^[a-f0-9]{32}$/i.test(databaseId)
}

export async function queryNotionDatabase(
  options: NotionQueryOptions,
): Promise<NotionQueryResult> {
  const { databaseId, notionApiKey, pageSize = 100, filter, sorts } = options

  const normalizedId = normalizeDatabaseId(databaseId)

  if (!isValidDatabaseId(normalizedId)) {
    return {
      success: false,
      error: `Invalid Notion Database ID format. Expected 32-character hex string, got: ${normalizedId.substring(0, 20)}...`,
      items: [],
    }
  }

  const body: Record<string, unknown> = { page_size: pageSize }
  if (filter) body.filter = filter
  if (sorts) body.sorts = sorts

  const response = await fetch(`https://api.notion.com/v1/databases/${normalizedId}/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${notionApiKey}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorMessage = `Notion API error: ${response.status}`
    try {
      const errorJson = JSON.parse(errorText)
      errorMessage = errorJson.message || errorMessage
    } catch {
      errorMessage = errorText || errorMessage
    }

    console.error('[Notion API] Error:', response.status, errorMessage)

    if (response.status === 401) {
      errorMessage =
        'Unauthorized. Please check your NOTION_API_KEY is correct and starts with "secret_".'
    } else if (response.status === 404) {
      errorMessage = `Database not found with ID: ${normalizedId}. Please verify the database ID and that it is shared with your Notion integration.`
    } else if (response.status === 403) {
      errorMessage =
        'Access forbidden. Make sure the database is shared with your Notion integration.'
    }

    return { success: false, error: errorMessage, items: [] }
  }

  const data = (await response.json()) as NotionQueryResponse
  const items = data.results.map(transformNotionPage)

  return {
    success: true,
    items,
    hasMore: data.has_more,
    nextCursor: data.next_cursor,
  }
}

export function getItemString(item: NotionItem, ...keys: string[]): string {
  for (const key of keys) {
    const value = item[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return ''
}

export function getItemImageUrl(item: NotionItem): string | null {
  const image = item.Image || item.image || item.Cover || item.cover
  if (Array.isArray(image) && image.length > 0) {
    return typeof image[0] === 'string' ? image[0] : null
  }
  if (typeof image === 'string' && image) {
    return image
  }
  return null
}

export function getItemPlatforms(item: NotionItem): string[] {
  const platforms = item.Platforms || item.platforms
  if (Array.isArray(platforms)) {
    return platforms.filter((p): p is string => typeof p === 'string')
  }
  return []
}

export const APP_TYPE_FILTER = {
  and: [
    { property: 'Type', select: { equals: 'App' } },
    { property: 'Published', checkbox: { equals: true } },
  ],
}
