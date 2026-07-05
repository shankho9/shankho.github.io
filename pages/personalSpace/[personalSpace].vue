<script setup lang="ts">
import type { BlogPost } from '@/types/blog'
import { seoData } from '~/data'
import { computed, onMounted, onUnmounted, nextTick, ref } from 'vue'
import LikeButton from '@/components/blog/LikeButton.vue'
import Comments from '@/components/blog/Comments.vue'
import ReadingProgress from '@/components/blog/ReadingProgress.vue'
import FocusMode from '@/components/blog/FocusMode.vue'
import TextToSpeech from '@/components/blog/TextToSpeech.vue'
import { calculateReadingTime } from '~/utils/blog/readingTime'
import { useAuth } from '~/composables/useAuth'

const { path } = useRoute()

// Authentication
const { isAuthenticated, loadStoredUser } = useAuth()
const showLoginModal = ref(false)

const openLoginModal = () => {
  showLoginModal.value = true
}

const closeLoginModal = () => {
  showLoginModal.value = false
}

// Convert route path to content path
// Route path: /personalSpace/8. Fav_map
// Content path: /blogs/8. Fav_map
const getContentPath = (routePath: string): string => {
  let contentPath = routePath

  // Remove /personalSpace/ prefix if present
  if (contentPath.startsWith('/personalSpace/')) {
    contentPath = contentPath.replace(/^\/personalSpace\//, '')
  } else if (contentPath.startsWith('/personalSpace')) {
    contentPath = contentPath.replace(/^\/personalSpace/, '')
  }

  // Ensure it starts with /
  if (!contentPath.startsWith('/')) {
    contentPath = '/' + contentPath
  }

  // Prepend /blogs/ if not already present
  if (!contentPath.startsWith('/blogs/')) {
    contentPath = '/blogs' + contentPath
  }

  return contentPath
}

// Get content path for current route
const blogsPath = getContentPath(path)

// Fetch article data
const { data: articles, error } = await useAsyncData(`personal-space-${blogsPath}`, async () => {
  let result = null
  try {
    result = await queryCollection('content').path(blogsPath).first()
  } catch {
    // If path query fails, try without .md extension
    const pathWithoutMd = blogsPath.replace(/\.md$/, '')
    result = await queryCollection('content').path(pathWithoutMd).first()
  }

  if (!result) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Article not found',
      fatal: true,
    })
  }

  return result
})

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

const readingTimeTimeout = ref<NodeJS.Timeout | null>(null)

// Initialize auth on mount
onMounted(() => {
  loadStoredUser()

  // Calculate reading time from article content
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
      // Store timeout so it can be cleared on unmount
      readingTimeTimeout.value = setTimeout(() => {
        calculateTime()
        readingTimeTimeout.value = null
      }, 500)
    }
  })
})

// Cleanup timeouts on unmount
onUnmounted(() => {
  if (readingTimeTimeout.value) {
    clearTimeout(readingTimeTimeout.value)
    readingTimeTimeout.value = null
  }
})

useHead({
  title: data.value.title || '',
  meta: [
    { name: 'description', content: data.value.description },
    {
      name: 'description',
      content: data.value.description,
    },
    // Test on: https://developers.facebook.com/tools/debug/ or https://socialsharepreview.com/
    { property: 'og:title', content: data.value.title },
    { property: 'og:description', content: data.value.description },
    { property: 'og:image', content: data.value.ogImage },
    { property: 'og:type', content: 'article' },
    { property: 'og:url', content: `${seoData.mySite}${path}` },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: data.value.title },
    { name: 'twitter:description', content: data.value.description },
    { name: 'twitter:image', content: data.value.ogImage },
  ],
})

// Generate OG Image with error handling (static og:image is also set in useHead above)
try {
  defineOgImageComponent('About', {
    headline: data.value.title,
    title: data.value.title,
    description: data.value.description,
  })
} catch (error) {
  console.error('[Personal Space Detail] Failed to define OG image:', error)
  // Don't throw - allow page to render without OG image
}
</script>

