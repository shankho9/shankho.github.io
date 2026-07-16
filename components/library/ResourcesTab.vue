<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import TinaEditButton from '~/components/library/TinaEditButton.vue'
import ResourceCard from '~/components/library/ResourceCard.vue'
import LibraryFilterChips from '~/components/library/LibraryFilterChips.vue'
import LibraryPagination from '~/components/library/LibraryPagination.vue'
import type { ResourceListItem, ResourceType } from '~/types/resources'
import { toResourceListItem } from '~/utils/resources/display'
import { useTinaEditor } from '~/composables/useTinaEditor'
import { uniqueSortedLabels, useLibraryPagination } from '~/composables/useLibraryPagination'
import { useAuth } from '~/composables/useAuth'
import { useLibraryEngagementStats } from '~/composables/useLibraryEngagementStats'

type ResourceTab = 'books' | 'tools' | 'learning'

const { isAuthenticated } = useAuth()
const { loadStatsForItems } = useLibraryEngagementStats(() => isAuthenticated.value)

const activeResourceTab = ref<ResourceTab>('books')
const searchQuery = ref('')
const categoryFilter = ref<string | null>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)
const items = ref<ResourceListItem[]>([])

const { resourcesCollectionUrl } = useTinaEditor()

const resourceTabs: {
  id: ResourceTab
  label: string
  shortLabel: string
  icon: string
}[] = [
  { id: 'books', label: 'Books', shortLabel: 'Books', icon: 'mdi:book-open-variant' },
  { id: 'tools', label: 'Tools', shortLabel: 'Tools', icon: 'mdi:tools' },
  { id: 'learning', label: 'Learning', shortLabel: 'Learn', icon: 'mdi:school' },
]

const tabResourceType = (tab: ResourceTab): ResourceType => {
  if (tab === 'books') return 'book'
  if (tab === 'tools') return 'tool'
  return 'learning'
}

const books = computed(() => items.value.filter((item) => item.resourceType === 'book'))
const tools = computed(() => items.value.filter((item) => item.resourceType === 'tool'))
const learningResources = computed(() =>
  items.value.filter((item) => item.resourceType === 'learning'),
)

const tabCounts = computed(() => ({
  books: books.value.length,
  tools: tools.value.length,
  learning: learningResources.value.length,
}))

const currentTabItems = computed(() => {
  switch (activeResourceTab.value) {
    case 'books':
      return books.value
    case 'tools':
      return tools.value
    case 'learning':
      return learningResources.value
    default:
      return []
  }
})

const categoryOptions = computed(() =>
  uniqueSortedLabels(currentTabItems.value.map((item) => item.category)),
)

const filteredItems = computed(() => {
  let list = currentTabItems.value

  if (categoryFilter.value) {
    list = list.filter((item) => item.category === categoryFilter.value)
  }

  if (!searchQuery.value.trim()) return list

  const query = searchQuery.value.toLowerCase().trim()
  return list.filter((item) => {
    if (item.title.toLowerCase().includes(query)) return true
    if (item.description.toLowerCase().includes(query)) return true
    if (item.category.toLowerCase().includes(query)) return true
    if (item.author?.toLowerCase().includes(query)) return true
    if (item.tags.some((t) => t.toLowerCase().includes(query))) return true
    return false
  })
})

const { currentPage, pageItems, totalPages, rangeLabel, resetPage, goToPage } =
  useLibraryPagination(filteredItems)

async function syncPageEngagement() {
  if (!isAuthenticated.value || pageItems.value.length === 0) return
  const payload = pageItems.value.map((item) => ({
    id: item.slug,
    likeCount: item.likeCount ?? 0,
    commentCount: item.commentCount ?? 0,
  }))
  await loadStatsForItems(payload, 'resource')
  for (const item of pageItems.value) {
    const row = payload.find((p) => p.id === item.slug)
    if (row) {
      item.likeCount = row.likeCount
      item.commentCount = row.commentCount
    }
  }
}

watch(pageItems, () => {
  void syncPageEngagement()
})

