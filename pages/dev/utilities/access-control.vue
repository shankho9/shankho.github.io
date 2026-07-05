<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth-admin'],
})
</script>

<template>
  <div class="max-w-3xl mx-auto w-full px-3 sm:px-6 py-6 sm:py-8 overflow-x-hidden">
    <div class="mb-6">
      <NuxtLink to="/dev" class="text-sm text-blue-600 dark:text-blue-400 hover:underline">
        ← Back to Utilities
      </NuxtLink>
      <h1 class="mt-2 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
        Utility Access Control
      </h1>
    </div>

    <div
      class="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 space-y-4"
    >
      <p class="text-gray-600 dark:text-gray-400">
        All utilities are restricted to <strong>admin</strong> users. Signed-in visitors can access
        Library, LifeLines, and Gallery. Utilities require admin login plus admin passcode.
      </p>
      <p class="text-gray-600 dark:text-gray-400">
        To promote or demote users, use the Admin Users utility (email OTP required for each
        change).
      </p>
      <NuxtLink
        to="/dev/utilities/admin-users"
        class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        <Icon name="mdi:account-cog" size="18" />
        Manage Admin Users
      </NuxtLink>
    </div>
  </div>
</template>
