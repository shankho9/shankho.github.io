<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { useGoogleAuth } from '~/composables/useGoogleAuth'

interface Comment {
  id: number
  post_id: string
  user_email: string
  user_name: string
  user_picture: string
  content: string
  created_at: string | Date
}

const props = defineProps<{
  itemId: string | number
}>()

const { user, isAuthenticated, signIn, loadStoredUser, initializeGoogleSignIn } = useGoogleAuth()

const comments = ref<Comment[]>([])
const isLoading = ref(false)
const isSubmitting = ref(false)
const commentText = ref('')
const error = ref<string | null>(null)
const imageErrors = ref<Set<number>>(new Set())
const userImageError = ref(false)

// Pagination state
const currentPage = ref(1)
const commentsPerPage = ref(10)
const totalComments = ref(0)
const totalPages = ref(0)

const formatDate = (date: string | Date) => {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const loadComments = async (page: number = currentPage.value, retryCount = 0) => {
  isLoading.value = true
  error.value = null
  try {
    const response = await $fetch<{
      comments: Comment[]
      pagination: { page: number; limit: number; total: number; totalPages: number }
    }>(
      `/api/gallery/comments?itemId=${encodeURIComponent(props.itemId)}&page=${page}&limit=${commentsPerPage.value}`,
    )
    comments.value = response.comments
    currentPage.value = response.pagination.page
    totalComments.value = response.pagination.total
    totalPages.value = response.pagination.totalPages
  } catch (err: unknown) {
    console.error('[GalleryComments] Failed to load comments:', err)

    // Retry logic for network errors and server errors (max 2 retries)
    if (retryCount < 2 && err && typeof err === 'object') {
      const status = 'status' in err ? (err as { status?: number }).status : undefined
      if (!status || (status >= 500 && status < 600)) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (retryCount + 1)))
        // Recursive call - isLoading remains true, don't set to false here
        return loadComments(page, retryCount + 1)
      }
    }

    // User-friendly error messages (only set if not retrying)
    if (err && typeof err === 'object' && 'status' in err) {
      const status = (err as { status?: number }).status
      if (status === 404) {
        error.value = 'Comments not found for this image.'
      } else if (status && status >= 500) {
        error.value = 'Server error. Please try again later.'
      } else {
        error.value = 'Failed to load comments. Please refresh the page.'
      }
    } else {
      error.value = 'Network error. Please check your connection and try again.'
    }
  } finally {
    // Always reset loading state when not retrying
    // This ensures the UI doesn't remain in a loading state indefinitely
    // For retries, the recursive call will handle resetting the loading state
    // Only reset if we're not in a retry scenario (retryCount >= 2 means no more retries)
    if (retryCount >= 2) {
      isLoading.value = false
    }
  }
}

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    loadComments(page)
    const commentsSection = document.querySelector('.gallery-comments-section')
    if (commentsSection) {
      commentsSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }
}

const submitComment = async () => {
  if (!isAuthenticated.value || !user.value) {
    signIn()
    return
  }

  if (!commentText.value.trim()) {
    return
  }

  isSubmitting.value = true
  error.value = null
  try {
    const response = await $fetch<{ success: boolean; comment: Comment }>('/api/gallery/comments', {
      method: 'POST',
      body: {
        itemId: props.itemId,
        content: commentText.value,
        userEmail: user.value.email,
        userName: user.value.name,
        userPicture: user.value.picture || '',
      },
    })

    if (response.success) {
      commentText.value = ''
      const newTotal = totalComments.value + 1
      totalComments.value = newTotal
      totalPages.value = Math.ceil(newTotal / commentsPerPage.value)
      await loadComments(1)
    }
  } catch (err) {
    console.error('[GalleryComments] Failed to submit comment:', err)
    error.value = 'Failed to submit comment. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}

const handleImageError = (commentId: number) => {
  imageErrors.value.add(commentId)
}

const handleUserImageError = () => {
  userImageError.value = true
}

// Render Google Sign-In button
const renderGoogleSignInButton = () => {
  nextTick(() => {
    const buttonElement = document.getElementById('gallery-comments-signin-button')
    if (!buttonElement || !window.google) return

    const clientId = useRuntimeConfig().public.googleClientId
    if (!clientId) {
      console.error('[GalleryComments] Google Client ID not configured')
      return
    }

    buttonElement.innerHTML = ''

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: { credential: string }) => {
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

            // Track login event for analytics
            if (typeof window !== 'undefined') {
              const { trackLogin } = await import('~/utils/analytics/trackLogin')
              await trackLogin(result.user.email, result.user.name, window.location.pathname)
              window.dispatchEvent(new CustomEvent('auth:signin', { detail: result.user }))
            }
          }
        } catch (error) {
          console.error('[GalleryComments] Authentication failed:', error)
        }
      },
    })

    window.google.accounts.id.renderButton(buttonElement, {
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      width: 250,
    })
  })
}

