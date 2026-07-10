<script setup lang="ts">
const model = defineModel<string | null>({ default: null })

defineProps<{
  label?: string
  options: string[]
  allLabel?: string
}>()

function select(value: string | null) {
  model.value = value
}
</script>

<template>
  <div v-if="options.length > 0" class="mb-4 flex flex-wrap items-center gap-1.5">
    <span v-if="label" class="mr-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
      {{ label }}
    </span>
    <button
      type="button"
      :class="[
        'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
        model === null
          ? 'bg-sky-600 text-white'
          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-slate-700 dark:text-zinc-300 dark:hover:bg-slate-600',
      ]"
      @click="select(null)"
    >
      {{ allLabel || 'All' }}
    </button>
    <button
      v-for="option in options"
      :key="option"
      type="button"
      :class="[
        'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
        model === option
          ? 'bg-sky-600 text-white'
          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-slate-700 dark:text-zinc-300 dark:hover:bg-slate-600',
      ]"
      @click="select(option)"
    >
      {{ option }}
    </button>
  </div>
</template>
