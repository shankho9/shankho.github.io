<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import GalleryComments from '~/components/gallery/Comments.vue'
import type { LibraryEngagementKind } from '~/composables/useLibraryEngagementStats'

const props = withDefaults(
  defineProps<{
    itemId: string | number
    kind: LibraryEngagementKind
    /** Start with comments panel open */
    initiallyShowComments?: boolean
    /** Compact toolbar only (no full comments until toggled) */
    compact?: boolean
  }>(),
  {
    initiallyShowComments: false,
    compact: false,
  },
)

const emit = defineEmits<{
  'like-changed': [itemId: string | number]
  'comment-added': [itemId: string | number]
}>()

const likeCount = ref(0)
const isLiked = ref(false)
const isLiking = ref(false)
const showComments = ref(props.initiallyShowComments)
const commentCount = ref(0)

const loadLikes = async () => {
  const itemId = String(props.itemId)
  try {
    const response = await $fetch<{ success: boolean; count: number; isLiked: boolean }>(
      `/api/library/likes?itemId=${encodeURIComponent(itemId)}&kind=${props.kind}`,
    )
    if (response.success && String(props.itemId) === itemId) {
      likeCount.value = response.count
      isLiked.value = response.isLiked
    }
  } catch (error) {
    console.error('[LibraryItemEngagement] Failed to load likes:', error)
  }
}

const loadCommentCount = async () => {
  try {
    const response = await $fetch<{
      pagination: { total: number }
    }>(
      `/api/library/comments?itemId=${encodeURIComponent(String(props.itemId))}&kind=${props.kind}&page=1&limit=1`,
    )
    commentCount.value = response.pagination?.total ?? 0
  } catch {
    // non-fatal
  }
}

const toggleLike = async () => {
  if (isLiking.value) return
  isLiking.value = true
  const itemId = String(props.itemId)
  const previousLikeCount = likeCount.value
  const previousIsLiked = isLiked.value
  const action = previousIsLiked ? 'unlike' : 'like'

  if (isLiked.value) {
    likeCount.value = Math.max(0, likeCount.value - 1)
    isLiked.value = false
  } else {
    likeCount.value += 1
    isLiked.value = true
  }

  try {
    await $fetch('/api/library/like', {
      method: 'POST',
      body: { itemId, kind: props.kind, action },
    })
    await loadLikes()
    emit('like-changed', itemId)
  } catch (error) {
    console.error('[LibraryItemEngagement] Failed to toggle like:', error)
    likeCount.value = previousLikeCount
    isLiked.value = previousIsLiked
  } finally {
    isLiking.value = false
  }
}

const handleCommentAdded = (itemId: string | number) => {
  commentCount.value += 1
  emit('comment-added', itemId)
}

watch(
  () => [props.itemId, props.kind] as const,
  () => {
    likeCount.value = 0
    isLiked.value = false
    commentCount.value = 0
    void loadLikes()
    void loadCommentCount()
  },
  { immediate: true },
)

onMounted(() => {
  showComments.value = props.initiallyShowComments
})
</script>

<template>
  <div class="library-item-engagement">
    <div class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
        :disabled="isLiking"
        @click.stop="toggleLike"
      >
        <Icon :name="isLiked ? 'mdi:heart' : 'mdi:heart-outline'" size="18" class="text-red-500" />
        <span>{{ likeCount > 0 ? likeCount : 'Like' }}</span>
      </button>

      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
        :class="{ 'ring-2 ring-sky-400/60': showComments }"
        @click.stop="showComments = !showComments"
      >
        <Icon name="mdi:comment-outline" size="18" class="text-sky-600 dark:text-sky-400" />
        <span>{{ commentCount > 0 ? commentCount : 'Comment' }}</span>
      </button>
    </div>

    <div v-if="showComments" class="mt-3" @click.stop>
      <GalleryComments
        :item-id="itemId"
        :kind="kind"
        :dark="false"
        @comment-added="handleCommentAdded"
      />
    </div>
  </div>
</template>
