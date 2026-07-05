<script setup lang="ts">
import type { NotionItem } from '~/composables/useNotion'

interface Props {
  item: NotionItem
  type?: 'book' | 'tool' | 'learning' | 'default'
}

const props = withDefaults(defineProps<Props>(), {
  type: 'default',
})

function pickString(item: NotionItem, ...keys: string[]): string {
  for (const key of keys) {
    const value = item[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function pickStringArray(item: NotionItem, ...keys: string[]): string[] {
  for (const key of keys) {
    const value = item[key]
    if (Array.isArray(value)) {
      return value
        .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
        .map((entry) => entry.trim())
    }
    if (typeof value === 'string' && value.trim()) return [value.trim()]
  }
  return []
}

const title = computed(() => {
  return pickString(props.item, 'Title', 'title', 'Name', 'name') || 'Untitled'
})

const description = computed(() => {
  return pickString(props.item, 'Description', 'description')
})

const link = computed(() => {
  return (
    pickString(props.item, 'Link', 'link', 'URL', 'url') || props.item.notionUrl || ''
  )
})

const category = computed(() => pickString(props.item, 'Category', 'category'))

const author = computed(() => pickString(props.item, 'Author', 'author'))

const publisher = computed(() => pickString(props.item, 'Publisher', 'publisher'))

const year = computed(() => {
  const raw = pickString(props.item, 'Year', 'year')
  if (raw) return raw
  const date = pickString(props.item, 'Published Date', 'publishedDate', 'Date', 'date')
  if (date) {
    try {
      return new Intl.DateTimeFormat(undefined, { year: 'numeric' }).format(new Date(date))
    } catch {
      return date
    }
  }
  return ''
})

const status = computed(() => pickString(props.item, 'Status', 'status'))

const rating = computed(() => {
  const raw = props.item.Rating ?? props.item.rating
  if (typeof raw === 'number' && !Number.isNaN(raw)) return raw
  if (typeof raw === 'string' && raw.trim()) return raw.trim()
  return ''
})

const tags = computed(() => pickStringArray(props.item, 'Tags', 'tags').slice(0, 3))

const platforms = computed(() => pickStringArray(props.item, 'Platforms', 'platforms').slice(0, 3))

const formattedUpdatedAt = computed(() => {
  const raw = props.item.updatedAt || props.item.Updated || props.item.updated
  if (!raw || typeof raw !== 'string') return null
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(raw))
  } catch {
    return null
  }
})

const linkHost = computed(() => {
  if (!link.value) return null
  try {
    return new URL(link.value).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
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

const typeLabel = computed(() => {
  switch (props.type) {
    case 'book':
      return 'Book'
    case 'tool':
      return 'Tool'
    case 'learning':
      return 'Learning'
    default:
      return 'Resource'
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

const platformIcon = (platform: string): string => {
  const lower = platform.toLowerCase()
  if (lower.includes('web') || lower.includes('browser')) return 'mdi:web'
  if (lower.includes('mobile') || lower.includes('android') || lower.includes('ios')) {
    return 'mdi:cellphone'
  }
  if (lower.includes('desktop') || lower.includes('windows') || lower.includes('mac')) {
    return 'mdi:monitor'
  }
  return 'mdi:application-outline'
}
</script>

<template>
  <a
    :href="link"
    target="_blank"
    rel="noopener noreferrer"
    class="group flex h-full flex-col gap-3 rounded-xl border border-gray-200/90 bg-white p-3 shadow-sm transition-all hover:border-sky-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-sky-600"
  >
    <div class="flex items-start gap-3">
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
          <h3
            class="line-clamp-2 text-base font-semibold text-zinc-800 group-hover:text-sky-700 dark:text-zinc-100 dark:group-hover:text-sky-400"
          >
            {{ title }}
          </h3>
          <span
            :class="[
              'inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold',
              typeBadgeClass,
            ]"
          >
            <Icon :name="typeIcon" size="12" />
            {{ typeLabel }}
          </span>
        </div>

        <p v-if="description" class="mt-1 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
          {{ description }}
        </p>
      </div>
    </div>

    <div
      class="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-gray-100 pt-2.5 text-xs text-zinc-500 dark:border-slate-700 dark:text-zinc-400"
    >
      <span v-if="author" class="inline-flex items-center gap-1" :title="author">
        <Icon name="mdi:account-outline" size="13" class="shrink-0 text-zinc-400" />
        <span class="max-w-[8rem] truncate">{{ author }}</span>
      </span>

      <span v-if="publisher" class="inline-flex items-center gap-1" :title="publisher">
        <Icon name="mdi:domain" size="13" class="shrink-0 text-zinc-400" />
        <span class="max-w-[8rem] truncate">{{ publisher }}</span>
      </span>

      <span v-if="year" class="inline-flex items-center gap-1">
        <Icon name="mdi:calendar-outline" size="13" class="shrink-0 text-zinc-400" />
        {{ year }}
      </span>

      <span v-if="category" class="inline-flex items-center gap-1">
        <Icon name="mdi:folder-outline" size="13" class="shrink-0 text-zinc-400" />
        {{ category }}
      </span>

      <span
        v-if="rating"
        class="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400"
      >
        <Icon name="mdi:star" size="13" />
        {{ rating }}
      </span>

      <span v-if="status" class="inline-flex items-center gap-1">
        <Icon name="mdi:progress-check" size="13" class="shrink-0 text-zinc-400" />
        {{ status }}
      </span>

      <span
        v-for="platform in platforms"
        :key="platform"
        class="inline-flex items-center gap-0.5 rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-slate-700"
      >
        <Icon :name="platformIcon(platform)" size="12" />
        {{ platform }}
      </span>

      <span
        v-for="tag in tags"
        :key="tag"
        class="inline-flex items-center gap-0.5 rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-slate-700"
      >
        <Icon name="mdi:tag-outline" size="12" class="text-zinc-400" />
        {{ tag }}
      </span>

      <span v-if="linkHost" class="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400">
        <Icon name="mdi:open-in-new" size="13" />
        {{ linkHost }}
      </span>

      <span v-if="formattedUpdatedAt" class="inline-flex items-center gap-1">
        <Icon name="mdi:clock-outline" size="13" class="shrink-0 text-zinc-400" />
        {{ formattedUpdatedAt }}
      </span>
    </div>
  </a>
</template>
