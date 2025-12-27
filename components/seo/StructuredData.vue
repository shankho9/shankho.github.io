<script setup lang="ts">
import { seoData, socialLinks } from '~/data'
import { useRoute } from 'vue-router'

const route = useRoute()
const config = useRuntimeConfig()

interface Props {
  type?: 'website' | 'article' | 'person'
  title?: string
  description?: string
  image?: string
  author?: {
    name: string
    url?: string
  }
  publishedDate?: string
  modifiedDate?: string
  tags?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  type: 'website',
  title: seoData.title,
  description: seoData.description,
  image: seoData.image,
  author: () => ({
    name: 'Siddhartha Basu',
    url: seoData.mySite,
  }),
  publishedDate: undefined,
  modifiedDate: undefined,
  tags: () => [],
})

const siteUrl = (config.public.siteUrl as string) || seoData.mySite.replace(/\/$/, '')
const currentUrl = `${siteUrl}${route.path}`

const websiteSchema = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: seoData.title,
  url: siteUrl,
  description: seoData.description,
  publisher: {
    '@type': 'Person',
    name: props.author.name,
    url: props.author.url || siteUrl,
  },
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${siteUrl}/blogs?search={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
}))

const articleSchema = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: props.title,
  description: props.description,
  image: props.image,
  datePublished: props.publishedDate,
  dateModified: props.modifiedDate || props.publishedDate,
  author: {
    '@type': 'Person',
    name: props.author.name,
    url: props.author.url || siteUrl,
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

const personSchema = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: props.author.name,
  url: props.author.url || siteUrl,
  jobTitle: 'Test Automation Senior Vice President',
  worksFor: {
    '@type': 'Organization',
    name: 'Natwest Group',
  },
  sameAs: [
    socialLinks.github,
    socialLinks.linkedin,
    socialLinks.twitter,
    socialLinks.stackoverflow,
  ].filter(Boolean),
  email: seoData.mailAddress,
}))

const schema = computed(() => {
  switch (props.type) {
    case 'article':
      return articleSchema.value
    case 'person':
      return personSchema.value
    default:
      return websiteSchema.value
  }
})
</script>

<template>
  <!-- eslint-disable vue/no-v-html -->
  <!-- JSON.stringify() safely escapes all content, preventing XSS -->
  <script type="application/ld+json" v-html="JSON.stringify(schema)" />
  <!-- eslint-enable vue/no-v-html -->
</template>
