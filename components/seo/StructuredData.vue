<script setup lang="ts">
import { seoData, socialLinks, siteBrand } from '~/data'
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
  title: seoData?.title || siteBrand.siteName,
  description: seoData?.description || siteBrand.publisherName,
  image: seoData?.image || '/not-found.jpg',
  author: () => ({
    name: siteBrand.authorName,
    url: seoData?.mySite || 'https://www.nomadic-notions.co.in',
  }),
  publishedDate: undefined,
  modifiedDate: undefined,
  tags: () => [],
})

const siteUrl =
  (config.public.siteUrl as string) ||
  (seoData?.mySite ? seoData.mySite.replace(/\/$/, '') : 'https://www.nomadic-notions.co.in')
const currentUrl = `${siteUrl}${route.path}`

const websiteSchema = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: seoData?.title || siteBrand.siteName,
  url: siteUrl,
  description: seoData?.description || siteBrand.publisherName,
  publisher: {
    '@type': 'Organization',
    name: siteBrand.publisherName,
    url: siteUrl,
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
    name: siteBrand.publisherName,
    logo: {
      '@type': 'ImageObject',
      url: seoData?.image || '/not-found.jpg',
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
  email: siteBrand.contactEmail,
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
