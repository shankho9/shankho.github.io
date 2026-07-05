<script setup lang="ts">
defineProps<{
  postId: string
}>()
</script>

<template>
  <div
    class="blog-post-toolbar mb-6 overflow-hidden rounded-xl border border-gray-200/80 bg-white/90 shadow-sm backdrop-blur-sm dark:border-slate-700/80 dark:bg-slate-800/90"
  >
    <div
      class="flex items-center justify-between gap-3 border-b border-gray-100 px-3 py-2 dark:border-slate-700/80 sm:px-4"
    >
      <span class="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Reading tools
      </span>
      <FocusMode compact />
    </div>
    <div class="px-3 py-3 sm:px-4">
      <TextToSpeech :post-id="postId" embedded />
    </div>
  </div>
</template>
