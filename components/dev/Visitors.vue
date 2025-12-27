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
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div class="text-sm text-blue-600 dark:text-blue-400 mb-1">Total Pages Tracked</div>
          <div class="text-2xl font-bold text-blue-900 dark:text-blue-100">
            {{ data?.pageVisits?.length || 0 }}
          </div>
        </div>
        <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <div class="text-sm text-green-600 dark:text-green-400 mb-1">Unique Users</div>
          <div class="text-2xl font-bold text-green-900 dark:text-green-100">
            {{ data?.uniqueLogins?.length || 0 }}
          </div>
        </div>
        <div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
          <div class="text-sm text-purple-600 dark:text-purple-400 mb-1">Pages with Logins</div>
          <div class="text-2xl font-bold text-purple-900 dark:text-purple-100">
            {{ data?.loginStats?.length || 0 }}
          </div>
        </div>
      </div>

      <!-- Page Visits Table -->
      <div>
        <h3 class="text-lg font-semibold mb-3">Page Visits</h3>
        <div class="overflow-x-auto">
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
                <td class="px-4 py-3 whitespace-nowrap text-sm font-medium">
                  {{ visit.page }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm">
                  {{ visit.unique_visitors }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm">
                  {{ visit.total_visits }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {{ formatDate(visit.last_visit) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Login Statistics by Page -->
      <div>
        <h3 class="text-lg font-semibold mb-3">Login Statistics by Page</h3>
        <div class="overflow-x-auto">
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
                  Unique Users
                </th>
                <th
                  class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Total Logins
                </th>
                <th
                  class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Last Login
                </th>
              </tr>
            </thead>
            <tbody
              class="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700"
            >
              <tr v-for="stat in data?.loginStats" :key="stat.login_location">
                <td class="px-4 py-3 whitespace-nowrap text-sm font-medium">
                  {{ stat.login_location }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm">
                  {{ stat.unique_users }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm">
                  {{ stat.total_logins }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {{ formatDate(stat.last_login) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Unique Users Table -->
      <div>
        <h3 class="text-lg font-semibold mb-3">Unique Users</h3>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead class="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th
                  class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Email
                </th>
                <th
                  class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Name
                </th>
                <th
                  class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Login Count
                </th>
                <th
                  class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  First Login
                </th>
                <th
                  class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Last Login
                </th>
                <th
                  class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Pages Visited
                </th>
              </tr>
            </thead>
            <tbody
              class="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700"
            >
              <tr v-for="user in data?.uniqueLogins" :key="user.user_email">
                <td class="px-4 py-3 whitespace-nowrap text-sm font-medium">
                  {{ user.user_email }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm">
                  {{ user.user_name }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm">
                  {{ user.login_count }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {{ formatDate(user.first_login) }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {{ formatDate(user.last_login) }}
                </td>
                <td class="px-4 py-3 text-sm">
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="page in user.pages"
                      :key="page"
                      class="px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded text-xs"
                    >
                      {{ page }}
                    </span>
                  </div>
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
