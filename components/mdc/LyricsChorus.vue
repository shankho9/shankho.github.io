<script setup lang="ts">
import { computed } from 'vue'

const slots = useSlots()
const hasContent = computed(() => Boolean(slots.default))
</script>

<template>
  <div
    v-if="hasContent"
    class="lyrics-chorus my-8 rounded-xl bg-gradient-to-r from-sky-50 via-indigo-50 to-violet-50 px-6 py-5 text-center font-serif text-lg font-medium italic leading-relaxed text-sky-900 shadow-sm dark:from-sky-950/40 dark:via-indigo-950/30 dark:to-violet-950/30 dark:text-sky-100 md:text-xl"
  >
    <slot />
  </div>
</template>
