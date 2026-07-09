<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted } from 'vue'
import type { AppListItem } from '~/types/apps'
import {
  appHasAnyAction,
  formatAppUpdatedAt,
  getAppCategoryIcon,
  getAppDownloadUrl,
  getAppModalBody,
} from '~/utils/apps/display'

const props = defineProps<{
  open: boolean
  app: AppListItem | null
}>()

const emit = defineEmits<{
  close: []
}>()

const imageFailed = ref(false)

const modalBody = computed(() => (props.app ? getAppModalBody(props.app) : ''))
const formattedUpdatedAt = computed(() =>
  props.app ? formatAppUpdatedAt(props.app.updatedAt) : null,
)
const hasActions = computed(() => (props.app ? appHasAnyAction(props.app) : false))

watch(
  () => props.app?.iconUrl,
  () => {
    imageFailed.value = false
  },
)

watch(
  () => props.open,
  (open) => {
    if (!import.meta.client) return
    document.body.style.overflow = open ? 'hidden' : ''
  },
)

function close() {
  emit('close')
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.open) close()
}

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
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open && app"
        class="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-detail-title"
        @click.self="close"
      >
        <div
          class="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
          aria-hidden="true"
          @click="close"
        />

        <div
          class="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-sky-200/70 bg-white shadow-2xl dark:border-slate-600 dark:bg-slate-900 sm:rounded-2xl"
          @click.stop
        >
          <div
            class="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white/95 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/95"
          >
            <p class="text-sm font-medium text-zinc-600 dark:text-zinc-300">App details</p>
            <button
              type="button"
              class="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-slate-700 dark:hover:text-zinc-100"
              aria-label="Close"
              @click="close"
            >
              <Icon name="mdi:close" size="20" />
            </button>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto">
            <div
              class="flex items-start gap-4 border-b border-gray-100 bg-gradient-to-br from-sky-50 to-indigo-50 px-5 py-6 dark:border-slate-700 dark:from-sky-950/40 dark:to-indigo-950/40"
            >
              <div
                class="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/80 bg-white shadow-md dark:border-slate-600 dark:bg-slate-800"
              >
                <CommonExternalImage
                  v-if="app.iconUrl && !imageFailed"
                  :src="app.iconUrl"
                  :alt="app.title"
                  img-class="h-full w-full object-cover"
                  @error="imageFailed = true"
                />
                <Icon v-else name="mdi:cellphone" class="text-4xl text-sky-700 dark:text-sky-400" />
              </div>

              <div class="min-w-0 flex-1">
                <h2
                  id="app-detail-title"
                  class="text-xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-2xl"
                >
                  {{ app.title }}
                </h2>
                <p v-if="app.version" class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Version {{ app.version }}
                </p>
                <div v-if="app.categories.length" class="mt-3 flex flex-wrap gap-1.5">
                  <span
                    v-for="category in app.categories"
                    :key="category"
                    class="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-medium text-zinc-700 shadow-sm dark:bg-slate-800 dark:text-zinc-300"
                  >
                    <Icon :name="getAppCategoryIcon(category)" size="12" />
                    {{ category }}
                  </span>
                </div>
              </div>
            </div>

            <div class="space-y-5 px-5 py-5">
              <section v-if="modalBody">
                <h3 class="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  About
                </h3>
                <p class="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {{ modalBody }}
                </p>
              </section>

              <p
                v-else
                class="text-sm italic text-zinc-500 dark:text-zinc-400"
              >
                No description available for this app yet.
              </p>

              <p
                v-if="formattedUpdatedAt"
                class="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400"
              >
                <Icon name="mdi:update" size="14" />
                Last updated {{ formattedUpdatedAt }}
              </p>

              <section v-if="hasActions" class="border-t border-gray-100 pt-4 dark:border-slate-700">
                <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  Get the app
                </h3>
                <div class="flex flex-wrap gap-2">
                  <a
                    v-if="app.webUrl"
                    :href="app.webUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
                  >
                    <Icon name="mdi:web" size="16" />
                    Open Web App
                  </a>
                  <a
                    v-if="app.playStoreUrl"
                    :href="app.playStoreUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                  >
                    <Icon name="mdi:google-play" size="16" />
                    Google Play
                  </a>
                  <a
                    v-if="app.hasApk"
                    :href="getAppDownloadUrl(app.slug, 'apk')"
                    class="inline-flex items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
                  >
                    <Icon name="mdi:download" size="16" />
                    Download APK
                  </a>
                  <a
                    v-if="app.hasMsix"
                    :href="getAppDownloadUrl(app.slug, 'msix')"
                    class="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    <Icon name="mdi:download" size="16" />
                    Download MSIX
                  </a>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
