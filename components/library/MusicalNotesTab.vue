<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import TinaEditButton from '~/components/library/TinaEditButton.vue'
import MusicDetailModal from '~/components/music/MusicDetailModal.vue'
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

const detailOpen = ref(false)
const selectedItem = ref<MusicListItem | null>(null)

function openDetail(item: MusicListItem) {
  selectedItem.value = item
  detailOpen.value = true
}

function closeDetail() {
  detailOpen.value = false
  selectedItem.value = null
}

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
      <NuxtLink
        v-if="isAdmin"
        to="/admin"
        class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200/80 bg-sky-50/80 px-4 py-3 transition-colors hover:border-sky-400 hover:bg-sky-100/90 dark:border-sky-800/50 dark:bg-sky-950/30 dark:hover:border-sky-600 dark:hover:bg-sky-950/50"
      >
        <div class="flex items-center gap-2 text-sm font-medium text-sky-900 dark:text-sky-200">
          <Icon name="mdi:music-clef-treble" size="20" class="shrink-0" />
          <span>Edit Musical Notes in Tina CMS</span>
        </div>
        <span
          class="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white"
        >
          Open Tina CMS
          <Icon name="mdi:arrow-right" size="16" />
        </span>
      </NuxtLink>

      <LibraryTabToolbar
        v-model:search="searchQuery"
        search-placeholder="Search title, artist, tags..."
      >
        <template #tabs>
          <LibraryTabPill
            v-for="tab in musicTabs"
            :key="tab.id"
            :icon="tab.icon"
            :label="tab.label"
            :active="activeMusicTab === tab.id"
            @click="activeMusicTab = tab.id"
          />
        </template>
        <template #actions>
          <TinaEditButton />
        </template>
      </LibraryTabToolbar>

      <p v-if="searchQuery" class="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
        {{ filteredItems.length }} {{ filteredItems.length === 1 ? 'result' : 'results' }}
      </p>

      <div v-if="filteredItems.length > 0" class="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <MusicListRow
          v-for="item in filteredItems"
          :key="item.id"
          :item="item"
          @select="openDetail"
        />
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
        <p v-if="!searchQuery" class="mt-2 text-sm text-zinc-500">
          Click a card to view lyrics, notation, and streaming links.
        </p>
      </div>

      <MusicDetailModal :open="detailOpen" :slug="selectedItem?.slug" @close="closeDetail" />
    </div>
  </div>
</template>
