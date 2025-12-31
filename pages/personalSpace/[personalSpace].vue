<script setup lang="ts">
import type { BlogPost } from '@/types/blog'
import { navbarData, seoData } from '~/data'
import { computed, onMounted, onUnmounted, nextTick, ref, watch } from 'vue'
import LikeButton from '@/components/blog/LikeButton.vue'
import Comments from '@/components/blog/Comments.vue'
import ReadingProgress from '@/components/blog/ReadingProgress.vue'
import { calculateReadingTime } from '~/utils/blog/readingTime'
import { useGoogleAuth } from '~/composables/useGoogleAuth'

const { path } = useRoute()

// Authentication
const { user, isAuthenticated, loadStoredUser, initializeGoogleSignIn } = useGoogleAuth()

// Convert route path to content path
// Route path: /personalSpace/8. Fav_map
// Content path: /blogs/8. Fav_map
const getContentPath = (routePath: string): string => {
  let contentPath = routePath

  // Remove /personalSpace/ prefix if present
  if (contentPath.startsWith('/personalSpace/')) {
    contentPath = contentPath.replace(/^\/personalSpace\//, '')
  } else if (contentPath.startsWith('/personalSpace')) {
    contentPath = contentPath.replace(/^\/personalSpace/, '')
  }

  // Ensure it starts with /
  if (!contentPath.startsWith('/')) {
    contentPath = `/${contentPath}`
  }

  // Add /blogs/ prefix if not already present
  if (!contentPath.startsWith('/blogs/')) {
    // Remove leading /, add /blogs/, then add the rest
    const slug = contentPath.replace(/^\/+/, '')
    contentPath = `/blogs/${slug}`
  }

  // Final cleanup - ensure no double slashes
  return contentPath.replace(/\/+/g, '/')
}

const { data: articles, error } = await useAsyncData(`blog-post-${path}`, async () => {
  // Convert path to content path for querying
  const contentPath = getContentPath(path)

  // Try the converted content path first (most likely to work)
  let result = await queryCollection('content').path(contentPath).first()

  // If not found, try the route path as-is (fallback)
  if (!result) {
    result = await queryCollection('content').path(path).first()
  }

  // If still not found, try without /personalSpace/ prefix but with /blogs/
  if (!result && path.startsWith('/personalSpace/')) {
    const slug = path.replace(/^\/personalSpace\//, '')
    const blogsPath = `/blogs/${slug}`
    result = await queryCollection('content').path(blogsPath).first()
  }

  if (!result) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Article not found',
      fatal: true,
    })
  }

  return result
})

if (error.value) navigateTo('/404')

const readingTime = ref<number | undefined>(undefined)

const data = computed<BlogPost>(() => {
  const meta = articles?.value?.meta as unknown as BlogPost
  return {
    title: articles.value?.title || 'no-title available',
    description: articles.value?.description || 'no-description available',
    image: meta?.image || '/not-found.jpg',
    alt: meta?.alt || 'no alter data available',
    ogImage: (articles?.value?.ogImage as unknown as string) || '/not-found.jpg',
    date: meta?.date || 'not-date-available',
    tags: meta?.tags || [],
    published: meta?.published || false,
  }
})

// Flag to prevent duplicate button renders
const isRenderingButton = ref(false)
const googleCheckTimeout = ref<NodeJS.Timeout | null>(null)
const readingTimeTimeout = ref<NodeJS.Timeout | null>(null)

// Check for Google script and render button with timeout protection
const checkGoogleAndRender = () => {
  // Only run in browser environment
  if (typeof window === 'undefined') return

  // Prevent duplicate renders
  if (isRenderingButton.value) return

  // Check if Google script is available
  if (window.google && window.google.accounts) {
    // Don't set the flag here - let renderGoogleSignInButton() set it after checking
    // This prevents the render function from returning early due to the flag
    const rendered = renderGoogleSignInButton()
    return rendered
  }
  return false
}

