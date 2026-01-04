<template>
  <div class="min-h-screen bg-gray-50 dark:bg-slate-900 py-6 sm:py-12 px-4 sm:px-6">
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
                2FA Code (Microsoft Authenticator) <span class="text-red-500">*</span>
              </label>
              <input
                v-model="totpCode"
                type="text"
                :required="requires2FA"
                maxlength="6"
                pattern="[0-9]{6}"
                class="w-full px-4 py-2 border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                placeholder="000000"
                autocomplete="one-time-code"
                inputmode="numeric"
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
          <div
            class="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow cursor-pointer active:scale-[0.98] touch-manipulation"
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

          <!-- Database Stats Utility -->
          <div
            class="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow cursor-pointer active:scale-[0.98] touch-manipulation"
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
            class="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow cursor-pointer active:scale-[0.98] touch-manipulation"
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
            class="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow cursor-pointer active:scale-[0.98] touch-manipulation"
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
            class="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow cursor-pointer active:scale-[0.98] touch-manipulation"
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
            class="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow cursor-pointer active:scale-[0.98] touch-manipulation"
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

          <!-- Personal Planner Utility -->
          <div
            class="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow active:scale-[0.98] touch-manipulation cursor-pointer"
            @click="handlePlannerClick"
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
          </div>
        </div>

        <!-- Active Utility View -->
        <div v-if="activeUtility" class="mt-6 md:mt-8">
          <div
            class="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 sm:p-6 overflow-x-auto max-w-full"
          >
            <div class="flex items-center justify-between mb-4 sm:mb-6">
              <h2 class="text-xl sm:text-2xl font-bold">
                {{ utilityTitles[activeUtility] }}
              </h2>
              <button
                class="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Close utility"
                @click="activeUtility = null"
              >
                <Icon name="mdi:close" size="24" />
              </button>
            </div>

            <!-- Visitor Analytics Component -->
            <DevVisitors v-if="activeUtility === 'visitors'" />

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

    <!-- Planner Google Auth Warning Modal -->
    <div
      v-if="showPlannerAuthWarning"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      @click.self="closePlannerAuthWarning"
    >
      <div
        class="bg-white dark:bg-slate-800 rounded-xl p-8 text-center border border-gray-200 dark:border-slate-700 shadow-lg max-w-md mx-4"
      >
        <Icon name="mdi:lock" class="text-6xl text-orange-600 dark:text-orange-400 mb-4 mx-auto" />
        <h2 class="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
          Google Authentication Required
        </h2>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          Personal Planner requires Google authentication in addition to admin authentication.
          Please sign in with Google to continue.
        </p>
        <div id="planner-google-signin-button" class="flex justify-center mb-4"></div>
        <button
          class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          @click="closePlannerAuthWarning"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import DevVisitors from '~/components/dev/Visitors.vue'
import DevDatabase from '~/components/dev/Database.vue'
import DevHealth from '~/components/dev/Health.vue'
import DevEmails from '~/components/dev/Emails.vue'
import DevContent from '~/components/dev/Content.vue'
import DevCache from '~/components/dev/Cache.vue'
import { useGoogleAuth } from '~/composables/useGoogleAuth'
import { useAdminAuth } from '~/composables/useAdminAuth'

const isAuthenticated = ref(false)
const password = ref('')
const totpCode = ref('')
const requires2FA = ref(false)
const isLoading = ref(false)
const loginError = ref('')
const activeUtility = ref<string | null>(null)

// Google authentication for Planner
const {
  isAuthenticated: isGoogleAuthenticated,
  loadStoredUser,
  initializeGoogleSignIn,
  user,
} = useGoogleAuth()
const showPlannerAuthWarning = ref(false)

const utilityTitles: Record<string, string> = {
  visitors: 'Visitor Analytics',
  database: 'Database Statistics',
  health: 'API Health Check',
  emails: 'Email Logs',
  content: 'Content Manager',
  cache: 'Cache Management',
}

const { setAuthenticated: setAdminAuthenticated, clearAuth: clearAdminAuth } = useAdminAuth()

const checkAuth = async () => {
  try {
    const response = await $fetch<{ authenticated: boolean; requires2FA?: boolean }>(
      '/api/admin/auth',
    )
    isAuthenticated.value = response.authenticated
    // Update the shared admin auth state
    setAdminAuthenticated(response.authenticated)
    // Don't set requires2FA here - it should only be set based on login attempt response
    // The requires2FA from this endpoint indicates global 2FA configuration, not current login state
  } catch {
    isAuthenticated.value = false
    setAdminAuthenticated(false)
  }
}

