<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        v-for="check in healthChecks"
        :key="check.name"
        class="bg-white dark:bg-slate-700 rounded-lg p-4 border border-gray-200 dark:border-slate-600"
      >
        <div class="flex items-center justify-between mb-2">
          <h4 class="font-semibold">{{ check.name }}</h4>
          <div
            class="w-3 h-3 rounded-full"
            :class="
              check.status === 'healthy'
                ? 'bg-green-500'
                : check.status === 'degraded'
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
            "
          ></div>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400">{{ check.message }}</p>
        <p v-if="check.responseTime" class="text-xs text-gray-500 dark:text-gray-500 mt-1">
          Response time: {{ check.responseTime }}ms
        </p>
      </div>
    </div>

    <div class="mt-6">
      <button
        :disabled="isChecking"
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        @click="runHealthChecks"
      >
        {{ isChecking ? 'Checking...' : 'Refresh Health Checks' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface HealthCheck {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  message: string
  responseTime?: number
}

const healthChecks = ref<HealthCheck[]>([])
const isChecking = ref(false)

const runHealthChecks = async () => {
  isChecking.value = true

  const checks: HealthCheck[] = []

  // Check database
  const dbStart = Date.now()
  try {
    const response = await $fetch<{ success: boolean }>('/api/dev/test-db')
    const responseTime = Date.now() - dbStart
    checks.push({
      name: 'Database Connection',
      status: response.success ? 'healthy' : 'unhealthy',
      message: response.success ? 'Database is accessible' : 'Database connection failed',
      responseTime,
    })
  } catch {
    checks.push({
      name: 'Database Connection',
      status: 'unhealthy',
      message: 'Database connection failed',
      responseTime: Date.now() - dbStart,
    })
  }

  // Check admin auth
  const authStart = Date.now()
  try {
    await $fetch<{ authenticated: boolean }>('/api/admin/auth')
    const responseTime = Date.now() - authStart
    checks.push({
      name: 'Admin Auth',
      status: 'healthy',
      message: 'Admin authentication endpoint is working',
      responseTime,
    })
  } catch {
    checks.push({
      name: 'Admin Auth',
      status: 'degraded',
      message: 'Admin authentication endpoint error',
      responseTime: Date.now() - authStart,
    })
  }

  // Check travel places API
  const placesStart = Date.now()
  try {
    await $fetch('/api/travel/places')
    const responseTime = Date.now() - placesStart
    checks.push({
      name: 'Travel Places API',
      status: 'healthy',
      message: 'Travel places endpoint is accessible',
      responseTime,
    })
  } catch {
    checks.push({
      name: 'Travel Places API',
      status: 'degraded',
      message: 'Travel places endpoint error',
      responseTime: Date.now() - placesStart,
    })
  }

  // Check gallery API
  const galleryStart = Date.now()
  try {
    await $fetch('/api/gallery/likes?itemId=1')
    const responseTime = Date.now() - galleryStart
    checks.push({
      name: 'Gallery API',
      status: 'healthy',
      message: 'Gallery endpoints are accessible',
      responseTime,
    })
  } catch {
    checks.push({
      name: 'Gallery API',
      status: 'degraded',
      message: 'Gallery endpoints error',
      responseTime: Date.now() - galleryStart,
    })
  }

  healthChecks.value = checks
  isChecking.value = false
}

onMounted(() => {
  runHealthChecks()
})
</script>
