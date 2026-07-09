import type { NotionItem } from '~/composables/useNotion'

const IMAGE_KEYS = [
  'Image',
  'image',
  'Cover',
  'cover',
  'Thumbnail',
  'thumbnail',
  'Icon',
  'icon',
  'Cover Image',
  'coverImage',
  'Cover URL',
  'coverUrl',
  'Poster',
  'poster',
]

export function getNotionItemImageUrl(item: NotionItem): string | null {
  for (const key of IMAGE_KEYS) {
    const image = item[key]
    if (Array.isArray(image) && image.length > 0) {
      const first = image[0]
      if (typeof first === 'string' && first.trim()) return first.trim()
    }
    if (typeof image === 'string' && image.trim()) return image.trim()
  }
  return null
}
