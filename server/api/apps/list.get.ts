import { createError, defineEventHandler } from 'h3'
import { useRuntimeConfig } from '#imports'
import { toAppListItem } from '~/server/utils/apps'
import { getCurrentUser } from '~/server/utils/auth'
import { envOrConfig } from '~/server/utils/runtimeEnv'
import { APP_TYPE_FILTER, queryNotionDatabaseAll } from '~/server/utils/notion'

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  const config = useRuntimeConfig(event)
  const notionApiKey = envOrConfig(config.notionApiKey, 'NOTION_API_KEY')
  const databaseId = envOrConfig(config.notionDatabaseId, 'NOTION_DATABASE_ID')

  if (!notionApiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Notion API key is missing. Set NOTION_API_KEY.',
    })
  }

  if (!databaseId) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Notion database ID is missing. Set NOTION_DATABASE_ID.',
    })
  }

  const result = await queryNotionDatabaseAll({
    databaseId,
    notionApiKey,
    filter: APP_TYPE_FILTER,
  })

  if (!result.success) {
    throw createError({
      statusCode: 502,
      statusMessage: result.error || 'Failed to fetch apps from Notion',
    })
  }

  return {
    success: true,
    items: result.items.map(toAppListItem),
    truncated: result.truncated ?? false,
    hasMore: result.hasMore ?? false,
  }
})
