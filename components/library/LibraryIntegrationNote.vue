<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

export type LibraryTabId =
  | 'photos'
  | 'videos'
  | 'musical-notes'
  | 'travel-map'
  | 'resources'
  | 'apps'

const props = defineProps<{
  tab: LibraryTabId
}>()

const STORAGE_PREFIX = 'library-integration'

function storageKey(suffix: string) {
  return `${STORAGE_PREFIX}:${props.tab}:${suffix}`
}

const dismissed = ref(false)
/** Expanded by default on first visit; collapsed state is remembered per tab. */
const expanded = ref(true)

function loadTabState() {
  if (!import.meta.client) return

  dismissed.value = localStorage.getItem(storageKey('dismissed')) === '1'

  const savedExpanded = localStorage.getItem(storageKey('expanded'))
  expanded.value = savedExpanded === null ? true : savedExpanded === '1'
}

function persistExpanded(value: boolean) {
  if (!import.meta.client) return
  localStorage.setItem(storageKey('expanded'), value ? '1' : '0')
}

function dismiss() {
  dismissed.value = true
  if (import.meta.client) {
    localStorage.setItem(storageKey('dismissed'), '1')
  }
}

function toggleExpanded() {
  expanded.value = !expanded.value
  persistExpanded(expanded.value)
}

onMounted(loadTabState)

watch(
  () => props.tab,
  () => {
    loadTabState()
  },
)

const INTEGRATION_INFO: Record<
  LibraryTabId,
  { emoji: string; label: string; stack: string; blurb: string }
> = {
  photos: {
    emoji: '📸',
    label: 'Photos',
    stack: 'ImageKit + PostgreSQL',
    blurb:
      'Your gallery is powered by ImageKit — private folders, fast CDN delivery, rich metadata. Likes & comments live in Postgres. Neat stack, right? 😎',
  },
  videos: {
    emoji: '🎬',
    label: 'Videos',
    stack: 'ImageKit + PostgreSQL',
    blurb:
      'Same ImageKit engine as Photos, tuned for video files. Browse folders, search metadata, track engagement — all API-driven. 🚀',
  },
  'musical-notes': {
    emoji: '🎵',
    label: 'Musical Notes',
    stack: 'Tina CMS + Nuxt Content',
    blurb:
      'Lyrics & notation are Git-backed MDX — edited in Tina, rendered with love. YouTube & Spotify embeds baked in. For the music nerds among us 🎸✨',
  },
  'travel-map': {
    emoji: '🗺️',
    label: 'Travel Map',
    stack: 'Google Maps + PostgreSQL',
    blurb:
      'Places you have visited are curated in Postgres and plotted on an interactive Google Map. Pins, stories, wanderlust — cartography meets code 🌍',
  },
  resources: {
    emoji: '📚',
    label: 'Resources',
    stack: 'Tina CMS + Nuxt Content',
    blurb:
      'Books, tools & learning picks are Git-backed MDX — edited in Tina, rendered with love. Commit to publish 📖',
  },
  apps: {
    emoji: '📱',
    label: 'Apps',
    stack: 'Tina CMS + Cloudflare R2',
    blurb:
      'App listings from Tina CMS; APK/MSIX binaries in private Cloudflare R2 with presigned download links. Metadata in Git, binaries locked down 🔐',
  },
}

const info = computed(() => INTEGRATION_INFO[props.tab])
</script>

<template>
  <div
    v-if="!dismissed"
    class="overflow-hidden rounded-lg border border-violet-200/70 bg-violet-50/60 dark:border-violet-800/35 dark:bg-violet-950/20"
    role="note"
  >
    <div class="flex items-center gap-2 px-3 py-2">
      <span class="shrink-0 text-base leading-none" aria-hidden="true">{{ info.emoji }}</span>
      <button
        type="button"
        class="flex min-w-0 flex-1 items-center gap-2 text-left text-sm"
        :aria-expanded="expanded"
        @click="toggleExpanded"
      >
        <span class="font-semibold text-violet-900 dark:text-violet-100">
          Under the hood: {{ info.label }}
        </span>
        <span
          class="hidden shrink-0 rounded-full bg-violet-200/80 px-2 py-0.5 text-xs font-medium text-violet-800 sm:inline dark:bg-violet-900/50 dark:text-violet-200"
        >
          {{ info.stack }}
        </span>
        <Icon
          :name="expanded ? 'mdi:chevron-up' : 'mdi:chevron-down'"
          class="ml-auto shrink-0 text-violet-500"
          size="18"
        />
      </button>
      <button
        type="button"
        class="shrink-0 rounded p-1 text-violet-400 transition-colors hover:bg-violet-100 hover:text-violet-700 dark:hover:bg-violet-900/40 dark:hover:text-violet-200"
        aria-label="Dismiss integration note"
        @click="dismiss"
      >
        <Icon name="mdi:close" size="16" />
      </button>
    </div>
    <div
      v-if="expanded"
      class="border-t border-violet-200/60 px-3 pb-3 pt-2 text-sm leading-relaxed text-violet-800/90 dark:border-violet-800/30 dark:text-violet-200/85"
    >
      <span
        class="mb-2 inline-flex rounded-full bg-violet-200/80 px-2 py-0.5 text-xs font-medium text-violet-800 sm:hidden dark:bg-violet-900/50 dark:text-violet-200"
      >
        {{ info.stack }}
      </span>
      <p class="mt-1">{{ info.blurb }}</p>
    </div>
  </div>
</template>
