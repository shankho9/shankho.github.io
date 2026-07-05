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

const categoryBadgeClass = (category: string): string => {
  const lower = category.toLowerCase()
  if (lower.includes('android')) {
    return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
  }
  if (lower.includes('ios') || lower.includes('apple')) {
    return 'bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200'
  }
  if (lower.includes('desktop') || lower.includes('windows')) {
    return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300'
  }
  return 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300'
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

const downloadSummary = computed(() => {
  const parts: string[] = []
  if (props.app.hasApk) parts.push('APK')
  if (props.app.hasMsix) parts.push('MSIX')
  return parts.length > 0 ? parts.join(' · ') : null
})

const hasAnyAction = computed(
  () => props.app.playStoreUrl || props.app.hasApk || props.app.hasMsix,
)
</script>

<template>
  <article
    class="group flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800 sm:flex-row sm:items-stretch sm:p-5"
  >
    <!-- Icon -->
    <div class="flex shrink-0 justify-center sm:justify-start">
      <div
        class="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl bg-gray-100 dark:bg-slate-700 sm:h-28 sm:w-28"
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
        <Icon
          v-else
          name="mdi:cellphone"
          class="text-4xl text-sky-700 dark:text-sky-400"
        />
      </div>
    </div>

    <!-- Main content -->
    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div class="min-w-0">
          <h3 class="text-xl font-semibold text-zinc-800 dark:text-zinc-100">
            {{ app.title }}
          </h3>
          <p v-if="app.version" class="mt-0.5 text-sm font-medium text-sky-600 dark:text-sky-400">
            Version {{ app.version }}
          </p>
        </div>
        <div v-if="app.categories.length > 0" class="flex flex-wrap gap-1.5">
          <span
            v-for="category in app.categories"
            :key="category"
            :class="[
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
              categoryBadgeClass(category),
            ]"
          >
            <Icon :name="categoryIcon(category)" size="14" />
            {{ category }}
          </span>
        </div>
      </div>

      <p
        v-if="app.description"
        class="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300 sm:text-base"
      >
        {{ app.description }}
      </p>
      <p v-else class="mt-3 text-sm italic text-zinc-400 dark:text-zinc-500">No description</p>

      <!-- Metadata row -->
      <dl class="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-zinc-500 dark:text-zinc-400">
        <div v-if="formattedUpdatedAt" class="flex items-center gap-1.5">
          <Icon name="mdi:calendar-clock" size="14" />
          <dt class="sr-only">Last updated</dt>
          <dd>Updated {{ formattedUpdatedAt }}</dd>
        </div>
        <div v-if="downloadSummary" class="flex items-center gap-1.5">
          <Icon name="mdi:package-variant" size="14" />
          <dt class="sr-only">Downloads</dt>
          <dd>Direct download: {{ downloadSummary }}</dd>
        </div>
        <div v-if="app.playStoreUrl" class="flex items-center gap-1.5">
          <Icon name="mdi:google-play" size="14" />
          <dt class="sr-only">Store</dt>
          <dd>Google Play available</dd>
        </div>
        <div v-if="!hasAnyAction" class="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
          <Icon name="mdi:information-outline" size="14" />
          <dd>No download links configured</dd>
        </div>
      </dl>
    </div>

    <!-- Actions -->
    <div
      v-if="hasAnyAction"
      class="flex shrink-0 flex-row flex-wrap gap-2 border-t border-gray-100 pt-4 dark:border-slate-700 sm:w-44 sm:flex-col sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0"
    >
      <a
        v-if="app.playStoreUrl"
        :href="app.playStoreUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 sm:flex-none"
      >
        <Icon name="mdi:google-play" size="18" />
        Play Store
      </a>
      <a
        v-if="app.hasApk"
        :href="downloadUrl('apk')"
        class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-sky-700 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-700 sm:flex-none"
      >
        <Icon name="mdi:download" size="18" />
        APK
      </a>
      <a
        v-if="app.hasMsix"
        :href="downloadUrl('msix')"
        class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 sm:flex-none"
      >
        <Icon name="mdi:download" size="18" />
        MSIX
      </a>
    </div>
  </article>
</template>
