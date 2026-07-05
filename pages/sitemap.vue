<script setup lang="ts">
import { extractBlogPostFromMeta } from '~/utils/blog/blogMeta'
import { useAuth } from '~/composables/useAuth'
import { onMounted, nextTick, computed } from 'vue'
import OAuthButtons from '~/components/auth/OAuthButtons.vue'

// Authentication
const { isAuthenticated, loadStoredUser } = useAuth()

// Load all blog posts
const { data: allBlogs } = await useAsyncData('sitemap-blogs', () =>
  queryCollection('content').all(),
)

// Static pages structure
const staticPages = [
  { path: '/', title: 'Home', icon: 'mdi:home' },
  { path: '/blogs', title: 'Blogs', icon: 'mdi:book-open-variant' },
  { path: '/about', title: 'About', icon: 'mdi:account' },
  { path: '/gallery', title: 'Gallery', icon: 'mdi:image-multiple', requiresAuth: true },
  { path: '/library', title: 'Library', icon: 'mdi:library', requiresAuth: true },
  { path: '/resources', title: 'Resources', icon: 'mdi:folder-multiple' },
  { path: '/personalSpace', title: 'LifeLines', icon: 'mdi:heart', requiresAuth: true },
  { path: '/categories', title: 'Categories', icon: 'mdi:tag-multiple' },
  { path: '/maps', title: "Places I've Visited", icon: 'mdi:map', requiresAuth: true },
  { path: '/sitemap', title: 'Sitemap', icon: 'mdi:sitemap' },
]

// Format blog data
const formattedBlogs = computed(() => {
  if (!allBlogs.value) return []

  return allBlogs.value
    .map((articles) => {
      const meta = extractBlogPostFromMeta(articles.meta)
      const isLifeline =
        (meta.tags || []).some((tag: string) => tag.toLowerCase() === 'lifelines') ||
        meta.category === 'lifelines'

      return {
        path: articles.path,
        title: articles.title || 'no-title available',
        tags: meta.tags || [],
        category: meta.category || '',
        published: meta.published || false,
        isLifeline,
        requiresAuth: isLifeline,
      }
    })
    .filter((post) => post.published)
})

// Group blogs by category/tag
const blogsByCategory = computed(() => {
  const grouped: Record<string, typeof formattedBlogs.value> = {}
  const regularBlogs: typeof formattedBlogs.value = []
  const lifelineBlogs: typeof formattedBlogs.value = []

  formattedBlogs.value.forEach((blog) => {
    if (blog.isLifeline) {
      lifelineBlogs.push(blog)
    } else {
      regularBlogs.push(blog)
      const category = blog.category || 'Uncategorized'
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push(blog)
    }
  })

  return { grouped, regularBlogs, lifelineBlogs }
})

// Normalize path for lifelines blogs
const getPersonalSpacePath = (originalPath: string) => {
  let path = originalPath || '/'

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
}

