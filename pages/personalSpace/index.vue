<script lang="ts" setup>
import Fuse from 'fuse.js'
import { extractBlogPostFromMeta } from '~/utils/blog/blogMeta'
import { pesonalSpace } from '~/data'
import { parseCustomDate, getDateTimestamp } from '~/utils/common/dateParser'
import { getTagColorClasses, getTagSelectedColorClasses } from '~/utils/blog/tagColors'
import { useGoogleAuth } from '~/composables/useGoogleAuth'
import { ref, onMounted, watch, nextTick } from 'vue'

// Authentication
const { user, isAuthenticated, loadStoredUser, initializeGoogleSignIn } = useGoogleAuth()

// Load all blog posts
const { data } = await useAsyncData('personal-space-posts', () => queryCollection('content').all())

// View mode: 'grid' or 'list'
const viewMode = ref<'grid' | 'list'>('list')

// Pagination
const elementPerPage = ref(12)
const pageNumber = ref(1)

// Search
const searchTest = ref('')

// Filters
const selectedTags = ref<string[]>([])
const sortBy = ref<'date-desc' | 'date-asc' | 'title-asc' | 'title-desc'>('date-desc')

// Format all lifelines data (only posts with "lifelines" tag)
const formattedData = computed(() => {
  if (!data.value) return []

  return data.value
    .map((articles) => {
      const meta = extractBlogPostFromMeta(articles.meta)
      // Normalize path: remove .md extension if present and ensure proper format
      let normalizedPath = articles.path || '/'
      // Remove .md extension if present
      if (normalizedPath.endsWith('.md')) {
        normalizedPath = normalizedPath.replace(/\.md$/, '')
      }
      // Remove leading /content/ if present (Nuxt Content sometimes includes this)
      if (normalizedPath.startsWith('/content/')) {
        normalizedPath = normalizedPath.replace(/^\/content/, '')
      }
      // Ensure path doesn't have double slashes
      normalizedPath = normalizedPath.replace(/\/+/g, '/')

      return {
        path: normalizedPath,
        title: articles.title || 'no-title available',
        description: articles.description || 'no-description available',
        image: meta.image || '/not-found.jpg',
        alt: meta.alt || 'no alter data available',
        ogImage: meta.ogImage || '/not-found.jpg',
        date: meta.date || 'not-date-available',
        tags: meta.tags || [],
        published: meta.published || false,
        category: meta.category || '',
      }
    })
    .filter((post) => {
      // Only show published posts with "lifelines" tag
      const isLifeline = post.tags.includes('lifelines') || post.category === 'lifelines'
      return post.published && isLifeline
    })
})

// Calculate stats
const stats = computed(() => {
  const allTags = new Set<string>()

  formattedData.value.forEach((post) => {
    post.tags.forEach((tag) => {
      // Only count non-lifelines tags for stats
      if (tag !== 'lifelines') {
        allTags.add(tag)
      }
    })
  })

  return {
    totalPosts: formattedData.value.length,
    totalTags: allTags.size,
  }
})

// Get all unique tags for filters (excluding lifelines tag itself)
const allTags = computed(() => {
  const tags = new Set<string>()
  formattedData.value.forEach((post) => {
    post.tags.forEach((tag) => {
      // Exclude the "lifelines" tag from filter options
      if (tag !== 'lifelines') {
        tags.add(tag)
      }
    })
  })
  return Array.from(tags).sort()
})

// Filter data based on selected tags
const filteredData = computed(() => {
  let filtered = formattedData.value

  // Filter by tags
  if (selectedTags.value.length > 0) {
    filtered = filtered.filter((post) => selectedTags.value.some((tag) => post.tags.includes(tag)))
  }

  return filtered
})

// Search functionality
const fuse = computed(
  () =>
    new Fuse(filteredData.value, {
      keys: ['title', 'description', 'tags'],
      threshold: 0.4,
      includeScore: false,
    }),
)

const searchData = computed(() => {
  if (!searchTest.value.trim()) return filteredData.value
  return fuse.value.search(searchTest.value).map((result) => result.item)
})

