<template>
  <div class="space-y-6">
    <div
      class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4"
    >
      <p class="text-yellow-800 dark:text-yellow-200">
        <Icon name="mdi:information" class="inline mr-2" />
        Email logs are stored in the email service provider (Resend). This utility shows recent new
        user alerts.
      </p>
    </div>

    <div v-if="isLoading" class="text-center py-8">
      <div
        class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"
      ></div>
      <p class="mt-2 text-gray-600 dark:text-gray-400">Loading email data...</p>
    </div>

    <div
      v-else-if="error"
      class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
    >
      <p class="text-red-800 dark:text-red-200">{{ error }}</p>
    </div>

    <div v-else class="space-y-6">
      <!-- Summary -->
      <div
        class="flex flex-row flex-nowrap md:grid md:grid-cols-3 justify-around sm:justify-around gap-2 sm:gap-4 overflow-x-auto scrollbar-hide"
        style="scrollbar-width: none; -ms-overflow-style: none; -webkit-overflow-scrolling: touch"
      >
        <div
          class="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 sm:p-4 flex-1 min-w-0 text-center flex-shrink-0"
        >
          <div class="text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 mb-1">
            Total New Users
          </div>
          <div class="text-xl sm:text-2xl font-bold text-indigo-900 dark:text-indigo-100">
            {{ newUsers.length }}
          </div>
        </div>
        <div
          class="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 sm:p-4 flex-1 min-w-0 text-center flex-shrink-0"
        >
          <div class="text-xs sm:text-sm text-green-600 dark:text-green-400 mb-1">
            Recent (Last 7 Days)
          </div>
          <div class="text-xl sm:text-2xl font-bold text-green-900 dark:text-green-100">
            {{ recentUsers.length }}
          </div>
        </div>
        <div
          class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 sm:p-4 flex-1 min-w-0 text-center flex-shrink-0"
        >
          <div class="text-xs sm:text-sm text-blue-600 dark:text-blue-400 mb-1">This Month</div>
          <div class="text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-100">
            {{ thisMonthUsers.length }}
          </div>
        </div>
      </div>

      <!-- New Users Table -->
      <div>
        <h3 class="text-lg font-semibold mb-3">New User Alerts</h3>
        <div
          class="overflow-x-auto -mx-3 sm:mx-0 scrollbar-hide"
          style="scrollbar-width: none; -ms-overflow-style: none; -webkit-overflow-scrolling: touch"
        >
          <div class="inline-block min-w-full align-middle px-3 sm:px-0">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead class="bg-gray-50 dark:bg-slate-700">
                <tr>
                  <th
                    class="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Email
                  </th>
                  <th
                    class="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell"
                  >
                    Name
                  </th>
                  <th
                    class="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden lg:table-cell"
                  >
                    Location
                  </th>
                  <th
                    class="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden lg:table-cell"
                  >
                    Country
                  </th>
                  <th
                    class="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    First Login
                  </th>
                </tr>
              </thead>
              <tbody
                class="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700"
              >
                <tr v-for="user in newUsers" :key="user.user_email">
                  <td
                    class="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium break-all max-w-[150px] sm:max-w-none sm:break-words"
                  >
                    {{ user.user_email }}
                  </td>
                  <td
                    class="px-2 sm:px-4 py-2 sm:py-3 text-sm whitespace-nowrap hidden md:table-cell"
                  >
                    {{ user.user_name }}
                  </td>
                  <td
                    class="px-2 sm:px-4 py-2 sm:py-3 text-sm break-words max-w-[100px] lg:max-w-none lg:whitespace-nowrap hidden lg:table-cell"
                  >
                    {{ user.login_location }}
                  </td>
                  <td
                    class="px-2 sm:px-4 py-2 sm:py-3 text-sm whitespace-nowrap hidden lg:table-cell"
                  >
                    {{ user.country || 'N/A' }}
                  </td>
                  <td
                    class="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap"
                  >
                    {{ formatDate(user.first_login) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface NewUser {
  user_email: string
  user_name: string
  login_location: string
  country: string | null
  first_login: string
}

const newUsers = ref<NewUser[]>([])
const isLoading = ref(true)
const error = ref('')

const recentUsers = computed(() => {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  return newUsers.value.filter((user) => new Date(user.first_login) >= sevenDaysAgo)
})

const thisMonthUsers = computed(() => {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  return newUsers.value.filter((user) => new Date(user.first_login) >= startOfMonth)
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
    const response = await $fetch<{ success: boolean; users?: NewUser[]; error?: string }>(
      '/api/admin/new-users',
    )

    if (response.success && response.users) {
      newUsers.value = response.users.sort(
        (a, b) => new Date(b.first_login).getTime() - new Date(a.first_login).getTime(),
      )
    } else {
      error.value = response.error || 'Failed to load email data'
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load email data'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>
