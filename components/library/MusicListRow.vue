<script setup lang="ts">
export type MusicType = 'lyrics' | 'instrumental' | 'notation'

export interface MusicListItem {
  id: string
  path: string
  slug: string
  title: string
  musicType: MusicType
  artist?: string
  language?: string
  youtubeUrl?: string
  spotifyUrl?: string
  tags?: string[]
  coverImage?: string
}

interface Props {
  item: MusicListItem
}

const props = defineProps<Props>()

const emit = defineEmits<{
  select: [item: MusicListItem]
}>()

function onSelect() {
  emit('select', props.item)
}

const typeLabel: Record<MusicType, string> = {
  lyrics: 'Lyrics',
  instrumental: 'Instrumental',
  notation: 'Notation',
}

const typeIcon: Record<MusicType, string> = {
  lyrics: 'mdi:music-note',
  instrumental: 'mdi:music-box-outline',
  notation: 'mdi:music-clef-treble',
}

const typeBadgeClass: Record<MusicType, string> = {
  lyrics: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
  instrumental: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  notation: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
}
</script>

<template>
  <button
    type="button"
    class="group flex w-full items-center gap-3 rounded-xl border border-gray-200/90 bg-white p-3 text-left shadow-sm transition-all hover:border-sky-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-sky-600"
    :aria-label="`View ${item.title}`"
    @click="onSelect"
  >
    <div
      class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-sky-100 to-indigo-100 dark:from-sky-900/40 dark:to-indigo-900/40"
    >
      <NuxtImg
        v-if="item.coverImage"
        :src="item.coverImage"
        :alt="item.title"
        class="h-full w-full object-cover"
        loading="lazy"
        format="webp"
        quality="80"
      />
      <Icon
        v-else
        :name="typeIcon[item.musicType]"
        class="text-2xl text-sky-700 dark:text-sky-400"
      />
    </div>

    <div class="min-w-0 flex-1">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <h3
            class="truncate text-base font-semibold text-zinc-800 group-hover:text-sky-700 dark:text-zinc-100 dark:group-hover:text-sky-400"
          >
            {{ item.title }}
          </h3>
          <p v-if="item.artist" class="truncate text-sm text-zinc-500 dark:text-zinc-400">
            {{ item.artist }}
          </p>
        </div>
        <span
          :class="[
            'hidden shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold sm:inline-flex',
            typeBadgeClass[item.musicType],
          ]"
        >
          <Icon :name="typeIcon[item.musicType]" size="12" />
          {{ typeLabel[item.musicType] }}
        </span>
      </div>

      <div
        class="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400"
      >
        <span v-if="item.language" class="inline-flex items-center gap-0.5">
          <Icon name="mdi:translate" size="12" />
          {{ item.language }}
        </span>
        <span
          v-if="item.youtubeUrl"
          class="inline-flex items-center gap-0.5 text-red-600 dark:text-red-400"
        >
          <Icon name="mdi:youtube" size="12" />
          YouTube
        </span>
        <span
          v-if="item.spotifyUrl"
          class="inline-flex items-center gap-0.5 text-green-600 dark:text-green-400"
        >
          <Icon name="mdi:spotify" size="12" />
          Spotify
        </span>
        <span
          v-for="tag in item.tags?.slice(0, 2)"
          :key="tag"
          class="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-slate-700"
        >
          {{ tag }}
        </span>
      </div>
    </div>

    <Icon
      name="mdi:chevron-right"
      class="shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-sky-600"
      size="20"
    />
  </button>
</template>
