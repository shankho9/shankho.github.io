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

    <div v-else class="space-y-4 sm:space-y-6">
      <!-- Summary Cards -->
      <div
        class="flex flex-row flex-nowrap md:grid md:grid-cols-3 justify-around sm:justify-around gap-2 sm:gap-4 overflow-x-auto scrollbar-hide"
        style="scrollbar-width: none; -ms-overflow-style: none; -webkit-overflow-scrolling: touch"
      >
        <div
          class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 sm:p-4 flex-1 min-w-0 text-center flex-shrink-0"
        >
          <div class="text-xs sm:text-sm text-blue-600 dark:text-blue-400 mb-1">
            Total Pages Tracked
          </div>
          <div class="text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-100">
            {{ data?.pageVisits?.length || 0 }}
          </div>
        </div>
        <div
          class="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 sm:p-4 flex-1 min-w-0 text-center flex-shrink-0"
        >
          <div class="text-xs sm:text-sm text-green-600 dark:text-green-400 mb-1">Unique Users</div>
          <div class="text-xl sm:text-2xl font-bold text-green-900 dark:text-green-100">
            {{ data?.uniqueLogins?.length || 0 }}
          </div>
        </div>
        <div
          class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 sm:p-4 flex-1 min-w-0 text-center flex-shrink-0"
        >
          <div class="text-xs sm:text-sm text-purple-600 dark:text-purple-400 mb-1">
            Pages with Logins
          </div>
          <div class="text-xl sm:text-2xl font-bold text-purple-900 dark:text-purple-100">
            {{ data?.loginStats?.length || 0 }}
          </div>
        </div>
      </div>

      <!-- Page Visits Table - Mobile Card View / Desktop Table View -->
      <div>
        <h3 class="text-lg font-semibold mb-3">Page Visits</h3>

        <!-- Mobile Card View (transposed) -->
        <div class="md:hidden space-y-3">
          <div
            v-for="visit in data?.pageVisits"
            :key="visit.page"
            class="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 space-y-2"
          >
            <div class="pb-2 border-b border-gray-200 dark:border-slate-700">
              <div
                class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1"
              >
                Page
              </div>
              <div class="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">
                {{ visit.page }}
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <div
                  class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1"
                >
                  Unique Visitors
                </div>
                <div class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {{ visit.unique_visitors }}
                </div>
              </div>

              <div>
                <div
                  class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1"
                >
                  Total Visits
                </div>
                <div class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {{ visit.total_visits }}
                </div>
              </div>
            </div>

            <div
              v-if="visit.last_visit"
              class="pt-2 border-t border-gray-200 dark:border-slate-700"
            >
              <div
                class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1"
              >
                Last Visit
              </div>
              <div class="text-xs text-gray-600 dark:text-gray-400">
                {{ formatDate(visit.last_visit) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Desktop Table View -->
        <div
          class="hidden md:block overflow-x-auto -mx-3 sm:mx-0 scrollbar-hide"
          style="scrollbar-width: none; -ms-overflow-style: none; -webkit-overflow-scrolling: touch"
        >
          <div class="inline-block min-w-full align-middle px-3 sm:px-0">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead class="bg-gray-50 dark:bg-slate-700">
                <tr>
                  <th
                    class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Page
                  </th>
                  <th
                    class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Unique Visitors
                  </th>
                  <th
                    class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Total Visits
                  </th>
                  <th
                    class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Last Visit
                  </th>
                </tr>
              </thead>
              <tbody
                class="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700"
              >
                <tr v-for="visit in data?.pageVisits" :key="visit.page">
                  <td
                    class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 break-words"
                  >
                    {{ visit.page }}
                  </td>
                  <td class="px-4 py-3 text-sm whitespace-nowrap text-gray-900 dark:text-gray-100">
                    {{ visit.unique_visitors }}
                  </td>
                  <td class="px-4 py-3 text-sm whitespace-nowrap text-gray-900 dark:text-gray-100">
                    {{ visit.total_visits }}
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {{ formatDate(visit.last_visit) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Login Statistics by Page - Card View with Pagination -->
      <div>
        <div
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-2 sm:mb-3"
        >
          <h3 class="text-base sm:text-lg font-semibold">Login Statistics by Page</h3>

          <!-- Pagination Controls -->
          <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <div class="flex items-center gap-2">
              <label class="text-xs sm:text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                Rows per page:
              </label>
              <select
                v-model.number="loginStatsRowsPerPage"
                class="px-2 py-1 text-xs sm:text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                @change="loginStatsPage = 1"
              >
                <option
                  v-for="option in loginStatsRowsPerPageOptions"
                  :key="option"
                  :value="option"
                >
                  {{ option }}
                </option>
              </select>
            </div>

            <div class="flex items-center gap-2">
              <span class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Page {{ loginStatsPage }} of {{ totalLoginStatsPages }}
              </span>
              <div class="flex gap-1">
                <button
                  :disabled="loginStatsPage === 1"
                  class="px-2 py-1 text-xs sm:text-sm bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  @click="loginStatsPage = Math.max(1, loginStatsPage - 1)"
                >
                  ← Prev
                </button>
                <button
                  :disabled="loginStatsPage >= totalLoginStatsPages"
                  class="px-2 py-1 text-xs sm:text-sm bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  @click="loginStatsPage = Math.min(totalLoginStatsPages, loginStatsPage + 1)"
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
            v-for="stat in paginatedLoginStats"
            :key="stat.login_location"
            class="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-2 sm:p-3 space-y-1.5"
          >
            <div class="pb-1.5 border-b border-gray-200 dark:border-slate-700">
              <div
                class="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5"
              >
                Page
              </div>
              <div
                class="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 break-words line-clamp-2"
              >
                {{ stat.login_location }}
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 sm:gap-3">
              <div>
                <div
                  class="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5"
                >
                  Unique Users
                </div>
                <div class="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {{ stat.unique_users }}
                </div>
              </div>

              <div>
                <div
                  class="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5"
                >
                  Total Logins
                </div>
                <div class="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {{ stat.total_logins }}
                </div>
              </div>
            </div>

            <div
              v-if="stat.last_login"
              class="pt-1.5 border-t border-gray-200 dark:border-slate-700"
            >
              <div
                class="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5"
              >
                Last Login
              </div>
              <div class="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                {{ formatDate(stat.last_login) }}
              </div>
            </div>
          </div>

          <div
            v-if="paginatedLoginStats.length === 0"
            class="col-span-full text-center py-8 text-gray-500 dark:text-gray-400"
          >
            No login statistics available
          </div>
        </div>
      </div>

      <!-- Unique Users - Card View with Pagination -->
      <div>
        <div
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-2 sm:mb-3"
        >
          <h3 class="text-base sm:text-lg font-semibold">Unique Users</h3>

          <!-- Pagination Controls -->
          <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <div class="flex items-center gap-2">
              <label class="text-xs sm:text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                Rows per page:
              </label>
              <select
                v-model.number="uniqueUsersRowsPerPage"
                class="px-2 py-1 text-xs sm:text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                @change="uniqueUsersPage = 1"
              >
                <option
                  v-for="option in uniqueUsersRowsPerPageOptions"
                  :key="option"
                  :value="option"
                >
                  {{ option }}
                </option>
              </select>
            </div>

            <div class="flex items-center gap-2">
              <span class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Page {{ uniqueUsersPage }} of {{ totalUniqueUsersPages }}
              </span>
              <div class="flex gap-1">
                <button
                  :disabled="uniqueUsersPage === 1"
                  class="px-2 py-1 text-xs sm:text-sm bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  @click="uniqueUsersPage = Math.max(1, uniqueUsersPage - 1)"
                >
                  ← Prev
                </button>
                <button
                  :disabled="uniqueUsersPage >= totalUniqueUsersPages"
                  class="px-2 py-1 text-xs sm:text-sm bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  @click="uniqueUsersPage = Math.min(totalUniqueUsersPages, uniqueUsersPage + 1)"
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
            v-for="user in paginatedUniqueUsers"
            :key="user.user_email"
            class="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-2 sm:p-3 space-y-1.5"
          >
            <div class="pb-1.5 border-b border-gray-200 dark:border-slate-700">
              <div
                class="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5"
              >
                Email
              </div>
              <div
                class="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 break-all line-clamp-2"
              >
                {{ user.user_email }}
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 sm:gap-3">
              <div>
                <div
                  class="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5"
                >
                  Name
                </div>
                <div class="text-xs sm:text-sm text-gray-900 dark:text-gray-100 line-clamp-1">
                  {{ user.user_name || 'N/A' }}
                </div>
              </div>

              <div>
                <div
                  class="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5"
                >
                  Login Count
                </div>
                <div class="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {{ user.login_count }}
                </div>
              </div>
            </div>

            <div
              class="grid grid-cols-2 gap-2 sm:gap-3 pt-1.5 border-t border-gray-200 dark:border-slate-700"
            >
              <div>
                <div
                  class="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5"
                >
                  First Login
                </div>
                <div class="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                  {{ formatDate(user.first_login) }}
                </div>
              </div>

              <div>
                <div
                  class="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5"
                >
                  Last Login
                </div>
                <div class="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                  {{ formatDate(user.last_login) }}
                </div>
              </div>
            </div>

            <div
              v-if="user.pages && user.pages.length > 0"
              class="pt-1.5 border-t border-gray-200 dark:border-slate-700"
            >
              <div
                class="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1"
              >
                Pages Visited
                <span
                  v-if="user.pages.length === 10"
                  class="text-gray-400 dark:text-gray-500 normal-case"
                >
                  (Top 10)
                </span>
              </div>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="page in user.pages"
                  :key="page"
                  class="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-[10px] sm:text-xs text-gray-700 dark:text-gray-300"
                >
                  {{ page }}
                </span>
              </div>
            </div>
          </div>

          <div
            v-if="paginatedUniqueUsers.length === 0"
            class="col-span-full text-center py-8 text-gray-500 dark:text-gray-400"
          >
            No unique users available
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface VisitorData {
  pageVisits: Array<{
    page: string
    unique_visitors: number
    total_visits: number
    last_visit: string
  }>
  uniqueLogins: Array<{
    user_email: string
    user_name: string
    login_count: number
    first_login: string
    last_login: string
    pages: string[]
  }>
  loginStats: Array<{
    login_location: string
    unique_users: number
    total_logins: number
    last_login: string
  }>
}

const data = ref<VisitorData | null>(null)
const isLoading = ref(true)
const error = ref('')

// Pagination for Login Statistics
const loginStatsPage = ref(1)
const loginStatsRowsPerPage = ref(10)
const loginStatsRowsPerPageOptions = [5, 10, 20, 50]

// Pagination for Unique Users
const uniqueUsersPage = ref(1)
const uniqueUsersRowsPerPage = ref(10)
const uniqueUsersRowsPerPageOptions = [5, 10, 20, 50]

// Computed: Limit Pages Visited to top 10
const uniqueLoginsWithLimitedPages = computed(() => {
  if (!data.value?.uniqueLogins) return []
  return data.value.uniqueLogins.map((user) => ({
    ...user,
    pages: user.pages ? user.pages.slice(0, 10) : [],
  }))
})

// Computed: Paginated Login Statistics
const paginatedLoginStats = computed(() => {
  if (!data.value?.loginStats) return []
  const start = (loginStatsPage.value - 1) * loginStatsRowsPerPage.value
  const end = start + loginStatsRowsPerPage.value
  return data.value.loginStats.slice(start, end)
})

const totalLoginStatsPages = computed(() => {
  if (!data.value?.loginStats) return 0
  return Math.ceil(data.value.loginStats.length / loginStatsRowsPerPage.value)
})

// Computed: Paginated Unique Users
const paginatedUniqueUsers = computed(() => {
  if (!uniqueLoginsWithLimitedPages.value) return []
  const start = (uniqueUsersPage.value - 1) * uniqueUsersRowsPerPage.value
  const end = start + uniqueUsersRowsPerPage.value
  return uniqueLoginsWithLimitedPages.value.slice(start, end)
})

const totalUniqueUsersPages = computed(() => {
  if (!uniqueLoginsWithLimitedPages.value) return 0
  return Math.ceil(uniqueLoginsWithLimitedPages.value.length / uniqueUsersRowsPerPage.value)
})

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleString()
}

const loadData = async () => {
  isLoading.value = true
  error.value = ''

  try {
    const response = await $fetch<{ success: boolean; error?: string } & VisitorData>(
      '/api/admin/visitors',
    )

    if (response.success) {
      data.value = {
        pageVisits: response.pageVisits || [],
        uniqueLogins: response.uniqueLogins || [],
        loginStats: response.loginStats || [],
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

onMounted(() => {
  loadData()
})
</script>