<template>
  <div class="overflow-x-hidden min-w-0 w-full">
    <ReadingProgress />

    <!-- Authentication Required Message -->
    <div v-if="!isAuthenticated" class="max-w-2xl mx-auto mt-12 px-4 sm:px-6">
      <div
        class="bg-white dark:bg-slate-800 rounded-xl p-8 text-center border border-gray-200 dark:border-slate-700 shadow-lg"
      >
        <Icon name="mdi:lock" class="text-6xl text-sky-700 dark:text-sky-400 mb-4 mx-auto" />
        <h2 class="text-2xl font-bold mb-4 text-zinc-800 dark:text-zinc-200">
          Authentication Required
        </h2>
        <p class="text-zinc-600 dark:text-zinc-400 mb-6">Please sign in to access this LifeLine.</p>
        <button
          class="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
          @click="openLoginModal"
        >
          <Icon name="mdi:login" size="20" />
          Login
        </button>
      </div>
    </div>

    <!-- LifeLine Content (Authenticated Users Only) -->
    <div
      v-else
      class="px-3 sm:px-6 container max-w-5xl mx-auto sm:grid grid-cols-12 gap-x-12 overflow-x-hidden w-full"
    >
      <div class="col-span-12 lg:col-span-9 blog-content-container min-w-0">
        <div class="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <div class="flex items-center gap-2">
            <FocusMode />
            <TextToSpeech :post-id="path" />
          </div>
        </div>

        <article
          class="prose prose-lg dark:prose-invert max-w-full prose-pre:overflow-x-auto prose-pre:max-w-full prose-img:max-w-full"
        >
          <ContentRenderer :value="articles" />
        </article>

        <div class="mt-8 flex items-center justify-between flex-wrap gap-4">
          <LikeButton :post-id="path" />
          <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Icon name="mdi:clock-outline" size="18" />
            <span v-if="readingTime">{{ readingTime }} min read</span>
            <span v-else>Reading...</span>
          </div>
        </div>

        <Comments :post-id="path" />
      </div>

      <aside class="col-span-12 lg:col-span-3 mt-8 lg:mt-0">
        <div class="sticky top-20 space-y-6">
          <div class="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-md">
            <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Share</h3>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="network in ['facebook', 'twitter', 'linkedin', 'whatsapp', 'email']"
                :key="network"
                :class="`social-share-wrapper social-share-${network === 'twitter' ? 'x' : network}`"
                :data-network="network === 'twitter' ? 'x' : network"
                :title="`Share with ${network === 'twitter' ? 'X' : network.charAt(0).toUpperCase() + network.slice(1)}`"
              >
                <SocialShare
                  :network="network === 'twitter' ? 'x' : network"
                  :styled="false"
                  :label="false"
                  class="social-share-button"
                  :aria-label="`Share on ${network === 'twitter' ? 'X' : network.charAt(0).toUpperCase() + network.slice(1)}`"
                />
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- Login Modal -->
    <AuthLoginModal :is-open="showLoginModal" @close="closeLoginModal" />
  </div>
</template>

<style scoped>
/* Wrapper for share buttons */
.social-share-wrapper {
  @apply relative flex items-center;
}

/* Social Share Button Styles */
:deep(.social-share-button) {
  @apply w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200;
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

/* Facebook - bright vibrant blue */
.social-share-facebook :deep(.social-share-button),
.social-share-wrapper[data-network='facebook'] :deep(.social-share-button) {
  @apply bg-blue-600 dark:bg-blue-700 text-white border-blue-700 dark:border-blue-800;
  box-shadow: 0 4px 14px 0 rgba(37, 99, 235, 0.4);
}

.social-share-facebook:hover :deep(.social-share-button),
.social-share-wrapper[data-network='facebook']:hover :deep(.social-share-button) {
  @apply bg-blue-700 dark:bg-blue-800 border-blue-800 dark:border-blue-900;
  box-shadow: 0 6px 20px 0 rgba(37, 99, 235, 0.6);
}

/* LinkedIn - bright vibrant blue */
.social-share-linkedin :deep(.social-share-button),
.social-share-wrapper[data-network='linkedin'] :deep(.social-share-button) {
  @apply bg-blue-700 dark:bg-blue-800 text-white border-blue-800 dark:border-blue-900;
  box-shadow: 0 4px 14px 0 rgba(29, 78, 216, 0.4);
}

.social-share-linkedin:hover :deep(.social-share-button),
.social-share-wrapper[data-network='linkedin']:hover :deep(.social-share-button) {
  @apply bg-blue-800 dark:bg-blue-900 border-blue-900 dark:border-blue-950;
  box-shadow: 0 6px 20px 0 rgba(29, 78, 216, 0.6);
}

/* WhatsApp - bright vibrant green */
.social-share-whatsapp :deep(.social-share-button),
.social-share-wrapper[data-network='whatsapp'] :deep(.social-share-button) {
  @apply bg-emerald-500 dark:bg-emerald-600 text-white border-emerald-600 dark:border-emerald-700;
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
