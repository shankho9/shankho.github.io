<script setup lang="ts">
import type { NotionItem } from '~/composables/useNotion'

interface Props {
  item: NotionItem
  type?: 'book' | 'tool' | 'learning' | 'default'
}

const props = withDefaults(defineProps<Props>(), {
  type: 'default',
})

const title = computed(() => {
  return props.item.Title || props.item.title || props.item.Name || props.item.name || 'Untitled'
})

const description = computed(() => {
  return props.item.Description || props.item.description || ''
})

const link = computed(() => {
  return (
    props.item.Link || props.item.link || props.item.URL || props.item.url || props.item.notionUrl
  )
})

const category = computed(() => {
  return props.item.Category || props.item.category || ''
})

const author = computed(() => {
  return props.item.Author || props.item.author || ''
})

const typeIcon = computed(() => {
  const custom = props.item.Icon || props.item.icon
  if (typeof custom === 'string' && custom) return custom
  switch (props.type) {
    case 'book':
      return 'mdi:book-open-variant'
    case 'tool':
      return 'mdi:tools'
    case 'learning':
      return 'mdi:school'
    default:
      return 'mdi:link'
  }
})

const typeBadgeClass = computed(() => {
  switch (props.type) {
    case 'book':
      return 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300'
    case 'tool':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
    case 'learning':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
    default:
      return 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300'
  }
})

const imageUrl = computed(() => {
  const image = props.item.Image || props.item.image || props.item.Cover || props.item.cover
  if (Array.isArray(image) && image.length > 0) return image[0]
  if (typeof image === 'string' && image) return image
  return null
})
</script>

<template>
  <a
    :href="link"
    target="_blank"
    rel="noopener noreferrer"
    class="group flex items-center gap-3 rounded-xl border border-gray-200/90 bg-white p-3 shadow-sm transition-all hover:border-sky-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-sky-600"
  >
    <div
      class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-sky-100 to-indigo-100 dark:from-sky-900/40 dark:to-indigo-900/40"
    >
      <NuxtImg
        v-if="imageUrl"
        :src="imageUrl"
        :alt="title"
        class="h-full w-full object-cover"
        loading="lazy"
        format="webp"
        quality="80"
      />
      <Icon v-else :name="typeIcon" class="text-2xl text-sky-700 dark:text-sky-400" />
    </div>

    <div class="min-w-0 flex-1">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <h3
            class="truncate text-base font-semibold text-zinc-800 group-hover:text-sky-700 dark:text-zinc-100 dark:group-hover:text-sky-400"
          >
            {{ title }}
          </h3>
          <p v-if="author" class="truncate text-sm text-zinc-500 dark:text-zinc-400">
            {{ author }}
          </p>
        </div>
        <span
          :class="[
            'hidden shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold capitalize sm:inline',
            typeBadgeClass,
          ]"
        >
          {{ type }}
        </span>
      </div>

      <p v-if="description" class="mt-1 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
        {{ description }}
      </p>

      <div
        v-if="category"
        class="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400"
      >
        <span class="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-slate-700">{{ category }}</span>
      </div>
    </div>

    <Icon
      name="mdi:open-in-new"
      class="shrink-0 text-zinc-400 transition-colors group-hover:text-sky-600"
      size="18"
    />
  </a>
</template>