// Handle blog click with auth check
const handleBlogClick = (blog: (typeof formattedBlogs.value)[0], event: Event) => {
  if (blog.requiresAuth && !isAuthenticated.value) {
    event.preventDefault()
    // Scroll to auth section
    nextTick(() => {
      const authSection = document.getElementById('sitemap-auth-section')
      if (authSection) {
        authSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    })
  }
}

// Handle OAuth success
const handleOAuthSuccess = async (authUser: unknown) => {
  if (typeof window !== 'undefined' && authUser && typeof authUser === 'object') {
    const userData = authUser as { email?: string; name?: string }
    if (userData.email && userData.name) {
      const { trackLogin } = await import('~/utils/analytics/trackLogin')
      await trackLogin(userData.email, userData.name, window.location.pathname)
    }
  }
}

// Handle OAuth error
const handleOAuthError = (error: string) => {
  console.error('[Sitemap] OAuth error:', error)
  // Error is handled by the OAuth component
}

// Initialize auth on mount
onMounted(() => {
  loadStoredUser()
})

useHead({
  title: 'Sitemap',
  meta: [
    {
      name: 'description',
      content: 'Complete sitemap of all pages and blog posts on Nomadic Notions',
    },
  ],
})
</script>

<template>
  <div class="container max-w-5xl mx-auto px-3 sm:px-4 py-8 overflow-x-hidden">
    <h1 class="text-4xl font-bold mb-6 text-black dark:text-zinc-300">Sitemap</h1>
    <p class="text-gray-600 dark:text-gray-400 mb-8">
      Navigate through all pages and blog posts on this site. Some content requires authentication.
    </p>

    <!-- Authentication Section (shown when trying to access protected content) -->
    <div
      v-if="!isAuthenticated"
      id="sitemap-auth-section"
      class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 mb-8"
    >
      <h2 class="text-xl font-semibold mb-2 text-yellow-800 dark:text-yellow-200">
        🔒 Authentication Required
      </h2>
      <p class="text-yellow-700 dark:text-yellow-300 mb-4">
        Some blog posts with the "Lifelines" tag require authentication to access.
      </p>
      <OAuthButtons
        size="large"
        theme="outline"
        :full-width="false"
        @success="handleOAuthSuccess"
        @error="handleOAuthError"
      />
    </div>

    <!-- Static Pages -->
    <section class="mb-12">
      <h2 class="text-2xl font-semibold mb-4 text-black dark:text-zinc-300 flex items-center gap-2">
        <Icon name="mdi:sitemap" size="28" />
        Pages
      </h2>
      <ul class="space-y-2">
        <li v-for="page in staticPages" :key="page.path">
          <NuxtLink
            :to="page.path"
            class="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
          >
            <Icon :name="page.icon" size="20" />
            <span>{{ page.title }}</span>
            <span
              v-if="page.requiresAuth"
              class="ml-2 px-2 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded"
            >
              🔒 Auth Required
            </span>
          </NuxtLink>
        </li>
      </ul>
    </section>

    <!-- Regular Blogs -->
    <section class="mb-12">
      <h2 class="text-2xl font-semibold mb-4 text-black dark:text-zinc-300 flex items-center gap-2">
        <Icon name="mdi:book-open-variant" size="28" />
        Blog Posts
      </h2>
      <div
        v-if="blogsByCategory.regularBlogs.length === 0"
        class="text-gray-500 dark:text-gray-400"
      >
        No blog posts available.
      </div>
      <div v-else class="space-y-4">
        <!-- Grouped by category -->
        <div
          v-for="[category, blogs] in Object.entries(blogsByCategory.grouped)"
          :key="category"
          class="border-l-4 border-blue-500 dark:border-blue-400 pl-4"
        >
          <h3 class="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">
            {{ category }}
          </h3>
          <ul class="space-y-1 ml-4">
            <li v-for="blog in blogs" :key="blog.path">
              <NuxtLink
                :to="blog.path"
                class="text-blue-600 dark:text-blue-400 hover:underline"
                @click="handleBlogClick(blog, $event)"
              >
                {{ blog.title }}
              </NuxtLink>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Lifelines Blogs (Protected) -->
    <section class="mb-12">
      <h2 class="text-2xl font-semibold mb-4 text-black dark:text-zinc-300 flex items-center gap-2">
        <Icon name="mdi:heart" size="28" />
        LifeLines
        <span
          class="ml-2 px-2 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded"
        >
          🔒 Protected
        </span>
      </h2>
      <div v-if="!isAuthenticated" class="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center">
        <p class="text-gray-600 dark:text-gray-400 mb-4">
          Please sign in with Google to view LifeLines posts.
        </p>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Use the authentication section above to sign in.
        </p>
      </div>
      <div v-else>
        <div
          v-if="blogsByCategory.lifelineBlogs.length === 0"
          class="text-gray-500 dark:text-gray-400"
        >
          No LifeLines posts available.
        </div>
        <ul v-else class="space-y-2">
          <li v-for="blog in blogsByCategory.lifelineBlogs" :key="blog.path">
            <NuxtLink
              :to="getPersonalSpacePath(blog.path)"
              class="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {{ blog.title }}
            </NuxtLink>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
