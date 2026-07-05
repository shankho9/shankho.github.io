<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'

export interface MediaMetadataItem {
  metadata?: {
    fileId?: string
    name?: string
    fileType?: string
    filePath?: string
    width?: number
    height?: number
    size?: number | string
    createdAt?: string
    updatedAt?: string
    tags?: string[]
    customMetadata?: Record<string, unknown>
  }
}

const props = defineProps<{
  open: boolean
  item: MediaMetadataItem | null
}>()

const emit = defineEmits<{
  close: []
}>()

const panelRef = ref<HTMLElement | null>(null)
const closeButtonRef = ref<HTMLButtonElement | null>(null)

function close() {
  emit('close')
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.open) {
    event.preventDefault()
    close()
  }
}

watch(
  () => props.open,
  (open) => {
    if (!import.meta.client) return
    document.body.style.overflow = open ? 'hidden' : ''
    if (open) {
      void nextTick(() => closeButtonRef.value?.focus())
    }
  },
)

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  if (import.meta.client) document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-[105] bg-black/50"
        aria-hidden="true"
        @click="close"
      />
    </Transition>

    <Transition name="slide">
      <aside
        v-if="open && item"
        ref="panelRef"
        role="dialog"
        aria-modal="true"
        aria-labelledby="media-metadata-title"
        class="fixed inset-y-0 right-0 z-[110] flex w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800 sm:w-96"
        @click.stop
      >
        <div
          class="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
        >
          <h2 id="media-metadata-title" class="text-xl font-bold text-zinc-800 dark:text-zinc-200">
            Metadata
          </h2>
          <button
            ref="closeButtonRef"
            type="button"
            class="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-slate-700"
            aria-label="Close metadata panel"
            @click="close"
          >
            <Icon name="mdi:close" size="24" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-6">
          <div v-if="item.metadata" class="space-y-6">
            <div>
              <h3 class="mb-3 text-sm font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                Basic Information
              </h3>
              <div class="space-y-2">
                <div v-if="item.metadata.fileId" class="flex justify-between gap-3">
                  <span class="text-sm text-zinc-600 dark:text-zinc-400">File ID:</span>
                  <span class="text-sm font-mono text-zinc-800 dark:text-zinc-200">{{
                    item.metadata.fileId
                  }}</span>
                </div>
                <div v-if="item.metadata.name" class="flex justify-between gap-3">
                  <span class="text-sm text-zinc-600 dark:text-zinc-400">Name:</span>
                  <span class="text-sm text-zinc-800 dark:text-zinc-200">{{
                    item.metadata.name
                  }}</span>
                </div>
                <div v-if="item.metadata.fileType" class="flex justify-between gap-3">
                  <span class="text-sm text-zinc-600 dark:text-zinc-400">Type:</span>
                  <span class="text-sm text-zinc-800 dark:text-zinc-200">{{
                    item.metadata.fileType
                  }}</span>
                </div>
                <div v-if="item.metadata.filePath" class="flex justify-between gap-3">
                  <span class="shrink-0 text-sm text-zinc-600 dark:text-zinc-400">Path:</span>
                  <span class="break-all text-sm font-mono text-zinc-800 dark:text-zinc-200">{{
                    item.metadata.filePath
                  }}</span>
                </div>
              </div>
            </div>

            <div v-if="item.metadata.width || item.metadata.height || item.metadata.size">
              <h3 class="mb-3 text-sm font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                Dimensions & Size
              </h3>
              <div class="space-y-2">
                <div v-if="item.metadata.width" class="flex justify-between gap-3">
                  <span class="text-sm text-zinc-600 dark:text-zinc-400">Width:</span>
                  <span class="text-sm text-zinc-800 dark:text-zinc-200"
                    >{{ item.metadata.width }}px</span
                  >
                </div>
                <div v-if="item.metadata.height" class="flex justify-between gap-3">
                  <span class="text-sm text-zinc-600 dark:text-zinc-400">Height:</span>
                  <span class="text-sm text-zinc-800 dark:text-zinc-200"
                    >{{ item.metadata.height }}px</span
                  >
                </div>
                <div v-if="item.metadata.size" class="flex justify-between gap-3">
                  <span class="text-sm text-zinc-600 dark:text-zinc-400">Size:</span>
                  <span class="text-sm text-zinc-800 dark:text-zinc-200"
                    >{{ (Number(item.metadata.size) / 1024 / 1024).toFixed(2) }} MB</span
                  >
                </div>
              </div>
            </div>

            <div v-if="item.metadata.createdAt || item.metadata.updatedAt">
              <h3 class="mb-3 text-sm font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                Dates
              </h3>
              <div class="space-y-2">
                <div v-if="item.metadata.createdAt" class="flex justify-between gap-3">
                  <span class="text-sm text-zinc-600 dark:text-zinc-400">Created:</span>
                  <span class="text-sm text-zinc-800 dark:text-zinc-200">{{
                    new Date(item.metadata.createdAt).toLocaleString()
                  }}</span>
                </div>
                <div v-if="item.metadata.updatedAt" class="flex justify-between gap-3">
                  <span class="text-sm text-zinc-600 dark:text-zinc-400">Updated:</span>
                  <span class="text-sm text-zinc-800 dark:text-zinc-200">{{
                    new Date(item.metadata.updatedAt).toLocaleString()
                  }}</span>
                </div>
              </div>
            </div>

            <div v-if="item.metadata.tags?.length">
              <h3 class="mb-3 text-sm font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                Tags
              </h3>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="tag in item.metadata.tags"
                  :key="tag"
                  class="rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-900 dark:text-sky-300"
                >
                  {{ tag }}
                </span>
              </div>
            </div>

            <div
              v-if="
                item.metadata.customMetadata && Object.keys(item.metadata.customMetadata).length > 0
              "
            >
              <h3 class="mb-3 text-sm font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                Custom Metadata
              </h3>
              <div class="space-y-2">
                <div
                  v-for="(value, key) in item.metadata.customMetadata"
                  :key="key"
                  class="flex justify-between gap-3"
                >
                  <span class="text-sm capitalize text-zinc-600 dark:text-zinc-400"
                    >{{ key }}:</span
                  >
                  <span class="break-all text-right text-sm text-zinc-800 dark:text-zinc-200">{{
                    String(value)
                  }}</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="py-8 text-center text-zinc-500 dark:text-zinc-400">
            No metadata available
          </div>
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
