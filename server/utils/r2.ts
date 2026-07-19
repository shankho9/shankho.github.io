import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { useRuntimeConfig } from '#imports'
import { envOrConfig } from '~/server/utils/runtimeEnv'

const DEFAULT_PRESIGN_TTL_SECONDS = 300
const DEFAULT_UPLOAD_PRESIGN_TTL_SECONDS = 900

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

export function getDefaultBucketName(): string | undefined {
  const config = useRuntimeConfig()
  const bucket = envOrConfig(config.r2BucketName, 'R2_BUCKET_NAME')?.trim()
  return bucket || undefined
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
 * Build `{folder}/{fileName}` for uploads.
 * Folder may be `Android`, `Android/releases`, etc.; filename is basename-only.
 */
export function buildUploadObjectKey(folder: string, fileName: string): string {
  const folderPart = folder.trim().replace(/^\/+/, '').replace(/\/+$/, '').replace(/\\/g, '/')

  const baseName = fileName.trim().replace(/\\/g, '/').split('/').filter(Boolean).pop()

  if (!folderPart || !baseName) {
    throw new Error('Folder and file name are required.')
  }

  if (folderPart.includes('..') || baseName.includes('..')) {
    throw new Error('Object key must not contain "..".')
  }

  const folderSegments = folderPart.split('/').filter(Boolean)
  if (!folderSegments.every((s) => /^[A-Za-z0-9_-]+$/.test(s))) {
    throw new Error('Folder path segments may only contain letters, numbers, dash, and underscore.')
  }

  return `${folderPart}/${baseName}`
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

  // platformFolder/.../filename — at least one slash, no empty segments
  const parts = normalized.split('/')
  if (parts.length < 2 || parts.some((p) => !p)) {
    return false
  }

  // Every path segment must be a safe folder/file token
  if (!parts.every((p) => /^[A-Za-z0-9._-]+$/.test(p))) {
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
  const bucketName = getDefaultBucketName()

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

export async function getPresignedUploadUrl(options: {
  bucket: string
  objectKey: string
  contentType?: string
  expiresInSeconds?: number
}): Promise<string> {
  const bucket = options.bucket.trim()
  if (!bucket) {
    throw new Error('R2 bucket name is required.')
  }

  const normalizedKey = normalizeAppsObjectKey(options.objectKey, bucket)

  if (!isAllowedAppsKey(normalizedKey)) {
    throw new Error(`Object key is not allowed: ${options.objectKey}`)
  }

  const expiresIn = options.expiresInSeconds ?? DEFAULT_UPLOAD_PRESIGN_TTL_SECONDS
  const client = getR2Client()
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: normalizedKey,
    ...(options.contentType ? { ContentType: options.contentType } : {}),
  })

  return getSignedUrl(client, command, { expiresIn })
}

/**
 * Server-side PutObject (same-origin admin upload — no R2 CORS required).
 */
export async function uploadObjectToR2(options: {
  bucket: string
  objectKey: string
  body: Buffer | Uint8Array
  contentType?: string
}): Promise<{ bucket: string; objectKey: string; etag?: string }> {
  const bucket = options.bucket.trim()
  if (!bucket) {
    throw new Error('R2 bucket name is required.')
  }

  const normalizedKey = normalizeAppsObjectKey(options.objectKey, bucket)

  if (!isAllowedAppsKey(normalizedKey)) {
    throw new Error(`Object key is not allowed: ${options.objectKey}`)
  }

  const client = getR2Client()
  const result = await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: normalizedKey,
      Body: options.body,
      ...(options.contentType ? { ContentType: options.contentType } : {}),
    }),
  )

  return {
    bucket,
    objectKey: normalizedKey,
    etag: result.ETag,
  }
}

/**
 * List folder paths in a bucket (top-level and nested) via delimiter `/`.
 * Filters by R2_ALLOWED_KEY_PREFIXES when that allowlist is set.
 */
export async function listFolderPaths(bucketName: string): Promise<string[]> {
  const bucket = bucketName.trim()
  if (!bucket) {
    throw new Error('R2 bucket name is required.')
  }

  const client = getR2Client()
  const folders = new Set<string>()
  const queue: string[] = ['']
  const maxDepth = 6
  const maxFolders = 500

  while (queue.length > 0 && folders.size < maxFolders) {
    const prefix = queue.shift()!
    let continuationToken: string | undefined

    do {
      const response = await client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix || undefined,
          Delimiter: '/',
          MaxKeys: 1000,
          ContinuationToken: continuationToken,
        }),
      )

      for (const common of response.CommonPrefixes || []) {
        const raw = common.Prefix?.trim()
        if (!raw) continue
        const path = raw.replace(/\/+$/, '')
        const segments = path.split('/').filter(Boolean)
        if (
          !segments.length ||
          segments.length > maxDepth ||
          path.includes('..') ||
          !segments.every((s) => /^[A-Za-z0-9_-]+$/.test(s))
        ) {
          continue
        }

        folders.add(path)
        if (segments.length < maxDepth && folders.size < maxFolders) {
          queue.push(`${path}/`)
        }
      }

      continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined
    } while (continuationToken && folders.size < maxFolders)
  }

  const allowed = getAllowedKeyPrefixes()
  let list = [...folders].sort((a, b) => a.localeCompare(b))
  if (allowed !== '*') {
    list = list.filter((path) =>
      allowed.some((prefix) => path === prefix.replace(/\/+$/, '') || path.startsWith(prefix)),
    )
  }

  return list
}

/** @deprecated Prefer listFolderPaths (includes nested folders). */
export async function listTopLevelFolders(bucketName: string): Promise<string[]> {
  const all = await listFolderPaths(bucketName)
  return all.filter((path) => !path.includes('/'))
}

export { DEFAULT_UPLOAD_PRESIGN_TTL_SECONDS }
