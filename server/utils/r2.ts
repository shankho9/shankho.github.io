import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { useRuntimeConfig } from '#imports'
import { envOrConfig } from '~/server/utils/runtimeEnv'

const DEFAULT_PRESIGN_TTL_SECONDS = 300

function getR2Client(): S3Client {
  const config = useRuntimeConfig()

  const accountId = envOrConfig(config.r2AccountId, 'R2_ACCOUNT_ID')
  const accessKeyId = envOrConfig(config.r2AccessKeyId, 'R2_ACCESS_KEY_ID')
  const secretAccessKey = envOrConfig(config.r2SecretAccessKey, 'R2_SECRET_ACCESS_KEY')

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

/**
 * Optional allowlist of object-key prefixes.
 * Set R2_ALLOWED_KEY_PREFIXES=* (or leave unset) to allow any top-level folder
 * under the bucket (Android/, Desktop/, iOS/, Web/, …).
 * Set a comma list to restrict (e.g. Android/,Desktop/,iOS/).
 */
export function getAllowedKeyPrefixes(): string[] | '*' {
  const config = useRuntimeConfig()
  const fromEnv = envOrConfig(config.r2AllowedKeyPrefixes, 'R2_ALLOWED_KEY_PREFIXES')

  if (!fromEnv?.trim() || fromEnv.trim() === '*') {
    return '*'
  }

  return fromEnv
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => (p.endsWith('/') ? p : `${p}/`))
}

/** @deprecated Prefer getAllowedKeyPrefixes */
export function getAppsPrefix(): string {
  const prefixes = getAllowedKeyPrefixes()
  if (prefixes === '*') return 'Android/'
  return prefixes[0] || 'Android/'
}

/**
 * Normalize a pasted R2 key:
 * - trim whitespace
 * - strip leading slash
 * - strip bucket name if pasted as nomadic-notions-apps/Android/...
 */
export function normalizeAppsObjectKey(key: string, bucketName?: string): string {
  let normalized = key.trim().replace(/^\/+/, '')

  const bucket = bucketName?.trim()
  if (bucket && normalized.toLowerCase().startsWith(`${bucket.toLowerCase()}/`)) {
    normalized = normalized.slice(bucket.length + 1)
  }

  return normalized
}

/**
 * Safe object key under the apps bucket.
 * Layout: {PlatformFolder}/{filename}
 * e.g. Android/Taskora_Android_v1.0.0.apk
 */
export function isAllowedAppsKey(key: string): boolean {
  const config = useRuntimeConfig()
  const bucketName = envOrConfig(config.r2BucketName, 'R2_BUCKET_NAME') || undefined
  const normalized = normalizeAppsObjectKey(key, bucketName)

  if (!normalized || normalized.includes('..') || normalized.includes('\\')) {
    return false
  }

  // platformFolder/filename — at least one slash, no empty segments
  const parts = normalized.split('/')
  if (parts.length < 2 || parts.some((p) => !p)) {
    return false
  }

  // First segment = platform folder name (letters, numbers, dash, underscore)
  if (!/^[A-Za-z0-9_-]+$/.test(parts[0])) {
    return false
  }

  const prefixes = getAllowedKeyPrefixes()
  if (prefixes === '*') {
    return true
  }

  return prefixes.some((prefix) => normalized.startsWith(prefix))
}

export async function getPresignedDownloadUrl(
  objectKey: string,
  expiresInSeconds: number = DEFAULT_PRESIGN_TTL_SECONDS,
): Promise<string> {
  const config = useRuntimeConfig()
  const bucketName = envOrConfig(config.r2BucketName, 'R2_BUCKET_NAME')

  if (!bucketName) {
    throw new Error('R2 bucket name is missing. Set R2_BUCKET_NAME.')
  }

  const normalizedKey = normalizeAppsObjectKey(objectKey, bucketName)

  if (!isAllowedAppsKey(normalizedKey)) {
    throw new Error(`Object key is not allowed: ${objectKey}`)
  }

  const client = getR2Client()
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: normalizedKey,
  })

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds })
}
