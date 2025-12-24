import type { BlogPost } from '~/types/blog'

/**
 * Safely extracts BlogPost properties from Nuxt Content meta object
 * This avoids the need for double type assertions (as unknown as BlogPost)
 */
export function extractBlogPostFromMeta(meta: unknown): Partial<BlogPost> {
  if (!meta || typeof meta !== 'object') {
    return {}
  }

  const metaObj = meta as Record<string, unknown>

  return {
    image: typeof metaObj.image === 'string' ? metaObj.image : undefined,
    alt: typeof metaObj.alt === 'string' ? metaObj.alt : undefined,
    ogImage: typeof metaObj.ogImage === 'string' ? metaObj.ogImage : undefined,
    date: typeof metaObj.date === 'string' ? metaObj.date : undefined,
    tags: Array.isArray(metaObj.tags) ? (metaObj.tags as string[]) : undefined,
    published: typeof metaObj.published === 'boolean' ? metaObj.published : undefined,
    category: typeof metaObj.category === 'string' ? metaObj.category : undefined,
  }
}
