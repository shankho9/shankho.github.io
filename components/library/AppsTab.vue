<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { AppListItem } from '~/types/apps'
import { toAppListItem } from '~/utils/apps/content'
import AppCard from '~/components/library/AppCard.vue'
import AppDetailModal from '~/components/library/AppDetailModal.vue'
import TinaEditButton from '~/components/library/TinaEditButton.vue'
import LibraryFilterChips from '~/components/library/LibraryFilterChips.vue'
import LibraryPagination from '~/components/library/LibraryPagination.vue'
import { useTinaEditor } from '~/composables/useTinaEditor'
import { uniqueSortedLabels, useLibraryPagination } from '~/composables/useLibraryPagination'

const apps = ref<AppListItem[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const searchQuery = ref('')
const categoryFilter = ref<string | null>(null)
const selectedApp = ref<AppListItem | null>(null)
const showModal = ref(false)

const { appsCollectionUrl } = useTinaEditor()

const categoryOptions = computed(() =>
  uniqueSortedLabels(apps.value.flatMap((app) => app.categories)),
)

const filteredApps = computed(() => {
  let list = apps.value

  if (categoryFilter.value) {
    list = list.filter((app) => app.categories.includes(categoryFilter.value!))
  }

  if (!searchQuery.value.trim()) return list

  const query = searchQuery.value.toLowerCase().trim()
  return list.filter((app) => {
    if (app.title.toLowerCase().includes(query)) return true
    if (app.description.toLowerCase().includes(query)) return true
    if (app.details?.toLowerCase().includes(query)) return true
    if (app.categories.some((c) => c.toLowerCase().includes(query))) return true
    if (app.version.toLowerCase().includes(query)) return true
    return false
  })
})

const { currentPage, pageItems, totalPages, rangeLabel, resetPage, goToPage } =
  useLibraryPagination(filteredApps)

watch([searchQuery, categoryFilter], () => {
  resetPage()
})

watch(categoryOptions, (options) => {
  if (categoryFilter.value && !options.includes(categoryFilter.value)) {
    categoryFilter.value = null
  }
})

const openApp = (app: AppListItem) => {
  selectedApp.value = app
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  selectedApp.value = null
}

const loadApps = async () => {
  isLoading.value = true
  error.value = null
  try {
    const docs = await queryCollection('apps').all()
    apps.value = docs.filter((doc) => doc.published === true).map((doc) => toAppListItem(doc))
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
      >
        <template #actions>
          <TinaEditButton :href="appsCollectionUrl" />
        </template>
      </LibraryTabToolbar>

      <LibraryFilterChips
        v-model="categoryFilter"
        label="Platform"
        :options="categoryOptions"
        all-label="All platforms"
      />

      <p v-if="searchQuery || categoryFilter" class="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
        {{ filteredApps.length }} {{ filteredApps.length === 1 ? 'result' : 'results' }}
      </p>

      <div v-if="pageItems.length > 0" class="flex flex-col gap-3">
        <AppCard v-for="app in pageItems" :key="app.id" :app="app" @select="openApp(app)" />
      </div>

      <div v-else class="py-12 text-center">
        <Icon name="mdi:cellphone-off" class="mb-4 text-6xl text-zinc-400" />
        <p class="text-lg text-zinc-600 dark:text-zinc-400">
          {{
            searchQuery || categoryFilter ? 'No apps match your filters' : 'No apps available yet'
          }}
        </p>
        <p
          v-if="!searchQuery && !categoryFilter"
          class="mt-2 text-sm text-zinc-500 dark:text-zinc-400"
        >
          Add apps in Tina CMS to see them here.
        </p>
      </div>

      <LibraryPagination
        :current-page="currentPage"
        :total-pages="totalPages"
        :range-label="rangeLabel"
        @update:current-page="goToPage"
      />
    </div>

    <AppDetailModal :open="showModal" :app="selectedApp" @close="closeModal" />
  </div>
</template>
