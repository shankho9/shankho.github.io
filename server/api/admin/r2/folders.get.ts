import { createError, getQuery } from 'h3'
import { requireAdminUser } from '~/server/utils/adminUsers'
import { getDefaultBucketName, listFolderPaths } from '~/server/utils/r2'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)

  const query = getQuery(event)
  const bucket =
    (typeof query.bucket === 'string' ? query.bucket.trim() : '') || getDefaultBucketName() || ''

  if (!bucket) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bucket is required. Provide ?bucket= or set R2_BUCKET_NAME.',
    })
  }

  try {
    const folders = await listFolderPaths(bucket)
    return {
      success: true,
      bucket,
      folders,
    }
  } catch (err) {
    throw createError({
      statusCode: 500,
      statusMessage: err instanceof Error ? err.message : 'Failed to list R2 folders.',
    })
  }
})
