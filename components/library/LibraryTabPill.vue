<script setup lang="ts">
defineProps<{
  active?: boolean
  icon?: string
  label: string
  count?: number
}>()
</script>

<template>
  <button
    type="button"
    :class="[
      'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
      active
        ? 'bg-sky-700 text-white dark:bg-sky-600'
        : 'bg-gray-100 text-zinc-700 hover:bg-gray-200 dark:bg-slate-700 dark:text-zinc-300 dark:hover:bg-slate-600',
    ]"
  >
    <Icon v-if="icon" :name="icon" size="16" />
    <span>{{ label }}</span>
    <span
      v-if="count !== undefined && count > 0"
      :class="[
        'rounded-full px-1.5 py-0.5 text-xs font-semibold',
        active
          ? 'bg-white/20 text-white'
          : 'bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300',
      ]"
    >
      {{ count }}
    </span>
  </button>
</template>