// Initialize auth on mount
onMounted(() => {
  initializeGoogleSignIn()
  loadStoredUser()

  // Render sign-in button if not authenticated (after Google script loads)
  // Only run in browser environment
  if (typeof window !== 'undefined' && !isAuthenticated.value) {
    // Wait for Google script to load, then render button
    // Maximum 50 retries (5 seconds total) to prevent infinite loops
    let retryCount = 0
    const maxRetries = 50
    const retryInterval = 100

    const attemptRender = () => {
      if (checkGoogleAndRender()) {
        // Successfully rendered, stop retrying
        return
      }

      retryCount++
      if (retryCount < maxRetries) {
        googleCheckTimeout.value = setTimeout(attemptRender, retryInterval)
      } else {
        // Max retries reached, log warning
        console.warn(
          '[LifeLines Detail] Google Identity Services script failed to load after maximum retries',
        )
        isRenderingButton.value = false
      }
    }

    // Start checking after a brief delay to allow Google script to load
    googleCheckTimeout.value = setTimeout(attemptRender, 200)
  }

  // Calculate reading time from article content
  // Use nextTick and a small delay to ensure content is fully rendered
  nextTick(() => {
    // Try multiple times in case content loads asynchronously
    const calculateTime = () => {
      const proseElement = document.querySelector('.prose')
      if (proseElement) {
        const textContent = proseElement.textContent || ''
        if (textContent.trim().length > 0) {
          readingTime.value = calculateReadingTime(textContent)
          return true
        }
      }
      return false
    }

    // Try immediately
    if (!calculateTime()) {
      // If not found, try again after a short delay
      // Store timeout so it can be cleared on unmount
      readingTimeTimeout.value = setTimeout(() => {
        calculateTime()
        readingTimeTimeout.value = null
      }, 500)
    }
  })
})

// Cleanup timeouts on unmount
onUnmounted(() => {
  if (googleCheckTimeout.value) {
    clearTimeout(googleCheckTimeout.value)
    googleCheckTimeout.value = null
  }
  if (readingTimeTimeout.value) {
    clearTimeout(readingTimeTimeout.value)
    readingTimeTimeout.value = null
  }
  isRenderingButton.value = false
})

// Render Google Sign-In button
// Returns: true if rendering was initiated, false otherwise
const renderGoogleSignInButton = (): boolean => {
  // Ensure we're in the browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false
  }

  // Prevent concurrent renders - only check the flag, not child nodes
  // Child nodes check prevents re-rendering after logout or failed auth
  if (isRenderingButton.value) {
    return false
  }

  const buttonElement = document.getElementById('lifelines-detail-google-signin-button')
  if (!buttonElement) {
    return false
  }

  // Set flag after initial check passes to prevent concurrent renders
  isRenderingButton.value = true

  nextTick(() => {
    const buttonElement = document.getElementById('lifelines-detail-google-signin-button')
    if (!buttonElement || !window.google || !window.google.accounts) {
      isRenderingButton.value = false
      return
    }

    const clientId = useRuntimeConfig().public.googleClientId
    if (!clientId) {
      console.error('[LifeLines Detail] Google Client ID not configured')
      isRenderingButton.value = false
      return
    }

    // Clear any existing button content to allow re-rendering
    // This is necessary when user logs out or authentication fails
    buttonElement.innerHTML = ''

    // Authentication callback - flag management is handled here
    const originalCallback = async (response: { credential: string }) => {
      // Set flag to true when user starts authentication to prevent concurrent renders
      isRenderingButton.value = true
      try {
        const result = await $fetch<{
          user: { email: string; name: string; picture: string; sub: string }
        }>('/api/auth/google', {
          method: 'POST',
          body: { token: response.credential },
        })
        if (result && result.user) {
          user.value = result.user
          localStorage.setItem('google_user', JSON.stringify(result.user))

          if (typeof window !== 'undefined') {
            const { trackLogin } = await import('~/utils/analytics/trackLogin')
            await trackLogin(result.user.email, result.user.name, window.location.pathname)
            window.dispatchEvent(new CustomEvent('auth:signin', { detail: result.user }))
          }
        }
      } catch (error) {
        console.error('[LifeLines Detail] Authentication failed:', error)
      } finally {
        // Reset flag after authentication completes (regardless of success/failure)
        // This allows re-rendering if needed (e.g., after logout or failed auth)
        isRenderingButton.value = false
      }
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: originalCallback,
    })

    window.google.accounts.id.renderButton(buttonElement, {
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      width: 250,
    })

    // Reset flag after button is rendered (button rendering is synchronous)
    // The flag will be set to true again when user clicks the button to start authentication
    // and reset in the auth callback's finally block when auth completes
    // This allows re-rendering if user logs out before clicking the button
    isRenderingButton.value = false
  })

  return true
}

// Watch for authentication changes - render button when not authenticated
watch(
  isAuthenticated,
  (newValue) => {
    // Only run in browser environment
    if (typeof window === 'undefined') return

    if (!newValue && !isRenderingButton.value) {
      // Clear any existing timeout
      if (googleCheckTimeout.value) {
        clearTimeout(googleCheckTimeout.value)
        googleCheckTimeout.value = null
      }

      // Try to render immediately if Google is already loaded
      if (window.google && window.google.accounts) {
        checkGoogleAndRender()
      } else {
        // Otherwise, start the retry mechanism
        let retryCount = 0
        const maxRetries = 50
        const retryInterval = 100

        const attemptRender = () => {
          if (checkGoogleAndRender()) {
            return
          }

          retryCount++
          if (retryCount < maxRetries) {
            googleCheckTimeout.value = setTimeout(attemptRender, retryInterval)
          } else {
            console.warn(
              '[LifeLines Detail] Google Identity Services script failed to load after maximum retries',
            )
            isRenderingButton.value = false
          }
        }

        googleCheckTimeout.value = setTimeout(attemptRender, 200)
      }
    }
  },
  { immediate: false },
) // Don't run immediately - let onMounted handle initial render

