<script setup lang="ts">
import type { NotionItem } from '~/composables/useNotion'

interface Props {
  item: NotionItem
  type?: 'book' | 'tool' | 'learning' | 'default'
}

const props = withDefaults(defineProps<Props>(), {
  type: 'default',
})

// Extract common properties (adapt based on your Notion database structure)
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

const icon = computed(() => {
  return props.item.Icon || props.item.icon || getDefaultIcon()
})

// Extract image URL from various possible property names
const imageUrl = computed(() => {
  // Check for Image property (Files type in Notion)
  const image = props.item.Image || props.item.image || props.item.Cover || props.item.cover
  // If it's an array, take the first one; if it's a string, use it directly
  if (Array.isArray(image) && image.length > 0) {
    return image[0]
  }
  if (typeof image === 'string' && image) {
    return image
  }
  return null
})

const getDefaultIcon = () => {
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
}
</script>

<template>
  <a
    :href="link"
    target="_blank"
    rel="noopener noreferrer"
    class="group bg-white dark:bg-slate-800 rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border border-gray-200 dark:border-slate-700 flex flex-col"
  >
    <!-- Image Section -->
    <div v-if="imageUrl" class="w-full h-48 overflow-hidden bg-gray-100 dark:bg-slate-700">
      <NuxtImg
        :src="imageUrl"
        :alt="title"
        class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        loading="lazy"
        format="webp"
        quality="80"
      />
    </div>

    <!-- Content Section -->
    <div class="p-6 flex-1 flex flex-col">
      <div class="flex items-start justify-between mb-3">
        <div class="flex items-start gap-3 flex-1">
          <Icon
            v-if="!imageUrl && icon"
            :name="icon"
            class="text-2xl text-sky-700 dark:text-sky-400 mt-1 flex-shrink-0"
          />
          <div class="flex-1">
            <h3
              class="text-xl font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors"
            >
              {{ title }}
            </h3>
            <p v-if="author" class="text-sm text-sky-600 dark:text-sky-400 font-medium mt-1">
              {{ author }}
            </p>
          </div>
        </div>
        <Icon name="mdi:open-in-new" class="text-zinc-400 group-hover:text-sky-600 flex-shrink-0" />
      </div>

      <p v-if="description" class="text-zinc-600 dark:text-zinc-400 mb-3 flex-1">
        {{ description }}
      </p>

      <div v-if="category" class="flex items-center gap-2 flex-wrap">
        <span
          class="px-2 py-1 text-xs font-medium rounded-full bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300"
        >
          {{ category }}
        </span>
      </div>
    </div>
  </a>
</template>
