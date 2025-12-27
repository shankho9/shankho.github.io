<template>
  <div class="min-h-screen bg-gray-50 dark:bg-slate-900 py-12 px-4">
    <div class="max-w-7xl mx-auto">
      <!-- Login Screen -->
      <div v-if="!isAuthenticated" class="max-w-md mx-auto">
        <div class="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
          <h1 class="text-3xl font-bold mb-2 text-center">Dev Utilities</h1>
          <p class="text-gray-600 dark:text-gray-400 text-center mb-6">Admin access required</p>
          <form class="space-y-4" @submit.prevent="handleLogin">
            <div>
              <label class="block text-sm font-medium mb-2">Password</label>
              <input
                v-model="password"
                type="password"
                required
                class="w-full px-4 py-2 border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                placeholder="Enter admin password"
              />
            </div>
            <div v-if="requires2FA">
              <label class="block text-sm font-medium mb-2">
                2FA Code (Microsoft Authenticator)
              </label>
              <input
                v-model="totpCode"
                type="text"
                required
                maxlength="6"
                pattern="[0-9]{6}"
                class="w-full px-4 py-2 border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                placeholder="000000"
              />
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Enter the 6-digit code from Microsoft Authenticator
              </p>
            </div>
            <button
              type="submit"
              :disabled="isLoading"
              class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isLoading ? 'Logging in...' : 'Login' }}
            </button>
            <p v-if="loginError" class="text-red-600 text-sm text-center">
              {{ loginError }}
            </p>
          </form>
        </div>
      </div>

      <!-- Main Utilities Dashboard -->
      <div v-else>
        <div class="mb-8 flex items-center justify-between">
          <div>
            <h1 class="text-4xl font-bold mb-2">Dev Utilities</h1>
            <p class="text-gray-600 dark:text-gray-400">
              Development tools and analytics dashboard
            </p>
          </div>
          <button
            class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            @click="handleLogout"
          >
            Logout
          </button>
        </div>

        <!-- Utilities Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <!-- Visitor Analytics Utility -->
          <div
            class="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
            @click="activeUtility = 'visitors'"
          >
            <div class="flex items-center gap-4 mb-4">
              <div
                class="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center"
              >
                <Icon name="mdi:chart-line" size="24" class="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 class="text-xl font-semibold">Visitor Analytics</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">Unique visitors & logins</p>
              </div>
            </div>
            <p class="text-gray-600 dark:text-gray-400 text-sm">
              View unique visitors signing in to various pages with detailed analytics
            </p>
          </div>

          <!-- Location Manager Utility -->
          <div
            class="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
            @click="activeUtility = 'locations'"
          >
            <div class="flex items-center gap-4 mb-4">
              <div
                class="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center"
              >
                <Icon name="mdi:map-marker" size="24" class="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 class="text-xl font-semibold">Location Manager</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">Add places to map</p>
              </div>
            </div>
            <p class="text-gray-600 dark:text-gray-400 text-sm">
              Web interface to add and manage locations on the travel map
            </p>
          </div>

          <!-- Database Stats Utility -->
          <div
            class="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
            @click="activeUtility = 'database'"
          >
            <div class="flex items-center gap-4 mb-4">
              <div
                class="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center"
              >
                <Icon name="mdi:database" size="24" class="text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 class="text-xl font-semibold">Database Stats</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">Table statistics</p>
              </div>
            </div>
            <p class="text-gray-600 dark:text-gray-400 text-sm">
              View database table statistics and row counts
            </p>
          </div>

          <!-- API Health Check Utility -->
          <div
            class="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
            @click="activeUtility = 'health'"
          >
            <div class="flex items-center gap-4 mb-4">
              <div
                class="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center"
              >
                <Icon
                  name="mdi:heart-pulse"
                  size="24"
                  class="text-yellow-600 dark:text-yellow-400"
                />
              </div>
              <div>
                <h3 class="text-xl font-semibold">API Health</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">System status</p>
              </div>
            </div>
            <p class="text-gray-600 dark:text-gray-400 text-sm">
              Check API endpoints and database connectivity status
            </p>
          </div>

          <!-- Email Logs Utility -->
          <div
            class="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
            @click="activeUtility = 'emails'"
          >
            <div class="flex items-center gap-4 mb-4">
              <div
                class="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center"
              >
                <Icon name="mdi:email" size="24" class="text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 class="text-xl font-semibold">Email Logs</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">Alert history</p>
              </div>
            </div>
            <p class="text-gray-600 dark:text-gray-400 text-sm">
              View email alert history and new user notifications
            </p>
          </div>

          <!-- Content Manager Utility -->
          <div
            class="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
            @click="activeUtility = 'content'"
          >
            <div class="flex items-center gap-4 mb-4">
              <div
                class="w-12 h-12 bg-pink-100 dark:bg-pink-900 rounded-lg flex items-center justify-center"
              >
                <Icon
                  name="mdi:file-document-edit"
                  size="24"
                  class="text-pink-600 dark:text-pink-400"
                />
              </div>
              <div>
                <h3 class="text-xl font-semibold">Content Manager</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">Quick actions</p>
              </div>
            </div>
            <p class="text-gray-600 dark:text-gray-400 text-sm">
              Quick links to manage blog posts, gallery items, and resources
            </p>
          </div>

          <!-- Cache Management Utility -->
          <div
            class="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
            @click="activeUtility = 'cache'"
          >
            <div class="flex items-center gap-4 mb-4">
              <div
                class="w-12 h-12 bg-teal-100 dark:bg-teal-900 rounded-lg flex items-center justify-center"
              >
                <Icon name="mdi:cached" size="24" class="text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <h3 class="text-xl font-semibold">Cache Management</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">Clear & manage cache</p>
              </div>
            </div>
            <p class="text-gray-600 dark:text-gray-400 text-sm">
              Clear application cache and manage cache settings
            </p>
          </div>
        </div>

        <!-- Active Utility View -->
        <div v-if="activeUtility" class="mt-8">
          <div class="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-2xl font-bold">
                {{ utilityTitles[activeUtility] }}
              </h2>
              <button
                class="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md"
                @click="activeUtility = null"
              >
                <Icon name="mdi:close" size="24" />
              </button>
            </div>

            <!-- Visitor Analytics Component -->
            <DevVisitors v-if="activeUtility === 'visitors'" />

            <!-- Location Manager Component -->
            <DevLocations v-else-if="activeUtility === 'locations'" />

            <!-- Database Stats Component -->
            <DevDatabase v-else-if="activeUtility === 'database'" />

            <!-- API Health Component -->
            <DevHealth v-else-if="activeUtility === 'health'" />

            <!-- Email Logs Component -->
            <DevEmails v-else-if="activeUtility === 'emails'" />

            <!-- Content Manager Component -->
            <DevContent v-else-if="activeUtility === 'content'" />

            <!-- Cache Management Component -->
            <DevCache v-else-if="activeUtility === 'cache'" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DevVisitors from '~/components/dev/Visitors.vue'
