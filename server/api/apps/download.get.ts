import { createError, defineEventHandler, getQuery, sendRedirect } from 'h3'
import { getCurrentUser } from '~/server/utils/auth'
import { findAppBySlug, getAppR2Key } from '~/utils/apps/content'
import {
  getPresignedDownloadUrl,
  isAllowedAppsKey,
  normalizeAppsObjectKey,
} from '~/server/utils/r2'
import { envOrConfig } from '~/server/utils/runtimeEnv'

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  const query = getQuery(event)
  const slug = query.slug as string | undefined
  const format = query.format as string | undefined

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing app slug' })
  }

  if (format !== 'apk' && format !== 'msix') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid format. Use apk or msix.' })
  }

  const docs = await queryCollection(event, 'apps').all()
  const publishedApps = docs.filter((doc) => doc.published === true)
  const app = findAppBySlug(publishedApps, slug)

  if (!app) {
    throw createError({ statusCode: 404, statusMessage: 'App not found' })
  }

  const rawKey = getAppR2Key(app, format)
  const config = useRuntimeConfig(event)
  const bucketName = envOrConfig(config.r2BucketName, 'R2_BUCKET_NAME') || undefined
  const objectKey = rawKey ? normalizeAppsObjectKey(rawKey, bucketName) : null

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
