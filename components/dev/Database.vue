<template>
  <div class="space-y-6">
    <div v-if="isLoading" class="text-center py-8">
      <div
        class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"
      ></div>
      <p class="mt-2 text-gray-600 dark:text-gray-400">Loading database statistics...</p>
    </div>

    <div
      v-else-if="error"
      class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
    >
      <p class="text-red-800 dark:text-red-200">{{ error }}</p>
    </div>

    <div v-else class="space-y-4 sm:space-y-6">
      <!-- Summary Cards -->
      <div
        class="flex flex-row flex-nowrap md:grid md:grid-cols-2 lg:grid-cols-4 justify-around sm:justify-around gap-2 sm:gap-4 overflow-x-auto scrollbar-hide"
        style="scrollbar-width: none; -ms-overflow-style: none; -webkit-overflow-scrolling: touch"
      >
        <div
          v-for="stat in stats"
          :key="stat.table"
          class="bg-white dark:bg-slate-700 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-slate-600 flex-1 min-w-0 text-center flex-shrink-0"
        >
          <div class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">
            {{ stat.table }}
          </div>
          <div class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
            {{ stat.count.toLocaleString() }}
          </div>
        </div>
      </div>

      <!-- Table Statistics - Card View with Pagination -->
      <div>
        <div
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-2 sm:mb-3"
        >
          <h3 class="text-base sm:text-lg font-semibold">Table Statistics</h3>

          <!-- Pagination Controls -->
          <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <div class="flex items-center gap-2">
              <label class="text-xs sm:text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                Rows per page:
              </label>
              <select
                v-model.number="rowsPerPage"
                class="px-2 py-1 text-xs sm:text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                @change="currentPage = 1"
              >
                <option v-for="option in rowsPerPageOptions" :key="option" :value="option">
                  {{ option }}
                </option>
              </select>
            </div>

            <div class="flex items-center gap-2">
              <span class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Page {{ currentPage }} of {{ totalPages }}
              </span>
              <div class="flex gap-1">
                <button
                  :disabled="currentPage === 1"
                  class="px-2 py-1 text-xs sm:text-sm bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  @click="currentPage = Math.max(1, currentPage - 1)"
                >
                  ← Prev
                </button>
                <button
                  :disabled="currentPage >= totalPages"
                  class="px-2 py-1 text-xs sm:text-sm bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  @click="currentPage = Math.min(totalPages, currentPage + 1)"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Card View (all screens) - Compact Grid Layout -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
          <div
            v-for="stat in paginatedStats"
            :key="stat.table"
            class="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-2 sm:p-3"
          >
            <div
              class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3"
            >
              <div class="flex-1 min-w-0">
                <div
                  class="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5"
                >
                  Table Name
                </div>
                <div
                  class="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 break-words line-clamp-2"
                >
                  {{ stat.table }}
                </div>
              </div>

              <div class="flex-shrink-0 sm:text-right">
                <div
                  class="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5"
                >
                  Row Count
                </div>
                <div class="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {{ stat.count.toLocaleString() }}
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="paginatedStats.length === 0"
            class="col-span-full text-center py-8 text-gray-500 dark:text-gray-400"
          >
            No table statistics available
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface TableStat {
  table: string
  count: number
}

const stats = ref<TableStat[]>([])
const isLoading = ref(true)
const error = ref('')

// Pagination for Table Statistics
const currentPage = ref(1)
const rowsPerPage = ref(10)
const rowsPerPageOptions = [5, 10, 20, 50]

// Computed: Paginated Table Statistics
const paginatedStats = computed(() => {
  if (!stats.value) return []
  const start = (currentPage.value - 1) * rowsPerPage.value
  const end = start + rowsPerPage.value
  return stats.value.slice(start, end)
})

const totalPages = computed(() => {
  if (!stats.value || stats.value.length === 0) return 0
  return Math.ceil(stats.value.length / rowsPerPage.value)
})

const loadStats = async () => {
  isLoading.value = true
  error.value = ''

  try {
    const response = await $fetch<{ success: boolean; stats?: TableStat[]; error?: string }>(
      '/api/admin/database-stats',
    )

    if (response.success && response.stats) {
      stats.value = response.stats
    } else {
      error.value = response.error || 'Failed to load database statistics'
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load database statistics'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadStats()
})
</script>
