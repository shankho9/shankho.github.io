<script setup lang="ts">
export interface AppListItem {
  id: string
  title: string
  description: string
  version: string
  platforms: string[]
  playStoreUrl: string | null
  iconUrl: string | null
  category: string
  hasApk: boolean
  hasMsix: boolean
}

interface Props {
  app: AppListItem
}

const props = defineProps<Props>()

const downloadUrl = (format: 'apk' | 'msix') =>
  `/api/apps/download?id=${encodeURIComponent(props.app.id)}&format=${format}`

const platformIcon = (platform: string): string => {
  const lower = platform.toLowerCase()
  if (lower.includes('android')) return 'mdi:android'
  if (lower.includes('windows')) return 'mdi:microsoft-windows'
  if (lower.includes('ios') || lower.includes('apple')) return 'mdi:apple'
  return 'mdi:cellphone'
}
</script>

<template>
  <div
    class="group bg-white dark:bg-slate-800 rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border border-gray-200 dark:border-slate-700 flex flex-col"
  >
    <!-- Icon / Image -->
    <div v-if="app.iconUrl" class="w-full h-48 overflow-hidden bg-gray-100 dark:bg-slate-700">
      <NuxtImg
        :src="app.iconUrl"
        :alt="app.title"
        class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        loading="lazy"
        format="webp"
        quality="80"
      />
    </div>

    <div class="p-6 flex-1 flex flex-col">
      <div class="flex items-start gap-3 mb-3">
        <Icon
          v-if="!app.iconUrl"
          name="mdi:cellphone"
          class="text-2xl text-sky-700 dark:text-sky-400 mt-1 flex-shrink-0"
        />
        <div class="flex-1 min-w-0">
          <h3 class="text-xl font-semibold text-zinc-800 dark:text-zinc-200">
            {{ app.title }}
          </h3>
          <p v-if="app.version" class="text-sm text-sky-600 dark:text-sky-400 font-medium mt-1">
            v{{ app.version }}
          </p>
        </div>
      </div>

      <p v-if="app.description" class="text-zinc-600 dark:text-zinc-400 mb-3 flex-1">
        {{ app.description }}
      </p>

      <div v-if="app.platforms.length > 0 || app.category" class="flex items-center gap-2 flex-wrap mb-4">
        <span
          v-for="platform in app.platforms"
          :key="platform"
          class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300"
        >
          <Icon :name="platformIcon(platform)" size="14" />
          {{ platform }}
        </span>
        <span
          v-if="app.category"
          class="px-2 py-1 text-xs font-medium rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
        >
          {{ app.category }}
        </span>
      </div>

      <div class="flex flex-wrap gap-2 mt-auto">
        <a
          v-if="app.playStoreUrl"
          :href="app.playStoreUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors"
        >
          <Icon name="mdi:google-play" size="18" />
          Play Store
        </a>
        <a
          v-if="app.hasApk"
          :href="downloadUrl('apk')"
          class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg bg-sky-700 hover:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-700 text-white transition-colors"
        >
          <Icon name="mdi:download" size="18" />
          Download APK
        </a>
        <a
          v-if="app.hasMsix"
          :href="downloadUrl('msix')"
          class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
        >
          <Icon name="mdi:download" size="18" />
          Download MSIX
        </a>
      </div>
    </div>
  </div>
</template>
