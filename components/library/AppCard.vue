<script setup lang="ts">
import { computed } from 'vue'
import type { AppListItem } from '~/types/apps'
import {
  appHasAnyAction,
  formatAppUpdatedAt,
  getAppCategoryIcon,
  getAppDownloadUrl,
} from '~/utils/apps/display'

interface Props {
  app: AppListItem
}

const props = defineProps<Props>()

const emit = defineEmits<{
  select: []
}>()

const cardDescription = computed(() => props.app.description.trim() || 'Tap for details')

const detailPreview = computed(() => {
  const details = props.app.details?.trim()
  if (!details) return ''
  // Avoid repeating the short description when details start the same way
  if (details === props.app.description.trim()) return ''
  return details
})

const formattedUpdatedAt = computed(() => formatAppUpdatedAt(props.app.updatedAt))
const hasAnyAction = computed(() => appHasAnyAction(props.app))
const imageFailed = ref(false)

watch(
  () => props.app.iconUrl,
  () => {
    imageFailed.value = false
  },
)

function onCardClick() {
  emit('select')
}
</script>

<template>
  <article
    role="button"
    tabindex="0"
    class="group flex w-full cursor-pointer items-start gap-3 rounded-xl border border-gray-200/90 bg-white p-3 text-left shadow-sm transition-all hover:border-sky-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-sky-600 sm:items-center sm:gap-4 sm:p-4"
    @click="onCardClick"
    @keydown.enter.prevent="onCardClick"
    @keydown.space.prevent="onCardClick"
  >
    <div
      class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-sky-100 to-indigo-100 dark:from-sky-900/40 dark:to-indigo-900/40 sm:h-16 sm:w-16"
    >
      <CommonExternalImage
        v-if="app.iconUrl && !imageFailed"
        :src="app.iconUrl"
        :alt="app.title"
        img-class="h-full w-full object-cover"
        @error="imageFailed = true"
      />
      <Icon v-else name="mdi:cellphone" class="text-2xl text-sky-700 dark:text-sky-400" />
    </div>

    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div class="min-w-0">
          <h3
            class="text-base font-semibold text-zinc-800 group-hover:text-sky-700 dark:text-zinc-100 dark:group-hover:text-sky-400"
          >
            {{ app.title }}
          </h3>
          <p v-if="app.version" class="mt-0.5 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            v{{ app.version }}
            <span v-if="formattedUpdatedAt"> · Updated {{ formattedUpdatedAt }}</span>
          </p>
        </div>
      </div>

      <p
        :class="[
          'mt-1.5 line-clamp-2 text-sm',
          app.description.trim()
            ? 'text-zinc-600 dark:text-zinc-300'
            : 'italic text-zinc-400 dark:text-zinc-500',
        ]"
      >
        {{ cardDescription }}
      </p>

      <p v-if="detailPreview" class="mt-1 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
        {{ detailPreview }}
      </p>

      <div
        class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-zinc-500 dark:text-zinc-400"
      >
        <span
          v-for="category in app.categories"
          :key="category"
          class="inline-flex items-center gap-0.5 rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-slate-700"
        >
          <Icon :name="getAppCategoryIcon(category)" size="12" />
          {{ category }}
        </span>

        <span
          v-if="app.webUrl"
          class="inline-flex items-center gap-0.5 text-violet-600 dark:text-violet-400"
          title="Web app available"
        >
          <Icon name="mdi:web" size="13" />
          Web
        </span>

        <span
          v-if="app.storeUrl"
          class="inline-flex items-center gap-0.5 text-green-600 dark:text-green-400"
          title="Available on store"
        >
          <Icon name="mdi:store" size="13" />
          Store
        </span>

        <span
          v-if="app.hasApk"
          class="inline-flex items-center gap-0.5 text-sky-600 dark:text-sky-400"
          title="APK download available"
        >
          <Icon name="mdi:android" size="13" />
          APK
        </span>

        <span
          v-if="app.hasMsix"
          class="inline-flex items-center gap-0.5 text-indigo-600 dark:text-indigo-400"
          title="MSIX download available"
        >
          <Icon name="mdi:microsoft-windows" size="13" />
          MSIX
        </span>
      </div>

      <div v-if="hasAnyAction" class="mt-2.5 flex flex-wrap gap-1.5">
        <a
          v-if="app.webUrl"
          :href="app.webUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center justify-center gap-1 rounded-md bg-violet-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
          title="Open web app"
          @click.stop
        >
          <Icon name="mdi:web" size="14" />
          Web
        </a>
        <a
          v-if="app.storeUrl"
          :href="app.storeUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center justify-center gap-1 rounded-md bg-green-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
          title="Open store page"
          @click.stop
        >
          <Icon name="mdi:store" size="14" />
          Store
        </a>
        <a
          v-if="app.hasApk"
          :href="getAppDownloadUrl(app.slug, 'apk')"
          class="inline-flex items-center justify-center gap-1 rounded-md bg-sky-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
          title="Download APK"
          @click.stop
        >
          <Icon name="mdi:download" size="14" />
          APK
        </a>
        <a
          v-if="app.hasMsix"
          :href="getAppDownloadUrl(app.slug, 'msix')"
          class="inline-flex items-center justify-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
          title="Download MSIX"
          @click.stop
        >
          <Icon name="mdi:download" size="14" />
          MSIX
        </a>
      </div>
    </div>

    <Icon
      name="mdi:chevron-right"
      class="mt-1 hidden shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-sky-600 sm:mt-0 sm:block"
      size="20"
    />
  </article>
</template>
