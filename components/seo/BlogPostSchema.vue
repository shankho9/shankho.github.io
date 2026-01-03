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
  image: seoData?.image || '/not-found.jpg',
  authorName: 'Siddhartha Basu',
  authorUrl: seoData?.mySite || 'https://shankho-blogsite.vercel.app',
  modifiedDate: undefined,
  tags: () => [],
})

const siteUrl =
  (config.public.siteUrl as string) ||
  (seoData?.mySite ? seoData.mySite.replace(/\/$/, '') : 'https://shankho-blogsite.vercel.app')
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

// Use useHead to inject JSON-LD script tag into document head
// Vue 3 doesn't allow <script> tags in component templates
// Use a function to make it reactive so it updates when schema changes
useHead(() => ({
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify(schema.value),
    },
  ],
}))
</script>

<template>
  <div style="display: none">
    <!-- JSON-LD is injected via useHead() above -->
  </div>
</template>
