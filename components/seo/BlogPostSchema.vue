<script setup lang="ts">
import { seoData, socialLinks } from '~/data'
import { useRoute } from 'vue-router'

const route = useRoute()
const config = useRuntimeConfig()

interface Props {
  title: string
  description: string
  image?: string
  authorName?: string
  authorUrl?: string
  publishedDate: string
  modifiedDate?: string
  tags?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  image: seoData.image,
  authorName: 'Siddhartha Basu',
  authorUrl: seoData.mySite,
  modifiedDate: undefined,
  tags: () => [],
})

const siteUrl = (config.public.siteUrl as string) || seoData.mySite.replace(/\/$/, '')
const currentUrl = `${siteUrl}${route.path}`

const schema = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: props.title,
  description: props.description,
  image: props.image,
  datePublished: props.publishedDate,
  dateModified: props.modifiedDate || props.publishedDate,
  author: {
    '@type': 'Person',
    name: props.authorName,
    url: props.authorUrl,
    sameAs: [
      socialLinks.github,
      socialLinks.linkedin,
      socialLinks.twitter,
      socialLinks.stackoverflow,
    ].filter(Boolean),
  },
  publisher: {
    '@type': 'Organization',
    name: seoData.title,
    logo: {
      '@type': 'ImageObject',
      url: seoData.image,
    },
  },
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': currentUrl,
  },
  keywords: props.tags?.join(', ') || '',
}))
</script>

<template>
  <!-- eslint-disable vue/no-v-html -->
  <!-- JSON.stringify() safely escapes all content, preventing XSS -->
  <script type="application/ld+json" v-html="JSON.stringify(schema)" />
  <!-- eslint-enable vue/no-v-html -->
</template>
