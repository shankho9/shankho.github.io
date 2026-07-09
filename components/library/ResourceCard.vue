<script setup lang="ts">
import type { ResourceListItem, ResourceType } from '~/types/resources'
import {
  formatResourceUpdatedAt,
  getResourceLinkHost,
  getResourceTypeIcon,
} from '~/utils/resources/display'

interface Props {
  item: ResourceListItem
  type?: ResourceType | 'default'
}

const props = withDefaults(defineProps<Props>(), {
  type: 'default',
})

const cardType = computed((): ResourceType => {
  if (props.type !== 'default') return props.type
  return props.item.resourceType
})

const title = computed(() => props.item.title)
const description = computed(() => props.item.description)
const link = computed(() => props.item.link)
const category = computed(() => props.item.category)
const author = computed(() => props.item.author)
const publisher = computed(() => props.item.publisher)
const year = computed(() => props.item.year)
const status = computed(() => props.item.status)
const rating = computed(() => props.item.rating)
const tags = computed(() => props.item.tags.slice(0, 3))
const formattedUpdatedAt = computed(() => formatResourceUpdatedAt(props.item.updatedAt))
const linkHost = computed(() => getResourceLinkHost(link.value))

const typeIcon = computed(() => getResourceTypeIcon(cardType.value, props.item.icon))
const imageUrl = computed(() => props.item.coverImageUrl || null)
const imageFailed = ref(false)

watch(imageUrl, () => {
  imageFailed.value = false
})

const typeLabel = computed(() => {
  switch (cardType.value) {
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
  switch (cardType.value) {
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
</script>

<template>
  <a
    :href="link || '#'"
    :target="link ? '_blank' : undefined"
    :rel="link ? 'noopener noreferrer' : undefined"
    class="group flex h-full flex-col gap-3 rounded-xl border border-gray-200/90 bg-white p-3 shadow-sm transition-all hover:border-sky-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-sky-600"
  >
    <div class="flex items-start gap-3">
      <div
        class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-sky-100 to-indigo-100 dark:from-sky-900/40 dark:to-indigo-900/40"
      >
        <CommonExternalImage
          v-if="imageUrl && !imageFailed"
          :src="imageUrl"
          :alt="title"
          img-class="h-full w-full object-cover"
          @error="imageFailed = true"
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
