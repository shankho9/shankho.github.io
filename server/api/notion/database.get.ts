import { defineEventHandler, getQuery } from 'h3'
import { useRuntimeConfig } from '#imports'
import {
  filterPublishedItems,
  isValidDatabaseId,
  normalizeDatabaseId,
  queryNotionDatabase,
} from '~/server/utils/notion'

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
      error:
        'Notion Database ID is missing. Please provide databaseId query parameter or set NOTION_DATABASE_ID environment variable.',
      items: [],
    }
  }

  databaseId = normalizeDatabaseId(databaseId)

  if (!isValidDatabaseId(databaseId)) {
    return {
      success: false,
      error: `Invalid Notion Database ID format. Expected 32-character hex string, got: ${databaseId.substring(0, 20)}...`,
      items: [],
    }
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let filter: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let sorts: any[]

    if (query.filter) {
      try {
        filter = JSON.parse(query.filter as string)
      } catch {
        // Invalid JSON, ignore
      }
    }

    if (query.sorts) {
      try {
        sorts = JSON.parse(query.sorts as string)
      } catch {
        // Invalid JSON, ignore
      }
    }

    const result = await queryNotionDatabase({
      databaseId,
      notionApiKey,
      pageSize: parseInt((query.pageSize as string) || '100', 10),
      filter,
      sorts,
    })

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        items: [],
      }
    }

    const publishedItems = filterPublishedItems(result.items)

    return {
      success: true,
      items: publishedItems,
      hasMore: result.hasMore,
      nextCursor: result.nextCursor,
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
