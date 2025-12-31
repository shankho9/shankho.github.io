<script lang="ts" setup>
import { getTagColorClasses } from '~/utils/blog/tagColors'
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
  type?: 'blog' | 'lifeline'
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
  type: 'blog',
})

// Normalize path for lifelines blogs
const normalizedPath = computed(() => {
  // For lifelines blogs, ensure path uses /personalSpace/ prefix
  const isLifeline =
    props.type === 'lifeline' || props.tags.some((tag) => tag.toLowerCase() === 'lifelines')

  if (!isLifeline) {
    return props.path
  }

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
</script>

<template>
  <article
    class="group border dark:border-gray-800 m-2 rounded-2xl overflow-hidden shadow-sm text-zinc-700 dark:text-zinc-300"
  >
    <NuxtLink
      :to="normalizedPath"
      class="grid grid-cols-1 sm:grid-cols-10 gap-1 touch-manipulation"
      style="touch-action: manipulation; -webkit-tap-highlight-color: transparent"
    >
      <div class="sm:col-span-3">
        <NuxtImg
          class="h-full w-full object-cover object-center rounded-t-2xl sm:rounded-l-2xl sm:rounded-t-none shadow-lg group-hover:scale-[1.02] transition-all duration-500"
          width="300"
          :src="image"
          :alt="alt"
        />
      </div>
      <div class="sm:col-span-7 p-5">
        <h2
          class="text-xl font-semibold text-black dark:text-zinc-300 pb-1 group-hover:text-sky-700 dark:group-hover:text-sky-400"
        >
          {{ title }}
        </h2>
        <p class="text-ellipsis line-clamp-2">
          {{ description }}
        </p>
        <div class="text-black dark:text-zinc-300 text-sm mt-2 mb-1 md:flex md:space-x-6">
          <div class="flex items-center">
            <LogoDate />
            <p>{{ date }}</p>
          </div>
          <div class="flex items-center gap-1 flex-wrap">
            <LogoTag />
            <p
              v-for="tag in tags"
              :key="tag"
              :class="['rounded px-1.5 py-0.5 text-xs font-medium', getTagColorClasses(tag)]"
            >
              {{ tag }}
            </p>
          </div>
        </div>
        <div class="flex group-hover:underline text-sky-700 dark:text-sky-400 items-center pt-2">
          <p>Read More</p>
          <LogoArrow />
        </div>
      </div>
    </NuxtLink>
  </article>
</template>
