<script lang="ts" setup>
import { getTagColorClasses } from '~/utils/blog/tagColors'
import { useGoogleAuth } from '~/composables/useGoogleAuth'
import { computed } from 'vue'

interface Props {
  path?: string
  title?: string
  date?: string
  description?: string
  image?: string
  alt?: string
  ogImage?: string
  tags?: Array<string>
  published?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  path: '/',
  title: 'no-title',
  date: 'no-date',
  description: 'no-description',
  image: '/blogs-img/blog.jpg',
  alt: 'no-alt',
  ogImage: '/blogs-img/blog.jpg',
  tags: () => [],
  published: false,
})

// Check if this is a lifelines blog
const isLifeline = computed(() => {
  return props.tags.some((tag) => tag.toLowerCase() === 'lifelines')
})

// Authentication
const { isAuthenticated } = useGoogleAuth()

// Normalize path for lifelines blogs
const normalizedPath = computed(() => {
  if (!isLifeline.value) {
    return props.path
  }

  // For lifelines blogs, ensure path uses /personalSpace/ prefix
  let path = props.path || '/'

  // Remove .md extension if present
  if (path.endsWith('.md')) {
    path = path.replace(/\.md$/, '')
  }

  // Remove leading /content/ if present
  if (path.startsWith('/content/')) {
    path = path.replace(/^\/content/, '')
  }

  // Remove leading /blogs/ if present
  if (path.startsWith('/blogs/')) {
    path = path.replace(/^\/blogs/, '')
  }

  // Ensure no double slashes
  path = path.replace(/\/+/g, '/')

  // Ensure path starts with /personalSpace/
  if (!path.startsWith('/personalSpace/')) {
    const cleanPath = path.replace(/^\/+/, '')
    path = `/personalSpace/${cleanPath}`
  }

  // Final cleanup
  return path.replace(/\/+/g, '/')
})

// Handle click - check auth for lifelines
const handleClick = (event: MouseEvent) => {
  if (isLifeline.value && !isAuthenticated.value) {
    event.preventDefault()
    // Navigate to personalSpace page which has auth
    navigateTo('/personalSpace')
  }
}
</script>

<template>
  <article
    class="group border dark:border-gray-800 m-2 overflow-hidden rounded-2xl shadow-sm text-zinc-700 dark:text-zinc-300"
  >
    <NuxtLink
      :to="normalizedPath"
      class="block touch-manipulation"
      style="touch-action: manipulation; -webkit-tap-highlight-color: transparent"
      @click="handleClick"
    >
      <NuxtImg
        class="lg:h-48 md:h-36 w-full object-cover object-center rounded-t-2xl shadow-lg group-hover:scale-[1.02] transition-all duration-500"
        width="300"
        :src="image"
        :alt="alt"
      />
      <div class="px-3 pb-4">
        <div class="text-black dark:text-zinc-300 pt-3 pb-2">
          <div class="flex items-center">
            <LogoDate />
            {{ date }}
          </div>
          <div class="flex items-center gap-1 flex-wrap">
            <LogoTag />
            <template v-for="tag in tags" :key="tag">
              <span :class="['rounded px-1.5 py-0.5 text-xs font-medium', getTagColorClasses(tag)]">
                {{ tag }}
              </span>
            </template>
          </div>
        </div>
        <h2
          class="text-xl font-semibold text-black dark:text-zinc-300 pb-1 group-hover:text-sky-700 dark:group-hover:text-sky-400"
        >
          {{ title }}
        </h2>
        <p class="text-ellipsis line-clamp-2 text-base">
          {{ description }}
        </p>
        <div class="flex group-hover:underline text-sky-700 dark:text-sky-400 items-center py-2">
          <p>Read More</p>
          <LogoArrow />
        </div>
      </div>
    </NuxtLink>
  </article>
</template>
