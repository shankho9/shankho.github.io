<script setup lang="ts">
import type { BlogPost } from '@/types/blog'
import { extractBlogPostFromMeta } from '~/utils/blog/blogMeta'

interface Props {
  currentPath: string
  currentTags?: string[]
  currentCategory?: string
  limit?: number
  showExternal?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  currentTags: () => [],
  currentCategory: undefined,
  limit: 5,
  showExternal: false,
})

// Fetch related posts from internal content
const { data: relatedPosts } = await useAsyncData(
  `related-posts-${props.currentPath}`,
  async () => {
    // Get all blog posts
    const allPosts = await queryCollection('content').all()

    // Extract current post's metadata
    const currentPost = allPosts.find((post) => post.path === props.currentPath)
    if (!currentPost) return []

    const currentMeta = extractBlogPostFromMeta(currentPost.meta)
    const currentTags = currentMeta.tags || []
    const currentCategory = currentMeta.category

    // Filter and score related posts
    const scoredPosts = allPosts
      .filter((post) => {
        // Exclude current post
        if (post.path === props.currentPath) return false

        const meta = extractBlogPostFromMeta(post.meta)
        // Only include published posts
        if (!meta.published) return false

        // Exclude lifelines from regular blog posts
        const isLifeline = meta.tags?.includes('lifelines') || meta.category === 'lifelines'
        const currentIsLifeline = currentTags.includes('lifelines') || currentCategory === 'lifelines'

        // Only show lifelines if current post is also a lifeline
        if (isLifeline && !currentIsLifeline) return false
        if (!isLifeline && currentIsLifeline) return false

        return true
      })
      .map((post) => {
        const meta = extractBlogPostFromMeta(post.meta)
        let score = 0

        // Score based on shared tags
        const sharedTags = (meta.tags || []).filter((tag) => currentTags.includes(tag))
        score += sharedTags.length * 10

        // Score based on category match
        if (currentCategory && meta.category === currentCategory) {
          score += 15
        }

        // Normalize path for lifelines
        let normalizedPath = post.path || '/'
        if (normalizedPath.endsWith('.md')) {
          normalizedPath = normalizedPath.replace(/\.md$/, '')
        }
        if (normalizedPath.startsWith('/content/')) {
          normalizedPath = normalizedPath.replace(/^\/content/, '')
        }
        if (normalizedPath.startsWith('/blogs/')) {
          normalizedPath = normalizedPath.replace(/^\/blogs/, '')
        }
        normalizedPath = normalizedPath.replace(/\/+/g, '/')

        const isLifeline = meta.tags?.includes('lifelines') || meta.category === 'lifelines'
        if (isLifeline && !normalizedPath.startsWith('/personalSpace/')) {
          const cleanPath = normalizedPath.replace(/^\/+/, '')
          normalizedPath = `/personalSpace/${cleanPath}`
        }
        normalizedPath = normalizedPath.replace(/\/+/g, '/')

        return {
          path: normalizedPath,
          title: post.title || 'no-title available',
          description: post.description || 'no-description available',
          image: meta.image || '/not-found.jpg',
          alt: meta.alt || 'no-alt',
          date: meta.date || 'no-date-available',
          tags: meta.tags || [],
          score,
        }
      })
      .filter((post) => post.score > 0) // Only show posts with some relevance
      .sort((a, b) => b.score - a.score) // Sort by relevance
      .slice(0, props.limit) // Limit results

    return scoredPosts
  },
)

// External content (can be extended to fetch from APIs)
const externalContent = ref<any[]>([])
const isLoadingExternal = ref(false)

if (props.showExternal) {
  // Fetch external content from API
  isLoadingExternal.value = true
  try {
    const { data } = await useFetch('/api/related-content', {
      query: {
        tags: props.currentTags.join(','),
        category: props.currentCategory,
        title: '', // Can be used for semantic search
        limit: props.limit,
        source: 'medium', // Can be: 'medium', 'devto', 'wordpress', 'reddit', etc.
      },
    })
    externalContent.value = data.value || []
  } catch (error) {
    console.error('Failed to fetch external content:', error)
  } finally {
    isLoadingExternal.value = false
  }
}
</script>

<template>
  <div v-if="(relatedPosts && relatedPosts.length > 0) || (externalContent && externalContent.length > 0)" class="mt-6">
    <div class="border dark:border-gray-800 p-3 rounded-md min-w-[200px] dark:bg-slate-900">
      <h2 class="text-sm font-bold mb-3 border-b dark:border-gray-800 pb-2">
        Related Content
      </h2>
      
      <!-- Internal Related Posts -->
      <div v-if="relatedPosts && relatedPosts.length > 0" class="space-y-3">
        <NuxtLink
          v-for="post in relatedPosts"
          :key="post.path"
          :to="post.path"
          class="block group"
        >
          <div class="flex gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded transition-colors">
            <NuxtImg
              v-if="post.image"
              :src="post.image"
              :alt="post.alt"
              class="w-16 h-16 object-cover rounded flex-shrink-0"
              width="64"
              height="64"
            />
            <div class="flex-1 min-w-0">
              <h3
                class="text-xs font-semibold text-zinc-800 dark:text-zinc-200 line-clamp-2 group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors"
              >
                {{ post.title }}
              </h3>
              <p class="text-xs text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">
                {{ post.description }}
              </p>
            </div>
          </div>
        </NuxtLink>
      </div>

      <!-- External Content -->
      <div v-if="showExternal && externalContent && externalContent.length > 0" class="space-y-3 mt-4">
        <div v-if="relatedPosts && relatedPosts.length > 0" class="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2 pt-2 border-t dark:border-gray-800">
          From the Web
        </div>
        <a
          v-for="item in externalContent"
          :key="item.url"
          :href="item.url"
          target="_blank"
          rel="noopener noreferrer"
          class="block group"
        >
          <div class="flex gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded transition-colors">
            <NuxtImg
              v-if="item.image"
              :src="item.image"
              :alt="item.title"
              class="w-16 h-16 object-cover rounded flex-shrink-0"
              width="64"
              height="64"
            />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1 mb-1">
                <span class="text-xs text-zinc-500 dark:text-zinc-500">{{ item.source }}</span>
              </div>
              <h3
                class="text-xs font-semibold text-zinc-800 dark:text-zinc-200 line-clamp-2 group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors"
              >
                {{ item.title }}
              </h3>
              <p class="text-xs text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">
                {{ item.description }}
              </p>
            </div>
          </div>
        </a>
      </div>

      <!-- Loading State -->
      <div v-if="isLoadingExternal" class="text-xs text-zinc-500 dark:text-zinc-400 text-center py-4">
        Loading external content...
      </div>
    </div>
  </div>
</template>
