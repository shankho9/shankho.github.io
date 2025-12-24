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
  postId: string
}>()

const { user, isAuthenticated, signIn, signOut, loadStoredUser, initializeGoogleSignIn } =
  useGoogleAuth()

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
      `/api/comments?postId=${encodeURIComponent(props.postId)}&page=${page}&limit=${commentsPerPage.value}`,
    )
    comments.value = response.comments
    currentPage.value = response.pagination.page
    totalComments.value = response.pagination.total
    totalPages.value = response.pagination.totalPages
    isLoading.value = false
  } catch (err: unknown) {
    console.error('[Comments] Failed to load comments:', err)

    // Retry logic for network errors and server errors (max 2 retries)
    if (retryCount < 2 && err && typeof err === 'object') {
      const status = 'status' in err ? (err as { status?: number }).status : undefined
      // Retry on network errors (no status) or 5xx server errors
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
        error.value = 'Comments not found for this post.'
      } else if (status && status >= 500) {
        error.value = 'Server error. Please try again later.'
      } else {
        error.value = 'Failed to load comments. Please refresh the page.'
      }
    } else {
      error.value = 'Network error. Please check your connection and try again.'
    }
    isLoading.value = false
  }
}

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    loadComments(page)
    // Scroll to comments section
    const commentsSection = document.querySelector('.comments-section')
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
    const response = await $fetch<{ success: boolean; comment: Comment }>('/api/comments', {
      method: 'POST',
      body: {
        postId: props.postId,
        content: commentText.value,
        userEmail: user.value.email,
        userName: user.value.name,
        userPicture: user.value.picture,
      },
    })

    // New comments appear at the top (page 1), so reload page 1 to show the new comment
    const newTotal = totalComments.value + 1
    totalComments.value = newTotal
    totalPages.value = Math.ceil(newTotal / commentsPerPage.value)

    // Reload page 1 to show the new comment at the top
    await loadComments(1)
    commentText.value = ''
    // Reset image errors for the new comment
    if (response.comment.id) {
      imageErrors.value.delete(response.comment.id)
    }
  } catch (err: unknown) {
    console.error('[Comments] Failed to submit comment:', err)

    // User-friendly error messages
    if (err && typeof err === 'object') {
      if ('status' in err) {
        const status = (err as { status?: number }).status
        if (status === 401 || status === 403) {
          error.value = 'Please sign in to post a comment.'
        } else if (status && status >= 500) {
          error.value = 'Server error. Please try again later.'
        } else if (
          'data' in err &&
          err.data &&
          typeof err.data === 'object' &&
          'message' in err.data
        ) {
          error.value =
            typeof err.data.message === 'string'
              ? err.data.message
              : 'Failed to submit comment. Please try again.'
        } else {
          error.value = 'Failed to submit comment. Please try again.'
        }
      } else if (
        'data' in err &&
        err.data &&
        typeof err.data === 'object' &&
        'message' in err.data
      ) {
        error.value =
          typeof err.data.message === 'string'
            ? err.data.message
            : 'Failed to submit comment. Please try again.'
      } else {
        error.value = 'Network error. Please check your connection and try again.'
      }
    } else {
      error.value = 'Failed to submit comment. Please try again.'
    }
  } finally {
    isSubmitting.value = false
  }
}

const renderGoogleSignInButton = () => {
  if (typeof window === 'undefined' || !window.google || isAuthenticated.value) {
    return
  }

  const clientId = useRuntimeConfig().public.googleClientId
  if (!clientId) {
    console.error('[Comments] Google Client ID not configured')
    return
  }

  // Clear any existing button first
  const buttonElement = document.getElementById(`google-signin-${props.postId}`)
  if (buttonElement) {
    buttonElement.innerHTML = ''
  }

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
        user.value = result.user
        userImageError.value = false // Reset image error when user changes
        localStorage.setItem('google_user', JSON.stringify(result.user))
        await loadComments()
      } catch (err) {
        console.error('Authentication failed:', err)
      }
    },
  })

  if (buttonElement && window.google) {
    window.google.accounts.id.renderButton(buttonElement, {
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      width: 250,
    })
  }
}

onMounted(async () => {
  initializeGoogleSignIn()
  loadStoredUser()
  // Reset image error when component mounts
  if (user.value) {
    userImageError.value = false
  }
  await loadComments()

  // Initialize Google Sign In button after component mounts
  if (typeof window !== 'undefined') {
    if (window.google) {
      setTimeout(renderGoogleSignInButton, 500)
    } else {
      // Wait for Google script to load
      const checkGoogle = setInterval(() => {
        if (window.google) {
          clearInterval(checkGoogle)
          setTimeout(renderGoogleSignInButton, 100)
        }
      }, 100)

      // Clear interval after 10 seconds
      setTimeout(() => clearInterval(checkGoogle), 10000)
    }
  }
})

