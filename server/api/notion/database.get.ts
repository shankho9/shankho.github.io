import { defineEventHandler, getQuery } from 'h3'
import { useRuntimeConfig } from '#imports'

interface NotionDatabaseQuery {
  filter?: any
  sorts?: any[]
  page_size?: number
}

interface NotionPage {
  id: string
  properties: Record<string, any>
  url: string
  created_time: string
  last_edited_time: string
}

interface NotionResponse {
  results: NotionPage[]
  has_more: boolean
  next_cursor?: string
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)

  const notionApiKey = config.notionApiKey
  let databaseId = (query.databaseId as string) || config.notionDatabaseId

  if (!notionApiKey) {
    return {
      success: false,
      error: 'Notion API key is missing. Please set NOTION_API_KEY environment variable.',
      items: [],
    }
  }

  if (!databaseId) {
    return {
      success: false,
      error: 'Notion Database ID is missing. Please provide databaseId query parameter or set NOTION_DATABASE_ID environment variable.',
      items: [],
    }
  }

  // Normalize database ID: remove hyphens and ensure it's a valid format
  // Notion API accepts IDs with or without hyphens, but we'll normalize to without hyphens
  databaseId = databaseId.replace(/-/g, '')
  
  // Validate format (should be 32 hex characters)
  if (!/^[a-f0-9]{32}$/i.test(databaseId)) {
    return {
      success: false,
      error: `Invalid Notion Database ID format. Expected 32-character hex string, got: ${databaseId.substring(0, 20)}...`,
      items: [],
    }
  }

  try {
    // Build query parameters
    // Note: database_id goes in the URL, not in the body
    const queryParams: Omit<NotionDatabaseQuery, 'database_id'> = {
      page_size: parseInt((query.pageSize as string) || '100', 10),
    }

    // Add filter if provided
    if (query.filter) {
      try {
        queryParams.filter = JSON.parse(query.filter as string)
      } catch {
        // Invalid JSON, ignore
      }
    }

    // Add sorts if provided
    if (query.sorts) {
      try {
        queryParams.sorts = JSON.parse(query.sorts as string)
      } catch {
        // Invalid JSON, ignore
      }
    }

    console.log('[Notion API] Fetching database:', databaseId)

    // Query Notion database
    const response = await fetch('https://api.notion.com/v1/databases/' + databaseId + '/query', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionApiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(queryParams),
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
        errorMessage = 'Unauthorized. Please check your NOTION_API_KEY is correct and starts with "secret_".'
      } else if (response.status === 404) {
        errorMessage = `Database not found with ID: ${databaseId}. Please verify:
1. The database ID is correct (32 characters)
2. The database has been shared with your Notion integration
3. To share: Open database → "..." menu → "Connections" → Select your integration → "Invite"`
      } else if (response.status === 403) {
        errorMessage = 'Access forbidden. Make sure the database is shared with your Notion integration.'
      }

      return {
        success: false,
        error: errorMessage,
        items: [],
      }
    }

    const data = (await response.json()) as NotionResponse

    // Transform Notion pages to our format
    const items = data.results.map((page) => {
      // Extract properties based on common Notion property types
      const extractProperty = (prop: any): any => {
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
          case 'files':
            // Return array of file URLs, but also extract first image URL for convenience
            const fileUrls = prop.files?.map((f: any) => f.file?.url || f.external?.url) || []
            // If it's a single image, return the URL directly; otherwise return array
            return fileUrls.length === 1 ? fileUrls[0] : fileUrls
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

      // Build item object from properties
      const item: any = {
        id: page.id,
        notionUrl: page.url,
        createdAt: page.created_time,
        updatedAt: page.last_edited_time,
      }

      // Extract all properties
      Object.keys(page.properties).forEach((key) => {
        const prop = page.properties[key]
        item[key] = extractProperty(prop)
        // Also create camelCase version for easier access
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
        if (camelKey !== key) {
          item[camelKey] = extractProperty(prop)
        }
      })

      return item
    })

    // Filter by Published checkbox if property exists
    const publishedItems = items.filter((item) => {
      const published = item.Published || item.published
      // If Published property doesn't exist, include all items (backward compatibility)
      if (published === undefined) return true
      return published === true
    })

    console.log(`[Notion API] Successfully fetched ${items.length} items from database, ${publishedItems.length} published`)

    return {
      success: true,
      items: publishedItems,
      hasMore: data.has_more,
      nextCursor: data.next_cursor,
    }
  } catch (error) {
    console.error('[Notion API] Failed to fetch database:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch from Notion',
      items: [],
    }
  }
})