const handleLogin = async () => {
  isLoading.value = true
  loginError.value = ''

  try {
    // Include totpCode if it has a value (user entered it)
    // Don't reset requires2FA here - it should persist from previous attempt if needed
    const response = await $fetch<{
      success: boolean
      error?: string
      requires2FA?: boolean
    }>('/api/admin/auth', {
      method: 'POST',
      body: {
        password: password.value,
        // Include totpCode if user entered it (has a value)
        totpCode: totpCode.value.trim() || undefined,
      },
    })

    if (response.success) {
      isAuthenticated.value = true
      // Update the shared admin auth state
      setAdminAuthenticated(true)
      password.value = ''
      totpCode.value = ''
      requires2FA.value = false
    } else {
      if (response.requires2FA) {
        requires2FA.value = true
        loginError.value =
          'Password correct! Please enter your 2FA code from Microsoft Authenticator.'
        // Don't clear totpCode if 2FA is required - user can retry with same code
        // Focus on 2FA input field if it's now visible
        await nextTick()
        const totpInput = document.querySelector(
          'input[type="text"][maxlength="6"]',
        ) as HTMLInputElement
        if (totpInput) {
          totpInput.focus()
        }
      } else {
        // Reset 2FA state on non-2FA errors (wrong password, etc.)
        requires2FA.value = false
        totpCode.value = ''
        // Provide more user-friendly error messages
        const errorMsg = response.error || 'Invalid password or 2FA code'
        if (errorMsg.includes('password')) {
          loginError.value = 'Incorrect password. Please try again.'
        } else if (errorMsg.includes('2FA') || errorMsg.includes('code')) {
          loginError.value = 'Invalid 2FA code. Please check your authenticator app and try again.'
        } else {
          loginError.value = errorMsg
        }
      }
    }
  } catch (error: unknown) {
    // $fetch throws on 401/400, but the response body contains the error details
    // Extract the response data if available
    if (error && typeof error === 'object' && 'data' in error) {
      const response = (
        error as { data: { success?: boolean; error?: string; requires2FA?: boolean } }
      ).data

      if (response.requires2FA) {
        requires2FA.value = true
        loginError.value =
          'Password correct! Please enter your 2FA code from Microsoft Authenticator.'
        // Focus on 2FA input field if it's now visible
        await nextTick()
        const totpInput = document.querySelector(
          'input[type="text"][maxlength="6"]',
        ) as HTMLInputElement
        if (totpInput) {
          totpInput.focus()
        }
      } else {
        requires2FA.value = false
        totpCode.value = ''
        // Provide more user-friendly error messages
        const errorMsg = response.error || 'Invalid password or 2FA code'
        if (errorMsg.includes('password')) {
          loginError.value = 'Incorrect password. Please try again.'
        } else if (errorMsg.includes('2FA') || errorMsg.includes('code')) {
          loginError.value = 'Invalid 2FA code. Please check your authenticator app and try again.'
        } else {
          loginError.value = errorMsg
        }
      }
    } else {
      // Generic error if we can't extract response data
      loginError.value = 'Failed to authenticate. Please try again.'
      requires2FA.value = false
    }
  } finally {
    isLoading.value = false
  }
}

const handleLogout = async () => {
  try {
    await $fetch('/api/admin/logout', { method: 'POST' })
    isAuthenticated.value = false
    // Clear the shared admin auth state
    clearAdminAuth()
    activeUtility.value = null
  } catch (error) {
    console.error('Logout error:', error)
  }
}

const handlePlannerClick = async () => {
  await loadStoredUser()
  if (!isGoogleAuthenticated.value) {
    showPlannerAuthWarning.value = true
    initializeGoogleSignIn()
    // Render sign-in button after a short delay to ensure Google script is loaded
    await nextTick()
    setTimeout(() => {
      renderGoogleSignInButton()
    }, 100)
  } else {
    await navigateTo('/dev/planner')
  }
}

const renderGoogleSignInButton = () => {
  const buttonElement = document.getElementById('planner-google-signin-button')
  if (!buttonElement || typeof window === 'undefined' || !window.google) {
    // Retry if Google script not loaded yet
    setTimeout(() => renderGoogleSignInButton(), 200)
    return
  }

  const clientId = useRuntimeConfig().public.googleClientId
  if (!clientId) {
    console.error('[Dev Utilities] Google Client ID not configured')
    return
  }

  buttonElement.innerHTML = ''

  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: async (response: { credential: string }) => {
      try {
        const result = await $fetch<{
          user: { email: string; name: string; picture: string; sub: string }
        }>('/api/auth/google', {
          method: 'POST',
          body: { token: response.credential },
        })
        if (result && result.user) {
          // Update user state and localStorage
          user.value = result.user
          localStorage.setItem('google_user', JSON.stringify(result.user))

          // Track login for analytics
          if (typeof window !== 'undefined') {
            const { trackLogin } = await import('~/utils/analytics/trackLogin')
            await trackLogin(result.user.email, result.user.name, window.location.pathname)
            window.dispatchEvent(new CustomEvent('auth:signin', { detail: result.user }))
          }

          // Sign-in successful, navigate to planner
          showPlannerAuthWarning.value = false
          await navigateTo('/dev/planner')
        }
      } catch (error) {
        console.error('[Dev Utilities] Authentication failed:', error)
      }
    },
  })

  window.google.accounts.id.renderButton(buttonElement, {
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
    width: 250,
  })
}

const closePlannerAuthWarning = () => {
  showPlannerAuthWarning.value = false
}

onMounted(() => {
  checkAuth()
  initializeGoogleSignIn()
  loadStoredUser()
})
</script>
