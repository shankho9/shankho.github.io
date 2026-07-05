<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>

<template>
  <section class="mb-5 space-y-3 last:mb-0">
    <div v-if="title || $slots.header" class="flex flex-wrap items-center justify-between gap-2">
      <h3 v-if="title" class="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        {{ title }}
      </h3>
      <slot name="header" />
    </div>
    <slot />
  </section>
</template>
