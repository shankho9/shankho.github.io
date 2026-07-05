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
    ],
  },
})
