<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <NuxtLink
        to="/admin/places"
        class="block bg-white dark:bg-slate-700 rounded-lg p-6 border border-gray-200 dark:border-slate-600 hover:shadow-lg transition-shadow"
      >
        <div class="flex items-center gap-3 mb-2">
          <Icon name="mdi:map-marker" size="24" class="text-green-600 dark:text-green-400" />
          <h3 class="text-lg font-semibold">Manage Places</h3>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400">Add and manage travel locations</p>
      </NuxtLink>

      <NuxtLink
        to="/gallery"
        class="block bg-white dark:bg-slate-700 rounded-lg p-6 border border-gray-200 dark:border-slate-600 hover:shadow-lg transition-shadow"
      >
        <div class="flex items-center gap-3 mb-2">
          <Icon name="mdi:image-multiple" size="24" class="text-blue-600 dark:text-blue-400" />
          <h3 class="text-lg font-semibold">Gallery</h3>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400">View and manage gallery items</p>
      </NuxtLink>

      <NuxtLink
        to="/blogs"
        class="block bg-white dark:bg-slate-700 rounded-lg p-6 border border-gray-200 dark:border-slate-600 hover:shadow-lg transition-shadow"
      >
        <div class="flex items-center gap-3 mb-2">
          <Icon
            name="mdi:book-open-variant"
            size="24"
            class="text-purple-600 dark:text-purple-400"
          />
          <h3 class="text-lg font-semibold">Blog Posts</h3>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400">View blog posts and content</p>
      </NuxtLink>

      <NuxtLink
        to="/resources"
        class="block bg-white dark:bg-slate-700 rounded-lg p-6 border border-gray-200 dark:border-slate-600 hover:shadow-lg transition-shadow"
      >
        <div class="flex items-center gap-3 mb-2">
          <Icon name="mdi:folder-multiple" size="24" class="text-orange-600 dark:text-orange-400" />
          <h3 class="text-lg font-semibold">Resources</h3>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400">Manage resources and content</p>
      </NuxtLink>

      <NuxtLink
        to="/personalSpace"
        class="block bg-white dark:bg-slate-700 rounded-lg p-6 border border-gray-200 dark:border-slate-600 hover:shadow-lg transition-shadow"
      >
        <div class="flex items-center gap-3 mb-2">
          <Icon name="mdi:account-circle" size="24" class="text-pink-600 dark:text-pink-400" />
          <h3 class="text-lg font-semibold">Personal Space</h3>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400">View personal space content</p>
      </NuxtLink>

      <div
        class="bg-white dark:bg-slate-700 rounded-lg p-6 border border-gray-200 dark:border-slate-600"
      >
        <div class="flex items-center gap-3 mb-2">
          <Icon name="mdi:database" size="24" class="text-indigo-600 dark:text-indigo-400" />
          <h3 class="text-lg font-semibold">Database</h3>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Direct database access and queries
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-500">Coming soon: SQL query interface</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Content manager component - provides quick links to manage content
</script>