useHead({
  title: data.value.title || '',
  meta: [
    { name: 'description', content: data.value.description },
    {
      name: 'description',
      content: data.value.description,
    },
    // Test on: https://developers.facebook.com/tools/debug/ or https://socialsharepreview.com/
    { property: 'og:site_name', content: navbarData.homeTitle },
    { property: 'og:type', content: 'website' },
    {
      property: 'og:url',
      content: `${seoData.mySite}/${path}`,
    },
    {
      property: 'og:title',
      content: data.value.title,
    },
    {
      property: 'og:description',
      content: data.value.description,
    },
    {
      property: 'og:image',
      content: data.value.ogImage || data.value.image,
    },
    // Test on: https://cards-dev.twitter.com/validator or https://socialsharepreview.com/
    { name: 'twitter:site', content: '@qdnvubp' },
    { name: 'twitter:card', content: 'summary_large_image' },
    {
      name: 'twitter:url',
      content: `${seoData.mySite}/${path}`,
    },
    {
      name: 'twitter:title',
      content: data.value.title,
    },
    {
      name: 'twitter:description',
      content: data.value.description,
    },
    {
      name: 'twitter:image',
      content: data.value.ogImage || data.value.image,
    },
  ],
  link: [
    {
      rel: 'canonical',
      href: `${seoData.mySite}/${path}`,
    },
  ],
})

// Generate OG Image
defineOgImageComponent('Test', {
  headline: 'Shankhos Blog 👋',
  title: articles.value?.seo.title || '',
  description: articles.value?.seo.description || '',
  link: data.value.ogImage,
})
</script>

<template>
  <div>
    <ReadingProgress />

    <!-- Authentication Required Message -->
    <div v-if="!isAuthenticated" class="max-w-2xl mx-auto mt-12 px-6">
      <div
        class="bg-white dark:bg-slate-800 rounded-xl p-8 text-center border border-gray-200 dark:border-slate-700 shadow-lg"
      >
        <Icon name="mdi:lock" class="text-6xl text-sky-700 dark:text-sky-400 mb-4 mx-auto" />
        <h2 class="text-2xl font-bold mb-4 text-zinc-800 dark:text-zinc-200">
          Authentication Required
        </h2>
        <p class="text-zinc-600 dark:text-zinc-400 mb-6">
          Please sign in with Google to access this LifeLine.
        </p>
        <div id="lifelines-detail-google-signin-button" class="flex justify-center"></div>
      </div>
    </div>

    <!-- LifeLine Content (Authenticated Users Only) -->
    <div v-else class="px-6 container max-w-5xl mx-auto sm:grid grid-cols-12 gap-x-12">
      <div class="col-span-12 lg:col-span-9">
        <BlogHeader
          :title="data.title"
          :image="data.image"
          :alt="data.alt"
          :date="data.date"
          :description="data.description"
          :tags="data.tags"
          :reading-time="readingTime"
        />

        <!-- Like Button (Top) -->
        <div class="mt-4 flex items-center gap-2">
          <LikeButton :post-id="path" />
        </div>

        <div
          class="prose prose-pre:max-w-xs sm:prose-pre:max-w-full prose-sm sm:prose-base md:prose-lg prose-h1:no-underline max-w-5xl mx-auto prose-zinc dark:prose-invert prose-img:rounded-lg"
        >
          <ContentRenderer v-if="articles" :value="articles">
            <template #empty>
              <p>No content found.</p>
            </template>
          </ContentRenderer>
        </div>

        <!-- Like Button (Bottom) -->
        <div class="mt-4 flex items-center gap-2">
          <LikeButton :post-id="path" />
        </div>
      </div>
      <BlogToc />

      <!-- Share Icons -->
      <div class="col-span-12 lg:col-span-9 mt-10 mb-8">
        <div class="flex flex-row flex-wrap md:flex-nowrap gap-2">
          <SocialShare
            v-for="network in ['facebook', 'twitter', 'linkedin', 'email']"
            :key="network"
            :network="network"
            :styled="true"
            :label="true"
            class="p-1"
            aria-label="Share with {network}"
          />
        </div>
      </div>

      <!-- Comments Section -->
      <div class="col-span-12 lg:col-span-9 mt-8">
        <Comments :post-id="path" />
      </div>
    </div>
  </div>
</template>
