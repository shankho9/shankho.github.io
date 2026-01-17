<template>
  <div
    class="min-h-screen bg-gray-50 dark:bg-slate-900 py-6 sm:py-12 px-4 sm:px-6 overflow-x-hidden"
  >
    <div class="max-w-7xl mx-auto w-full">
      <!-- Not Authenticated - Redirect to login -->
      <div v-if="!isAuthenticated" class="max-w-md mx-auto">
        <div class="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 text-center">
          <h1 class="text-3xl font-bold mb-2">Dev Utilities</h1>
          <p class="text-gray-600 dark:text-gray-400 mb-6">Authentication required</p>
          <NuxtLink
            to="/auth/login?redirect=/dev"
            class="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Sign In
          </NuxtLink>
        </div>
      </div>

      <!-- Main Utilities Dashboard -->
      <div v-else>
        <div
          class="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 class="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">Dev Utilities</h1>
            <p class="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Development tools and analytics dashboard
            </p>
          </div>
          <button
            class="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            @click="handleLogout"
          >
            Logout
          </button>
        </div>

        <!-- Utilities Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <!-- Visitor Analytics Utility -->
          <NuxtLink
            to="/dev/utilities/visitors"
            class="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow cursor-pointer active:scale-[0.98] touch-manipulation block"
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
          </NuxtLink>

          <!-- Location Manager Utility -->
          <NuxtLink
            to="/dev/locations"
            class="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow cursor-pointer active:scale-[0.98] touch-manipulation block"
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
          </NuxtLink>

          <!-- Car Database Manager Utility -->
          <NuxtLink
            to="/dev/utilities/car-manager"
            class="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow cursor-pointer active:scale-[0.98] touch-manipulation block"
          >
            <div class="flex items-center gap-4 mb-4">
              <div
                class="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center"
              >
                <Icon
                  name="mdi:car-multiple"
                  size="24"
                  class="text-orange-600 dark:text-orange-400"
                />
              </div>
              <div>
                <h3 class="text-xl font-semibold">Car Database Manager</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">Manage car data</p>
              </div>
            </div>
            <p class="text-gray-600 dark:text-gray-400 text-sm">
              View, edit, and manage car manufacturers, models, and variants with CSV import/export
            </p>
          </NuxtLink>

          <!-- Database Stats Utility -->
          <NuxtLink
            to="/dev/utilities/database"
            class="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow cursor-pointer active:scale-[0.98] touch-manipulation block"
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
          </NuxtLink>

          <!-- API Health Check Utility -->
          <NuxtLink
            to="/dev/utilities/health"
            class="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow cursor-pointer active:scale-[0.98] touch-manipulation block"
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
          </NuxtLink>

          <!-- Email Logs Utility -->
          <NuxtLink
            to="/dev/utilities/emails"
            class="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow cursor-pointer active:scale-[0.98] touch-manipulation block"
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
          </NuxtLink>

          <!-- Analytics Dashboard Utility -->
          <NuxtLink
            to="/dev/utilities/analytics"
            class="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow cursor-pointer active:scale-[0.98] touch-manipulation block"
          >
            <div class="flex items-center gap-4 mb-4">
              <div
                class="w-12 h-12 bg-pink-100 dark:bg-pink-900 rounded-lg flex items-center justify-center"
              >
                <Icon name="mdi:chart-bar" size="24" class="text-pink-600 dark:text-pink-400" />
              </div>
              <div>
                <h3 class="text-xl font-semibold">Analytics Dashboard</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">Popular posts & engagement</p>
              </div>
            </div>
            <p class="text-gray-600 dark:text-gray-400 text-sm">
              View popular posts, reading time, engagement metrics, and content performance
            </p>
          </NuxtLink>

          <!-- Content Manager Utility -->
          <NuxtLink
            to="/dev/utilities/content"
            class="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow cursor-pointer active:scale-[0.98] touch-manipulation block"
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
          </NuxtLink>

          <!-- Cache Management Utility -->
          <NuxtLink
            to="/dev/utilities/cache"
            class="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow cursor-pointer active:scale-[0.98] touch-manipulation block"
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
          </NuxtLink>

          <!-- Personal Planner Utility -->
          <NuxtLink
            to="/dev/planner"
            class="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow active:scale-[0.98] touch-manipulation cursor-pointer block"
          >
            <div class="flex items-center gap-4 mb-4">
              <div
                class="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center"
              >
                <Icon
                  name="mdi:calendar-check"
                  size="24"
                  class="text-orange-600 dark:text-orange-400"
                />
              </div>
              <div>
                <h3 class="text-xl font-semibold">Personal Planner</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">Daily planning & tasks</p>
              </div>
            </div>
            <p class="text-gray-600 dark:text-gray-400 text-sm">
              Daily planner with Kanban board, weekly reviews, and printable plans
            </p>
          </NuxtLink>

          <!-- Car Lease Calculator Utility -->
          <NuxtLink
            to="/dev/utilities/car-lease-calculator"
            class="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow active:scale-[0.98] touch-manipulation cursor-pointer block"
          >
            <div class="flex items-center gap-4 mb-4">
              <div
                class="w-12 h-12 bg-cyan-100 dark:bg-cyan-900 rounded-lg flex items-center justify-center"
              >
                <Icon
                  name="mdi:calculator-variant"
                  size="24"
                  class="text-cyan-600 dark:text-cyan-400"
                />
              </div>
              <div>
                <h3 class="text-xl font-semibold">Car Lease Calculator</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">Ownership vs lease analysis</p>
              </div>
            </div>
            <p class="text-gray-600 dark:text-gray-400 text-sm">
              Compare car ownership vs leasing with tax savings, reimbursements, and investment
              returns. Save and manage templates.
            </p>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'

const { isAuthenticated, checkAuth, signOut } = useAuth()

const handleLogout = async () => {
  await signOut()
  await navigateTo('/auth/login?redirect=/dev')
}

onMounted(async () => {
  await checkAuth()
})
</script>
