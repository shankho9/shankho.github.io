<script setup lang="ts">
import type { BlogPost } from '@/types/blog'
import { navbarData, seoData } from '~/data'
import { computed, onMounted, nextTick, ref } from 'vue'
import { useRoute, navigateTo } from 'nuxt/app'
import LikeButton from '@/components/blog/LikeButton.vue'
import Comments from '@/components/blog/Comments.vue'
import ReadingProgress from '@/components/blog/ReadingProgress.vue'
import { calculateReadingTime } from '~/utils/readingTime'

const { path } = useRoute()

const { data: articles, error } = await useAsyncData(`blog-post-${path}`, () =>
  queryCollection('content').path(path).first(),
)

if (error.value) navigateTo('/404')

const readingTime = ref<number | undefined>(undefined)

const data = computed<BlogPost>(() => {
  const meta = articles?.value?.meta as unknown as BlogPost
  return {
    title: articles.value?.title || 'no-title available',
    description: articles.value?.description || 'no-description available',
    image: meta?.image || '/not-found.jpg',
    alt: meta?.alt || 'no alter data available',
    ogImage: (articles?.value?.ogImage as unknown as string) || '/not-found.jpg',
    date: meta?.date || 'not-date-available',
    tags: meta?.tags || [],
    published: meta?.published || false,
  }
})

// Calculate reading time from article content
onMounted(() => {
  // Use nextTick and a small delay to ensure content is fully rendered
  nextTick(() => {
    // Try multiple times in case content loads asynchronously
    const calculateTime = () => {
      const proseElement = document.querySelector('.prose')
      if (proseElement) {
        const textContent = proseElement.textContent || ''
        if (textContent.trim().length > 0) {
          readingTime.value = calculateReadingTime(textContent)
          return true
        }
      }
      return false
    }

    // Try immediately
    if (!calculateTime()) {
      // If not found, try again after a short delay
      setTimeout(() => {
        calculateTime()
      }, 500)
    }
  })
})

useHead({
  title: data.value.title || '',
  meta: [
    { name: 'description', content: data.value.description },
    { property: 'og:site_name', content: navbarData.homeTitle },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: `${seoData.mySite}/${path}` },
    { property: 'og:title', content: data.value.title },
    { property: 'og:description', content: data.value.description },
    { property: 'og:image', content: data.value.ogImage || data.value.image },
  ],
  link: [{ rel: 'canonical', href: `${seoData.mySite}/${path}` }],
})
</script>

<template>
  <ReadingProgress />
  <div class="px-6 container max-w-5xl mx-auto sm:grid grid-cols-12 gap-x-12">
    <div class="col-span-12 lg:col-span-9">
      <BlogHeader
        :title="data.title"
        :image="data.image"
        :alt="data.alt"
        :date="data.date"
        :description="data.description"
        :tags="data.tags"
        :reading-time="readingTime"
      />

      <!-- Like Button (Top) -->
      <div class="mt-4 flex items-center gap-2">
        <LikeButton :post-id="path" />
      </div>

      <div
        class="prose prose-pre:max-w-xs sm:prose-pre:max-w-full prose-sm sm:prose-base md:prose-lg prose-h1:no-underline max-w-5xl mx-auto prose-zinc dark:prose-invert prose-img:rounded-lg"
      >
        <ContentRenderer v-if="articles" :value="articles">
          <template #empty>
            <p>No content found.</p>
          </template>
        </ContentRenderer>
      </div>

      <!-- Like Button (Bottom) -->
      <div class="mt-4 flex items-center gap-2">
        <LikeButton :post-id="path" />
      </div>
    </div>

    <BlogToc />

    <!-- Share Icons -->
    <div class="col-span-12 lg:col-span-9 mt-10 mb-8">
      <div class="flex flex-row flex-wrap md:flex-nowrap gap-2">
        <SocialShare
          v-for="network in ['facebook', 'twitter', 'linkedin', 'email']"
          :key="network"
          :network="network"
          :styled="true"
          :label="true"
          class="p-1"
          aria-label="Share with {network}"
        />
      </div>
    </div>

    <!-- Comments Section -->
    <div class="col-span-12 lg:col-span-9 mt-8">
      <Comments :post-id="path" />
    </div>
  </div>
</template>
