<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import GalleryComments from './Comments.vue'

interface GalleryItem {
  id: number
  title: string
  description: string
  image: string
  category: string
  date: string
  type: string
  likeCount?: number
}

interface Props {
  items: GalleryItem[]
  currentIndex: number
  isOpen: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  'update:currentIndex': [index: number]
}>()

const currentIndex = computed({
  get: () => props.currentIndex,
  set: (value) => emit('update:currentIndex', value),
})

const zoomLevel = ref(1)
const isZoomed = computed(() => zoomLevel.value > 1)
const imagePosition = ref({ x: 0, y: 0 })
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })

const currentItem = computed(() => props.items[currentIndex.value])

// Like functionality
const likeCount = ref(0)
const isLiked = ref(false)
const isLiking = ref(false)
const showComments = ref(false)

// Load like count and status
const loadLikes = async () => {
  if (!currentItem.value) return
  
  // Capture the itemId at the start to prevent race conditions
  const itemId = currentItem.value.id
  
  try {
    const response = await $fetch<{ success: boolean; count: number; isLiked: boolean }>(
      `/api/gallery/likes?itemId=${itemId}`,
    )
    // Verify the response is still for the current item before updating state
    // This prevents race conditions when navigating quickly between items
    if (response.success && currentItem.value?.id === itemId) {
      likeCount.value = response.count
      isLiked.value = response.isLiked
    }
  } catch (error) {
    console.error('[Lightbox] Failed to load likes:', error)
  }
}

// Toggle like
const toggleLike = async () => {
  if (!currentItem.value || isLiking.value) return
  isLiking.value = true
  const previousLikeCount = likeCount.value
  const previousIsLiked = isLiked.value

  // Optimistic update
  if (isLiked.value) {
    likeCount.value = Math.max(0, likeCount.value - 1)
    isLiked.value = false
  } else {
    likeCount.value += 1
    isLiked.value = true
  }

  try {
    await $fetch('/api/gallery/like', {
      method: 'POST',
      body: {
        itemId: currentItem.value.id,
        action: isLiked.value ? 'like' : 'unlike',
      },
    })
    // Reload to get accurate count
    await loadLikes()
  } catch (error) {
    console.error('[Lightbox] Failed to toggle like:', error)
    // Revert optimistic update
    likeCount.value = previousLikeCount
    isLiked.value = previousIsLiked
  } finally {
    isLiking.value = false
  }
}

// Watch for item changes to load likes
watch(
  () => currentItem.value?.id,
  (newId) => {
    if (newId) {
      loadLikes()
      showComments.value = false
    }
  },
  { immediate: true },
)

const hasNext = computed(() => currentIndex.value < props.items.length - 1)
const hasPrevious = computed(() => currentIndex.value > 0)

const nextImage = () => {
  if (hasNext.value) {
    currentIndex.value++
    resetZoom()
  }
}

const previousImage = () => {
  if (hasPrevious.value) {
    currentIndex.value--
    resetZoom()
  }
}

const resetZoom = () => {
  zoomLevel.value = 1
  imagePosition.value = { x: 0, y: 0 }
}

const zoomIn = () => {
  zoomLevel.value = Math.min(zoomLevel.value + 0.25, 3)
}

const zoomOut = () => {
  zoomLevel.value = Math.max(zoomLevel.value - 0.25, 1)
  if (zoomLevel.value === 1) {
    imagePosition.value = { x: 0, y: 0 }
  }
}

const handleWheel = (e: WheelEvent) => {
  if (!props.isOpen) return
  e.preventDefault()
  if (e.deltaY < 0) {
    zoomIn()
  } else {
    zoomOut()
  }
}

const startDrag = (e: MouseEvent | TouchEvent) => {
  if (!isZoomed.value) return
  isDragging.value = true
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
  dragStart.value = { x: clientX - imagePosition.value.x, y: clientY - imagePosition.value.y }
}

const onDrag = (e: MouseEvent | TouchEvent) => {
  if (!isDragging.value || !isZoomed.value) return
  e.preventDefault()
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
  imagePosition.value = {
    x: clientX - dragStart.value.x,
    y: clientY - dragStart.value.y,
  }
}

const endDrag = () => {
  isDragging.value = false
}

const handleKeydown = (e: KeyboardEvent) => {
  if (!props.isOpen) return

  switch (e.key) {
    case 'Escape':
      emit('close')
      break
    case 'ArrowLeft':
      previousImage()
      break
    case 'ArrowRight':
      nextImage()
      break
    case '+':
    case '=':
      zoomIn()
      break
    case '-':
      zoomOut()
      break
    case '0':
      resetZoom()
      break
  }
}

const closeLightbox = () => {
  resetZoom()
  emit('close')
}

watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      resetZoom()
    }
  },
)

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('wheel', handleWheel, { passive: false })
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('wheel', handleWheel)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="lightbox">
      <div
        v-if="isOpen"
        class="lightbox-overlay fixed inset-0 z-[100] bg-black bg-opacity-95 flex items-center justify-center"
        @click.self="closeLightbox"
      >
        <!-- Navigation Buttons -->
        <button
          v-if="hasPrevious"
          class="absolute left-4 z-10 p-3 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full text-white transition-colors"
          aria-label="Previous image"
          @click="previousImage"
        >
          <Icon name="mdi:chevron-left" size="32" />
        </button>

        <button
          v-if="hasNext"
          class="absolute right-4 z-10 p-3 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full text-white transition-colors"
          aria-label="Next image"
          @click="nextImage"
        >
          <Icon name="mdi:chevron-right" size="32" />
        </button>

        <!-- Zoom Controls -->
        <div
          class="absolute top-16 left-4 z-10 flex flex-col gap-2 bg-black bg-opacity-50 rounded-lg p-2"
        >
          <button
            class="p-2 hover:bg-opacity-70 rounded text-white transition-colors"
            aria-label="Zoom in"
            :disabled="zoomLevel >= 3"
            @click="zoomIn"
          >
            <Icon name="mdi:plus" size="20" />
          </button>
          <button
            class="p-2 hover:bg-opacity-70 rounded text-white transition-colors"
            aria-label="Zoom out"
            :disabled="zoomLevel <= 1"
            @click="zoomOut"
          >
            <Icon name="mdi:minus" size="20" />
          </button>
          <button
            v-if="isZoomed"
            class="p-2 hover:bg-opacity-70 rounded text-white transition-colors text-xs"
            aria-label="Reset zoom"
            @click="resetZoom"
          >
            Reset
          </button>
        </div>

        <!-- Image Container - Apply zoom to entire container -->
        <div
          class="relative w-full h-full flex items-center justify-center p-4 transition-transform duration-200"
          :style="{
            transform: `scale(${zoomLevel}) translate(${imagePosition.x / zoomLevel}px, ${imagePosition.y / zoomLevel}px)`,
            transformOrigin: 'center center',
          }"
          :class="{ 'cursor-grab': isZoomed && !isDragging, 'cursor-grabbing': isDragging }"
          @mousedown="startDrag"
          @touchstart="startDrag"
          @mousemove="onDrag"
          @touchmove="onDrag"
          @mouseup="endDrag"
          @mouseleave="endDrag"
          @touchend="endDrag"
        >
          <div class="max-w-full max-h-full overflow-hidden">
            <NuxtImg
              v-if="currentItem"
              :src="currentItem.image"
              :alt="currentItem.title"
              class="max-w-full max-h-[90vh] object-contain"
              loading="eager"
            />
          </div>
        </div>

        <!-- Social Actions (Like, Comment, Close) - Top Right -->
        <div class="absolute top-4 right-4 z-10 flex items-center gap-2">
          <!-- Like Button -->
          <button
            class="p-3 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full text-white transition-colors flex items-center gap-2"
            :disabled="isLiking"
            @click="toggleLike"
          >
            <Icon
              :name="isLiked ? 'mdi:heart' : 'mdi:heart-outline'"
              size="24"
              class="text-red-500"
            />
            <span v-if="likeCount > 0" class="text-sm text-white">{{ likeCount }}</span>
          </button>

          <!-- Comments Toggle Button -->
          <button
            class="p-3 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full text-white transition-colors"
            :class="{ 'bg-opacity-70': showComments }"
            @click="showComments = !showComments"
          >
            <Icon name="mdi:comment-outline" size="24" />
          </button>

          <!-- Close Button -->
          <button
            class="p-2 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full text-white transition-colors"
            aria-label="Close lightbox"
            @click="closeLightbox"
          >
            <Icon name="mdi:close" size="24" />
          </button>
        </div>

        <!-- Comments Panel -->
        <Transition name="slide">
          <div
            v-if="showComments && currentItem"
            class="absolute right-0 top-0 bottom-0 w-96 bg-black bg-opacity-95 z-20 overflow-y-auto"
          >
            <div class="p-4">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-xl font-bold text-white">Comments</h3>
                <button
                  class="p-2 hover:bg-opacity-70 rounded text-white transition-colors"
                  @click="showComments = false"
                >
                  <Icon name="mdi:close" size="20" />
                </button>
              </div>
              <GalleryComments :item-id="currentItem.id" />
            </div>
          </div>
        </Transition>

        <!-- Image Metadata -->
        <div
          v-if="currentItem"
          class="absolute bottom-0 left-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6 text-white"
          :class="showComments ? 'right-96' : 'right-0'"
        >
          <div class="container mx-auto max-w-4xl">
            <h3 class="text-2xl font-bold mb-2">{{ currentItem.title }}</h3>
            <p class="text-gray-300 mb-4">{{ currentItem.description }}</p>
            <div class="flex items-center gap-4 text-sm text-gray-400">
              <span class="flex items-center gap-1">
                <Icon name="mdi:tag" size="16" />
                <span class="capitalize">{{ currentItem.category }}</span>
              </span>
              <span class="flex items-center gap-1">
                <Icon name="mdi:calendar" size="16" />
                <span>{{
                  new Date(currentItem.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                }}</span>
              </span>
              <span class="flex items-center gap-1">
                <Icon name="mdi:image" size="16" />
                <span>{{ currentIndex + 1 }} / {{ items.length }}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.lightbox-enter-active,
.lightbox-leave-active {
  transition: opacity 0.3s ease;
}

.lightbox-enter-from,
.lightbox-leave-to {
  opacity: 0;
}

.lightbox-enter-active .lightbox-overlay > *,
.lightbox-leave-active .lightbox-overlay > * {
  transition:
    transform 0.3s ease,
    opacity 0.3s ease;
}

.lightbox-enter-from .lightbox-overlay > *,
.lightbox-leave-to .lightbox-overlay > * {
  opacity: 0;
  transform: scale(0.9);
}

/* Comments panel slide animation */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from {
  transform: translateX(100%);
}

.slide-leave-to {
  transform: translateX(100%);
}
</style>