watch(isAuthenticated, (newValue) => {
  if (!newValue) {
    nextTick(() => {
      renderGoogleSignInButton()
    })
  }
})

onMounted(() => {
  initializeGoogleSignIn()
  loadStoredUser()
  loadComments()
})
</script>

<template>
  <div class="gallery-comments-section mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
    <h3 class="text-xl font-bold mb-4 text-white">Comments</h3>

    <!-- Comment Form -->
    <div v-if="isAuthenticated && user" class="mb-6">
      <div class="flex gap-3 mb-4">
        <img
          v-if="user.picture && !userImageError"
          :src="user.picture"
          :alt="user.name"
          class="w-10 h-10 rounded-full border-2 border-sky-400"
          @error="handleUserImageError"
        />
        <div v-else class="w-10 h-10 rounded-full bg-sky-600 flex items-center justify-center">
          <span class="text-white font-semibold text-sm">
            {{ user.name?.charAt(0).toUpperCase() || 'U' }}
          </span>
        </div>
        <div class="flex-1">
          <textarea
            v-model="commentText"
            placeholder="Add a comment..."
            class="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
            rows="3"
            :disabled="isSubmitting"
          />
          <div class="flex justify-between items-center mt-2">
            <p class="text-xs text-gray-400">{{ commentText.length }}/5000</p>
            <button
              :disabled="!commentText.trim() || isSubmitting"
              class="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-semibold"
              @click="submitComment"
            >
              {{ isSubmitting ? 'Posting...' : 'Post Comment' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Sign In Prompt -->
    <div v-else class="mb-6 p-4 bg-white/10 rounded-lg border border-white/20">
      <p class="text-white mb-3">Sign in to add a comment</p>
      <div id="gallery-comments-signin-button" class="flex justify-center"></div>
    </div>

    <!-- Comments List -->
    <div v-if="isLoading" class="text-center py-8 text-gray-400">Loading comments...</div>
    <div
      v-else-if="error"
      class="text-center py-8 text-red-400 bg-red-900/20 rounded-lg border border-red-500/30"
    >
      {{ error }}
    </div>
    <div
      v-else-if="comments.length === 0 && totalComments === 0"
      class="text-center py-8 text-gray-400"
    >
      No comments yet. Be the first to comment!
    </div>
    <div v-else-if="comments.length > 0" class="space-y-4">
      <div
        v-for="comment in comments"
        :key="comment.id"
        class="flex gap-3 p-4 bg-white/5 rounded-lg border border-white/10"
      >
        <img
          v-if="comment.user_picture && !imageErrors.has(comment.id)"
          :src="comment.user_picture"
          :alt="comment.user_name"
          class="w-10 h-10 rounded-full border-2 border-sky-400 flex-shrink-0"
          @error="handleImageError(comment.id)"
        />
        <div
          v-else
          class="w-10 h-10 rounded-full bg-sky-600 flex items-center justify-center flex-shrink-0"
        >
          <span class="text-white font-semibold text-sm">
            {{ comment.user_name?.charAt(0).toUpperCase() || 'U' }}
          </span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="font-semibold text-white">{{ comment.user_name }}</span>
            <span class="text-xs text-gray-400">{{ formatDate(comment.created_at) }}</span>
          </div>
          <p class="text-gray-200 whitespace-pre-wrap break-words">{{ comment.content }}</p>
        </div>
      </div>

      <!-- Pagination -->
      <div
        v-if="totalPages > 1"
        class="flex items-center justify-between pt-4 border-t border-white/10"
      >
        <button
          :disabled="currentPage === 1"
          class="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
          @click="goToPage(currentPage - 1)"
        >
          Previous
        </button>
        <span class="text-sm text-gray-400"> Page {{ currentPage }} of {{ totalPages }} </span>
        <button
          :disabled="currentPage === totalPages"
          class="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
          @click="goToPage(currentPage + 1)"
        >
          Next
        </button>
      </div>
      <div v-if="totalComments > 0" class="text-center pt-2">
        <p class="text-sm text-gray-400">
          Showing {{ comments.length }} of {{ totalComments }} comments
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gallery-comments-section {
  max-height: 60vh;
  overflow-y: auto;
}

.gallery-comments-section::-webkit-scrollbar {
  width: 8px;
}

.gallery-comments-section::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.gallery-comments-section::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
}

.gallery-comments-section::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}
</style>
