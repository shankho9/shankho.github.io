<script lang="ts" setup>
import Fuse from 'fuse.js'
import { onMounted, onUnmounted, nextTick, watch } from 'vue'
import { extractBlogPostFromMeta } from '~/utils/blog/blogMeta'
import { parseCustomDate, getDateTimestamp } from '~/utils/common/dateParser'
import { getTagColorClasses, getTagSelectedColorClasses } from '~/utils/blog/tagColors'
import { blogsPage } from '~/data'
import { getSearchSuggestions } from '~/utils/search/searchHighlighter'
import SearchSuggestions from '~/components/search/SearchSuggestions.vue'
import SearchFilters from '~/components/search/SearchFilters.vue'
import { usePrefetch } from '~/composables/usePrefetch'

// Load all blog posts
const { data } = await useAsyncData('all-blog-post', () => queryCollection('content').all())

// View mode: 'grid' or 'list'
const viewMode = ref<'grid' | 'list'>('list')

// Pagination
const elementPerPage = ref(12)
const pageNumber = ref(1)

// Search
const searchTest = ref('')
const showSuggestions = ref(false)
const searchInputRef = ref<HTMLInputElement | null>(null)
const suggestionsRef = ref<InstanceType<typeof SearchSuggestions> | null>(null)

// Filters
const selectedTags = ref<string[]>([])
const selectedCategories = ref<string[]>([])
const minDate = ref<string | undefined>(undefined)
const maxDate = ref<string | undefined>(undefined)
const sortBy = ref<'date-desc' | 'date-asc' | 'title-asc' | 'title-desc' | 'category'>('date-desc')

