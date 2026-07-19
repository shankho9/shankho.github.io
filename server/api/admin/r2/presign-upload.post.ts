import { createError, getRequestHeader, readBody } from 'h3'
import { requireAdminUser } from '~/server/utils/adminUsers'
import {
  DEFAULT_UPLOAD_PRESIGN_TTL_SECONDS,
  buildUploadObjectKey,
  ensureR2UploadCors,
  getDefaultBucketName,
  getPresignedUploadUrl,
  isAllowedAppsKey,
  normalizeAppsObjectKey,
} from '~/server/utils/r2'

interface PresignUploadBody {
  bucket?: string
  folder?: string
  fileName?: string
  contentType?: string
}

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)

  const body = await readBody<PresignUploadBody>(event)
  const folder = body?.folder?.trim() || ''
  const fileName = body?.fileName?.trim() || ''
  const contentType = body?.contentType?.trim() || undefined
  const bucket = body?.bucket?.trim() || getDefaultBucketName() || ''

  if (!bucket) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bucket is required. Provide a bucket or set R2_BUCKET_NAME.',
    })
  }

  if (!folder || !fileName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Folder and file name are required.',
    })
  }

  let objectKey: string
  try {
    objectKey = buildUploadObjectKey(folder, fileName)
  } catch (err) {
    throw createError({
      statusCode: 400,
      statusMessage: err instanceof Error ? err.message : 'Invalid folder or file name.',
    })
  }

  const normalizedKey = normalizeAppsObjectKey(objectKey, bucket)
  if (!isAllowedAppsKey(normalizedKey)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Object key is not allowed: ${objectKey}`,
    })
  }

  const expiresIn = DEFAULT_UPLOAD_PRESIGN_TTL_SECONDS
  const requestOrigin = getRequestHeader(event, 'origin') || undefined

  try {
    // Large browser uploads need bucket CORS; configure from the site origin.
    await ensureR2UploadCors(bucket, requestOrigin)

    const uploadUrl = await getPresignedUploadUrl({
      bucket,
      objectKey: normalizedKey,
      contentType,
      expiresInSeconds: expiresIn,
    })

    return {
      success: true,
      bucket,
      objectKey: normalizedKey,
      uploadUrl,
      expiresIn,
      mode: 'direct',
    }
  } catch (err) {
    throw createError({
      statusCode: 500,
      statusMessage: err instanceof Error ? err.message : 'Failed to create upload URL.',
    })
  }
})
