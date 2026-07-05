<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useNotion, type NotionItem } from '~/composables/useNotion'
import NotionResourceCard from './ResourceCard.vue'

type ResourceTab = 'books' | 'tools' | 'learning'

const activeResourceTab = ref<ResourceTab>('books')
const searchQuery = ref('')

const { isLoading, error, fetchDatabase } = useNotion()
const items = ref<NotionItem[]>([])

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

const extractTypeString = (item: NotionItem): string => {
  let type = item.Type || item.type
  if (type && typeof type === 'object' && 'name' in type) {
    type = type.name
  }
  if (typeof type !== 'string') {
    type = item.type
    if (type && typeof type === 'object' && 'name' in type) {
      type = type.name
    }
  }
  return typeof type === 'string' ? type.trim() : ''
}

const books = computed(() =>
  items.value.filter((item) => {
    const published = item.Published || item.published || false
    if (!published) return false
    return extractTypeString(item) === 'Book'
  }),
)

const tools = computed(() =>
  items.value.filter((item) => {
    const published = item.Published || item.published || false
    if (!published) return false
    return extractTypeString(item) === 'Tool'
  }),
)

const learningResources = computed(() =>
  items.value.filter((item) => {
    const published = item.Published || item.published || false
    if (!published) return false
    return extractTypeString(item) === 'Learning Resource'
  }),
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

const filteredItems = computed(() => {
  if (!searchQuery.value.trim()) return currentTabItems.value

  const query = searchQuery.value.toLowerCase().trim()
  return currentTabItems.value.filter((item) => {
    const title = item.Title || item.title || item.Name || item.name || ''
    if (title && String(title).toLowerCase().includes(query)) return true
    const description = item.Description || item.description || ''
    if (description && String(description).toLowerCase().includes(query)) return true
    const category = item.Category || item.category || ''
    if (category && String(category).toLowerCase().includes(query)) return true
    const author = item.Author || item.author || ''
    if (author && String(author).toLowerCase().includes(query)) return true
    return false
  })
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

const cardType = computed((): 'book' | 'tool' | 'learning' => {
  if (activeResourceTab.value === 'books') return 'book'
  if (activeResourceTab.value === 'tools') return 'tool'
  return 'learning'
})

const loadResources = async () => {
  const config = useRuntimeConfig()
  const databaseId = config.public.notionDatabaseId
  if (databaseId && typeof databaseId === 'string') {
    const response = await fetchDatabase({ databaseId, pageSize: 100 })
    if (response.success) items.value = response.items
  }
}

onMounted(() => {
  loadResources()
})
</script>

<template>
  <div>
    <div v-if="isLoading" class="py-12 text-center">
      <Icon name="svg-spinners:180-ring" class="mb-4 text-4xl text-sky-700 dark:text-sky-400" />
      <p class="text-zinc-600 dark:text-zinc-400">Loading resources from Notion...</p>
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
      </LibraryTabToolbar>

      <p v-if="searchQuery" class="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
        {{ filteredItems.length }} {{ filteredItems.length === 1 ? 'result' : 'results' }}
      </p>

      <div v-if="filteredItems.length > 0" class="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <NotionResourceCard
          v-for="item in filteredItems"
          :key="item.id"
          :item="item"
          :type="cardType"
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
            searchQuery
              ? `No results matching "${searchQuery}"`
              : `No ${activeResourceTab} available yet`
          }}
        </p>
        <p v-if="!searchQuery" class="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Add items to your Notion database to see them here.
        </p>
      </div>
    </div>
  </div>
</template>
