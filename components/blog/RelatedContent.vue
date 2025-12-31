<script setup lang="ts">
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

// Helper function to normalize paths for comparison
const normalizePathForComparison = (path: string): string => {
  let normalized = path || '/'
  // Remove .md extension
  if (normalized.endsWith('.md')) {
    normalized = normalized.replace(/\.md$/, '')
  }
  // Remove /content/ prefix
  if (normalized.startsWith('/content/')) {
    normalized = normalized.replace(/^\/content/, '')
  }
  // Remove /blogs/ prefix
  if (normalized.startsWith('/blogs/')) {
    normalized = normalized.replace(/^\/blogs/, '')
  }
  // Remove /personalSpace/ prefix for comparison
  if (normalized.startsWith('/personalSpace/')) {
    normalized = normalized.replace(/^\/personalSpace\//, '')
  }
  // Clean up slashes
  normalized = normalized.replace(/\/+/g, '/').replace(/^\/+/, '').replace(/\/+$/, '')
  return normalized
}

// Helper function to normalize path for display/routing
const normalizePathForDisplay = (path: string, isLifeline: boolean): string => {
  let normalized = path || '/'
  if (normalized.endsWith('.md')) {
    normalized = normalized.replace(/\.md$/, '')
  }
  if (normalized.startsWith('/content/')) {
    normalized = normalized.replace(/^\/content/, '')
  }
  if (normalized.startsWith('/blogs/')) {
    normalized = normalized.replace(/^\/blogs/, '')
  }
  normalized = normalized.replace(/\/+/g, '/')

  if (isLifeline && !normalized.startsWith('/personalSpace/')) {
    const cleanPath = normalized.replace(/^\/+/, '')
    normalized = `/personalSpace/${cleanPath}`
  } else if (!isLifeline && !normalized.startsWith('/blogs/')) {
    const cleanPath = normalized.replace(/^\/+/, '')
    normalized = `/blogs/${cleanPath}`
  }
  return normalized.replace(/\/+/g, '/')
}

// Fetch related posts from internal content
const { data: relatedPosts } = await useAsyncData(
  `related-posts-${props.currentPath}`,
  async () => {
    // Get all blog posts
    const allPosts = await queryCollection('content').all()

    // Normalize current path for comparison
    const normalizedCurrentPath = normalizePathForComparison(props.currentPath)

    // Find current post by comparing normalized paths
    const currentPost = allPosts.find((post) => {
      const normalizedPostPath = normalizePathForComparison(post.path || '')
      return normalizedPostPath === normalizedCurrentPath
    })

    if (!currentPost) {
      console.warn(
        'Current post not found for path:',
        props.currentPath,
        'Available paths:',
        allPosts.map((p) => p.path),
      )
      // Fallback: show recent posts (respect lifelines filter based on current path)
      const currentIsLifeline = props.currentPath.includes('/personalSpace/')
      return allPosts
        .filter((post) => {
          const meta = extractBlogPostFromMeta(post.meta)
          if (!meta.published) return false

          const isLifeline = meta.tags?.includes('lifelines') || meta.category === 'lifelines'
          // Only show lifelines if current path is also a lifeline
          if (isLifeline && !currentIsLifeline) return false
          if (!isLifeline && currentIsLifeline) return false

          return true
        })
        .map((post) => {
          const meta = extractBlogPostFromMeta(post.meta)
          const isLifeline = meta.tags?.includes('lifelines') || meta.category === 'lifelines'
          return {
            path: normalizePathForDisplay(post.path || '/', isLifeline),
            title: post.title || 'no-title available',
            description: post.description || 'no-description available',
            image: meta.image || '/not-found.jpg',
            alt: meta.alt || 'no-alt',
            date: meta.date || 'no-date-available',
            tags: meta.tags || [],
            score: 1, // Base score for fallback
          }
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, props.limit)
    }

    const currentMeta = extractBlogPostFromMeta(currentPost.meta)
    const currentTags = currentMeta.tags || []
    const currentCategory = currentMeta.category
    const currentIsLifeline = currentTags.includes('lifelines') || currentCategory === 'lifelines'

    // Filter and score related posts
    const scoredPosts = allPosts
      .filter((post) => {
        // Exclude current post by comparing normalized paths
        const normalizedPostPath = normalizePathForComparison(post.path || '')
        if (normalizedPostPath === normalizedCurrentPath) return false

        const meta = extractBlogPostFromMeta(post.meta)
        // Only include published posts
        if (!meta.published) return false

        // Exclude lifelines from regular blog posts
        const isLifeline = meta.tags?.includes('lifelines') || meta.category === 'lifelines'

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

        // Base score for all posts (so we show something even without shared tags)
        if (score === 0) {
          score = 1
        }

        const isLifeline = meta.tags?.includes('lifelines') || meta.category === 'lifelines'
        const normalizedPath = normalizePathForDisplay(post.path || '/', isLifeline)

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
      .sort((a, b) => {
        // Sort by score first, then by date (most recent first)
        if (b.score !== a.score) {
          return b.score - a.score
        }
        // If scores are equal, sort by date
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      })
      .slice(0, props.limit) // Limit results

    return scoredPosts
  },
)

// External content (can be extended to fetch from APIs)
interface ExternalContentItem {
  title: string
  description: string
  url: string
  image?: string
  source: string
  date?: string
}

const externalContent = ref<ExternalContentItem[]>([])
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
  <div class="mt-6">
    <div class="border dark:border-gray-800 p-3 rounded-md min-w-[200px] dark:bg-slate-900">
      <h2 class="text-sm font-bold mb-3 border-b dark:border-gray-800 pb-2">Related Content</h2>

      <!-- No related posts message -->
      <div
        v-if="
          relatedPosts &&
          relatedPosts.length === 0 &&
          (!externalContent || externalContent.length === 0)
        "
        class="text-xs text-zinc-500 dark:text-zinc-400 text-center py-4"
      >
        No related posts found
      </div>

      <!-- Internal Related Posts -->
      <div v-if="relatedPosts && relatedPosts.length > 0" class="space-y-3">
        <NuxtLink v-for="post in relatedPosts" :key="post.path" :to="post.path" class="block group">
          <div
            class="flex gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded transition-colors"
          >
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
      <div
        v-if="showExternal && externalContent && externalContent.length > 0"
        class="space-y-3 mt-4"
      >
        <div
          v-if="relatedPosts && relatedPosts.length > 0"
          class="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2 pt-2 border-t dark:border-gray-800"
        >
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
          <div
            class="flex gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded transition-colors"
          >
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
      <div
        v-if="isLoadingExternal"
        class="text-xs text-zinc-500 dark:text-zinc-400 text-center py-4"
      >
        Loading external content...
      </div>
    </div>
  </div>
</template>