import DevLocations from '~/components/dev/Locations.vue'
import DevDatabase from '~/components/dev/Database.vue'
import DevHealth from '~/components/dev/Health.vue'
import DevEmails from '~/components/dev/Emails.vue'
import DevContent from '~/components/dev/Content.vue'
import DevCache from '~/components/dev/Cache.vue'

const isAuthenticated = ref(false)
const password = ref('')
const totpCode = ref('')
const requires2FA = ref(false)
const isLoading = ref(false)
const loginError = ref('')
const activeUtility = ref<string | null>(null)

const utilityTitles: Record<string, string> = {
  visitors: 'Visitor Analytics',
  locations: 'Location Manager',
  database: 'Database Statistics',
  health: 'API Health Check',
  emails: 'Email Logs',
  content: 'Content Manager',
  cache: 'Cache Management',
}

const checkAuth = async () => {
  try {
    const response = await $fetch<{ authenticated: boolean; requires2FA?: boolean }>(
      '/api/admin/auth',
    )
    isAuthenticated.value = response.authenticated
    // Don't set requires2FA here - it should only be set based on login attempt response
    // The requires2FA from this endpoint indicates global 2FA configuration, not current login state
  } catch {
    isAuthenticated.value = false
  }
}

const handleLogin = async () => {
  isLoading.value = true
  loginError.value = ''
  // Reset 2FA state for each new login attempt
  requires2FA.value = false
  totpCode.value = ''

  try {
    const response = await $fetch<{
      success: boolean
      error?: string
      requires2FA?: boolean
    }>('/api/admin/auth', {
      method: 'POST',
      body: {
        password: password.value,
        totpCode: requires2FA.value ? totpCode.value : undefined,
      },
    })

    if (response.success) {
      isAuthenticated.value = true
      password.value = ''
      totpCode.value = ''
      requires2FA.value = false
    } else {
      if (response.requires2FA) {
        requires2FA.value = true
        loginError.value = '2FA code required'
      } else {
        loginError.value = response.error || 'Invalid password or 2FA code'
      }
    }
  } catch {
    loginError.value = 'Failed to authenticate. Please try again.'
  } finally {
    isLoading.value = false
  }
}

const handleLogout = async () => {
  try {
    await $fetch('/api/admin/logout', { method: 'POST' })
    isAuthenticated.value = false
    activeUtility.value = null
  } catch (error) {
    console.error('Logout error:', error)
  }
}

onMounted(() => {
  checkAuth()
})
</script>
