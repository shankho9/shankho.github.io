<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppCard, { type AppListItem } from '~/components/notion/AppCard.vue'

const apps = ref<AppListItem[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const searchQuery = ref('')

const filteredApps = computed(() => {
  if (!searchQuery.value.trim()) {
    return apps.value
  }

  const query = searchQuery.value.toLowerCase().trim()
  return apps.value.filter((app) => {
    if (app.title.toLowerCase().includes(query)) return true
    if (app.description.toLowerCase().includes(query)) return true
    if (app.category.toLowerCase().includes(query)) return true
    if (app.platforms.some((p) => p.toLowerCase().includes(query))) return true
    return false
  })
})

const loadApps = async () => {
  isLoading.value = true
  error.value = null

  try {
    const response = await $fetch<{ success: boolean; items: AppListItem[] }>('/api/apps/list')
    if (response.success) {
      apps.value = response.items
    }
  } catch (err) {
    console.error('[AppsTab] Failed to load apps:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load apps'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadApps()
})

defineExpose({ apps, loadApps, isLoading })
</script>

<template>
  <div>
    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-12">
      <Icon name="svg-spinners:180-ring" class="text-4xl text-sky-700 dark:text-sky-400 mb-4" />
      <p class="text-zinc-600 dark:text-zinc-400">Loading apps...</p>
    </div>

    <!-- Error -->
    <div
      v-else-if="error"
      class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center"
    >
      <Icon name="mdi:alert-circle" class="text-4xl text-red-600 dark:text-red-400 mb-4" />
      <p class="text-red-600 dark:text-red-400 mb-2">{{ error }}</p>
      <button
        class="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-semibold"
        @click="loadApps"
      >
        <Icon name="mdi:refresh" class="inline mr-2" size="18" />
        Try Again
      </button>
    </div>

    <!-- Content -->
    <div v-else>
      <!-- Search -->
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
            placeholder="Search apps..."
            class="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          />
          <button
            v-if="searchQuery"
            class="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            @click="searchQuery = ''"
          >
            <Icon name="mdi:close-circle" size="20" />
          </button>
        </div>
        <p v-if="searchQuery" class="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Found {{ filteredApps.length }} {{ filteredApps.length === 1 ? 'result' : 'results' }}
        </p>
      </div>

      <!-- Grid -->
      <div v-if="filteredApps.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AppCard v-for="app in filteredApps" :key="app.id" :app="app" />
      </div>

      <!-- Empty -->
      <div v-else class="text-center py-12">
        <Icon name="mdi:cellphone-off" class="text-6xl text-zinc-400 mb-4" />
        <p class="text-lg text-zinc-600 dark:text-zinc-400">
          {{
            searchQuery
              ? `No apps found matching "${searchQuery}"`
              : 'No apps available yet'
          }}
        </p>
        <p v-if="searchQuery" class="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
          Try adjusting your search terms or clearing the search.
        </p>
        <p v-else class="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
          Add apps to your Notion database with Type = App to see them here.
        </p>
      </div>
    </div>
  </div>
</template>
