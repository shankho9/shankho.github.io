<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'

const { isAdmin, checkAuth } = useAuth()

onMounted(() => {
  checkAuth()
})
</script>

<template>
  <div class="flex flex-col dark:text-zinc-300 my-5 md:my-0 md:justify-self-center">
    <p class="text-black dark:text-zinc-300 text-lg sm:text-xl font-semibold mb-2 text-center">
      Quick Links
    </p>
    <div class="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 text-sm">
      <NuxtLink
        to="/"
        class="flex items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap group"
      >
        <Icon
          name="mdi:home"
          size="14"
          class="text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-shrink-0"
        />
        <span>Home</span>
      </NuxtLink>
      <span class="text-gray-400 dark:text-gray-600">|</span>
      <NuxtLink
        to="/blogs"
        class="flex items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap group"
      >
        <Icon
          name="mdi:book-open-variant"
          size="14"
          class="text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-shrink-0"
        />
        <span>Blogs</span>
      </NuxtLink>
      <span class="text-gray-400 dark:text-gray-600">|</span>
      <NuxtLink
        to="/personalSpace"
        class="flex items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap group"
      >
        <Icon
          name="mdi:account-circle"
          size="14"
          class="text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-shrink-0"
        />
        <span>LifeLines</span>
      </NuxtLink>
      <span class="text-gray-400 dark:text-gray-600">|</span>
      <NuxtLink
        to="/library"
        class="flex items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap group"
      >
        <Icon
          name="mdi:library"
          size="14"
          class="text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-shrink-0"
        />
        <span>Library</span>
      </NuxtLink>
      <span class="text-gray-400 dark:text-gray-600">|</span>
      <NuxtLink
        to="/categories"
        class="flex items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap group"
      >
        <Icon
          name="mdi:tag-multiple"
          size="14"
          class="text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-shrink-0"
        />
        <span>Categories</span>
      </NuxtLink>
      <span class="text-gray-400 dark:text-gray-600">|</span>
      <NuxtLink
        to="/about"
        class="flex items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap group"
      >
        <Icon
          name="mdi:information"
          size="14"
          class="text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-shrink-0"
        />
        <span>About Me</span>
      </NuxtLink>
      <template v-if="isAdmin">
        <span class="text-gray-400 dark:text-gray-600">|</span>
        <NuxtLink
          to="/dev"
          class="flex items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap group"
        >
          <Icon
            name="mdi:tools"
            size="14"
            class="text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-shrink-0"
          />
          <span>Utilities</span>
        </NuxtLink>
      </template>
      <span class="text-gray-400 dark:text-gray-600">|</span>
      <NuxtLink
        to="/sitemap"
        class="flex items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap group"
      >
        <Icon
          name="mdi:sitemap"
          size="14"
          class="text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-shrink-0"
        />
        <span>Sitemap</span>
      </NuxtLink>
    </div>
  </div>
</template>
