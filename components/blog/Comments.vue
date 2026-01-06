<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useAuth } from '~/composables/useAuth'
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

type ReactionType = 'thumbs_up' | 'heart' | 'party' | 'rocket' | 'eyes'

interface CommentReactions {
  [commentId: number]: {
    [reactionType: string]: number
  }
}

interface UserReactions {
  [commentId: number]: string[]
}

const props = defineProps<{
  postId: string
}>()

const { user, isAuthenticated, signIn, signOut, loadStoredUser } = useAuth()

const comments = ref<Comment[]>([])
const isLoading = ref(false)
const isSubmitting = ref(false)
const commentText = ref('')
const error = ref<string | null>(null)
const imageErrors = ref<Set<number>>(new Set())
const userImageError = ref(false)
const showLoginModal = ref(false)

// Comment reactions state
const commentReactions = ref<CommentReactions>({})
const userReactions = ref<UserReactions>({})
const reactingComments = ref<Set<number>>(new Set())

const reactionTypes: { type: ReactionType; emoji: string; label: string }[] = [
  { type: 'thumbs_up', emoji: '👍', label: 'Like it!' },
  { type: 'heart', emoji: '❤️', label: 'Love it!' },
  { type: 'party', emoji: '🎉', label: 'Celebrate it!' },
  { type: 'rocket', emoji: '🚀', label: 'Amazing!' },
  { type: 'eyes', emoji: '👀', label: 'Interesting!' },
]

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

const loadCommentReactions = async (commentIds: number[]) => {
  if (commentIds.length === 0) return

  try {
    const response = await $fetch<{
      reactions: CommentReactions
      userReactions: UserReactions
    }>(
      `/api/blog/comment-reactions?commentIds=${commentIds.join(',')}${
        user.value?.email ? `&userEmail=${encodeURIComponent(user.value.email)}` : ''
      }`,
    )
    commentReactions.value = { ...commentReactions.value, ...response.reactions }
    userReactions.value = { ...userReactions.value, ...response.userReactions }
  } catch (err) {
    console.warn('[Comments] Failed to load reactions:', err)
  }
}

const toggleReaction = async (commentId: number, reactionType: ReactionType) => {
  if (!isAuthenticated.value || !user.value) {
    signIn()
    return
  }

  if (reactingComments.value.has(commentId)) return

  // Get user details - ensure we have all required fields
  const userEmail = user.value.email
  const userName = user.value.name || user.value.email?.split('@')[0] || 'Anonymous'
  const userPicture = user.value.picture

  // Check if user already has a reaction (any type) for this comment
  const existingReaction = userReactions.value[commentId]?.[0] // Only one reaction allowed
  const isReacted = existingReaction === reactionType
  const action = isReacted ? 'remove' : 'add'

  // Store previous state for rollback
  const prevReactions = { ...commentReactions.value[commentId] }
  const prevUserReaction = userReactions.value[commentId]?.[0] || null

  // Optimistic update
  if (!commentReactions.value[commentId]) {
    commentReactions.value[commentId] = {}
  }

  if (action === 'add') {
    // Remove previous reaction count if exists
    if (prevUserReaction && prevUserReaction !== reactionType) {
      const prevType = prevUserReaction as ReactionType
      const prevCount = commentReactions.value[commentId][prevType] || 0
      commentReactions.value[commentId][prevType] = Math.max(0, prevCount - 1)
    }

    // Add new reaction
    const currentCount = commentReactions.value[commentId][reactionType] || 0
    commentReactions.value[commentId][reactionType] = currentCount + 1
    userReactions.value[commentId] = [reactionType]
  } else {
    // Remove reaction
    const currentCount = commentReactions.value[commentId][reactionType] || 0
    commentReactions.value[commentId][reactionType] = Math.max(0, currentCount - 1)
    userReactions.value[commentId] = []
  }

  reactingComments.value.add(commentId)

  try {
    const response = await $fetch<{ success: boolean; reactions: Record<string, number> }>(
      '/api/blog/comment-reactions',
      {
        method: 'POST',
        body: {
          commentId,
          reactionType,
          userEmail,
          userName,
          userPicture,
          action,
        },
      },
    )
    // Update with server response
    commentReactions.value[commentId] = {
      ...commentReactions.value[commentId],
      ...response.reactions,
    }
  } catch (err: unknown) {
    console.warn('[Comments] Failed to update reaction:', err)

    // Check if it's a timeout error
    const isTimeout =
      err instanceof Error &&
      (err.message.includes('timeout') ||
        err.message.includes('503') ||
        ('statusCode' in err && (err as { statusCode?: number }).statusCode === 503))

    if (isTimeout) {
      // For timeout errors, show a user-friendly message
      console.warn('[Comments] Database timeout - reaction may not have been saved')
      // Note: We keep the optimistic update for timeout errors since the request might have succeeded
      // but the response timed out. The next page load will sync the correct state.
    } else {
      // For other errors, revert optimistic update
      commentReactions.value[commentId] = prevReactions
      if (prevUserReaction) {
        userReactions.value[commentId] = [prevUserReaction]
      } else {
        userReactions.value[commentId] = []
      }
    }
  } finally {
    reactingComments.value.delete(commentId)
  }
}

