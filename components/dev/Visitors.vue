<template>
  <div class="space-y-6">
    <div v-if="isLoading" class="text-center py-8">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p class="mt-2 text-gray-600 dark:text-gray-400">Loading visitor data...</p>
    </div>

    <div
      v-else-if="error"
      class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
    >
      <p class="text-red-800 dark:text-red-200">{{ error }}</p>
    </div>

    <div v-else class="space-y-6">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div class="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 text-center">
          <div class="text-xs text-blue-600 dark:text-blue-400 mb-1">Unique visitors</div>
          <div class="text-2xl font-bold text-blue-900 dark:text-blue-100">
            {{ data?.summary?.totalUniqueVisitors ?? 0 }}
          </div>
        </div>
        <div class="rounded-lg bg-green-50 dark:bg-green-900/20 p-4 text-center">
          <div class="text-xs text-green-600 dark:text-green-400 mb-1">Registered</div>
          <div class="text-2xl font-bold text-green-900 dark:text-green-100">
            {{ data?.summary?.registeredVisitors ?? 0 }}
          </div>
        </div>
        <div class="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-4 text-center">
          <div class="text-xs text-amber-600 dark:text-amber-400 mb-1">Anonymous</div>
          <div class="text-2xl font-bold text-amber-900 dark:text-amber-100">
            {{ data?.summary?.anonymousVisitors ?? 0 }}
          </div>
        </div>
        <div class="rounded-lg bg-purple-50 dark:bg-purple-900/20 p-4 text-center">
          <div class="text-xs text-purple-600 dark:text-purple-400 mb-1">Page views</div>
          <div class="text-2xl font-bold text-purple-900 dark:text-purple-100">
            {{ data?.summary?.totalPageViews ?? 0 }}
          </div>
        </div>
      </div>

      <div>
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Unique visitors</h3>
          <input
            v-model="search"
            type="search"
            placeholder="Search email, IP, name, country..."
            class="w-full sm:w-72 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
          />
        </div>

        <div
          class="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800"
        >
          <table class="min-w-full text-sm">
            <thead
              class="bg-gray-50 dark:bg-slate-900/50 text-left text-gray-600 dark:text-gray-400"
            >
              <tr>
                <th class="px-4 py-3 font-semibold">Visitor</th>
                <th class="px-4 py-3 font-semibold">Type</th>
                <th class="px-4 py-3 font-semibold">Name / Role</th>
                <th class="px-4 py-3 font-semibold">Visits</th>
                <th class="px-4 py-3 font-semibold">Pages</th>
                <th class="px-4 py-3 font-semibold">Country</th>
                <th class="px-4 py-3 font-semibold">Browser</th>
                <th class="px-4 py-3 font-semibold">First seen</th>
                <th class="px-4 py-3 font-semibold">Last seen</th>
                <th class="px-4 py-3 font-semibold">Last page</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-slate-700">
              <tr
                v-for="visitor in filteredVisitors"
                :key="`${visitor.visitor_type}-${visitor.visitor_id}`"
              >
                <td class="px-4 py-3 text-gray-900 dark:text-gray-100 break-all">
                  {{ visitor.visitor_id }}
                </td>
                <td class="px-4 py-3 capitalize">{{ visitor.visitor_type }}</td>
                <td class="px-4 py-3 text-gray-600 dark:text-gray-300">
                  <div>{{ visitor.display_name || '—' }}</div>
                  <div v-if="visitor.user_role" class="text-xs capitalize text-gray-500">
                    {{ visitor.user_role }}
                  </div>
                </td>
                <td class="px-4 py-3">{{ visitor.total_events }}</td>
                <td class="px-4 py-3">{{ visitor.pages_count }}</td>
                <td class="px-4 py-3">{{ visitor.country || '—' }}</td>
                <td class="px-4 py-3">{{ visitor.browser || '—' }}</td>
                <td class="px-4 py-3 whitespace-nowrap">{{ formatDate(visitor.first_seen) }}</td>
                <td class="px-4 py-3 whitespace-nowrap">{{ formatDate(visitor.last_seen) }}</td>
                <td class="px-4 py-3 break-all text-gray-600 dark:text-gray-400">
                  {{ visitor.last_page || '—' }}
                </td>
              </tr>
              <tr v-if="filteredVisitors.length === 0">
                <td colspan="10" class="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  No visitor data yet
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <details
        class="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800"
      >
        <summary class="cursor-pointer px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">
          Page traffic breakdown
        </summary>
        <div class="overflow-x-auto border-t border-gray-200 dark:border-slate-700">
          <table class="min-w-full text-sm">
            <thead
              class="bg-gray-50 dark:bg-slate-900/50 text-left text-gray-600 dark:text-gray-400"
            >
              <tr>
                <th class="px-4 py-3 font-semibold">Page</th>
                <th class="px-4 py-3 font-semibold">Unique IPs</th>
                <th class="px-4 py-3 font-semibold">Total views</th>
                <th class="px-4 py-3 font-semibold">Last visit</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-slate-700">
              <tr v-for="visit in data?.pageVisits || []" :key="visit.page">
                <td class="px-4 py-3 break-all">{{ visit.page }}</td>
                <td class="px-4 py-3">{{ visit.unique_visitors }}</td>
                <td class="px-4 py-3">{{ visit.total_visits }}</td>
                <td class="px-4 py-3 whitespace-nowrap">{{ formatDate(visit.last_visit) }}</td>
              </tr>
              <tr v-if="!data?.pageVisits?.length">
                <td colspan="4" class="px-4 py-8 text-center text-gray-500">No page visit data</td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { formatDateLocaleString } from '~/utils/common/dateParser'

interface UniqueVisitor {
  visitor_id: string
  visitor_type: 'registered' | 'anonymous'
  display_name: string | null
  user_role: string | null
  total_events: number
  pages_count: number
  first_seen: string
  last_seen: string
  country: string | null
  browser: string | null
  ip_address: string | null
  last_page: string | null
}

interface VisitorData {
  summary: {
    totalUniqueVisitors: number
    registeredVisitors: number
    anonymousVisitors: number
    totalPageViews: number
  }
  uniqueVisitors: UniqueVisitor[]
  pageVisits: Array<{
    page: string
    unique_visitors: number
    total_visits: number
    last_visit: string
  }>
}

const data = ref<VisitorData | null>(null)
const isLoading = ref(true)
const error = ref('')
const search = ref('')

const filteredVisitors = computed(() => {
  const rows = data.value?.uniqueVisitors || []
  const q = search.value.trim().toLowerCase()
  if (!q) return rows
  return rows.filter((visitor) => {
    const haystack = [
      visitor.visitor_id,
      visitor.display_name,
      visitor.user_role,
      visitor.country,
      visitor.browser,
      visitor.last_page,
      visitor.ip_address,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
})

const formatDate = formatDateLocaleString

const loadData = async () => {
  isLoading.value = true
  error.value = ''
  try {
    const response = await $fetch<{ success: boolean; error?: string } & VisitorData>(
      '/api/admin/visitors',
    )
    if (response.success) {
      data.value = {
        summary: response.summary,
        uniqueVisitors: response.uniqueVisitors || [],
        pageVisits: response.pageVisits || [],
      }
    } else {
      error.value = response.error || 'Failed to load visitor data'
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load visitor data'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadData)
</script>
