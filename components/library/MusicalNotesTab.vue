<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import MusicListRow, {
  type MusicListItem,
  type MusicType,
} from '~/components/library/MusicListRow.vue'

type MusicTab = 'lyrics' | 'instrumental' | 'notation'

const { isAdmin } = useAuth()

const activeMusicTab = ref<MusicTab>('lyrics')
const searchQuery = ref('')
const isLoading = ref(true)
const error = ref<string | null>(null)
const items = ref<MusicListItem[]>([])

const musicTabs: { id: MusicTab; label: string; icon: string }[] = [
  { id: 'lyrics', label: 'Lyrics', icon: 'mdi:music-note-text' },
  { id: 'instrumental', label: 'Instrumental', icon: 'mdi:music-circle' },
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
    <div v-if="isAdmin" class="mb-4 flex justify-end">
      <a
        href="/admin#/collections/music"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-2 rounded-lg border border-sky-600 bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
      >
        <Icon name="mdi:pencil" size="18" />
        Edit in Tina
      </a>
    </div>

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
      <div class="mb-6 flex flex-wrap gap-2">
        <button
          v-for="tab in musicTabs"
          :key="tab.id"
          :class="[
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
            activeMusicTab === tab.id
              ? 'bg-sky-700 text-white dark:bg-sky-600'
              : 'bg-gray-100 text-zinc-700 hover:bg-gray-200 dark:bg-slate-700 dark:text-zinc-300 dark:hover:bg-slate-600',
          ]"
          @click="activeMusicTab = tab.id"
        >
          <Icon :name="tab.icon" size="18" />
          {{ tab.label }}
        </button>
      </div>

      <div class="mb-6">
        <div class="relative">
          <Icon
            name="mdi:magnify"
            class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            size="20"
          />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by title, artist, language, or tags..."
            class="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-zinc-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-800 dark:text-zinc-300"
          />
        </div>
      </div>

      <div v-if="filteredItems.length > 0" class="flex flex-col gap-3">
        <MusicListRow v-for="item in filteredItems" :key="item.id" :item="item" />
      </div>

      <div v-else class="py-12 text-center">
        <Icon name="mdi:music-note-off" class="mb-4 text-6xl text-zinc-400" />
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
