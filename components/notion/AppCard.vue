<script setup lang="ts">
import { computed } from 'vue'

export interface AppListItem {
  id: string
  title: string
  description: string
  version: string
  categories: string[]
  playStoreUrl: string | null
  iconUrl: string | null
  hasApk: boolean
  hasMsix: boolean
  updatedAt: string | null
}

interface Props {
  app: AppListItem
}

const props = defineProps<Props>()

const downloadUrl = (format: 'apk' | 'msix') =>
  `/api/apps/download?id=${encodeURIComponent(props.app.id)}&format=${format}`

const categoryIcon = (category: string): string => {
  const lower = category.toLowerCase()
  if (lower.includes('android')) return 'mdi:android'
  if (lower.includes('ios') || lower.includes('apple')) return 'mdi:apple'
  if (lower.includes('desktop') || lower.includes('windows')) return 'mdi:monitor'
  return 'mdi:application'
}

const formattedUpdatedAt = computed(() => {
  if (!props.app.updatedAt) return null
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(props.app.updatedAt))
  } catch {
    return null
  }
})

const hasAnyAction = computed(() => props.app.playStoreUrl || props.app.hasApk || props.app.hasMsix)
</script>

<template>
  <article
    class="group flex flex-col gap-3 rounded-xl border border-gray-200/90 bg-white p-3 shadow-sm transition-all hover:border-sky-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-sky-600 sm:flex-row sm:items-center"
  >
    <div
      class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-sky-100 to-indigo-100 dark:from-sky-900/40 dark:to-indigo-900/40"
    >
      <NuxtImg
        v-if="app.iconUrl"
        :src="app.iconUrl"
        :alt="app.title"
        class="h-full w-full object-cover"
        loading="lazy"
        format="webp"
        quality="80"
      />
      <Icon v-else name="mdi:cellphone" class="text-2xl text-sky-700 dark:text-sky-400" />
    </div>

    <div class="min-w-0 flex-1">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <h3
            class="truncate text-base font-semibold text-zinc-800 group-hover:text-sky-700 dark:text-zinc-100 dark:group-hover:text-sky-400"
          >
            {{ app.title }}
          </h3>
          <p v-if="app.version" class="text-sm text-zinc-500 dark:text-zinc-400">
            v{{ app.version }}
            <span v-if="formattedUpdatedAt" class="text-zinc-400"> · {{ formattedUpdatedAt }}</span>
          </p>
        </div>
      </div>

      <p
        v-if="app.description"
        class="mt-1 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400"
      >
        {{ app.description }}
      </p>

      <div
        v-if="app.categories.length > 0"
        class="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400"
      >
        <span
          v-for="category in app.categories.slice(0, 2)"
          :key="category"
          class="inline-flex items-center gap-0.5 rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-slate-700"
        >
          <Icon :name="categoryIcon(category)" size="12" />
          {{ category }}
        </span>
      </div>
    </div>

    <div
      v-if="hasAnyAction"
      class="flex shrink-0 flex-wrap gap-1.5 border-t border-gray-100 pt-2 sm:flex-col sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0 dark:border-slate-700"
    >
      <a
        v-if="app.playStoreUrl"
        :href="app.playStoreUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center justify-center gap-1 rounded-md bg-green-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
        title="Google Play"
        @click.stop
      >
        <Icon name="mdi:google-play" size="14" />
        Play
      </a>
      <a
        v-if="app.hasApk"
        :href="downloadUrl('apk')"
        class="inline-flex items-center justify-center gap-1 rounded-md bg-sky-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
        title="Download APK"
        @click.stop
      >
        <Icon name="mdi:download" size="14" />
        APK
      </a>
      <a
        v-if="app.hasMsix"
        :href="downloadUrl('msix')"
        class="inline-flex items-center justify-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
        title="Download MSIX"
        @click.stop
      >
        <Icon name="mdi:download" size="14" />
        MSIX
      </a>
    </div>
  </article>
</template>
