<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppCard, { type AppListItem } from '~/components/notion/AppCard.vue'

const apps = ref<AppListItem[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const searchQuery = ref('')

const filteredApps = computed(() => {
  if (!searchQuery.value.trim()) return apps.value
  const query = searchQuery.value.toLowerCase().trim()
  return apps.value.filter((app) => {
    if (app.title.toLowerCase().includes(query)) return true
    if (app.description.toLowerCase().includes(query)) return true
    if (app.categories.some((c) => c.toLowerCase().includes(query))) return true
    if (app.version.toLowerCase().includes(query)) return true
    return false
  })
})

const loadApps = async () => {
  isLoading.value = true
  error.value = null
  try {
    const response = await $fetch<{ success: boolean; items: AppListItem[] }>('/api/apps/list')
    if (response.success) apps.value = response.items
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
    <div v-if="isLoading" class="py-12 text-center">
      <Icon name="svg-spinners:180-ring" class="mb-4 text-4xl text-sky-700 dark:text-sky-400" />
      <p class="text-zinc-600 dark:text-zinc-400">Loading apps...</p>
    </div>

    <div
      v-else-if="error"
      class="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20"
    >
      <Icon name="mdi:alert-circle" class="mb-4 text-4xl text-red-600 dark:text-red-400" />
      <p class="mb-2 text-red-600 dark:text-red-400">{{ error }}</p>
      <button
        class="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
        @click="loadApps"
      >
        <Icon name="mdi:refresh" class="mr-2 inline" size="18" />
        Try Again
      </button>
    </div>

    <div v-else>
      <LibraryTabToolbar
        v-model:search="searchQuery"
        search-placeholder="Search apps, categories, version..."
      />

      <p v-if="searchQuery" class="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
        {{ filteredApps.length }} {{ filteredApps.length === 1 ? 'result' : 'results' }}
      </p>

      <div v-if="filteredApps.length > 0" class="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <AppCard v-for="app in filteredApps" :key="app.id" :app="app" />
      </div>

      <div v-else class="py-12 text-center">
        <Icon name="mdi:cellphone-off" class="mb-4 text-6xl text-zinc-400" />
        <p class="text-lg text-zinc-600 dark:text-zinc-400">
          {{ searchQuery ? `No apps found matching "${searchQuery}"` : 'No apps available yet' }}
        </p>
        <p v-if="!searchQuery" class="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Add apps to your Notion database with Type = App to see them here.
        </p>
      </div>
    </div>
  </div>
</template>
