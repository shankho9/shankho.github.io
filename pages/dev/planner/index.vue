<script setup lang="ts">
import { nextTick, reactive, onMounted, watch } from 'vue'
import type { Task } from '~/server/api/planner/tasks.get'
import { getLocalDateString, formatDateToDisplay } from '~/utils/common/dateParser'
import {
  groupTasksByQuadrant,
  enrichTaskWithQuadrant,
  type TaskWithQuadrant,
  type Quadrant,
} from '~/utils/planner/eisenhower'
import { useGoogleAuth } from '~/composables/useGoogleAuth'

definePageMeta({
  layout: 'default',
})

// Authentication
const { user, isAuthenticated, loadStoredUser, initializeGoogleSignIn } = useGoogleAuth()

const { fetchTasks, fetchThemes } = useTasks()

const tasks = ref<Task[]>([])
const isLoading = ref(false)
const availableThemes = ref<string[]>([])
const selectedDate = ref(getLocalDateString())

// Eisenhower Matrix data (excluding done tasks)
const quadrantData = computed(() => {
  return groupTasksByQuadrant(
    tasks.value.filter((t) => t.status !== 'done'),
    selectedDate.value,
  )
})

// Track expanded quadrants (reactive object)
const expandedQuadrants = reactive({
  Q1: false,
  Q2: false,
  Q3: false,
  Q4: false,
})
const toggleQuadrant = (quadrant: 'Q1' | 'Q2' | 'Q3' | 'Q4') => {
  expandedQuadrants[quadrant] = !expandedQuadrants[quadrant]
}

// View toggle: 'matrix' or 'themes'
const viewMode = ref<'matrix' | 'themes'>('matrix')

// Statistics
const stats = computed(() => {
  const today = selectedDate.value
  // planned_date is now always in YYYY-MM-DD format from the API
  const todayTasks = tasks.value.filter((t) => t.planned_date === today)
  const allTasks = tasks.value

  return {
    total: allTasks.length,
    today: todayTasks.length,
    mits: allTasks.filter((t) => t.is_mit).length,
    todayMits: todayTasks.filter((t) => t.is_mit).length,
    doing: allTasks.filter((t) => t.status === 'doing').length,
    done: allTasks.filter((t) => t.status === 'done').length,
  }
})

// Tasks by bucket (sorted by quadrant within each bucket)
const tasksByBucket = computed(() => {
  const bucketMap = new Map<string, TaskWithQuadrant[]>()
  const enrichedTasks = tasks.value.map((t) => enrichTaskWithQuadrant(t, selectedDate.value))

  enrichedTasks.forEach((task) => {
    const bucket = task.theme || 'No Bucket'
    if (!bucketMap.has(bucket)) {
      bucketMap.set(bucket, [])
    }
    bucketMap.get(bucket)!.push(task)
  })

  // Sort tasks within each bucket by quadrant (Q1, Q2, Q3, Q4)
  const quadrantOrder: Record<Quadrant, number> = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 }

  return Array.from(bucketMap.entries())
    .map(([bucket, bucketTasks]) => {
      // Sort tasks by quadrant, then by priority score
      const sortedTasks = bucketTasks.sort((a, b) => {
        const quadrantDiff = quadrantOrder[a.quadrant] - quadrantOrder[b.quadrant]
        if (quadrantDiff !== 0) return quadrantDiff
        return b.priorityScore - a.priorityScore
      })
      return { bucket, count: sortedTasks.length, tasks: sortedTasks }
    })
    .sort((a, b) => b.count - a.count)
})

const loadData = async () => {
  isLoading.value = true
  try {
    const [allTasks, themes] = await Promise.all([fetchTasks(), fetchThemes()])
    tasks.value = allTasks
    availableThemes.value = themes
  } catch (error) {
    console.error('Failed to load dashboard data:', error)
  } finally {
    isLoading.value = false
  }
}

// Render Google Sign-In button
const renderGoogleSignInButton = () => {
  nextTick(() => {
    const buttonElement = document.getElementById('planner-google-signin-button')
    if (!buttonElement || !window.google) return

    const clientId = useRuntimeConfig().public.googleClientId
    if (!clientId) {
      console.error('[Planner] Google Client ID not configured')
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
            user.value = result.user
            localStorage.setItem('google_user', JSON.stringify(result.user))

            if (typeof window !== 'undefined') {
              const { trackLogin } = await import('~/utils/analytics/trackLogin')
              await trackLogin(result.user.email, result.user.name, window.location.pathname)
              window.dispatchEvent(new CustomEvent('auth:signin', { detail: result.user }))
            }
          }
        } catch (error) {
          console.error('[Planner] Authentication failed:', error)
        }
      },
    })

    window.google.accounts.id.renderButton(buttonElement, {
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      width: 250,
    })
  })
}

