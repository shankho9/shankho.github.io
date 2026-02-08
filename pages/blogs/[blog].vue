<script setup lang="ts">
import type { BlogPost } from '@/types/blog'
import { navbarData, seoData } from '~/data'
import { computed, onMounted, nextTick, ref } from 'vue'
import { useRoute, navigateTo } from 'nuxt/app'
import LikeButton from '@/components/blog/LikeButton.vue'
import Comments from '@/components/blog/Comments.vue'
import ReadingProgress from '@/components/blog/ReadingProgress.vue'
import { calculateReadingTime } from '~/utils/blog/readingTime'
import { useAnalytics } from '~/composables/useAnalytics'

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
    category: meta?.category,
  }
})

// Analytics tracking
const { trackScroll, trackReading, trackExit } = useAnalytics()

// Calculate reading time from article content and track analytics
onMounted(() => {
  // Use nextTick and a small delay to ensure content is fully rendered
  nextTick(() => {
    // Try multiple times in case content loads asynchronously
    const calculateTime = () => {
      const proseElement = document.querySelector('.prose')
      if (proseElement) {
        const textContent = proseElement.textContent || ''
        if (textContent.trim().length > 0) {
          // Calculate reading time (which also calculates word count internally)
          const calculatedTime = calculateReadingTime(textContent)
          readingTime.value = calculatedTime

          // Calculate word count using the same method as calculateReadingTime
          // to ensure consistency (split by whitespace and filter empty strings)
          const wordCount = textContent
            .trim()
            .split(/\s+/)
            .filter((word) => word.length > 0).length

          // Track analytics after ensuring content is fully loaded
          // Track scroll depth
          trackScroll(path)

          // Track reading time with consistent word count and reading time
          trackReading(path, wordCount, calculatedTime)

          // Track exit intent
          trackExit(path)

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
    { property: 'og:type', content: 'article' }, // Changed to 'article' for blog posts
    { property: 'og:url', content: `${seoData.mySite}/${path}` },
    { property: 'og:title', content: data.value.title },
    { property: 'og:description', content: data.value.description },
    { property: 'og:image', content: data.value.ogImage || data.value.image },
    { property: 'article:published_time', content: data.value.date },
    { property: 'article:author', content: 'Siddhartha Basu' },
    ...(data.value.tags?.map((tag) => ({ property: 'article:tag', content: tag })) || []),
  ],
  link: [{ rel: 'canonical', href: `${seoData.mySite}/${path}` }],
})
</script>

<template>
  <div class="overflow-x-hidden min-w-0">
    <!-- Structured Data for Blog Post SEO -->
    <SeoBlogPostSchema
      :title="data.title"
      :description="data.description"
      :image="data.ogImage || data.image"
      :published-date="data.date"
      :tags="data.tags"
    />

    <ReadingProgress />
    <div
      class="px-3 sm:px-6 container max-w-5xl mx-auto sm:grid grid-cols-12 gap-x-12 overflow-x-hidden w-full"
    >
      <div class="col-span-12 lg:col-span-9 blog-content-container min-w-0">
        <div class="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <div class="flex items-center gap-2">
            <FocusMode />
            <TextToSpeech :post-id="path" />
          </div>
        </div>

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
          class="prose prose-pre:max-w-full prose-pre:overflow-x-auto prose-sm sm:prose-base md:prose-lg prose-h1:no-underline max-w-full prose-zinc dark:prose-invert prose-img:rounded-lg prose-img:max-w-full"
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

      <div
        class="lg:col-span-3 sticky top-28 hidden lg:block justify-self-end space-y-6 blog-sidebar"
      >
        <BlogToc />
        <RelatedContent
          :current-path="path"
          :current-tags="data.tags"
          :current-category="data.category"
          :limit="5"
        />
      </div>

      <!-- Share Icons -->
      <div class="col-span-12 lg:col-span-9 mt-10 mb-8">
        <h3 class="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-4">Share using</h3>
        <div class="flex flex-row flex-wrap gap-2 min-w-0">
          <div
            v-for="network in ['facebook', 'twitter', 'linkedin', 'whatsapp', 'email']"
            :key="network"
            :class="`social-share-wrapper social-share-${network === 'twitter' ? 'x' : network}`"
            :data-network="network === 'twitter' ? 'x' : network"
            :title="`Share with ${network === 'twitter' ? 'X' : network.charAt(0).toUpperCase() + network.slice(1)}`"
          >
            <SocialShare
              :network="network"
              :styled="false"
              :label="false"
              class="social-share-button"
              :aria-label="`Share on ${network === 'twitter' ? 'X' : network.charAt(0).toUpperCase() + network.slice(1)}`"
            />
          </div>
        </div>
      </div>

      <!-- Comments Section -->
      <div class="col-span-12 lg:col-span-9 mt-8">
        <Comments :post-id="path" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Wrapper for share buttons */
.social-share-wrapper {
  @apply relative flex items-center;
}

/* Custom styling for social share buttons - bright flashy colors that adapt to background */
:deep(.social-share-button) {
  @apply rounded-lg px-4 py-2.5 transition-all duration-200;
  @apply flex items-center gap-2 font-semibold;
  @apply border-2 shadow-lg hover:shadow-xl;
  @apply transform hover:scale-105 active:scale-95;
}

/* Hide any default "Share" text from the component */
:deep(.social-share-button span),
:deep(.social-share-button .label) {
  display: none;
}

/* Ensure icons are visible and sized properly */
:deep(.social-share-button svg),
:deep(.social-share-button .icon) {
  @apply w-5 h-5 flex-shrink-0;
  transition: all 0.2s ease-in-out;
}

/* Facebook - bright vibrant blue */
.social-share-facebook :deep(.social-share-button),
.social-share-wrapper[data-network='facebook'] :deep(.social-share-button) {
  @apply bg-blue-500 dark:bg-blue-600 text-white border-blue-600 dark:border-blue-500;
  box-shadow: 0 4px 14px 0 rgba(59, 130, 246, 0.4);
}

.social-share-facebook:hover :deep(.social-share-button),
.social-share-wrapper[data-network='facebook']:hover :deep(.social-share-button) {
  @apply bg-blue-600 dark:bg-blue-500 border-blue-700 dark:border-blue-400;
  box-shadow: 0 6px 20px 0 rgba(59, 130, 246, 0.6);
}

/* X (formerly Twitter) - bright vibrant sky blue */
.social-share-x :deep(.social-share-button),
.social-share-wrapper[data-network='x'] :deep(.social-share-button) {
  @apply bg-sky-500 dark:bg-sky-600 text-white border-sky-600 dark:border-sky-500;
  box-shadow: 0 4px 14px 0 rgba(14, 165, 233, 0.4);
}

.social-share-x:hover :deep(.social-share-button),
.social-share-wrapper[data-network='x']:hover :deep(.social-share-button) {
  @apply bg-sky-600 dark:bg-sky-500 border-sky-700 dark:border-sky-400;
  box-shadow: 0 6px 20px 0 rgba(14, 165, 233, 0.6);
}

/* LinkedIn - bright vibrant blue */
.social-share-linkedin :deep(.social-share-button),
.social-share-wrapper[data-network='linkedin'] :deep(.social-share-button) {
  @apply bg-blue-600 dark:bg-blue-700 text-white border-blue-700 dark:border-blue-600;
  box-shadow: 0 4px 14px 0 rgba(37, 99, 235, 0.4);
}

.social-share-linkedin:hover :deep(.social-share-button),
.social-share-wrapper[data-network='linkedin']:hover :deep(.social-share-button) {
  @apply bg-blue-700 dark:bg-blue-600 border-blue-800 dark:border-blue-500;
  box-shadow: 0 6px 20px 0 rgba(37, 99, 235, 0.6);
}

/* WhatsApp - bright vibrant emerald/green */
.social-share-whatsapp :deep(.social-share-button),
.social-share-wrapper[data-network='whatsapp'] :deep(.social-share-button) {
  @apply bg-emerald-500 dark:bg-emerald-600 text-white border-emerald-600 dark:border-emerald-500;
  box-shadow: 0 4px 14px 0 rgba(16, 185, 129, 0.4);
}

.social-share-whatsapp:hover :deep(.social-share-button),
.social-share-wrapper[data-network='whatsapp']:hover :deep(.social-share-button) {
  @apply bg-emerald-600 dark:bg-emerald-500 border-emerald-700 dark:border-emerald-400;
  box-shadow: 0 6px 20px 0 rgba(16, 185, 129, 0.6);
}

/* Email - bright vibrant slate/gray */
.social-share-email :deep(.social-share-button),
.social-share-wrapper[data-network='email'] :deep(.social-share-button) {
  @apply bg-slate-600 dark:bg-slate-500 text-white border-slate-700 dark:border-slate-400;
  box-shadow: 0 4px 14px 0 rgba(71, 85, 105, 0.4);
}

.social-share-email:hover :deep(.social-share-button),
.social-share-wrapper[data-network='email']:hover :deep(.social-share-button) {
  @apply bg-slate-700 dark:bg-slate-400 border-slate-800 dark:border-slate-300;
  box-shadow: 0 6px 20px 0 rgba(71, 85, 105, 0.6);
}
</style>
