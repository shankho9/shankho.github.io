<script setup lang="ts">
import type { BlogPost } from '@/types/blog'
import { navbarData, seoData, siteBrand } from '~/data'
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
    { property: 'article:author', content: siteBrand.authorName },
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
        <BlogPostToolbar :post-id="path" />

        <BlogPostShare compact class="mb-6 lg:hidden" />

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

      <aside class="blog-sidebar col-span-12 hidden lg:col-span-3 lg:block">
        <div class="sticky top-28 space-y-5">
          <BlogPostShare />
          <BlogToc />
          <RelatedContent
            :current-path="path"
            :current-tags="data.tags"
            :current-category="data.category"
            :limit="5"
          />
        </div>
      </aside>

      <!-- Comments Section -->
      <div class="col-span-12 lg:col-span-9 mt-8">
        <Comments :post-id="path" />
      </div>
    </div>
  </div>
</template>
