<script setup lang="ts">
const props = defineProps<{
  currentPage: number
  totalPages: number
  rangeLabel: string
}>()

const emit = defineEmits<{
  'update:currentPage': [page: number]
}>()

const showPager = computed(() => props.totalPages > 1)

function go(page: number) {
  if (page < 1 || page > props.totalPages) return
  emit('update:currentPage', page)
}
</script>

<template>
  <div
    v-if="totalPages > 0"
    class="mt-5 flex flex-col items-center justify-between gap-3 border-t border-gray-100 pt-4 text-sm text-zinc-500 dark:border-slate-700 dark:text-zinc-400 sm:flex-row"
  >
    <p class="text-xs sm:text-sm">{{ rangeLabel }}</p>

    <div v-if="showPager" class="flex items-center gap-1.5">
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-zinc-200 dark:hover:bg-slate-800"
        :disabled="currentPage <= 1"
        aria-label="Previous page"
        @click="go(currentPage - 1)"
      >
        <Icon name="mdi:chevron-left" size="16" />
        Prev
      </button>

      <span class="min-w-[4.5rem] text-center text-xs font-medium text-zinc-600 dark:text-zinc-300">
        {{ currentPage }} / {{ totalPages }}
      </span>

      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-zinc-200 dark:hover:bg-slate-800"
        :disabled="currentPage >= totalPages"
        aria-label="Next page"
        @click="go(currentPage + 1)"
      >
        Next
        <Icon name="mdi:chevron-right" size="16" />
      </button>
    </div>
  </div>
</template>
