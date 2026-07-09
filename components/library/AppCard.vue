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

const cardDescription = computed(
  () => props.app.description.trim() || 'Tap for details',
)

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
    class="group flex h-full cursor-pointer flex-col gap-3 rounded-xl border border-gray-200/90 bg-white p-3 text-left shadow-sm transition-all hover:border-sky-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-sky-600"
    @click="onCardClick"
    @keydown.enter.prevent="onCardClick"
    @keydown.space.prevent="onCardClick"
  >
    <div class="flex items-start gap-3">
      <div
        class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-sky-100 to-indigo-100 dark:from-sky-900/40 dark:to-indigo-900/40"
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
        <h3
          class="line-clamp-2 text-base font-semibold text-zinc-800 group-hover:text-sky-700 dark:text-zinc-100 dark:group-hover:text-sky-400"
        >
          {{ app.title }}
        </h3>

        <p
          :class="[
            'mt-1 line-clamp-2 text-xs',
            app.description.trim()
              ? 'text-zinc-500 dark:text-zinc-400'
              : 'italic text-zinc-400 dark:text-zinc-500',
          ]"
        >
          {{ cardDescription }}
        </p>
      </div>
    </div>

    <div
      class="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-gray-100 pt-2.5 text-xs text-zinc-500 dark:border-slate-700 dark:text-zinc-400"
    >
      <span
        v-if="app.version"
        class="inline-flex items-center gap-1 font-medium text-zinc-600 dark:text-zinc-300"
      >
        <Icon name="mdi:tag-outline" size="13" class="shrink-0 text-zinc-400" />
        v{{ app.version }}
      </span>

      <span v-if="formattedUpdatedAt" class="inline-flex items-center gap-1">
        <Icon name="mdi:update" size="13" class="shrink-0 text-zinc-400" />
        {{ formattedUpdatedAt }}
      </span>

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
        v-if="app.playStoreUrl"
        class="inline-flex items-center gap-0.5 text-green-600 dark:text-green-400"
        title="Available on Google Play"
      >
        <Icon name="mdi:google-play" size="13" />
        Play Store
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

    <div
      v-if="hasAnyAction"
      class="mt-auto flex flex-wrap gap-1.5 border-t border-gray-100 pt-2.5 dark:border-slate-700"
    >
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
  </article>
</template>
