<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useDevUtilityAuth } from '~/composables/useDevUtilityAuth'

definePageMeta({
  layout: 'default',
  middleware: ['auth-admin'],
})

interface Place {
  id: number
  name: string
  lat: number
  lng: number
  year?: number | null
  description?: string | null
  blog_slug?: string | null
  type?: 'home' | 'trip' | null
  created_at?: string
}

const { isAuthenticated, ensureAuth } = useDevUtilityAuth()
const places = ref<Place[]>([])
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await $fetch<Place[] | { error?: string }>('/api/travel/places')
    if (Array.isArray(data)) {
      places.value = data
    } else {
      places.value = []
      error.value = (data as { error?: string }).error || 'Failed to load locations'
    }
  } catch (e) {
    places.value = []
    error.value = e instanceof Error ? e.message : 'Failed to load locations'
  } finally {
    loading.value = false
  }
}

function formatDate(s: string | undefined) {
  if (!s) return '—'
  try {
    return new Date(s).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return '—'
  }
}

onMounted(async () => {
  if (!(await ensureAuth())) return
  await load()
})
</script>

<template>
  <div class="max-w-7xl mx-auto w-full px-3 sm:px-6 py-6 sm:py-8 overflow-x-hidden">
    <div v-if="!isAuthenticated" class="max-w-md mx-auto">
      <div
        class="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-8 text-center"
      >
        <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Locations
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mb-6">Sign in to access this utility.</p>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
          <NuxtLink
            :to="`/auth/login?redirect=${encodeURIComponent($route.fullPath)}`"
            class="w-full sm:w-auto inline-flex justify-center items-center px-5 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Sign in
          </NuxtLink>
          <NuxtLink
            to="/"
            class="w-full sm:w-auto inline-flex justify-center items-center px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600 border border-gray-200 dark:border-slate-600 transition-colors"
          >
            Back to home
          </NuxtLink>
        </div>
      </div>
    </div>

    <div v-else>
      <div class="mb-4 sm:mb-6">
        <div
          class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4"
        >
          <div>
            <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
              Locations
            </h1>
            <p class="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
              All locations from the database (added via
              <NuxtLink to="/dev/locations" class="text-blue-600 dark:text-blue-400 underline">
                Location Manager
              </NuxtLink>
              )
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <NuxtLink
              to="/dev/locations"
              class="inline-flex items-center px-2.5 py-1.5 text-sm font-medium bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors touch-manipulation"
            >
              <Icon name="mdi:map-marker-plus" class="mr-1.5 text-base" />
              Location Manager
            </NuxtLink>
            <NuxtLink
              to="/dev"
              class="inline-flex items-center px-2.5 py-1.5 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors touch-manipulation"
            >
              <Icon name="mdi:arrow-left" class="mr-1.5 text-base" />
              Back to Utilities
            </NuxtLink>
          </div>
        </div>
      </div>

      <div
        v-if="error"
        class="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 mb-6"
      >
        <div class="flex">
          <Icon name="mdi:alert-circle" class="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div class="ml-3">
            <p class="text-sm font-medium text-red-800 dark:text-red-200">{{ error }}</p>
            <button
              type="button"
              class="mt-2 text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
              @click="load"
            >
              Retry
            </button>
          </div>
        </div>
      </div>

      <div v-if="loading" class="flex justify-center py-12">
        <div
          class="inline-block h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900 dark:border-gray-600 dark:border-t-gray-100"
        />
        <span class="ml-2 text-gray-600 dark:text-gray-400">Loading locations…</span>
      </div>

      <div
        v-else-if="places.length === 0"
        class="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 sm:p-12 text-center"
      >
        <Icon
          name="mdi:map-marker-off"
          class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4"
        />
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          No locations yet
        </h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
          Add locations using
          <NuxtLink to="/dev/locations" class="text-blue-600 dark:text-blue-400 underline">
            Location Manager
          </NuxtLink>
          .
        </p>
        <NuxtLink
          to="/dev/locations"
          class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700"
        >
          <Icon name="mdi:map-marker-plus" class="mr-2" />
          Open Location Manager
        </NuxtLink>
      </div>

      <div
        v-else
        class="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden"
      >
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead class="bg-gray-50 dark:bg-slate-800/80">
              <tr>
                <th
                  scope="col"
                  class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400"
                >
                  Name
                </th>
                <th
                  scope="col"
                  class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400"
                >
                  Lat / Lng
                </th>
                <th
                  scope="col"
                  class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400"
                >
                  Type
                </th>
                <th
                  scope="col"
                  class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400"
                >
                  Year
                </th>
                <th
                  scope="col"
                  class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400"
                >
                  Description
                </th>
                <th
                  scope="col"
                  class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400"
                >
                  Created
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-slate-700">
              <tr
                v-for="p in places"
                :key="p.id"
                class="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
              >
                <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                  {{ p.name }}
                </td>
                <td class="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-400">
                  {{ p.lat.toFixed(4) }}, {{ p.lng.toFixed(4) }}
                </td>
                <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 capitalize">
                  {{ p.type || '—' }}
                </td>
                <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                  {{ p.year ?? '—' }}
                </td>
                <td
                  class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-[200px] truncate"
                  :title="p.description || ''"
                >
                  {{ p.description || '—' }}
                </td>
                <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-500">
                  {{ formatDate(p.created_at) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div
          class="px-4 py-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80 text-sm text-gray-600 dark:text-gray-400"
        >
          {{ places.length }} location{{ places.length === 1 ? '' : 's' }}
        </div>
      </div>
    </div>
  </div>
</template>
