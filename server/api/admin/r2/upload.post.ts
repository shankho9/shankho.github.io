import { createError, readMultipartFormData } from 'h3'
import { requireAdminUser } from '~/server/utils/adminUsers'
import {
  buildUploadObjectKey,
  getDefaultBucketName,
  isAllowedAppsKey,
  normalizeAppsObjectKey,
  uploadObjectToR2,
} from '~/server/utils/r2'

function fieldText(parts: Awaited<ReturnType<typeof readMultipartFormData>>, name: string): string {
  const part = parts?.find((p) => p.name === name)
  if (!part?.data) return ''
  return part.data.toString('utf-8').trim()
}

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)

  const parts = await readMultipartFormData(event)
  if (!parts?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Multipart form data is required.',
    })
  }

  const filePart = parts.find((p) => p.name === 'file' && p.data)
  if (!filePart?.data?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'File is required.',
    })
  }

  const folder = fieldText(parts, 'folder')
  const fileName = fieldText(parts, 'fileName') || filePart.filename?.trim() || 'upload.bin'
  const bucket = fieldText(parts, 'bucket') || getDefaultBucketName() || ''
  const contentType = fieldText(parts, 'contentType') || filePart.type || 'application/octet-stream'

  if (!bucket) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bucket is required. Provide a bucket or set R2_BUCKET_NAME.',
    })
  }

  if (!folder) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Folder is required.',
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

  try {
    const result = await uploadObjectToR2({
      bucket,
      objectKey: normalizedKey,
      body: filePart.data,
      contentType,
    })

    return {
      success: true,
      bucket: result.bucket,
      objectKey: result.objectKey,
      etag: result.etag,
    }
  } catch (err) {
    throw createError({
      statusCode: 500,
      statusMessage: err instanceof Error ? err.message : 'Failed to upload to R2.',
    })
  }
})
