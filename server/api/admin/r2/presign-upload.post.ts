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

function r2ErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return 'Failed to create upload URL.'
  const msg = err.message || ''
  if (/AccessDenied|Access Denied|not authorized|InvalidAccessKeyId/i.test(msg)) {
    return (
      'R2 Access Denied. Check that R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY have Object Write ' +
      'on this bucket, and R2_ACCOUNT_ID / R2_BUCKET_NAME are correct.'
    )
  }
  return msg
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

  // Best-effort: Object Write tokens often cannot PutBucketCors.
  const cors = await ensureR2UploadCors(bucket, requestOrigin)

  try {
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
      corsConfigured: cors.ok,
      corsOrigins: cors.origins,
      corsWarning: cors.ok
        ? undefined
        : 'Could not update bucket CORS via API (token may lack Admin). Set CORS in Cloudflare R2 dashboard for browser uploads to work.',
    }
  } catch (err) {
    throw createError({
      statusCode: 500,
      statusMessage: r2ErrorMessage(err),
    })
  }
})
