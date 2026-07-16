<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { formatDateForDisplay } from '~/utils/common/dateParser'
import LoginModal from '~/components/auth/LoginModal.vue'

interface Comment {
  id: number
  post_id: string
  user_email: string
  user_name: string
  user_picture: string
  content: string
  created_at: string | Date
}

const props = withDefaults(
  defineProps<{
    itemId: string | number
    /** gallery (default) | music | resource | app */
    kind?: 'gallery' | 'music' | 'resource' | 'app'
    /** When true, use dark lightbox styling; otherwise light page styling */
    dark?: boolean
  }>(),
  {
    kind: 'gallery',
    dark: true,
  },
)

const emit = defineEmits<{
  'comment-added': [itemId: string | number]
}>()

const { user, isAuthenticated, loadStoredUser } = useAuth()

const comments = ref<Comment[]>([])
const isLoading = ref(false)
const isSubmitting = ref(false)
const commentText = ref('')
const error = ref<string | null>(null)
const imageErrors = ref<Set<number>>(new Set())
const userImageError = ref(false)
const showLoginModal = ref(false)

// Pagination state
const currentPage = ref(1)
const commentsPerPage = ref(10)
const totalComments = ref(0)
const totalPages = ref(0)

const formatDate = formatDateForDisplay

const commentsApiBase = '/api/library/comments'

