<script setup lang="ts">
defineProps<{
  postId: string
}>()
</script>

<template>
  <section
    class="blog-post-toolbar mb-8 rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-white shadow-md ring-1 ring-sky-100/80 dark:border-sky-800/70 dark:from-sky-950/50 dark:via-slate-800 dark:to-slate-800 dark:ring-sky-900/40"
    aria-label="Reading tools"
  >
    <div
      class="flex flex-col gap-3 border-b border-sky-100 bg-sky-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-sky-900/50 dark:bg-sky-950/30"
    >
      <div class="flex items-center gap-2.5">
        <span
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white shadow-sm dark:bg-sky-500"
          aria-hidden="true"
        >
          <Icon name="mdi:book-open-page-variant" size="20" />
        </span>
        <div>
          <h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Reading tools</h2>
          <p class="text-xs text-zinc-600 dark:text-zinc-400">Listen aloud or enter focus mode</p>
        </div>
      </div>
      <FocusMode />
    </div>
    <div class="px-4 py-4">
      <TextToSpeech :post-id="postId" embedded />
    </div>
  </section>
</template>
