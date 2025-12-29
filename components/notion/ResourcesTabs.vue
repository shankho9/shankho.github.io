<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useNotion, type NotionItem } from '~/composables/useNotion'
import NotionResourceCard from './ResourceCard.vue'

type ResourceTab = 'books' | 'tools' | 'learning'

const activeResourceTab = ref<ResourceTab>('books')
const searchQuery = ref('')

const { isLoading, error, fetchDatabase } = useNotion()
const items = ref<NotionItem[]>([])

// Helper function to extract type string from various formats
const extractTypeString = (item: any): string => {
  // Try Type property first
  let type = item.Type || item.type
  
  // If it's an object with a name property, extract the name
  if (type && typeof type === 'object' && 'name' in type) {
    type = type.name
  }
  
  // If still not a string, try type property
  if (typeof type !== 'string') {
    type = item.type
    if (type && typeof type === 'object' && 'name' in type) {
      type = type.name
    }
  }
  
  // Return as string, trimmed
  return typeof type === 'string' ? type.trim() : ''
}

// Filter items by type and published status
const books = computed(() => {
  return items.value.filter((item) => {
    // Check if published
    const published = item.Published || item.published || false
    if (!published) return false
    
    // Check type
    const typeStr = extractTypeString(item)
    return typeStr === 'Book'
  })
})

const tools = computed(() => {
  return items.value.filter((item) => {
    // Check if published
    const published = item.Published || item.published || false
    if (!published) return false
    
    // Check type
    const typeStr = extractTypeString(item)
    return typeStr === 'Tool'
  })
})

const learningResources = computed(() => {
  return items.value.filter((item) => {
    // Check if published
    const published = item.Published || item.published || false
    if (!published) return false
    
    // Check type
    const typeStr = extractTypeString(item)
    return typeStr === 'Learning Resource'
  })
})

// Get current tab items
const currentTabItems = computed(() => {
  let tabItems: NotionItem[] = []
  switch (activeResourceTab.value) {
    case 'books':
      tabItems = books.value
      break
    case 'tools':
      tabItems = tools.value
      break
    case 'learning':
      tabItems = learningResources.value
      break
  }
  return tabItems
})

// Filter by search query
const filteredItems = computed(() => {
  if (!searchQuery.value.trim()) {
    return currentTabItems.value
  }
  
  const query = searchQuery.value.toLowerCase().trim()
  
  return currentTabItems.value.filter((item) => {
    // Search in title
    const title = item.Title || item.title || item.Name || item.name || ''
    if (title && String(title).toLowerCase().includes(query)) return true
    
    // Search in description
    const description = item.Description || item.description || ''
    if (description && String(description).toLowerCase().includes(query)) return true
    
    // Search in category
    const category = item.Category || item.category || ''
    if (category && String(category).toLowerCase().includes(query)) return true
    
    // Search in author (for books)
    const author = item.Author || item.author || ''
    if (author && String(author).toLowerCase().includes(query)) return true
    
    return false
  })
})

// Load resources from Notion
const loadResources = async () => {
  const config = useRuntimeConfig()
  const databaseId = config.public.notionDatabaseId
  
  if (databaseId && typeof databaseId === 'string') {
    const response = await fetchDatabase({
      databaseId: databaseId,
      pageSize: 100,
    })
    if (response.success) {
      items.value = response.items
    }
  }
}

onMounted(() => {
  loadResources()
})
</script>