// Sort data
const sortedData = computed(() => {
  const sorted = [...searchData.value]

  switch (sortBy.value) {
    case 'date-desc':
      return sorted.sort((a, b) => {
        const aDate = parseCustomDate(a.date)
        const bDate = parseCustomDate(b.date)
        return getDateTimestamp(bDate) - getDateTimestamp(aDate)
      })
    case 'date-asc':
      return sorted.sort((a, b) => {
        const aDate = parseCustomDate(a.date)
        const bDate = parseCustomDate(b.date)
        return getDateTimestamp(aDate) - getDateTimestamp(bDate)
      })
    case 'title-asc':
      return sorted.sort((a, b) => a.title.localeCompare(b.title))
    case 'title-desc':
      return sorted.sort((a, b) => b.title.localeCompare(a.title))
    default:
      return sorted
  }
})

// Paginated data
const paginatedData = computed(() => {
  const start = (pageNumber.value - 1) * elementPerPage.value
  return sortedData.value.slice(start, start + elementPerPage.value)
})

const totalPage = computed(() => Math.ceil(sortedData.value.length / elementPerPage.value))

// Pagination functions
function goToPage(page: number) {
  if (page >= 1 && page <= totalPage.value) {
    pageNumber.value = page
    // Scroll to top of results
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function onPreviousPageClick() {
  if (pageNumber.value > 1) {
    pageNumber.value -= 1
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function onNextPageClick() {
  if (pageNumber.value < totalPage.value) {
    pageNumber.value += 1
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

// Filter functions
function toggleTag(tag: string) {
  const index = selectedTags.value.indexOf(tag)
  if (index > -1) {
    selectedTags.value.splice(index, 1)
  } else {
    selectedTags.value.push(tag)
  }
  pageNumber.value = 1 // Reset to first page
}

function clearFilters() {
  selectedTags.value = []
  searchTest.value = ''
  pageNumber.value = 1
}

// Watch for filter changes and reset page
watch([selectedTags, searchTest, sortBy], () => {
  pageNumber.value = 1
})

// Initialize auth on mount
onMounted(() => {
  initializeGoogleSignIn()
  loadStoredUser()

  // Track page visit
  fetch('/api/analytics/track-visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page: 'lifelines' }),
  }).catch(() => {
    // Silent fail
  })
})

// Render Google Sign-In button
const renderGoogleSignInButton = () => {
  nextTick(() => {
    const buttonElement = document.getElementById('lifelines-google-signin-button')
    if (!buttonElement || !window.google) return

    const clientId = useRuntimeConfig().public.googleClientId
    if (!clientId) {
      console.error('[LifeLines] Google Client ID not configured')
      return
    }

    buttonElement.innerHTML = ''

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: { credential: string }) => {
        try {
          const result = await $fetch<{
            user: { email: string; name: string; picture: string; sub: string }
          }>('/api/auth/google', {
            method: 'POST',
            body: { token: response.credential },
          })
          if (result && result.user) {
            user.value = result.user
            localStorage.setItem('google_user', JSON.stringify(result.user))

            if (typeof window !== 'undefined') {
              const { trackLogin } = await import('~/utils/analytics/trackLogin')
              await trackLogin(result.user.email, result.user.name, window.location.pathname)
              window.dispatchEvent(new CustomEvent('auth:signin', { detail: result.user }))
            }
          }
        } catch (error) {
          console.error('[LifeLines] Authentication failed:', error)
        }
      },
    })

    window.google.accounts.id.renderButton(buttonElement, {
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      width: 250,
    })
  })
}

// Watch for authentication changes - render button when not authenticated
watch(isAuthenticated, (newValue) => {
  if (!newValue) {
    nextTick(() => {
      renderGoogleSignInButton()
    })
  }
})

useHead({
  title: pesonalSpace.title,
  meta: [
    {
      name: 'description',
      content: pesonalSpace.description,
    },
  ],
})

const siteData = useSiteConfig()
defineOgImage({
  props: {
    title: pesonalSpace.title,
    description: pesonalSpace.description,
    siteName: siteData.url,
  },
})
</script>

<template>
  <main class="container max-w-5xl mx-auto text-zinc-600">
    <PersonalSpaceHero />

    <!-- Authentication Required Message -->
    <div v-if="!isAuthenticated" class="max-w-2xl mx-auto mt-12 px-6">
      <div
        class="bg-white dark:bg-slate-800 rounded-xl p-8 text-center border border-gray-200 dark:border-slate-700 shadow-lg"
      >
        <Icon name="mdi:lock" class="text-6xl text-sky-700 dark:text-sky-400 mb-4 mx-auto" />
        <h2 class="text-2xl font-bold mb-4 text-zinc-800 dark:text-zinc-200">
          Authentication Required
        </h2>
        <p class="text-zinc-600 dark:text-zinc-400 mb-6">
          Please sign in with Google to access LifeLines.
        </p>
        <div id="lifelines-google-signin-button" class="flex justify-center"></div>
      </div>
    </div>

    <!-- LifeLines Content (Authenticated Users Only) -->
    <div v-else>
      <!-- Stats Section -->
      <div class="px-6 mb-6">
        <div
          class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#F1F2F4] dark:bg-slate-900 rounded-2xl"
        >
          <div class="text-center">
            <div class="text-3xl font-bold text-sky-700 dark:text-sky-400">
              {{ stats.totalPosts }}
            </div>
            <div class="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Total Lifelines</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold text-sky-700 dark:text-sky-400">
              {{ stats.totalTags }}
            </div>
            <div class="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Tags</div>
          </div>
        </div>
      </div>

      <!-- Controls Section -->
      <div class="px-6 mb-6 space-y-4">
        <!-- Search and View Toggle -->
        <div class="flex flex-col sm:flex-row gap-4 items-center">
          <div class="flex-1 w-full">
            <input
              v-model="searchTest"
              placeholder="Search lifelines by title, description, or tags..."
              type="text"
              class="block w-full bg-[#F1F2F4] dark:bg-slate-900 dark:placeholder-zinc-500 text-zinc-300 rounded-md border-gray-300 dark:border-gray-800 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 px-4 py-2"
            />
          </div>
          <div class="flex gap-2 items-center">
            <button
              :class="[
                'px-4 py-2 rounded-md transition-colors',
                viewMode === 'grid'
                  ? 'bg-sky-700 dark:bg-sky-600 text-white'
                  : 'bg-[#F1F2F4] dark:bg-slate-800 text-zinc-600 dark:text-zinc-300',
              ]"
              @click="viewMode = 'grid'"
            >
              <Icon name="mdi:view-grid" size="20" />
            </button>
            <button
              :class="[
                'px-4 py-2 rounded-md transition-colors',
                viewMode === 'list'
                  ? 'bg-sky-700 dark:bg-sky-600 text-white'
                  : 'bg-[#F1F2F4] dark:bg-slate-800 text-zinc-600 dark:text-zinc-300',
              ]"
              @click="viewMode = 'list'"
            >
              <Icon name="mdi:view-list" size="20" />
            </button>
          </div>
        </div>

        <!-- Sort and Filters -->
        <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div class="flex items-center gap-2">
            <label for="sort" class="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Sort by:
            </label>
            <select
              id="sort"
              v-model="sortBy"
              class="bg-[#F1F2F4] dark:bg-slate-900 text-zinc-700 dark:text-zinc-300 rounded-md border-gray-300 dark:border-gray-800 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 px-3 py-2 pr-8 text-sm min-w-[160px]"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="title-asc">Title (A-Z)</option>
              <option value="title-desc">Title (Z-A)</option>
            </select>
          </div>

          <div class="flex-1"></div>

          <button
            v-if="selectedTags.length > 0 || searchTest.trim()"
            class="px-4 py-2 text-sm bg-gray-200 dark:bg-slate-800 text-zinc-700 dark:text-zinc-300 rounded-md hover:bg-gray-300 dark:hover:bg-slate-700 transition-colors"
            @click="clearFilters"
          >
            Clear Filters
          </button>
        </div>

        <!-- Tag Filters -->
        <div v-if="allTags.length > 0" class="flex flex-wrap gap-2">
          <span class="text-sm font-semibold text-zinc-700 dark:text-zinc-300 self-center">
            Tags:
          </span>
          <button
            v-for="tag in allTags"
            :key="tag"
            :class="[
              'px-2 py-0.5 rounded text-xs font-medium transition-colors',
              selectedTags.includes(tag)
                ? getTagSelectedColorClasses(tag)
                : getTagColorClasses(tag) + ' hover:opacity-80',
            ]"
            @click="toggleTag(tag)"
          >
            {{ tag }}
          </button>
        </div>
      </div>

      <!-- Results Count -->
      <div class="px-6 mb-4">
        <p class="text-sm text-zinc-600 dark:text-zinc-400">
          Showing {{ paginatedData.length }} of {{ sortedData.length }} lifelines
          <span v-if="selectedTags.length > 0 || searchTest.trim()"> (filtered) </span>
        </p>
      </div>

      <!-- Lifelines Posts -->
      <div v-auto-animate class="px-4 mb-6">
        <!-- Grid View -->
        <div
          v-if="viewMode === 'grid'"
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          <template v-for="post in paginatedData" :key="post.path">
            <PersonalSpaceCard
              :path="post.path"
              :title="post.title"
              :date="post.date"
              :description="post.description"
              :image="post.image"
              :alt="post.alt"
              :og-image="post.ogImage"
              :tags="post.tags"
              :published="post.published"
            />
          </template>
          <div v-if="paginatedData.length === 0" class="col-span-full text-center py-12">
            <p class="text-lg text-zinc-600 dark:text-zinc-400">No lifelines found</p>
          </div>
        </div>

        <!-- List View -->
        <div v-else class="space-y-5">
          <template v-for="post in paginatedData" :key="post.path">
            <ArchiveCard
              :path="post.path"
              :title="post.title"
              :date="post.date"
              :description="post.description"
              :image="post.image"
              :alt="post.alt"
              :og-image="post.ogImage"
              :tags="post.tags"
              :published="post.published"
              type="lifeline"
            />
          </template>
          <div v-if="paginatedData.length === 0" class="text-center py-12">
            <p class="text-lg text-zinc-600 dark:text-zinc-400">No lifelines found</p>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPage > 1" class="px-6 mb-6">
        <div class="flex flex-col sm:flex-row justify-center items-center gap-4">
          <!-- Previous Button -->
          <button
            :disabled="pageNumber <= 1"
            :class="[
              'px-4 py-2 rounded-md transition-colors',
              pageNumber > 1
                ? 'bg-sky-700 dark:bg-sky-600 text-white hover:bg-sky-800 dark:hover:bg-sky-700'
                : 'bg-gray-200 dark:bg-slate-800 text-zinc-400 cursor-not-allowed',
            ]"
            @click="onPreviousPageClick"
          >
            <Icon name="mdi:code-less-than" size="24" />
          </button>

          <!-- Page Numbers -->
          <div class="flex flex-wrap justify-center gap-2">
            <button
              v-for="page in totalPage"
              :key="page"
              :class="[
                'px-3 py-1 rounded-md text-sm font-semibold transition-colors',
                page === pageNumber
                  ? 'bg-sky-700 dark:bg-sky-600 text-white'
                  : 'bg-gray-200 dark:bg-slate-800 text-zinc-700 dark:text-zinc-300 hover:bg-gray-300 dark:hover:bg-slate-700',
              ]"
              @click="goToPage(page)"
            >
              {{ page }}
            </button>
          </div>

          <!-- Next Button -->
          <button
            :disabled="pageNumber >= totalPage"
            :class="[
              'px-4 py-2 rounded-md transition-colors',
              pageNumber < totalPage
                ? 'bg-sky-700 dark:bg-sky-600 text-white hover:bg-sky-800 dark:hover:bg-sky-700'
                : 'bg-gray-200 dark:bg-slate-800 text-zinc-400 cursor-not-allowed',
            ]"
            @click="onNextPageClick"
          >
            <Icon name="mdi:code-greater-than" size="24" />
          </button>
        </div>

        <!-- Page Info -->
        <div class="text-center mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          Page {{ pageNumber }} of {{ totalPage }}
        </div>
      </div>
    </div>
  </main>
</template>
