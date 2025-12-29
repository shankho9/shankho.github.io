<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useNotion, type NotionItem } from '~/composables/useNotion'
import NotionResourceCard from './ResourceCard.vue'

interface Props {
  type?: 'books' | 'tools' | 'learning' | 'all'
  databaseId?: string
  autoLoad?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'all',
  databaseId: undefined,
  autoLoad: true,
})

const { isLoading, error, fetchResources, fetchDatabase } = useNotion()
const items = ref<NotionItem[]>([])

// Helper function to extract type string from various formats
const extractTypeString = (item: NotionItem): string => {
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

const filteredItems = computed(() => {
  if (props.type === 'all') return items.value

  return items.value.filter((item) => {
    const itemType = extractTypeString(item)
    const typeMap: Record<string, string> = {
      books: 'Book',
      tools: 'Tool',
      learning: 'Learning Resource',
    }
    return itemType === typeMap[props.type || 'all']
  })
})

const books = computed(() => {
  return filteredItems.value.filter((item) => {
    const typeStr = extractTypeString(item)
    return typeStr === 'Book'
  })
})

const tools = computed(() => {
  return filteredItems.value.filter((item) => {
    const typeStr = extractTypeString(item)
    return typeStr === 'Tool'
  })
})

const learningResources = computed(() => {
  return filteredItems.value.filter((item) => {
    const typeStr = extractTypeString(item)
    return typeStr === 'Learning Resource'
  })
})

const loadResources = async () => {
  const config = useRuntimeConfig()
  const databaseId = props.databaseId || config.public?.notionDatabaseId || config.notionDatabaseId

  if (databaseId) {
    const response = await fetchDatabase({
      databaseId: databaseId,
      pageSize: 100,
    })
    if (response.success) {
      items.value = response.items
    }
  } else {
    const response = await fetchResources(props.type)
    if (response.success) {
      items.value = response.items
    }
  }
}

onMounted(() => {
  if (props.autoLoad) {
    loadResources()
  }
})

defineExpose({
  loadResources,
  items,
  books,
  tools,
  learningResources,
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
    <div
      v-else-if="error"
      class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center"
    >
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
    <div v-else-if="filteredItems.length > 0">
      <slot
        :items="filteredItems"
        :books="books"
        :tools="tools"
        :learning-resources="learningResources"
      >
        <!-- Default rendering -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <NotionResourceCard
            v-for="item in filteredItems"
            :key="item.id"
            :item="item"
            :type="
              type === 'books'
                ? 'book'
                : type === 'tools'
                  ? 'tool'
                  : type === 'learning'
                    ? 'learning'
                    : 'default'
            "
          />
        </div>
      </slot>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12">
      <Icon name="mdi:notebook-off" class="text-6xl text-zinc-400 mb-4" />
      <p class="text-lg text-zinc-600 dark:text-zinc-400">No resources found</p>
      <p class="text-sm text-zinc-500 dark:text-zinc-500 mt-2">
        Add resources to your Notion database to see them here.
      </p>
    </div>
  </div>
</template>
