import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { useRuntimeConfig } from '#imports'

const DEFAULT_PRESIGN_TTL_SECONDS = 300

function getR2Client(): S3Client {
  const config = useRuntimeConfig()

  const accountId = config.r2AccountId
  const accessKeyId = config.r2AccessKeyId
  const secretAccessKey = config.r2SecretAccessKey

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'R2 configuration is missing. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.',
    )
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })
}

export function getAppsPrefix(): string {
  const config = useRuntimeConfig()
  return config.r2AppsPrefix || 'apps/'
}

export function isAllowedAppsKey(key: string): boolean {
  const prefix = getAppsPrefix()
  const normalized = key.trim()
  if (!normalized || normalized.includes('..')) {
    return false
  }
  return normalized.startsWith(prefix)
}

export async function getPresignedDownloadUrl(
  objectKey: string,
  expiresInSeconds: number = DEFAULT_PRESIGN_TTL_SECONDS,
): Promise<string> {
  const config = useRuntimeConfig()
  const bucketName = config.r2BucketName

  if (!bucketName) {
    throw new Error('R2 bucket name is missing. Set R2_BUCKET_NAME.')
  }

  if (!isAllowedAppsKey(objectKey)) {
    throw new Error(`Object key is not allowed: ${objectKey}`)
  }

  const client = getR2Client()
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: objectKey.trim(),
  })

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds })
}
