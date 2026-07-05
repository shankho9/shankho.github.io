<script setup lang="ts">
const search = defineModel<string>('search', { default: '' })

withDefaults(
  defineProps<{
    searchPlaceholder?: string
    showSearch?: boolean
  }>(),
  {
    searchPlaceholder: 'Search...',
    showSearch: true,
  },
)
</script>

<template>
  <div
    class="sticky top-0 z-10 -mx-1 mb-5 flex flex-col gap-3 rounded-xl border border-gray-200/80 bg-white/95 px-3 py-3 backdrop-blur-sm dark:border-slate-700/80 dark:bg-slate-900/95 sm:flex-row sm:items-center"
  >
    <div v-if="$slots.tabs" class="flex flex-wrap gap-1.5">
      <slot name="tabs" />
    </div>

    <div v-if="showSearch" class="relative min-w-0 flex-1 sm:max-w-sm">
      <Icon
        name="mdi:magnify"
        class="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
        size="18"
      />
      <input
        v-model="search"
        type="search"
        :placeholder="searchPlaceholder"
        class="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-zinc-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-800 dark:text-zinc-300"
      />
    </div>

    <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
