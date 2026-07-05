import { createError, defineEventHandler, getQuery } from 'h3'
import { useRuntimeConfig } from '#imports'
import { getCurrentUser } from '~/server/utils/auth'
import {
  filterPublishedItems,
  isValidDatabaseId,
  normalizeDatabaseId,
  queryNotionDatabase,
  queryNotionDatabaseAll,
} from '~/server/utils/notion'

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  const config = useRuntimeConfig()
  const query = getQuery(event)

  const notionApiKey = config.notionApiKey
  const databaseId = config.notionDatabaseId

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
      error: 'Notion Database ID is missing. Set NOTION_DATABASE_ID environment variable.',
      items: [],
    }
  }

  const normalizedId = normalizeDatabaseId(databaseId)

  if (!isValidDatabaseId(normalizedId)) {
    return {
      success: false,
      error: `Invalid Notion Database ID format. Expected 32-character hex string, got: ${normalizedId.substring(0, 20)}...`,
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

    const fetchAll = query.fetchAll !== 'false' && query.fetchAll !== '0'
    const pageSize = Math.min(parseInt((query.pageSize as string) || '100', 10), 100)

    const result = fetchAll
      ? await queryNotionDatabaseAll({
          databaseId: normalizedId,
          notionApiKey,
          filter,
          sorts,
        })
      : await queryNotionDatabase({
          databaseId: normalizedId,
          notionApiKey,
          pageSize,
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
      truncated: result.truncated ?? false,
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