// Watch for authentication state changes to re-render button
watch(isAuthenticated, async (newValue) => {
  if (!newValue && typeof window !== 'undefined') {
    // User signed out, wait for DOM to update then re-render the sign-in button
    await nextTick()
    if (window.google) {
      setTimeout(renderGoogleSignInButton, 100)
    } else {
      // Wait for Google script if not loaded yet
      const checkGoogle = setInterval(() => {
        if (window.google) {
          clearInterval(checkGoogle)
          setTimeout(renderGoogleSignInButton, 100)
        }
      }, 100)
      setTimeout(() => clearInterval(checkGoogle), 5000)
    }
  }
})
</script>

<template>
  <div class="comments-section mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
    <h2 class="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Comments</h2>

    <!-- Login Section -->
    <div v-if="!isAuthenticated" class="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
        Sign in with Google to leave a comment
      </p>
      <div :id="`google-signin-${postId}`" class="flex justify-center"></div>
    </div>

    <!-- Comment Form -->
    <div v-if="isAuthenticated" class="mb-6">
      <div class="flex items-start gap-3 mb-4">
        <div class="flex-shrink-0">
          <div
            v-if="user?.picture && user.picture.trim() && !userImageError"
            class="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700"
          >
            <img
              :src="user.picture"
              :alt="user.name"
              class="w-full h-full object-cover"
              @error="
                () => {
                  userImageError = true
                  console.warn('[Comments] Failed to load user image:', user?.picture)
                }
              "
              @load="
                () => {
                  userImageError = false
                }
              "
            />
          </div>
          <div
            v-else
            class="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 font-medium text-sm"
          >
            {{ user?.name?.charAt(0).toUpperCase() }}
          </div>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 break-words">
            {{ user?.name }}
          </p>
          <textarea
            v-model="commentText"
            placeholder="Write your comment..."
            rows="4"
            class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none"
          ></textarea>
          <div class="flex items-center justify-between mt-2">
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{ commentText.length }}/5000 characters
            </p>
            <button
              :disabled="!commentText.trim() || isSubmitting"
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              @click="submitComment"
            >
              {{ isSubmitting ? 'Posting...' : 'Post Comment' }}
            </button>
          </div>
        </div>
      </div>
      <button
        class="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        @click="signOut"
      >
        Sign out
      </button>
    </div>

    <!-- Error Message -->
    <div
      v-if="error"
      class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
    >
      <p class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
    </div>

    <!-- Comments List -->
    <div v-if="isLoading" class="text-center py-8 text-gray-500 dark:text-gray-400">
      Loading comments...
    </div>

    <div
      v-else-if="comments.length === 0 && totalComments === 0"
      class="text-center py-8 text-gray-500 dark:text-gray-400"
    >
      No comments yet. Be the first to comment!
    </div>

    <div v-else-if="comments.length > 0" class="space-y-6">
      <div
        v-for="comment in comments"
        :key="comment.id"
        class="flex gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
      >
        <div class="flex-shrink-0">
          <div
            v-if="
              comment.user_picture && comment.user_picture.trim() && !imageErrors.has(comment.id)
            "
            class="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0"
          >
            <img
              :src="comment.user_picture"
              :alt="comment.user_name"
              class="w-full h-full object-cover"
              @error="
                () => {
                  imageErrors.add(comment.id)
                  console.warn(
                    '[Comments] Failed to load image for comment:',
                    comment.id,
                    comment.user_picture,
                  )
                }
              "
              @load="() => imageErrors.delete(comment.id)"
            />
          </div>
          <div
            v-else
            class="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 font-medium text-sm flex-shrink-0"
          >
            {{ comment.user_name.charAt(0).toUpperCase() }}
          </div>
        </div>
        <div class="flex-1 min-w-0 overflow-hidden">
          <div class="flex items-center gap-2 mb-1 flex-wrap">
            <p class="font-medium text-gray-900 dark:text-gray-100 break-words">
              {{ comment.user_name }}
            </p>
            <span class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{{
              formatDate(comment.created_at)
            }}</span>
          </div>
          <p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
            {{ comment.content }}
          </p>
        </div>
      </div>
    </div>

    <!-- Pagination Controls -->
    <div v-if="totalPages > 1" class="mt-8 flex items-center justify-center gap-2 flex-wrap">
      <button
        :disabled="currentPage === 1 || isLoading"
        class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        @click="goToPage(currentPage - 1)"
      >
        Previous
      </button>

      <div class="flex items-center gap-1">
        <button
          v-for="page in totalPages"
          :key="page"
          :disabled="isLoading"
          :class="[
            'px-3 py-2 text-sm font-medium rounded-lg transition-colors',
            page === currentPage
              ? 'bg-blue-600 text-white'
              : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700',
            isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          ]"
          @click="goToPage(page)"
        >
          {{ page }}
        </button>
      </div>

      <button
        :disabled="currentPage === totalPages || isLoading"
        class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        @click="goToPage(currentPage + 1)"
      >
        Next
      </button>

      <div class="text-sm text-gray-500 dark:text-gray-400 ml-4">
        Showing {{ comments.length }} of {{ totalComments }} comments
      </div>
    </div>
  </div>
</template>

<style scoped>
.comments-section {
  max-width: 100%;
}
</style>
