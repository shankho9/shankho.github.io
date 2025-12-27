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

    <div v-else class="space-y-6">
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          v-for="stat in stats"
          :key="stat.table"
          class="bg-white dark:bg-slate-700 rounded-lg p-4 border border-gray-200 dark:border-slate-600"
        >
          <div class="text-sm text-gray-500 dark:text-gray-400 mb-1">{{ stat.table }}</div>
          <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {{ stat.count.toLocaleString() }}
          </div>
        </div>
      </div>

      <!-- Detailed Table -->
      <div>
        <h3 class="text-lg font-semibold mb-3">Table Statistics</h3>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead class="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th
                  class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Table Name
                </th>
                <th
                  class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Row Count
                </th>
              </tr>
            </thead>
            <tbody
              class="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700"
            >
              <tr v-for="stat in stats" :key="stat.table">
                <td class="px-4 py-3 whitespace-nowrap text-sm font-medium">
                  {{ stat.table }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm">
                  {{ stat.count.toLocaleString() }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface TableStat {
  table: string
  count: number
}

const stats = ref<TableStat[]>([])
const isLoading = ref(true)
const error = ref('')

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
