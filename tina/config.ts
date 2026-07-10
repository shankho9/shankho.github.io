import { defineConfig } from 'tinacms'

const branch = process.env.TINA_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || 'main'

export default defineConfig({
  branch,
  clientId: process.env.NUXT_PUBLIC_TINA_CLIENT_ID || '',
  token: process.env.TINA_TOKEN || '',

  build: {
    outputFolder: 'admin',
    publicFolder: 'public',
  },

  media: {
    tina: {
      mediaRoot: 'music',
      publicFolder: 'public',
    },
  },

  schema: {
    collections: [
      {
        name: 'music',
        label: 'Musical Notes',
        path: 'content/music',
        format: 'mdx',
        fields: [
          {
            type: 'string',
            name: 'title',
            label: 'Title',
            isTitle: true,
            required: true,
          },
          {
            type: 'string',
            name: 'musicType',
            label: 'Type',
            required: true,
            options: [
              { label: 'Lyrics', value: 'lyrics' },
              { label: 'Instrumental', value: 'instrumental' },
              { label: 'Notation', value: 'notation' },
            ],
          },
          {
            type: 'string',
            name: 'artist',
            label: 'Artist',
          },
          {
            type: 'string',
            name: 'language',
            label: 'Language',
          },
          {
            type: 'string',
            name: 'youtubeUrl',
            label: 'YouTube URL',
          },
          {
            type: 'string',
            name: 'spotifyUrl',
            label: 'Spotify URL',
          },
          {
            type: 'string',
            name: 'tags',
            label: 'Tags',
            list: true,
          },
          {
            type: 'boolean',
            name: 'published',
            label: 'Published',
          },
          {
            type: 'image',
            name: 'coverImage',
            label: 'Cover Image',
          },
          {
            type: 'rich-text',
            name: 'body',
            label: 'Body',
            isBody: true,
          },
        ],
      },
      {
        name: 'resources',
        label: 'Resources',
        path: 'content/resources',
        format: 'mdx',
        fields: [
          {
            type: 'string',
            name: 'title',
            label: 'Title',
            isTitle: true,
            required: true,
          },
          {
            type: 'string',
            name: 'resourceType',
            label: 'Type',
            required: true,
            options: [
              { label: 'Book', value: 'book' },
              { label: 'Tool', value: 'tool' },
              { label: 'Learning', value: 'learning' },
            ],
          },
          {
            type: 'string',
            name: 'description',
            label: 'Description',
          },
          {
            type: 'string',
            name: 'link',
            label: 'Link URL',
          },
          {
            type: 'string',
            name: 'category',
            label: 'Category',
          },
          {
            type: 'string',
            name: 'author',
            label: 'Author',
          },
          {
            type: 'string',
            name: 'publisher',
            label: 'Publisher',
          },
          {
            type: 'string',
            name: 'year',
            label: 'Year',
          },
          {
            type: 'string',
            name: 'status',
            label: 'Status',
          },
          {
            type: 'string',
            name: 'rating',
            label: 'Rating',
          },
          {
            type: 'string',
            name: 'tags',
            label: 'Tags',
            list: true,
          },
          {
            type: 'string',
            name: 'icon',
            label: 'Icon (MDI name, e.g. mdi:tools)',
          },
          {
            type: 'string',
            name: 'coverImageUrl',
            label: 'Cover Image URL (R2, ImageKit, or HTTPS)',
          },
          {
            type: 'boolean',
            name: 'published',
            label: 'Published',
          },
        ],
      },
      {
        name: 'apps',
        label: 'Apps',
        path: 'content/apps',
        format: 'mdx',
        fields: [
          {
            type: 'string',
            name: 'title',
            label: 'Title',
            isTitle: true,
            required: true,
          },
          {
            type: 'string',
            name: 'description',
            label: 'Description (card blurb)',
          },
          {
            type: 'string',
            name: 'details',
            label: 'Details (modal body)',
            ui: { component: 'textarea' },
          },
          {
            type: 'string',
            name: 'categories',
            label: 'Categories',
            list: true,
          },
          {
            type: 'string',
            name: 'version',
            label: 'Version',
          },
          {
            type: 'string',
            name: 'webUrl',
            label: 'Web URL',
          },
          {
            type: 'string',
            name: 'storeUrl',
            label: 'Store URL',
          },
          {
            type: 'string',
            name: 'iconUrl',
            label: 'Icon URL (R2 public URL or HTTPS)',
          },
          {
            type: 'string',
            name: 'apkKey',
            label: 'APK Key (R2 object key, e.g. Android/App_v1.0.0.apk)',
          },
          {
            type: 'string',
            name: 'msixKey',
            label: 'MSIX Key (R2 object key, e.g. Desktop/App_v1.0.0.msix)',
          },
          {
            type: 'boolean',
            name: 'published',
            label: 'Published',
          },
        ],
      },
    ],
  },
})
