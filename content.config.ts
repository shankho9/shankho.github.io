import { defineCollection, defineContentConfig, z } from '@nuxt/content'
import { asRobotsCollection } from '@nuxtjs/robots/content'
import { asSitemapCollection } from '@nuxtjs/sitemap/content'
import { defineOgImageSchema } from 'nuxt-og-image/content'

export default defineContentConfig({
  collections: {
    content: defineCollection(
      asSitemapCollection(
        asRobotsCollection({
          type: 'page',
          source: '**/*.md',
          schema: z.object({
            ogImage: defineOgImageSchema({ z }),
          }),
        }),
      ),
    ),
    music: defineCollection({
      type: 'page',
      source: 'music/**/*.{md,mdx}',
      schema: z.object({
        musicType: z.enum(['lyrics', 'instrumental', 'notation']),
        language: z.string().optional(),
        artist: z.string().optional(),
        youtubeUrl: z.string().optional(),
        spotifyUrl: z.string().optional(),
        tags: z.array(z.string()).optional(),
        published: z.boolean().default(false),
        coverImage: z.string().optional(),
      }),
    }),
  },
})
