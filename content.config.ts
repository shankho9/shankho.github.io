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
  },
})
