<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

interface GalleryItem {
  id: number
  title: string
  description: string
  image: string
  category: string
  date: string
  type: string
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
        <!-- Close Button -->
        <button
          @click="closeLightbox"
          class="absolute top-4 right-4 z-10 p-2 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full text-white transition-colors"
          aria-label="Close lightbox"
        >
          <Icon name="mdi:close" size="24" />
        </button>

        <!-- Navigation Buttons -->
        <button
          v-if="hasPrevious"
          @click="previousImage"
          class="absolute left-4 z-10 p-3 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full text-white transition-colors"
          aria-label="Previous image"
        >
          <Icon name="mdi:chevron-left" size="32" />
        </button>

        <button
          v-if="hasNext"
          @click="nextImage"
          class="absolute right-4 z-10 p-3 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full text-white transition-colors"
          aria-label="Next image"
        >
          <Icon name="mdi:chevron-right" size="32" />
        </button>

        <!-- Zoom Controls -->
        <div
          class="absolute top-4 left-4 z-10 flex flex-col gap-2 bg-black bg-opacity-50 rounded-lg p-2"
        >
          <button
            @click="zoomIn"
            class="p-2 hover:bg-opacity-70 rounded text-white transition-colors"
            aria-label="Zoom in"
            :disabled="zoomLevel >= 3"
          >
            <Icon name="mdi:plus" size="20" />
          </button>
          <button
            @click="zoomOut"
            class="p-2 hover:bg-opacity-70 rounded text-white transition-colors"
            aria-label="Zoom out"
            :disabled="zoomLevel <= 1"
          >
            <Icon name="mdi:minus" size="20" />
          </button>
          <button
            v-if="isZoomed"
            @click="resetZoom"
            class="p-2 hover:bg-opacity-70 rounded text-white transition-colors text-xs"
            aria-label="Reset zoom"
          >
            Reset
          </button>
        </div>

        <!-- Image Container -->
        <div class="relative w-full h-full flex items-center justify-center p-4">
          <div
            class="max-w-full max-h-full overflow-hidden"
            @mousedown="startDrag"
            @touchstart="startDrag"
            @mousemove="onDrag"
            @touchmove="onDrag"
            @mouseup="endDrag"
            @mouseleave="endDrag"
            @touchend="endDrag"
            :class="{ 'cursor-grab': isZoomed && !isDragging, 'cursor-grabbing': isDragging }"
          >
            <NuxtImg
              v-if="currentItem"
              :src="currentItem.image"
              :alt="currentItem.title"
              class="max-w-full max-h-[90vh] object-contain transition-transform duration-200"
              :style="{
                transform: `scale(${zoomLevel}) translate(${imagePosition.x / zoomLevel}px, ${imagePosition.y / zoomLevel}px)`,
              }"
              loading="eager"
            />
          </div>
        </div>

        <!-- Image Metadata -->
        <div
          v-if="currentItem"
          class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6 text-white"
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
</style>
