<script setup lang="ts">
import { ref, computed } from 'vue'

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

const dismissed = ref(false)

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
    stack: 'Notion API',
    blurb:
      'Books, tools & learning picks sync straight from a Notion database. Edit in Notion, browse here — headless CMS vibes without the fuss 📖',
  },
  apps: {
    emoji: '📱',
    label: 'Apps',
    stack: 'Notion + Cloudflare R2',
    blurb:
      'App listings from Notion; APK/MSIX binaries in private Cloudflare R2 with presigned download links. Metadata in the cloud, binaries locked down 🔐',
  },
}

const info = computed(() => INTEGRATION_INFO[props.tab])
</script>

<template>
  <div
    v-if="!dismissed"
    class="mb-6 flex gap-3 rounded-xl border border-violet-200/80 bg-gradient-to-r from-violet-50/90 via-sky-50/80 to-indigo-50/70 px-4 py-3 dark:border-violet-800/40 dark:from-violet-950/25 dark:via-sky-950/20 dark:to-indigo-950/25"
    role="note"
  >
    <span class="mt-0.5 shrink-0 text-xl leading-none" aria-hidden="true">{{ info.emoji }}</span>
    <div class="min-w-0 flex-1 text-sm">
      <p class="font-semibold text-violet-900 dark:text-violet-100">
        <span class="mr-1">🛠️</span>
        Under the hood: {{ info.label }}
        <span
          class="ml-1.5 inline-flex rounded-full bg-violet-200/80 px-2 py-0.5 text-xs font-medium text-violet-800 dark:bg-violet-900/50 dark:text-violet-200"
        >
          {{ info.stack }}
        </span>
      </p>
      <p class="mt-1.5 leading-relaxed text-violet-800/90 dark:text-violet-200/85">
        {{ info.blurb }}
      </p>
    </div>
    <button
      type="button"
      class="shrink-0 self-start rounded p-1 text-violet-400 transition-colors hover:bg-violet-100 hover:text-violet-700 dark:hover:bg-violet-900/40 dark:hover:text-violet-200"
      aria-label="Dismiss integration note"
      @click="dismissed = true"
    >
      <Icon name="mdi:close" size="18" />
    </button>
  </div>
</template>
