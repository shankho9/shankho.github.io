import { createError, defineEventHandler, getQuery, sendRedirect } from 'h3'
import { useRuntimeConfig } from '#imports'
import { findAppById, getAppR2Key } from '~/server/utils/apps'
import { getCurrentUser } from '~/server/utils/auth'
import { APP_TYPE_FILTER, queryNotionDatabase } from '~/server/utils/notion'
import { getPresignedDownloadUrl, isAllowedAppsKey } from '~/server/utils/r2'

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  const query = getQuery(event)
  const appId = query.id as string | undefined
  const format = query.format as string | undefined

  if (!appId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing app id' })
  }

  if (format !== 'apk' && format !== 'msix') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid format. Use apk or msix.' })
  }

  const config = useRuntimeConfig()
  const notionApiKey = config.notionApiKey
  const databaseId = config.notionDatabaseId

  if (!notionApiKey || !databaseId) {
    throw createError({ statusCode: 500, statusMessage: 'Notion is not configured' })
  }

  const result = await queryNotionDatabase({
    databaseId,
    notionApiKey,
    pageSize: 100,
    filter: APP_TYPE_FILTER,
  })

  if (!result.success) {
    throw createError({
      statusCode: 502,
      statusMessage: result.error || 'Failed to fetch app from Notion',
    })
  }

  const app = findAppById(result.items, appId)
  if (!app) {
    throw createError({ statusCode: 404, statusMessage: 'App not found' })
  }

  const objectKey = getAppR2Key(app, format)
  if (!objectKey || !isAllowedAppsKey(objectKey)) {
    throw createError({
      statusCode: 404,
      statusMessage: `No ${format.toUpperCase()} download available for this app`,
    })
  }

  try {
    const presignedUrl = await getPresignedDownloadUrl(objectKey)
    return sendRedirect(event, presignedUrl, 302)
  } catch (error) {
    console.error('[Apps Download] Failed to generate presigned URL:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to generate download link',
    })
  }
})