// Format all blog data (exclude lifelines)
const formattedData = computed(() => {
  if (!data.value) return []

  return data.value
    .map((articles) => {
      const meta = extractBlogPostFromMeta(articles.meta)
      return {
        path: articles.path,
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
      // Only show published posts that are NOT lifelines
      const isLifeline = post.tags.includes('lifelines') || post.category === 'lifelines'
      return post.published && !isLifeline
    })
})

// Calculate stats
const stats = computed(() => {
  const allTags = new Set<string>()
  const allCategories = new Set<string>()

  formattedData.value.forEach((post) => {
    post.tags.forEach((tag) => allTags.add(tag))
    if (post.category) allCategories.add(post.category)
  })

  return {
    totalPosts: formattedData.value.length,
    totalTags: allTags.size,
    totalCategories: allCategories.size,
  }
})

// Get all unique tags and categories for filters
const allTags = computed(() => {
  const tags = new Set<string>()
  formattedData.value.forEach((post) => {
    post.tags.forEach((tag) => tags.add(tag))
  })
  return Array.from(tags).sort()
})

const allCategories = computed(() => {
  const categories = new Set<string>()
  formattedData.value.forEach((post) => {
    if (post.category) categories.add(post.category)
  })
  return Array.from(categories).sort()
})

// Filter data based on selected tags, categories, and date range
const filteredData = computed(() => {
  let filtered = formattedData.value

  // Filter by tags
  if (selectedTags.value.length > 0) {
    filtered = filtered.filter((post) => selectedTags.value.some((tag) => post.tags.includes(tag)))
  }

  // Filter by categories
  if (selectedCategories.value.length > 0) {
    filtered = filtered.filter(
      (post) => post.category && selectedCategories.value.includes(post.category),
    )
  }

  // Filter by date range
  if (minDate.value || maxDate.value) {
    filtered = filtered.filter((post) => {
      const postDate = parseCustomDate(post.date)
      const postTimestamp = getDateTimestamp(postDate)

      if (minDate.value) {
        const minTimestamp = getDateTimestamp(parseCustomDate(minDate.value))
        if (postTimestamp < minTimestamp) return false
      }

      if (maxDate.value) {
        const maxTimestamp = getDateTimestamp(parseCustomDate(maxDate.value))
        if (postTimestamp > maxTimestamp) return false
      }

      return true
    })
  }

  return filtered
})

// Enhanced search functionality with improved Fuse.js configuration
const fuse = computed(
  () =>
    new Fuse(filteredData.value, {
      keys: [
        { name: 'title', weight: 0.5 },
        { name: 'description', weight: 0.3 },
        { name: 'tags', weight: 0.15 },
        { name: 'category', weight: 0.05 },
      ],
      threshold: 0.3, // Lower threshold for more accurate matches
      minMatchCharLength: 2, // Minimum characters to match
      includeScore: true,
      ignoreLocation: true, // Search anywhere in the text
      useExtendedSearch: true, // Enable extended search syntax
    }),
)

// Search suggestions
const searchSuggestions = computed(() => {
  if (!searchTest.value.trim() || searchTest.value.length < 2) return []
  return getSearchSuggestions(searchTest.value, filteredData.value, 5)
})

// "Did you mean?" functionality - find similar search terms
const didYouMean = computed(() => {
  if (!searchTest.value.trim() || searchTest.value.length < 3) return null

  // If no results found, try to find similar terms
  const searchResults = fuse.value.search(searchTest.value)
  if (searchResults.length === 0) {
    // Try with a higher threshold to find similar terms
    const similarFuse = new Fuse(filteredData.value, {
      keys: ['title', 'description', 'tags'],
      threshold: 0.6, // More lenient threshold
      minMatchCharLength: 2,
      includeScore: true,
    })

    const similarResults = similarFuse.search(searchTest.value)
    // Accept scores up to and including the threshold (0.6)
    // In Fuse.js, lower scores indicate better matches, so scores <= 0.6 are valid matches
    if (similarResults.length > 0 && similarResults[0].score && similarResults[0].score <= 0.6) {
      // Find the matched term in the result
      const bestMatch = similarResults[0]
      if (bestMatch.matches && bestMatch.matches.length > 0) {
        const matchedValue = bestMatch.matches[0].value as string
        if (matchedValue.toLowerCase() !== searchTest.value.toLowerCase()) {
          return matchedValue
        }
      }
    }
  }
  return null
})

const searchData = computed(() => {
  if (!searchTest.value.trim()) return filteredData.value
  const results = fuse.value.search(searchTest.value)
  return results.map((result) => result.item)
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
    case 'category':
      return sorted.sort((a, b) => {
        const aCat = a.category || ''
        const bCat = b.category || ''
        return aCat.localeCompare(bCat)
      })
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

function toggleCategory(category: string) {
  const index = selectedCategories.value.indexOf(category)
  if (index > -1) {
    selectedCategories.value.splice(index, 1)
  } else {
    selectedCategories.value.push(category)
  }
  pageNumber.value = 1 // Reset to first page
}

function clearFilters() {
  selectedTags.value = []
  selectedCategories.value = []
  searchTest.value = ''
  minDate.value = undefined
  maxDate.value = undefined
  pageNumber.value = 1
  showSuggestions.value = false
}

// Search suggestion handlers
function onSuggestionSelect(query: string) {
  searchTest.value = query
  showSuggestions.value = false
  pageNumber.value = 1
}

function onSuggestionClose() {
  showSuggestions.value = false
}

function handleSearchKeyDown(event: KeyboardEvent) {
  if (suggestionsRef.value) {
    suggestionsRef.value.handleKeyDown(event)
  }
}

function handleSearchFocus() {
  if (searchTest.value.length >= 2) {
    showSuggestions.value = true
  }
}

function handleSearchInput() {
  showSuggestions.value = searchTest.value.length >= 2
}

function handleDidYouMeanClick() {
  if (didYouMean.value) {
    searchTest.value = didYouMean.value
    showSuggestions.value = false
    pageNumber.value = 1
  }
}

// Close suggestions when clicking outside
function handleClickOutside(event: MouseEvent) {
  if (
    searchInputRef.value &&
    !searchInputRef.value.contains(event.target as Node) &&
    !(event.target as HTMLElement)?.closest('.search-suggestions-container')
  ) {
    showSuggestions.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Watch for filter changes and reset page
watch([selectedTags, selectedCategories, searchTest, sortBy, minDate, maxDate], () => {
  pageNumber.value = 1
})

// Prefetching for performance
const { prefetchNext } = usePrefetch()

// Prefetch next page when current page is loaded
watch(
  [pageNumber, totalPage],
  ([currentPage, totalPages]) => {
    if (import.meta.client && currentPage < totalPages) {
      // Prefetch next page in the background
      nextTick(() => {
        const baseUrl = window.location.pathname
        prefetchNext(currentPage, totalPages, baseUrl)
      })
    }
  },
  { immediate: true },
)

// Prefetch images on hover for blog cards (lazy load optimization)
// Note: Currently unused - images are lazy loaded via NuxtImg with loading="lazy"
// const prefetchBlogImages = (imageUrl: string) => {
//   if (import.meta.client) {
//     const link = document.createElement('link')
//     link.rel = 'prefetch'
//     link.href = imageUrl
//     link.as = 'image'
//     document.head.appendChild(link)
//   }
// }

useHead({
  title: 'All Blogs',
  meta: [
    {
      name: 'description',
      content: blogsPage.description,
    },
  ],
})

// Generate OG Image with error handling
try {
  defineOgImageComponent('About', {
    headline: blogsPage.title,
    title: blogsPage.title,
    description: blogsPage.description,
  })
} catch (error) {
  console.error('[Blogs Index] Failed to define OG image:', error)
  // Don't throw - allow page to render without OG image
}
</script>

<template>
  <main
    class="container max-w-5xl mx-auto text-zinc-600 overflow-x-hidden px-3 sm:px-6 w-full min-w-0"
  >
    <ArchiveHero :title="blogsPage.title" :description="blogsPage.description" />

    <!-- Stats Section -->
    <div class="px-3 sm:px-6 mb-6">
      <div
        class="flex flex-row justify-around gap-2 sm:gap-4 p-3 sm:p-4 bg-[#F1F2F4] dark:bg-slate-900 rounded-2xl min-w-0 overflow-hidden"
      >
        <div class="text-center flex-1 min-w-0">
          <div class="text-2xl sm:text-3xl font-bold text-sky-700 dark:text-sky-400">
            {{ stats.totalPosts }}
          </div>
          <div class="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">Total Posts</div>
        </div>
        <div class="text-center flex-1 min-w-0">
          <div class="text-2xl sm:text-3xl font-bold text-sky-700 dark:text-sky-400">
            {{ stats.totalCategories }}
          </div>
          <div class="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">Categories</div>
        </div>
        <div class="text-center flex-1 min-w-0">
          <div class="text-2xl sm:text-3xl font-bold text-sky-700 dark:text-sky-400">
            {{ stats.totalTags }}
          </div>
          <div class="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">Tags</div>
        </div>
      </div>
    </div>

    <!-- Controls Section -->
    <div class="px-3 sm:px-6 mb-6 space-y-4 min-w-0">
      <!-- Search and View Toggle -->
      <div class="flex flex-col sm:flex-row gap-4 items-center">
        <div class="flex-1 w-full relative search-suggestions-container">
          <input
            ref="searchInputRef"
            v-model="searchTest"
            placeholder="Search blogs by title, description, tags, or category..."
            type="text"
            class="block w-full bg-[#F1F2F4] dark:bg-slate-900 dark:placeholder-zinc-500 text-zinc-300 rounded-md border-gray-300 dark:border-gray-800 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 px-4 py-2"
            @focus="handleSearchFocus"
            @input="handleSearchInput"
            @keydown="handleSearchKeyDown"
          />
          <SearchSuggestions
            ref="suggestionsRef"
            :suggestions="searchSuggestions"
            :query="searchTest"
            :show="showSuggestions"
            @select="onSuggestionSelect"
            @close="onSuggestionClose"
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
            class="bg-[#F1F2F4] dark:bg-slate-900 text-zinc-700 dark:text-zinc-300 rounded-md border-gray-300 dark:border-gray-800 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 px-3 py-2 pr-8 text-sm min-w-0 max-w-full sm:min-w-[160px]"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="title-asc">Title (A-Z)</option>
            <option value="title-desc">Title (Z-A)</option>
            <option value="category">Category</option>
          </select>
        </div>

        <div class="flex-1"></div>

        <button
          v-if="
            selectedTags.length > 0 ||
            selectedCategories.length > 0 ||
            searchTest.trim() ||
            minDate ||
            maxDate
          "
          class="px-4 py-2 text-sm bg-gray-200 dark:bg-slate-800 text-zinc-700 dark:text-zinc-300 rounded-md hover:bg-gray-300 dark:hover:bg-slate-700 transition-colors"
          @click="clearFilters"
        >
          Clear Filters
        </button>
      </div>

      <!-- Advanced Search Filters -->
      <SearchFilters
        :all-tags="allTags"
        :all-categories="allCategories"
        :selected-tags="selectedTags"
        :selected-categories="selectedCategories"
        :min-date="minDate"
        :max-date="maxDate"
        @update:selected-tags="selectedTags = $event"
        @update:selected-categories="selectedCategories = $event"
        @update:min-date="minDate = $event"
        @update:max-date="maxDate = $event"
        @clear="clearFilters"
      />

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

      <!-- Category Filters -->
      <div v-if="allCategories.length > 0" class="flex flex-wrap gap-2">
        <span class="text-sm font-semibold text-zinc-700 dark:text-zinc-300 self-center">
          Categories:
        </span>
        <button
          v-for="category in allCategories"
          :key="category"
          :class="[
            'px-3 py-1 rounded-md text-sm font-semibold transition-colors',
            selectedCategories.includes(category)
              ? 'bg-sky-700 dark:bg-sky-600 text-white'
              : 'bg-gray-200 dark:bg-slate-800 text-zinc-700 dark:text-zinc-300 hover:bg-gray-300 dark:hover:bg-slate-700',
          ]"
          @click="toggleCategory(category)"
        >
          {{ category }}
        </button>
      </div>
    </div>

    <!-- Results Count -->
    <div class="px-3 sm:px-6 mb-4 space-y-2 min-w-0">
      <p class="text-sm text-zinc-600 dark:text-zinc-400">
        Showing {{ paginatedData.length }} of {{ sortedData.length }} posts
        <span
          v-if="
            selectedTags.length > 0 ||
            selectedCategories.length > 0 ||
            searchTest.trim() ||
            minDate ||
            maxDate
          "
        >
          (filtered)
        </span>
      </p>

      <!-- Did you mean? -->
      <div v-if="didYouMean" class="text-sm text-sky-600 dark:text-sky-400">
        <span>No results found for "{{ searchTest }}". </span>
        <button
          class="underline hover:text-sky-700 dark:hover:text-sky-300 font-medium"
          @click="handleDidYouMeanClick"
        >
          Did you mean "{{ didYouMean }}"?
        </button>
      </div>

      <!-- Search term highlighting info -->
      <p
        v-if="searchTest.trim() && sortedData.length > 0"
        class="text-xs text-zinc-500 dark:text-zinc-500"
      >
        Search results highlighted for: "{{ searchTest }}"
      </p>
    </div>

    <!-- Blog Posts -->
    <div v-auto-animate class="px-2 sm:px-4 mb-6 min-w-0 overflow-hidden">
      <!-- Grid View -->
      <div
        v-if="viewMode === 'grid'"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 min-w-0"
      >
        <template v-for="post in paginatedData" :key="post.path">
          <BlogCard
            :path="post.path"
            :title="post.title"
            :date="post.date"
            :description="post.description"
            :image="post.image"
            :alt="post.alt"
            :og-image="post.ogImage"
            :tags="post.tags"
            :published="post.published"
            :search-query="searchTest.trim() || undefined"
          />
        </template>
        <div v-if="paginatedData.length === 0" class="col-span-full text-center py-12">
          <p class="text-lg text-zinc-600 dark:text-zinc-400">No posts found</p>
        </div>
      </div>

      <!-- List View -->
      <div v-else class="space-y-5 min-w-0">
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
            type="blog"
            :search-query="searchTest.trim() || undefined"
          />
        </template>
        <div v-if="paginatedData.length === 0" class="text-center py-12">
          <p class="text-lg text-zinc-600 dark:text-zinc-400">No posts found</p>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPage > 1" class="px-3 sm:px-6 mb-6">
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
  </main>
</template>
