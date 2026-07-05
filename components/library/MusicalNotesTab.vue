<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import MusicListRow, {
  type MusicListItem,
  type MusicType,
} from '~/components/library/MusicListRow.vue'

type MusicTab = 'lyrics' | 'instrumental' | 'notation'

const { isAdmin } = useAuth()
const config = useRuntimeConfig()
const tinaConfigured = computed(() => Boolean(config.public.tinaClientId))

const activeMusicTab = ref<MusicTab>('lyrics')
const searchQuery = ref('')
const isLoading = ref(true)
const error = ref<string | null>(null)
const items = ref<MusicListItem[]>([])

const musicTabs: { id: MusicTab; label: string; icon: string }[] = [
  { id: 'lyrics', label: 'Lyrics', icon: 'mdi:music-note' },
  { id: 'instrumental', label: 'Instrumental', icon: 'mdi:music-box-outline' },
  { id: 'notation', label: 'Notation', icon: 'mdi:music-clef-treble' },
]

function slugFromPath(path: string): string {
  const segment = path.split('/').filter(Boolean).pop() || ''
  return segment.replace(/\.mdx?$/, '')
}

function toListItem(doc: {
  id: string
  path: string
  title?: string
  musicType?: MusicType
  artist?: string
  language?: string
  youtubeUrl?: string
  spotifyUrl?: string
  tags?: string[]
  coverImage?: string
  published?: boolean
}): MusicListItem | null {
  if (!doc.published) return null
  if (!doc.musicType) return null
  return {
    id: doc.id,
    path: doc.path,
    slug: slugFromPath(doc.path),
    title: doc.title || 'Untitled',
    musicType: doc.musicType,
    artist: doc.artist,
    language: doc.language,
    youtubeUrl: doc.youtubeUrl,
    spotifyUrl: doc.spotifyUrl,
    tags: doc.tags,
    coverImage: doc.coverImage,
  }
}

const tabItems = computed(() =>
  items.value.filter((item) => item.musicType === activeMusicTab.value),
)

const filteredItems = computed(() => {
  if (!searchQuery.value.trim()) return tabItems.value
  const q = searchQuery.value.toLowerCase().trim()
  return tabItems.value.filter((item) => {
    if (item.title.toLowerCase().includes(q)) return true
    if (item.artist?.toLowerCase().includes(q)) return true
    if (item.language?.toLowerCase().includes(q)) return true
    if (item.tags?.some((t) => t.toLowerCase().includes(q))) return true
    return false
  })
})

const loadMusic = async () => {
  isLoading.value = true
  error.value = null
  try {
    const docs = await queryCollection('music').all()
    items.value = docs.map(toListItem).filter((item): item is MusicListItem => item !== null)
  } catch (err) {
    console.error('[MusicalNotesTab] Failed to load music:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load musical notes'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadMusic()
})

defineExpose({ items, loadMusic, isLoading })
</script>

<template>
  <div>
    <div v-if="isLoading" class="py-12 text-center">
      <Icon name="svg-spinners:180-ring" class="mb-4 text-4xl text-sky-700 dark:text-sky-400" />
      <p class="text-zinc-600 dark:text-zinc-400">Loading musical notes...</p>
    </div>

    <div
      v-else-if="error"
      class="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20"
    >
      <Icon name="mdi:alert-circle" class="mb-4 text-4xl text-red-600 dark:text-red-400" />
      <p class="mb-2 text-red-600 dark:text-red-400">{{ error }}</p>
      <button
        class="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
        @click="loadMusic"
      >
        <Icon name="mdi:refresh" class="mr-2 inline" size="18" />
        Try Again
      </button>
    </div>

    <div v-else>
      <div
        class="sticky top-0 z-10 -mx-1 mb-4 flex flex-col gap-3 rounded-xl border border-gray-200/80 bg-white/95 px-3 py-3 backdrop-blur-sm dark:border-slate-700/80 dark:bg-slate-900/95 sm:flex-row sm:items-center"
      >
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="tab in musicTabs"
            :key="tab.id"
            :class="[
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              activeMusicTab === tab.id
                ? 'bg-sky-700 text-white dark:bg-sky-600'
                : 'bg-gray-100 text-zinc-700 hover:bg-gray-200 dark:bg-slate-700 dark:text-zinc-300 dark:hover:bg-slate-600',
            ]"
            @click="activeMusicTab = tab.id"
          >
            <Icon :name="tab.icon" size="16" />
            <span class="hidden sm:inline">{{ tab.label }}</span>
          </button>
        </div>

        <div class="relative min-w-0 flex-1 sm:max-w-xs">
          <Icon
            name="mdi:magnify"
            class="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
            size="18"
          />
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Search title, artist, tags..."
            class="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-zinc-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-800 dark:text-zinc-300"
          />
        </div>

        <a
          v-if="isAdmin && tinaConfigured"
          href="/admin#/collections/music"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700"
        >
          <Icon name="mdi:pencil" size="16" />
          Edit in Tina
        </a>
        <p
          v-else-if="isAdmin"
          class="shrink-0 text-xs text-amber-700 dark:text-amber-300"
          title="Set NUXT_PUBLIC_TINA_CLIENT_ID and TINA_TOKEN on Vercel"
        >
          Tina not configured
        </p>
      </div>

      <p v-if="searchQuery" class="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
        {{ filteredItems.length }} {{ filteredItems.length === 1 ? 'result' : 'results' }}
      </p>

      <div
        v-if="filteredItems.length > 0"
        class="grid grid-cols-1 gap-3 lg:grid-cols-2"
      >
        <MusicListRow v-for="item in filteredItems" :key="item.id" :item="item" />
      </div>

      <div v-else class="py-12 text-center">
        <Icon name="mdi:music-off" class="mb-4 text-6xl text-zinc-400" />
        <p class="text-lg text-zinc-600 dark:text-zinc-400">
          {{
            searchQuery
              ? `No results matching "${searchQuery}"`
              : `No ${activeMusicTab} entries yet`
          }}
        </p>
        <p v-if="isAdmin && !searchQuery" class="mt-2 text-sm text-zinc-500">
          Use <strong>Edit in Tina</strong> to add content.
        </p>
      </div>
    </div>
  </div>
</template>
