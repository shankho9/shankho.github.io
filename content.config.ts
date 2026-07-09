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
    resources: defineCollection({
      type: 'page',
      source: 'resources/**/*.{md,mdx}',
      schema: z.object({
        resourceType: z.enum(['book', 'tool', 'learning']),
        description: z.string().optional(),
        link: z.string().optional(),
        category: z.string().optional(),
        author: z.string().optional(),
        publisher: z.string().optional(),
        year: z.string().optional(),
        status: z.string().optional(),
        rating: z.union([z.string(), z.number()]).optional(),
        tags: z.array(z.string()).optional(),
        icon: z.string().optional(),
        coverImageUrl: z.string().optional(),
        published: z.boolean().default(false),
      }),
    }),
    apps: defineCollection({
      type: 'page',
      source: 'apps/**/*.{md,mdx}',
      schema: z.object({
        description: z.string().optional(),
        details: z.string().optional(),
        categories: z.array(z.string()).optional(),
        version: z.string().optional(),
        webUrl: z.string().optional(),
        playStoreUrl: z.string().optional(),
        iconUrl: z.string().optional(),
        apkKey: z.string().optional(),
        msixKey: z.string().optional(),
        published: z.boolean().default(false),
      }),
    }),
  },
})
