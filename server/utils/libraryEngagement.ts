/** Shared Media Library engagement post_id helpers (likes / comments tables). */

export const LIBRARY_ENGAGEMENT_KINDS = ['gallery', 'music', 'resource', 'app'] as const

export type LibraryEngagementKind = (typeof LIBRARY_ENGAGEMENT_KINDS)[number]

const KIND_PREFIX: Record<LibraryEngagementKind, string> = {
  gallery: 'gallery_',
  music: 'library_music_',
  resource: 'library_resource_',
  app: 'library_app_',
}

export function isLibraryEngagementKind(value: unknown): value is LibraryEngagementKind {
  return (
    typeof value === 'string' && (LIBRARY_ENGAGEMENT_KINDS as readonly string[]).includes(value)
  )
}

export function parseLibraryEngagementKind(
  value: unknown,
  fallback: LibraryEngagementKind = 'gallery',
): LibraryEngagementKind {
  return isLibraryEngagementKind(value) ? value : fallback
}

/** Build DB post_id for likes/comments. */
export function toLibraryPostId(kind: LibraryEngagementKind, itemId: string | number): string {
  const id = String(itemId).trim()
  if (!id) {
    throw new Error('itemId is required')
  }
  return `${KIND_PREFIX[kind]}${id}`
}

/** Strip known prefix from post_id → item id. Returns null if prefix does not match kind. */
export function fromLibraryPostId(kind: LibraryEngagementKind, postId: string): string | null {
  const prefix = KIND_PREFIX[kind]
  if (!postId.startsWith(prefix)) return null
  return postId.slice(prefix.length)
}

export function libraryEngagementLabel(postId: string): {
  kind: LibraryEngagementKind | 'unknown'
  itemId: string
  label: string
  href: string | null
} {
  if (postId.startsWith('library_music_')) {
    const itemId = postId.slice('library_music_'.length)
    return {
      kind: 'music',
      itemId,
      label: `Music: ${itemId}`,
      href: `/library/music/${encodeURIComponent(itemId)}`,
    }
  }
  if (postId.startsWith('library_resource_')) {
    const itemId = postId.slice('library_resource_'.length)
    return {
      kind: 'resource',
      itemId,
      label: `Resource: ${itemId}`,
      href: `/library?tab=resources`,
    }
  }
  if (postId.startsWith('library_app_')) {
    const itemId = postId.slice('library_app_'.length)
    return {
      kind: 'app',
      itemId,
      label: `App: ${itemId}`,
      href: `/library?tab=apps`,
    }
  }
  if (postId.startsWith('gallery_')) {
    const itemId = postId.slice('gallery_'.length)
    return {
      kind: 'gallery',
      itemId,
      label: `Media: ${itemId}`,
      href: `/library?tab=photos`,
    }
  }
  return { kind: 'unknown', itemId: postId, label: postId, href: null }
}

/** SQL LIKE patterns that match Media Library engagement rows (not blog posts). */
export const LIBRARY_POST_ID_SQL_PATTERNS = [
  'gallery_%',
  'library_music_%',
  'library_resource_%',
  'library_app_%',
] as const