watch(activeResourceTab, () => {
  categoryFilter.value = null
  resetPage()
})

watch([searchQuery, categoryFilter], () => {
  resetPage()
})

watch(categoryOptions, (options) => {
  if (categoryFilter.value && !options.includes(categoryFilter.value)) {
    categoryFilter.value = null
  }
})

const searchPlaceholder = computed(() => {
  switch (activeResourceTab.value) {
    case 'books':
      return 'Search books, authors...'
    case 'tools':
      return 'Search tools...'
    case 'learning':
      return 'Search learning resources...'
    default:
      return 'Search resources...'
  }
})

const cardType = computed(() => tabResourceType(activeResourceTab.value))

const loadResources = async () => {
  isLoading.value = true
  error.value = null
  try {
    const docs = await queryCollection('resources').all()
    items.value = docs
      .map(toResourceListItem)
      .filter((item): item is ResourceListItem => item !== null)
  } catch (err) {
    console.error('[ResourcesTab] Failed to load resources:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load resources'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadResources()
})

defineExpose({ items, loadResources, isLoading })
</script>

<template>
  <div>
    <div v-if="isLoading" class="py-12 text-center">
      <Icon name="svg-spinners:180-ring" class="mb-4 text-4xl text-sky-700 dark:text-sky-400" />
      <p class="text-zinc-600 dark:text-zinc-400">Loading resources...</p>
    </div>

    <div
      v-else-if="error"
      class="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20"
    >
      <Icon name="mdi:alert-circle" class="mb-4 text-4xl text-red-600 dark:text-red-400" />
      <p class="mb-2 text-red-600 dark:text-red-400">{{ error }}</p>
      <button
        class="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
        @click="loadResources"
      >
        <Icon name="mdi:refresh" class="mr-2 inline" size="18" />
        Try Again
      </button>
    </div>

    <div v-else>
      <LibraryTabToolbar v-model:search="searchQuery" :search-placeholder="searchPlaceholder">
        <template #tabs>
          <LibraryTabPill
            v-for="tab in resourceTabs"
            :key="tab.id"
            :icon="tab.icon"
            :label="tab.label"
            :count="tabCounts[tab.id]"
            :active="activeResourceTab === tab.id"
            @click="activeResourceTab = tab.id"
          />
        </template>
        <template #actions>
          <TinaEditButton :href="resourcesCollectionUrl" />
        </template>
      </LibraryTabToolbar>

      <LibraryFilterChips
        v-model="categoryFilter"
        label="Category"
        :options="categoryOptions"
        all-label="All categories"
      />

      <p v-if="searchQuery || categoryFilter" class="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
        {{ filteredItems.length }} {{ filteredItems.length === 1 ? 'result' : 'results' }}
      </p>

      <div v-if="pageItems.length > 0" class="flex flex-col gap-3">
        <ResourceCard
          v-for="item in pageItems"
          :key="item.id"
          :item="item"
          :type="cardType"
          @engagement-changed="syncPageEngagement"
        />
      </div>

      <div v-else class="py-12 text-center">
        <Icon
          :name="
            activeResourceTab === 'books'
              ? 'mdi:book-off'
              : activeResourceTab === 'tools'
                ? 'mdi:tools'
                : 'mdi:school-off'
          "
          class="mb-4 text-6xl text-zinc-400"
        />
        <p class="text-lg text-zinc-600 dark:text-zinc-400">
          {{
            searchQuery || categoryFilter
              ? 'No results match your filters'
              : `No ${activeResourceTab} available yet`
          }}
        </p>
        <p
          v-if="!searchQuery && !categoryFilter"
          class="mt-2 text-sm text-zinc-500 dark:text-zinc-400"
        >
          Add items in Tina CMS to see them here.
        </p>
      </div>

      <LibraryPagination
        :current-page="currentPage"
        :total-pages="totalPages"
        :range-label="rangeLabel"
        @update:current-page="goToPage"
      />
    </div>
  </div>
</template>
