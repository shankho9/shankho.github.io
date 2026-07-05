<script setup lang="ts">
import { useReadingDisplay, type ReadingFontFamily } from '~/composables/useReadingDisplay'

const {
  fontFamily,
  fontSizeLabel,
  canDecrease,
  canIncrease,
  increaseFont,
  decreaseFont,
  resetDisplay,
} = useReadingDisplay()

const fontOptions: { id: ReadingFontFamily; label: string; icon: string }[] = [
  { id: 'default', label: 'Default', icon: 'mdi:format-font' },
  { id: 'serif', label: 'Serif', icon: 'mdi:format-letter-case' },
  { id: 'sans', label: 'Sans', icon: 'mdi:format-text' },
]
</script>

<template>
  <div
    class="rounded-lg border border-sky-100 bg-white p-3 dark:border-slate-600 dark:bg-slate-900/40"
  >
    <div class="mb-3 flex items-center gap-2">
      <Icon name="mdi:format-size" size="18" class="text-sky-600 dark:text-sky-400" />
      <div>
        <p class="text-sm font-medium text-zinc-800 dark:text-zinc-200">Text display</p>
        <p class="text-xs text-zinc-500 dark:text-zinc-400">Font and size for the article body</p>
      </div>
    </div>

    <div class="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
      <div class="flex items-center gap-2">
        <span class="text-xs font-medium text-zinc-500 dark:text-zinc-400">Size</span>
        <div
          class="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-slate-600 dark:bg-slate-800"
        >
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-md text-zinc-700 transition-colors hover:bg-white disabled:opacity-40 dark:text-zinc-300 dark:hover:bg-slate-700"
            :disabled="!canDecrease"
            title="Decrease text size"
            aria-label="Decrease text size"
            @click="decreaseFont"
          >
            <Icon name="mdi:magnify-minus-outline" size="20" />
          </button>
          <span
            class="min-w-[3rem] px-2 text-center text-xs font-semibold tabular-nums text-zinc-700 dark:text-zinc-300"
            aria-live="polite"
          >
            {{ fontSizeLabel }}
          </span>
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-md text-zinc-700 transition-colors hover:bg-white disabled:opacity-40 dark:text-zinc-300 dark:hover:bg-slate-700"
            :disabled="!canIncrease"
            title="Increase text size"
            aria-label="Increase text size"
            @click="increaseFont"
          >
            <Icon name="mdi:magnify-plus-outline" size="20" />
          </button>
        </div>
        <button
          type="button"
          class="rounded-md px-2 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-gray-100 hover:text-zinc-800 dark:hover:bg-slate-700 dark:hover:text-zinc-200"
          title="Reset text size and font"
          @click="resetDisplay"
        >
          Reset
        </button>
      </div>

      <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <span class="text-xs font-medium text-zinc-500 dark:text-zinc-400">Font</span>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="option in fontOptions"
            :key="option.id"
            type="button"
            :class="[
              'inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
              fontFamily === option.id
                ? 'bg-sky-600 text-white dark:bg-sky-500'
                : 'bg-gray-100 text-zinc-700 hover:bg-gray-200 dark:bg-slate-700 dark:text-zinc-300 dark:hover:bg-slate-600',
            ]"
            @click="fontFamily = option.id"
          >
            <Icon :name="option.icon" size="14" />
            {{ option.label }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
