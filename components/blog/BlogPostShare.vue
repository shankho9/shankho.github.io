<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    compact?: boolean
  }>(),
  {
    title: 'Share',
    compact: false,
  },
)

const networks = ['facebook', 'twitter', 'linkedin', 'whatsapp', 'email'] as const
</script>

<template>
  <div
    :class="[
      'blog-post-share',
      compact
        ? 'blog-post-share--compact flex flex-wrap items-center gap-2 rounded-lg border border-gray-200/80 bg-white/80 px-3 py-2 dark:border-slate-700/80 dark:bg-slate-800/80'
        : 'rounded-xl border border-gray-200/80 bg-white/90 p-4 shadow-sm backdrop-blur-sm dark:border-slate-700/80 dark:bg-slate-800/90',
    ]"
  >
    <p
      v-if="!compact"
      class="mb-3 text-sm font-semibold text-zinc-800 dark:text-zinc-100"
    >
      {{ title }}
    </p>
    <span
      v-else
      class="mr-1 text-xs font-medium text-zinc-500 dark:text-zinc-400"
    >
      {{ title }}
    </span>
    <div :class="compact ? 'flex flex-wrap gap-1.5' : 'flex flex-wrap gap-2'">
      <div
        v-for="network in networks"
        :key="network"
        :class="`social-share-wrapper social-share-${network === 'twitter' ? 'x' : network}`"
        :data-network="network === 'twitter' ? 'x' : network"
        :title="`Share with ${network === 'twitter' ? 'X' : network.charAt(0).toUpperCase() + network.slice(1)}`"
      >
        <SocialShare
          :network="network"
          :styled="false"
          :label="false"
          class="social-share-button"
          :aria-label="`Share on ${network === 'twitter' ? 'X' : network.charAt(0).toUpperCase() + network.slice(1)}`"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.social-share-wrapper {
  @apply relative flex items-center;
}

:deep(.social-share-button) {
  @apply flex items-center justify-center rounded-lg border-2 transition-all duration-200;
  @apply shadow-md hover:shadow-lg hover:scale-105 active:scale-95;
}

:deep(.social-share-button span),
:deep(.social-share-button .label) {
  display: none;
}

:deep(.social-share-button svg),
:deep(.social-share-button .icon) {
  @apply h-4 w-4 flex-shrink-0;
}

.blog-post-share:not(.blog-post-share--compact) :deep(.social-share-button) {
  @apply h-10 w-10 rounded-full px-0 py-0;
}

.blog-post-share--compact :deep(.social-share-button) {
  @apply px-2 py-1.5;
}

.social-share-facebook :deep(.social-share-button),
.social-share-wrapper[data-network='facebook'] :deep(.social-share-button) {
  @apply border-blue-600 bg-blue-500 text-white dark:bg-blue-600;
}

.social-share-x :deep(.social-share-button),
.social-share-wrapper[data-network='x'] :deep(.social-share-button) {
  @apply border-sky-600 bg-sky-500 text-white dark:bg-sky-600;
}

.social-share-linkedin :deep(.social-share-button),
.social-share-wrapper[data-network='linkedin'] :deep(.social-share-button) {
  @apply border-blue-700 bg-blue-600 text-white dark:bg-blue-700;
}

.social-share-whatsapp :deep(.social-share-button),
.social-share-wrapper[data-network='whatsapp'] :deep(.social-share-button) {
  @apply border-emerald-600 bg-emerald-500 text-white dark:bg-emerald-600;
}

.social-share-email :deep(.social-share-button),
.social-share-wrapper[data-network='email'] :deep(.social-share-button) {
  @apply border-slate-600 bg-slate-500 text-white dark:bg-slate-600;
}
</style>
