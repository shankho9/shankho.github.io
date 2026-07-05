<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

definePageMeta({
  layout: 'default',
  middleware: ['auth-admin'],
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase

// Analytics data
interface PopularPostsData {
  success: boolean
  period: string
  popularByVisits: Array<{ page: string; visit_count: number; unique_visitors: number }>
  popularByLikes: Array<{ post_id: string; like_count: number }>
  popularByComments: Array<{ post_id: string; comment_count: number }>
  readingTimeStats: Array<{ page: string; avg_duration: number; avg_completion: number }>
}

const popularPosts = ref<PopularPostsData | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)
const selectedPeriod = ref<'7' | '30' | '90' | '365'>('30')

const loadAnalytics = async () => {
  isLoading.value = true
  error.value = null

  try {
    const data = await $fetch(`${apiBase}/analytics/popular`, {
      params: {
        limit: 20,
        period: selectedPeriod.value,
      },
    })

    popularPosts.value = data
  } catch (err: unknown) {
    console.error('Failed to load analytics:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load analytics'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadAnalytics()
})

watch(selectedPeriod, () => {
  loadAnalytics()
})
</script>

<template>
  <div class="max-w-7xl mx-auto w-full px-3 sm:px-6 py-6 sm:py-8 overflow-x-hidden">
    <!-- Header -->
    <div class="mb-4 sm:mb-6">
      <div
        class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4"
      >
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Popular Posts Analytics
          </h1>
          <p class="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            Track popular content, engagement metrics, and reading behavior
          </p>
        </div>
        <NuxtLink
          to="/dev"
          class="inline-flex items-center px-2.5 py-1.5 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors touch-manipulation"
        >
          <Icon name="mdi:arrow-left" class="mr-1.5 text-base" />
          Back to Utilities
        </NuxtLink>
      </div>

      <!-- Period Selector -->
      <div class="flex items-center gap-2 mb-4">
        <label class="text-sm font-semibold text-gray-700 dark:text-gray-300">Period:</label>
        <select
          v-model="selectedPeriod"
          class="px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-700 rounded-md text-sm focus:ring-2 focus:ring-sky-500"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last year</option>
        </select>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
      <p class="mt-2 text-gray-600 dark:text-gray-400">Loading analytics...</p>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
    >
      <p class="text-red-800 dark:text-red-200">{{ error }}</p>
    </div>

    <!-- Analytics Content -->
    <div v-else-if="popularPosts" class="space-y-6">
      <!-- Popular by Visits -->
      <div class="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 sm:p-6">
        <h2
          class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2"
        >
          <Icon name="mdi:eye" size="24" class="text-sky-600 dark:text-sky-400" />
          Most Visited Posts
        </h2>
        <div v-if="popularPosts.popularByVisits?.length" class="space-y-2">
          <div
            v-for="(post, index) in popularPosts.popularByVisits"
            :key="post.page"
            class="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-md"
          >
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <span class="text-lg font-bold text-sky-600 dark:text-sky-400 w-6">{{
                index + 1
              }}</span>
              <div class="flex-1 min-w-0">
                <NuxtLink
                  :to="post.page"
                  class="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-sky-600 dark:hover:text-sky-400 truncate block"
                >
                  {{ post.page }}
                </NuxtLink>
              </div>
            </div>
            <div class="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span class="flex items-center gap-1">
                <Icon name="mdi:account-multiple" size="16" />
                {{ post.unique_visitors }}
              </span>
              <span class="flex items-center gap-1">
                <Icon name="mdi:eye" size="16" />
                {{ post.visit_count }}
              </span>
            </div>
          </div>
        </div>
        <p v-else class="text-gray-500 dark:text-gray-400 text-sm">No visit data available</p>
      </div>

      <!-- Popular by Likes -->
      <div
        v-if="popularPosts.popularByLikes?.length"
        class="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 sm:p-6"
      >
        <h2
          class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2"
        >
          <Icon name="mdi:heart" size="24" class="text-red-600 dark:text-red-400" />
          Most Liked Posts
        </h2>
        <div class="space-y-2">
          <div
            v-for="(post, index) in popularPosts.popularByLikes"
            :key="post.post_id"
            class="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-md"
          >
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <span class="text-lg font-bold text-red-600 dark:text-red-400 w-6">{{
                index + 1
              }}</span>
              <div class="flex-1 min-w-0">
                <NuxtLink
                  :to="post.post_id"
                  class="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-red-600 dark:hover:text-red-400 truncate block"
                >
                  {{ post.post_id }}
                </NuxtLink>
              </div>
            </div>
            <div class="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
              <Icon name="mdi:heart" size="16" />
              {{ post.like_count }}
            </div>
          </div>
        </div>
      </div>

      <!-- Popular by Comments -->
      <div
        v-if="popularPosts.popularByComments?.length"
        class="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 sm:p-6"
      >
        <h2
          class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2"
        >
          <Icon name="mdi:comment" size="24" class="text-green-600 dark:text-green-400" />
          Most Commented Posts
        </h2>
        <div class="space-y-2">
          <div
            v-for="(post, index) in popularPosts.popularByComments"
            :key="post.post_id"
            class="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-md"
          >
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <span class="text-lg font-bold text-green-600 dark:text-green-400 w-6">{{
                index + 1
              }}</span>
              <div class="flex-1 min-w-0">
                <NuxtLink
                  :to="post.post_id"
                  class="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-green-600 dark:hover:text-green-400 truncate block"
                >
                  {{ post.post_id }}
                </NuxtLink>
              </div>
            </div>
            <div class="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
              <Icon name="mdi:comment" size="16" />
              {{ post.comment_count }}
            </div>
          </div>
        </div>
      </div>

      <!-- Reading Time Stats -->
      <div
        v-if="popularPosts.readingTimeStats?.length"
        class="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 sm:p-6"
      >
        <h2
          class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2"
        >
          <Icon name="mdi:clock-outline" size="24" class="text-purple-600 dark:text-purple-400" />
          Reading Engagement
        </h2>
        <div class="space-y-2">
          <div
            v-for="(stat, index) in popularPosts.readingTimeStats"
            :key="stat.page"
            class="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-md"
          >
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <span class="text-lg font-bold text-purple-600 dark:text-purple-400 w-6">{{
                index + 1
              }}</span>
              <div class="flex-1 min-w-0">
                <NuxtLink
                  :to="stat.page"
                  class="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-purple-600 dark:hover:text-purple-400 truncate block"
                >
                  {{ stat.page }}
                </NuxtLink>
              </div>
            </div>
            <div class="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span>Avg: {{ Math.round(stat.avg_duration) }}s</span>
              <span>Completion: {{ Math.round(stat.avg_completion) }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-if="
          !popularPosts.popularByVisits?.length &&
          !popularPosts.popularByLikes?.length &&
          !popularPosts.popularByComments?.length
        "
        class="text-center py-12"
      >
        <Icon
          name="mdi:chart-line"
          size="48"
          class="text-gray-400 dark:text-gray-500 mx-auto mb-4"
        />
        <p class="text-gray-600 dark:text-gray-400">
          No analytics data available for the selected period
        </p>
      </div>
    </div>
  </div>
</template>
