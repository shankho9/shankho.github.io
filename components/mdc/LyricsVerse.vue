<script setup lang="ts">
import { computed } from 'vue'

const slots = useSlots()
const hasContent = computed(() => Boolean(slots.default))
</script>

<template>
  <div
    v-if="hasContent"
    class="lyrics-verse my-6 border-l-4 border-amber-400/80 pl-6 font-serif text-lg leading-relaxed text-zinc-700 dark:border-amber-500/60 dark:text-zinc-200 md:text-xl md:leading-loose"
  >
    <slot />
  </div>
</template>