onMounted(() => {
  loadStoredUser()
  initializeGoogleSignIn()

  if (isAuthenticated.value) {
    loadData()
  } else {
    // Wait for Google script to load, then render sign-in button
    const checkAndRender = () => {
      if (window.google) {
        renderGoogleSignInButton()
      } else {
        // Retry after a short delay if script hasn't loaded yet
        setTimeout(checkAndRender, 100)
      }
    }
    nextTick(() => {
      checkAndRender()
    })
  }
})

watch(selectedDate, () => {
  if (isAuthenticated.value) {
    loadData()
  }
})

// Watch for authentication changes to load data when user signs in, or render button when signed out
watch(isAuthenticated, (newValue) => {
  if (newValue) {
    loadData()
  } else {
    // Wait for Google script to load, then render sign-in button
    const checkAndRender = () => {
      if (window.google) {
        renderGoogleSignInButton()
      } else {
        // Retry after a short delay if script hasn't loaded yet
        setTimeout(checkAndRender, 100)
      }
    }
    nextTick(() => {
      checkAndRender()
    })
  }
})
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Authentication Required Message -->
    <div v-if="!isAuthenticated" class="max-w-2xl mx-auto mt-12">
      <div
        class="bg-white dark:bg-slate-800 rounded-xl p-8 text-center border border-gray-200 dark:border-slate-700 shadow-lg"
      >
        <Icon name="mdi:lock" class="text-6xl text-sky-700 dark:text-sky-400 mb-4 mx-auto" />
        <h2 class="text-2xl font-bold mb-4 text-zinc-800 dark:text-zinc-200">
          Authentication Required
        </h2>
        <p class="text-zinc-600 dark:text-zinc-400 mb-6">
          Please sign in with Google to access the Planner.
        </p>
        <div id="planner-google-signin-button" class="flex justify-center"></div>
      </div>
    </div>

    <!-- Planner Content (only shown when authenticated) -->
    <div v-else>
      <!-- Header -->
      <div class="mb-6">
        <div
          class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4"
        >
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Planner Dashboard</h1>
            <p class="text-gray-600 dark:text-gray-400 mt-1">Overview of your tasks and progress</p>
          </div>
          <div class="flex items-center gap-2">
            <NuxtLink
              to="/dev/planner/tasks"
              class="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              title="Manage Tasks"
            >
              <Icon name="mdi:format-list-checkbox" size="20" />
            </NuxtLink>
            <NuxtLink
              to="/dev/planner/review"
              class="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              title="Review"
            >
              <Icon name="mdi:chart-line" size="20" />
            </NuxtLink>
            <NuxtLink
              :to="`/dev/planner/print/today?date=${selectedDate}`"
              class="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              title="Print Daily Plan"
            >
              <Icon name="mdi:printer" size="20" />
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="text-center py-12">
        <div
          class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"
        ></div>
      </div>

      <!-- Dashboard Content -->
      <div v-else class="space-y-6">
        <!-- Statistics Cards -->
        <div class="grid grid-cols-3 md:grid-cols-6 gap-3">
          <div
            class="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3"
          >
            <div class="text-xl font-bold text-blue-700 dark:text-blue-300">{{ stats.total }}</div>
            <div class="text-xs text-blue-600 dark:text-blue-400">Total</div>
          </div>
          <div
            class="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3"
          >
            <div class="text-xl font-bold text-green-700 dark:text-green-300">
              {{ stats.today }}
            </div>
            <div class="text-xs text-green-600 dark:text-blue-400">Today</div>
          </div>
          <div
            class="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3"
          >
            <div class="text-xl font-bold text-purple-700 dark:text-purple-300">
              {{ stats.mits }}
            </div>
            <div class="text-xs text-purple-600 dark:text-purple-400">MITs</div>
          </div>
          <div
            class="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3"
          >
            <div class="text-xl font-bold text-orange-700 dark:text-orange-300">
              {{ stats.todayMits }}
            </div>
            <div class="text-xs text-orange-600 dark:text-orange-400">Today MITs</div>
          </div>
          <div
            class="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3"
          >
            <div class="text-xl font-bold text-yellow-700 dark:text-yellow-300">
              {{ stats.doing }}
            </div>
            <div class="text-xs text-yellow-600 dark:text-yellow-400">Doing</div>
          </div>
          <div
            class="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3"
          >
            <div class="text-xl font-bold text-gray-700 dark:text-gray-300">{{ stats.done }}</div>
            <div class="text-xs text-gray-600 dark:text-gray-400">Done</div>
          </div>
        </div>

        <!-- View Toggle -->
        <div class="flex items-center justify-center gap-2 mb-4">
          <button
            :class="[
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              viewMode === 'matrix'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600',
            ]"
            @click="viewMode = 'matrix'"
          >
            Matrix View
          </button>
          <button
            :class="[
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              viewMode === 'themes'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600',
            ]"
            @click="viewMode = 'themes'"
          >
            Buckets View
          </button>
        </div>

        <!-- Eisenhower Matrix -->
        <div
          v-if="viewMode === 'matrix'"
          class="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4"
        >
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100">Eisenhower Matrix</h2>
            <NuxtLink
              to="/dev/planner/tasks"
              class="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              View All →
            </NuxtLink>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <!-- Q1: Do Now (Important & Urgent) -->
            <div class="border-2 border-red-500 rounded-lg p-3 bg-red-50 dark:bg-red-950/20">
              <div class="flex items-center justify-between mb-2">
                <h3 class="font-bold text-sm text-red-700 dark:text-red-400">Q1: Do Now</h3>
                <span
                  class="text-xs font-semibold text-red-600 dark:text-red-500 bg-red-100 dark:bg-red-900/40 px-2 py-0.5 rounded"
                  >{{ quadrantData[0].tasks.length }}</span
                >
              </div>
              <p class="text-xs text-red-600 dark:text-red-400 mb-2">Important & Urgent</p>
              <div class="space-y-1 max-h-60 overflow-y-auto">
                <div
                  v-for="task in expandedQuadrants.Q1
                    ? quadrantData[0].tasks
                    : quadrantData[0].tasks.slice(0, 10)"
                  :key="task.id"
                  class="text-xs text-gray-900 dark:text-gray-100 py-0.5"
                >
                  <span class="font-medium">{{ task.title }}</span>
                  <span class="inline-flex items-center gap-1 ml-2">
                    <span
                      v-if="task.theme"
                      class="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded"
                    >
                      {{ task.theme }}
                    </span>
                    <span
                      v-if="task.planned_date"
                      class="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                    >
                      {{ formatDateToDisplay(task.planned_date) || task.planned_date }}
                    </span>
                  </span>
                </div>
                <button
                  v-if="quadrantData[0].tasks.length > 10"
                  class="w-full text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium mt-1 p-1.5 hover:bg-red-100 dark:hover:bg-red-950/30 rounded transition-colors"
                  @click="toggleQuadrant('Q1')"
                >
                  {{
                    expandedQuadrants.Q1
                      ? 'View less...'
                      : `View more... (${quadrantData[0].tasks.length - 10} more)`
                  }}
                </button>
              </div>
            </div>

            <!-- Q2: Schedule (Important & Not Urgent) -->
            <div class="border-2 border-blue-500 rounded-lg p-3 bg-blue-50 dark:bg-blue-950/20">
              <div class="flex items-center justify-between mb-2">
                <h3 class="font-bold text-sm text-blue-700 dark:text-blue-400">Q2: Schedule</h3>
                <span
                  class="text-xs font-semibold text-blue-600 dark:text-blue-500 bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded"
                  >{{ quadrantData[1].tasks.length }}</span
                >
              </div>
              <p class="text-xs text-blue-600 dark:text-blue-400 mb-2">Important & Not Urgent</p>
              <div class="space-y-1 max-h-60 overflow-y-auto">
                <div
                  v-for="task in expandedQuadrants.Q2
                    ? quadrantData[1].tasks
                    : quadrantData[1].tasks.slice(0, 10)"
                  :key="task.id"
                  class="text-xs text-gray-900 dark:text-gray-100 py-0.5"
                >
                  <span class="font-medium">{{ task.title }}</span>
                  <span class="inline-flex items-center gap-1 ml-2">
                    <span
                      v-if="task.theme"
                      class="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded"
                    >
                      {{ task.theme }}
                    </span>
                    <span
                      v-if="task.planned_date"
                      class="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                    >
                      {{ formatDateToDisplay(task.planned_date) || task.planned_date }}
                    </span>
                  </span>
                </div>
                <button
                  v-if="quadrantData[1].tasks.length > 10"
                  class="w-full text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium mt-1 p-1.5 hover:bg-blue-100 dark:hover:bg-blue-950/30 rounded transition-colors"
                  @click="toggleQuadrant('Q2')"
                >
                  {{
                    expandedQuadrants.Q2
                      ? 'View less...'
                      : `View more... (${quadrantData[1].tasks.length - 10} more)`
                  }}
                </button>
              </div>
            </div>

            <!-- Q3: Defer/Batch (Not Important & Urgent) -->
            <div
              class="border-2 border-yellow-500 rounded-lg p-3 bg-yellow-50 dark:bg-yellow-950/20"
            >
              <div class="flex items-center justify-between mb-2">
                <h3 class="font-bold text-sm text-yellow-700 dark:text-yellow-400">
                  Q3: Defer / Batch
                </h3>
                <span
                  class="text-xs font-semibold text-yellow-600 dark:text-yellow-500 bg-yellow-100 dark:bg-yellow-900/40 px-2 py-0.5 rounded"
                  >{{ quadrantData[2].tasks.length }}</span
                >
              </div>
              <p class="text-xs text-yellow-600 dark:text-yellow-400 mb-2">
                Not Important & Urgent
              </p>
              <div class="space-y-1 max-h-60 overflow-y-auto">
                <div
                  v-for="task in expandedQuadrants.Q3
                    ? quadrantData[2].tasks
                    : quadrantData[2].tasks.slice(0, 10)"
                  :key="task.id"
                  class="text-xs text-gray-900 dark:text-gray-100 py-0.5"
                >
                  <span class="font-medium">{{ task.title }}</span>
                  <span class="inline-flex items-center gap-1 ml-2">
                    <span
                      v-if="task.theme"
                      class="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded"
                    >
                      {{ task.theme }}
                    </span>
                    <span
                      v-if="task.planned_date"
                      class="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                    >
                      {{ formatDateToDisplay(task.planned_date) || task.planned_date }}
                    </span>
                  </span>
                </div>
                <button
                  v-if="quadrantData[2].tasks.length > 10"
                  class="w-full text-xs text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300 font-medium mt-1 p-1.5 hover:bg-yellow-100 dark:hover:bg-yellow-950/30 rounded transition-colors"
                  @click="toggleQuadrant('Q3')"
                >
                  {{
                    expandedQuadrants.Q3
                      ? 'View less...'
                      : `View more... (${quadrantData[2].tasks.length - 10} more)`
                  }}
                </button>
              </div>
            </div>

            <!-- Q4: Later / Parking Lot (Not Important & Not Urgent) -->
            <div
              class="border-2 border-gray-400 rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50 opacity-75"
            >
              <div class="flex items-center justify-between mb-2">
                <h3 class="font-bold text-sm text-gray-600 dark:text-gray-400">
                  Q4: Later / Parking Lot
                </h3>
                <span
                  class="text-xs font-semibold text-gray-500 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded"
                  >{{ quadrantData[3].tasks.length }}</span
                >
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Deferred (Not Important & Not Urgent)
              </p>
              <div class="space-y-1 max-h-60 overflow-y-auto">
                <div
                  v-for="task in expandedQuadrants.Q4
                    ? quadrantData[3].tasks
                    : quadrantData[3].tasks.slice(0, 10)"
                  :key="task.id"
                  class="text-xs text-gray-600 dark:text-gray-400 py-0.5"
                >
                  <span class="font-medium">{{ task.title }}</span>
                  <span class="inline-flex items-center gap-1 ml-2">
                    <span
                      v-if="task.theme"
                      class="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded"
                    >
                      {{ task.theme }}
                    </span>
                    <span
                      v-if="task.planned_date"
                      class="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                    >
                      {{ formatDateToDisplay(task.planned_date) || task.planned_date }}
                    </span>
                  </span>
                </div>
                <button
                  v-if="quadrantData[3].tasks.length > 10"
                  class="w-full text-xs text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium mt-1 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded transition-colors"
                  @click="toggleQuadrant('Q4')"
                >
                  {{
                    expandedQuadrants.Q4
                      ? 'View less...'
                      : `View more... (${quadrantData[3].tasks.length - 10} more)`
                  }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Tasks by Bucket -->
        <div
          v-if="viewMode === 'themes'"
          class="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4"
        >
          <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">Tasks by Bucket</h2>
          <div
            v-if="tasksByBucket.length === 0"
            class="text-center py-6 text-gray-500 dark:text-gray-400"
          >
            No tasks with buckets
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div
              v-for="item in tasksByBucket"
              :key="item.bucket"
              class="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:shadow-sm transition-shadow"
            >
              <div class="flex items-center justify-between mb-2">
                <h3 class="font-semibold text-sm text-gray-900 dark:text-gray-100">
                  {{ item.bucket }}
                </h3>
                <span
                  class="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded"
                  >{{ item.count }}</span
                >
              </div>
              <div class="space-y-1">
                <div
                  v-for="task in item.tasks.slice(0, 5)"
                  :key="task.id"
                  class="text-xs text-gray-600 dark:text-gray-400 truncate"
                >
                  {{ task.title }}
                </div>
                <div v-if="item.tasks.length > 5" class="text-xs text-gray-500 dark:text-gray-400">
                  +{{ item.tasks.length - 5 }} more
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