const loadComments = async (page: number = currentPage.value, retryCount = 0) => {
  isLoading.value = true
  error.value = null
  let willRetry = false
  try {
    const response = await $fetch<{
      comments: Comment[]
      pagination: { page: number; limit: number; total: number; totalPages: number }
    }>(
      `${commentsApiBase}?itemId=${encodeURIComponent(String(props.itemId))}&kind=${props.kind}&page=${page}&limit=${commentsPerPage.value}`,
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
        willRetry = true
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
    // Reset if we're not going to retry (either retries exhausted or non-retryable error)
    if (!willRetry) {
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

const openLoginModal = () => {
  showLoginModal.value = true
}

const closeLoginModal = () => {
  showLoginModal.value = false
}

const submitComment = async () => {
  if (!isAuthenticated.value || !user.value) {
    openLoginModal()
    return
  }

  if (!commentText.value.trim()) {
    return
  }

  isSubmitting.value = true
  error.value = null
  try {
    // Identity fields come from the authenticated session on the server (not the request body).
    const response = await $fetch<{ success: boolean; comment: Comment }>(commentsApiBase, {
      method: 'POST',
      body: {
        itemId: String(props.itemId),
        kind: props.kind,
        content: commentText.value,
      },
    })

    if (response.success) {
      commentText.value = ''
      const newTotal = totalComments.value + 1
      totalComments.value = newTotal
      totalPages.value = Math.ceil(newTotal / commentsPerPage.value)
      await loadComments(1)
      // Emit event to notify parent of comment count change
      emit('comment-added', props.itemId)
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

// Watch for authentication state changes to close modal and reload comments
watch(isAuthenticated, (newValue) => {
  if (newValue) {
    showLoginModal.value = false
    loadComments()
  }
})

watch(
  () => [props.itemId, props.kind] as const,
  () => {
    currentPage.value = 1
    loadComments(1)
  },
)

onMounted(() => {
  loadStoredUser()
  loadComments()
})
</script>

<template>
  <div
    class="gallery-comments-section mt-6 pt-6 border-t"
    :class="dark ? 'border-gray-200 dark:border-gray-700' : 'border-zinc-200 dark:border-zinc-700'"
  >
    <h3
      class="mb-4 text-xl font-bold"
      :class="dark ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'"
    >
      Comments
    </h3>

    <!-- Comment Form -->
    <div v-if="isAuthenticated && user" class="mb-6">
      <div class="mb-4 flex gap-3">
        <img
          v-if="user.picture && !userImageError"
          :src="user.picture"
          :alt="user.name"
          class="h-10 w-10 rounded-full border-2 border-sky-400"
          @error="handleUserImageError"
        />
        <div v-else class="flex h-10 w-10 items-center justify-center rounded-full bg-sky-600">
          <span class="text-sm font-semibold text-white">
            {{ user.name?.charAt(0).toUpperCase() || 'U' }}
          </span>
        </div>
        <div class="flex-1">
          <textarea
            v-model="commentText"
            placeholder="Add a comment..."
            :class="
              dark
                ? 'w-full resize-none rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-400'
                : 'w-full resize-none rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100'
            "
            rows="3"
            :disabled="isSubmitting"
          />
          <div class="mt-2 flex items-center justify-between">
            <p :class="dark ? 'text-xs text-gray-400' : 'text-xs text-zinc-500'">
              {{ commentText.length }}/5000
            </p>
            <button
              :disabled="!commentText.trim() || isSubmitting"
              class="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-gray-600"
              @click="submitComment"
            >
              {{ isSubmitting ? 'Posting...' : 'Post Comment' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Sign In Prompt -->
    <div
      v-else
      class="mb-6 rounded-lg border p-4"
      :class="
        dark
          ? 'border-white/20 bg-white/10'
          : 'border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50'
      "
    >
      <p :class="dark ? 'mb-3 text-white' : 'mb-3 text-zinc-800 dark:text-zinc-100'">
        Sign in to add a comment
      </p>
      <button
        class="w-full rounded-lg bg-sky-600 px-4 py-2 font-medium text-white transition-colors hover:bg-sky-700"
        @click="openLoginModal"
      >
        Login
      </button>
    </div>

    <LoginModal :is-open="showLoginModal" @close="closeLoginModal" />

    <div
      v-if="isLoading"
      class="py-8 text-center"
      :class="dark ? 'text-gray-400' : 'text-zinc-500'"
    >
      Loading comments...
    </div>
    <div
      v-else-if="error"
      class="rounded-lg border border-red-500/30 bg-red-900/20 py-8 text-center text-red-400"
    >
      {{ error }}
    </div>
    <div
      v-else-if="comments.length === 0 && totalComments === 0"
      class="py-8 text-center"
      :class="dark ? 'text-gray-400' : 'text-zinc-500'"
    >
      No comments yet. Be the first to comment!
    </div>
    <div v-else-if="comments.length > 0" class="space-y-4">
      <div
        v-for="comment in comments"
        :key="comment.id"
        class="flex gap-3 rounded-lg border p-4"
        :class="
          dark
            ? 'border-white/10 bg-white/5'
            : 'border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/40'
        "
      >
        <img
          v-if="comment.user_picture && !imageErrors.has(comment.id)"
          :src="comment.user_picture"
          :alt="comment.user_name"
          class="h-10 w-10 flex-shrink-0 rounded-full border-2 border-sky-400"
          @error="handleImageError(comment.id)"
        />
        <div
          v-else
          class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-sky-600"
        >
          <span class="text-sm font-semibold text-white">
            {{ comment.user_name?.charAt(0).toUpperCase() || 'U' }}
          </span>
        </div>
        <div class="min-w-0 flex-1">
          <div class="mb-1 flex items-center gap-2">
            <span
              class="font-semibold"
              :class="dark ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'"
            >
              {{ comment.user_name }}
            </span>
            <span class="text-xs" :class="dark ? 'text-gray-400' : 'text-zinc-500'">
              {{ formatDate(comment.created_at) }}
            </span>
          </div>
          <p
            class="whitespace-pre-wrap break-words"
            :class="dark ? 'text-gray-200' : 'text-zinc-700 dark:text-zinc-300'"
          >
            {{ comment.content }}
          </p>
        </div>
      </div>

      <div
        v-if="totalPages > 1"
        class="flex items-center justify-between border-t pt-4"
        :class="dark ? 'border-white/10' : 'border-zinc-200 dark:border-zinc-700'"
      >
        <button
          :disabled="currentPage === 1"
          class="rounded-lg px-4 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          :class="
            dark
              ? 'bg-white/10 text-white hover:bg-white/20'
              : 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-100'
          "
          @click="goToPage(currentPage - 1)"
        >
          Previous
        </button>
        <span class="text-sm" :class="dark ? 'text-gray-400' : 'text-zinc-500'">
          Page {{ currentPage }} of {{ totalPages }}
        </span>
        <button
          :disabled="currentPage === totalPages"
          class="rounded-lg px-4 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          :class="
            dark
              ? 'bg-white/10 text-white hover:bg-white/20'
              : 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-100'
          "
          @click="goToPage(currentPage + 1)"
        >
          Next
        </button>
      </div>
      <div v-if="totalComments > 0" class="pt-2 text-center">
        <p class="text-sm" :class="dark ? 'text-gray-400' : 'text-zinc-500'">
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
