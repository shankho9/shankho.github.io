const NOTION_IMAGE_HOST_PATTERNS = [
  /^https:\/\/prod-files-secure\.s3\.[^/]+\.amazonaws\.com\//i,
  /^https:\/\/s3\.[^/]+\.amazonaws\.com\//i,
  /^https:\/\/[^/]+\.notion\.so\//i,
  /^https:\/\/images\.notionusercontent\.com\//i,
]

export function isNotionHostedImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false
  const trimmed = url.trim()
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false
  return NOTION_IMAGE_HOST_PATTERNS.some((pattern) => pattern.test(trimmed))
}

export function toNotionImageProxyUrl(url: string): string {
  return `/api/notion/image?url=${encodeURIComponent(url)}`
}

const IMAGE_PROPERTY_KEYS = new Set([
  'image',
  'cover',
  'thumbnail',
  'icon',
  'coverimage',
  'cover url',
  'coverurl',
])

function shouldProxyPropertyKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/_/g, ' ')
  if (IMAGE_PROPERTY_KEYS.has(normalized)) return true
  return normalized.includes('image') || normalized.includes('cover') || normalized.includes('thumbnail')
}

function proxyImageValue(value: unknown): unknown {
  if (typeof value === 'string' && isNotionHostedImageUrl(value)) {
    return toNotionImageProxyUrl(value)
  }

  if (Array.isArray(value)) {
    return value.map((entry) => {
      if (typeof entry === 'string' && isNotionHostedImageUrl(entry)) {
        return toNotionImageProxyUrl(entry)
      }
      return entry
    })
  }

  return value
}

/** Rewrite Notion-hosted image URLs to same-origin proxy URLs for reliable loading. */
export function proxyNotionImageUrls<T extends Record<string, unknown>>(item: T): T {
  const result = { ...item }

  for (const key of Object.keys(result)) {
    if (!shouldProxyPropertyKey(key)) continue
    result[key] = proxyImageValue(result[key]) as T[Extract<keyof T, string>]
  }

  return result
}
