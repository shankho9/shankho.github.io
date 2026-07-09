import { createError, defineEventHandler, getQuery, setResponseHeader } from 'h3'
import { getCurrentUser } from '~/server/utils/auth'
import { isNotionHostedImageUrl } from '~/server/utils/notionImages'

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  const url = getQuery(event).url
  if (typeof url !== 'string' || !url.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Missing image url' })
  }

  const decodedUrl = decodeURIComponent(url.trim())
  if (!isNotionHostedImageUrl(decodedUrl)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid image url' })
  }

  const response = await fetch(decodedUrl, {
    headers: {
      Accept: 'image/*',
    },
  })

  if (!response.ok) {
    throw createError({
      statusCode: response.status === 404 ? 404 : 502,
      statusMessage: 'Failed to fetch Notion image',
    })
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg'
  setResponseHeader(event, 'Content-Type', contentType)
  setResponseHeader(event, 'Cache-Control', 'private, max-age=3600')
  setResponseHeader(event, 'X-Content-Type-Options', 'nosniff')

  return response.body
})
