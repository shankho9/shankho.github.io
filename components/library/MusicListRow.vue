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

defineProps<Props>()

const typeLabel: Record<MusicType, string> = {
  lyrics: 'Lyrics',
  instrumental: 'Instrumental',
  notation: 'Notation',
}

const typeIcon: Record<MusicType, string> = {
  lyrics: 'mdi:music-note-text',
  instrumental: 'mdi:music-circle',
  notation: 'mdi:music-clef-treble',
}

const typeBadgeClass: Record<MusicType, string> = {
  lyrics: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
  instrumental: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  notation: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
}
</script>

<template>
  <NuxtLink
    :to="`/library/music/${item.slug}`"
    class="group flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-sky-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-sky-600 sm:flex-row sm:items-center"
  >
    <div
      class="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-sky-100 to-indigo-100 dark:from-sky-900/40 dark:to-indigo-900/40"
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
      <Icon v-else :name="typeIcon[item.musicType]" class="text-3xl text-sky-700 dark:text-sky-400" />
    </div>

    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3
            class="text-lg font-semibold text-zinc-800 group-hover:text-sky-700 dark:text-zinc-100 dark:group-hover:text-sky-400"
          >
            {{ item.title }}
          </h3>
          <p v-if="item.artist" class="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            {{ item.artist }}
          </p>
        </div>
        <span
          :class="[
            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
            typeBadgeClass[item.musicType],
          ]"
        >
          <Icon :name="typeIcon[item.musicType]" size="14" />
          {{ typeLabel[item.musicType] }}
        </span>
      </div>

      <div class="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
        <span v-if="item.language" class="inline-flex items-center gap-1">
          <Icon name="mdi:translate" size="14" />
          {{ item.language }}
        </span>
        <span v-if="item.youtubeUrl" class="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
          <Icon name="mdi:youtube" size="14" />
          YouTube
        </span>
        <span
          v-if="item.spotifyUrl"
          class="inline-flex items-center gap-1 text-green-600 dark:text-green-400"
        >
          <Icon name="mdi:spotify" size="14" />
          Spotify
        </span>
        <span
          v-for="tag in item.tags?.slice(0, 3)"
          :key="tag"
          class="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-slate-700"
        >
          {{ tag }}
        </span>
      </div>
    </div>

    <Icon
      name="mdi:chevron-right"
      class="hidden shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-sky-600 sm:block"
      size="24"
    />
  </NuxtLink>
</template>
