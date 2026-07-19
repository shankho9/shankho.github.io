import { requireAdminUser } from '~/server/utils/adminUsers'
import { getDefaultBucketName } from '~/server/utils/r2'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)

  return {
    success: true,
    defaultBucket: getDefaultBucketName() || '',
  }
})