const getReactionCount = (commentId: number, reactionType: ReactionType): number => {
  return commentReactions.value[commentId]?.[reactionType] || 0
}

const getTotalReactionCount = (commentId: number): number => {
  const reactions = commentReactions.value[commentId]
  if (!reactions) return 0
  return Object.values(reactions).reduce((sum, count) => sum + count, 0)
}

const hasUserReacted = (commentId: number, reactionType: ReactionType): boolean => {
  // User can only have one reaction, so check if it matches the requested type
  return userReactions.value[commentId]?.[0] === reactionType || false
}

// Track which comment's reaction picker is open
const openReactionPicker = ref<number | null>(null)

const loadComments = async (page: number = currentPage.value, retryCount = 0) => {
  isLoading.value = true
  error.value = null
  let willRetry = false
  try {
    const response = await $fetch<{
      comments: Comment[]
      pagination: { page: number; limit: number; total: number; totalPages: number }
    }>(
      `/api/blog/comments?postId=${encodeURIComponent(props.postId)}&page=${page}&limit=${commentsPerPage.value}`,
    )
    comments.value = response.comments
    currentPage.value = response.pagination.page
    totalComments.value = response.pagination.total
    totalPages.value = response.pagination.totalPages

    // Load reactions for these comments
    if (comments.value.length > 0) {
      await loadCommentReactions(comments.value.map((c) => c.id))
    }

    isLoading.value = false
  } catch (err: unknown) {
    console.error('[Comments] Failed to load comments:', err)

    // Retry logic for network errors and server errors (max 2 retries)
    if (retryCount < 2 && err && typeof err === 'object') {
      const status = 'status' in err ? (err as { status?: number }).status : undefined
      // Retry on network errors (no status) or 5xx server errors
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
        error.value = 'Comments not found for this post.'
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
    const response = await $fetch<{ success: boolean; comment: Comment }>('/api/blog/comments', {
      method: 'POST',
      body: {
        postId: props.postId,
        content: commentText.value,
        userEmail: user.value.email,
        userName: user.value.name || user.value.email?.split('@')[0] || 'Anonymous',
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

const openLoginModal = () => {
  showLoginModal.value = true
}

const closeLoginModal = () => {
  showLoginModal.value = false
}

// Watch for authentication state changes to close modal
watch(isAuthenticated, (newValue) => {
  if (newValue) {
    showLoginModal.value = false
    loadComments()
  }
})

onMounted(async () => {
  loadStoredUser()
  // Reset image error when component mounts
  if (user.value) {
    userImageError.value = false
  }
  await loadComments()
})
</script>

<template>
  <div class="comments-section mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
    <h2 class="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Comments</h2>

    <!-- Login Section -->
    <div v-if="!isAuthenticated" class="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">Sign in to leave a comment</p>
      <button
        class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        @click="openLoginModal"
      >
        Login
      </button>
    </div>

    <!-- Login Modal -->
    <LoginModal :is-open="showLoginModal" @close="closeLoginModal" />

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
          <p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words mb-3">
            {{ comment.content }}
          </p>

          <!-- Total Reaction Count -->
          <div
            v-if="getTotalReactionCount(comment.id) > 0"
            class="mb-2 text-xs text-gray-600 dark:text-gray-400 font-medium"
          >
            {{ getTotalReactionCount(comment.id) }}
            {{ getTotalReactionCount(comment.id) === 1 ? 'reaction' : 'reactions' }}
          </div>

          <!-- Adaptive Comment Reactions -->
          <div class="relative flex items-center gap-2">
            <!-- Main Reaction Button (Like/Thumbs Up) -->
            <div class="relative">
              <button
                :disabled="reactingComments.has(comment.id)"
                :class="[
                  'flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all',
                  'border border-gray-300 dark:border-gray-600',
                  'hover:bg-gray-100 dark:hover:bg-gray-700',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  hasUserReacted(comment.id, 'thumbs_up')
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-600'
                    : 'bg-white dark:bg-gray-800',
                ]"
                title="Like"
                @click="toggleReaction(comment.id, 'thumbs_up')"
                @mouseenter="openReactionPicker = comment.id"
                @mouseleave="
                  setTimeout(() => {
                    if (openReactionPicker === comment.id) openReactionPicker = null
                  }, 200)
                "
              >
                <span class="text-sm leading-none">👍</span>
                <span
                  v-if="getReactionCount(comment.id, 'thumbs_up') > 0"
                  class="text-[10px] font-medium text-gray-700 dark:text-gray-300 leading-none"
                >
                  {{ getReactionCount(comment.id, 'thumbs_up') }}
                </span>
              </button>

              <!-- Reaction Picker (shown on hover/click) -->
              <div
                v-if="openReactionPicker === comment.id"
                class="absolute bottom-full left-0 mb-2 flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full px-2 py-1 shadow-lg z-10"
                @mouseenter="openReactionPicker = comment.id"
                @mouseleave="openReactionPicker = null"
              >
                <button
                  v-for="reaction in reactionTypes"
                  :key="reaction.type"
                  :disabled="reactingComments.has(comment.id)"
                  :class="[
                    'flex items-center justify-center w-8 h-8 rounded-full text-base transition-all',
                    'hover:scale-125 hover:bg-gray-100 dark:hover:bg-gray-700',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    hasUserReacted(comment.id, reaction.type)
                      ? 'ring-2 ring-blue-400 dark:ring-blue-600'
                      : '',
                  ]"
                  :title="reaction.label"
                  @click="
                    () => {
                      toggleReaction(comment.id, reaction.type)
                      openReactionPicker = null
                    }
                  "
                >
                  {{ reaction.emoji }}
                </button>
              </div>
            </div>

            <!-- Show user's current reaction if different from thumbs_up -->
            <button
              v-if="
                userReactions[comment.id]?.[0] &&
                userReactions[comment.id][0] !== 'thumbs_up' &&
                hasUserReacted(comment.id, userReactions[comment.id][0] as ReactionType)
              "
              :disabled="reactingComments.has(comment.id)"
              :class="[
                'flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-all',
                'border border-blue-400 dark:border-blue-600',
                'bg-blue-50 dark:bg-blue-900/20',
                'hover:bg-blue-100 dark:hover:bg-blue-900/30',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              ]"
              :title="
                reactionTypes.find((r) => r.type === userReactions[comment.id][0])?.label || ''
              "
              @click="toggleReaction(comment.id, userReactions[comment.id][0] as ReactionType)"
            >
              <span class="text-sm leading-none">
                {{
                  reactionTypes.find((r) => r.type === userReactions[comment.id][0])?.emoji || ''
                }}
              </span>
              <span
                v-if="
                  getReactionCount(comment.id, userReactions[comment.id][0] as ReactionType) > 0
                "
                class="text-[10px] font-medium text-gray-700 dark:text-gray-300 leading-none"
              >
                {{ getReactionCount(comment.id, userReactions[comment.id][0] as ReactionType) }}
              </span>
            </button>
          </div>
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