<template>
  <div>
    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-12">
      <Icon name="svg-spinners:180-ring" class="text-4xl text-sky-700 dark:text-sky-400 mb-4" />
      <p class="text-zinc-600 dark:text-zinc-400">Loading resources from Notion...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
      <Icon name="mdi:alert-circle" class="text-4xl text-red-600 dark:text-red-400 mb-4" />
      <p class="text-red-600 dark:text-red-400 mb-2">{{ error }}</p>
      <button
        class="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-semibold"
        @click="loadResources"
      >
        <Icon name="mdi:refresh" class="inline mr-2" size="18" />
        Try Again
      </button>
    </div>

    <!-- Content -->
    <div v-else>
      <!-- Tabs -->
      <div class="mb-6 border-b border-gray-200 dark:border-slate-700">
        <nav class="flex space-x-8" aria-label="Resource Tabs">
          <button
            @click="activeResourceTab = 'books'"
            :class="[
              'py-4 px-1 border-b-2 font-semibold text-sm transition-colors',
              activeResourceTab === 'books'
                ? 'border-sky-700 dark:border-sky-400 text-sky-700 dark:text-sky-400'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600',
            ]"
          >
            <div class="flex items-center gap-2">
              <Icon name="mdi:book-open-variant" size="20" />
              <span>Recommended Books</span>
              <span
                v-if="books.length > 0"
                class="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300"
              >
                {{ books.length }}
              </span>
            </div>
          </button>
          <button
            @click="activeResourceTab = 'tools'"
            :class="[
              'py-4 px-1 border-b-2 font-semibold text-sm transition-colors',
              activeResourceTab === 'tools'
                ? 'border-sky-700 dark:border-sky-400 text-sky-700 dark:text-sky-400'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600',
            ]"
          >
            <div class="flex items-center gap-2">
              <Icon name="mdi:tools" size="20" />
              <span>Tools I Use</span>
              <span
                v-if="tools.length > 0"
                class="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300"
              >
                {{ tools.length }}
              </span>
            </div>
          </button>
          <button
            @click="activeResourceTab = 'learning'"
            :class="[
              'py-4 px-1 border-b-2 font-semibold text-sm transition-colors',
              activeResourceTab === 'learning'
                ? 'border-sky-700 dark:border-sky-400 text-sky-700 dark:text-sky-400'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600',
            ]"
          >
            <div class="flex items-center gap-2">
              <Icon name="mdi:school" size="20" />
              <span>Learning Resources</span>
              <span
                v-if="learningResources.length > 0"
                class="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300"
              >
                {{ learningResources.length }}
              </span>
            </div>
          </button>
        </nav>
      </div>

      <!-- Search Bar -->
      <div class="mb-6">
        <div class="relative">
          <Icon
            name="mdi:magnify"
            class="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
            size="20"
          />
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="`Search ${activeResourceTab === 'books' ? 'books' : activeResourceTab === 'tools' ? 'tools' : 'learning resources'}...`"
            class="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          />
          <button
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            <Icon name="mdi:close-circle" size="20" />
          </button>
        </div>
        <p v-if="searchQuery" class="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Found {{ filteredItems.length }} {{ filteredItems.length === 1 ? 'result' : 'results' }}
        </p>
      </div>

      <!-- Resources Grid -->
      <div v-if="filteredItems.length > 0">
        <div
          :class="[
            'grid gap-6',
            activeResourceTab === 'books' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
          ]"
        >
          <NotionResourceCard
            v-for="item in filteredItems"
            :key="item.id"
            :item="item"
            :type="activeResourceTab === 'books' ? 'book' : activeResourceTab === 'tools' ? 'tool' : 'learning'"
          />
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-12">
        <Icon
          :name="activeResourceTab === 'books' ? 'mdi:book-off' : activeResourceTab === 'tools' ? 'mdi:tools' : 'mdi:school-off'"
          class="text-6xl text-zinc-400 mb-4"
        />
        <p class="text-lg text-zinc-600 dark:text-zinc-400">
          {{
            searchQuery
              ? `No ${activeResourceTab === 'books' ? 'books' : activeResourceTab === 'tools' ? 'tools' : 'learning resources'} found matching "${searchQuery}"`
              : `No ${activeResourceTab === 'books' ? 'books' : activeResourceTab === 'tools' ? 'tools' : 'learning resources'} available`
          }}
        </p>
        <p v-if="searchQuery" class="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
          Try adjusting your search terms or clearing the search.
        </p>
        <p v-else class="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
          Add {{ activeResourceTab === 'books' ? 'books' : activeResourceTab === 'tools' ? 'tools' : 'learning resources' }} to your Notion database to see them here.
        </p>
      </div>
    </div>
  </div>
</template>

