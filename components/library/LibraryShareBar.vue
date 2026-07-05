<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRuntimeConfig } from '#imports'
import { useToast } from '~/composables/useToast'

export type LibraryShareTab = 'resources' | 'videos' | 'musical-notes' | 'apps'

const props = defineProps<{
  tab: LibraryShareTab
  title?: string
  description?: string
}>()

const TAB_LABELS: Record<LibraryShareTab, string> = {
  resources: 'Resources',
  videos: 'Videos',
  'musical-notes': 'Musical Notes',
  apps: 'Apps',
}

const config = useRuntimeConfig()
const { showToast } = useToast()
const copied = ref(false)

const shareTitle = computed(() => props.title || `Media Library — ${TAB_LABELS[props.tab]}`)
const shareDescription = computed(
  () => props.description || 'Explore photos, videos, resources, and more at Nomadic Notions.',
)

const shareUrl = computed(() => {
  const siteUrl =
    (config.public.siteUrl as string) ||
    (import.meta.client ? window.location.origin : 'https://www.nomadic-notions.co.in')
  return `${siteUrl}/library?tab=${props.tab}`
})

const networks = ['facebook', 'twitter', 'linkedin', 'whatsapp', 'email'] as const

const canNativeShare = computed(
  () =>
    import.meta.client && typeof navigator !== 'undefined' && typeof navigator.share === 'function',
)

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    copied.value = true
    showToast('Link copied to clipboard', 'success')
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    showToast('Could not copy link', 'error')
  }
}

const nativeShare = async () => {
  if (!canNativeShare.value) return
  try {
    await navigator.share({
      title: shareTitle.value,
      text: shareDescription.value,
      url: shareUrl.value,
    })
  } catch (err) {
    if (err instanceof Error && err.name !== 'AbortError') {
      showToast('Share failed', 'error')
    }
  }
}
</script>

<template>
  <div
    class="mb-6 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm"
  >
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0">
        <p class="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Share this section</p>
        <p class="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400" :title="shareUrl">
          {{ shareUrl }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-200 transition-colors hover:bg-gray-100 dark:hover:bg-slate-600"
          :title="copied ? 'Copied!' : 'Copy link'"
          @click="copyLink"
        >
          <Icon :name="copied ? 'mdi:check' : 'mdi:link-variant'" size="18" />
          <span>{{ copied ? 'Copied' : 'Copy link' }}</span>
        </button>

        <button
          v-if="canNativeShare"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-sky-600 bg-sky-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700"
          title="Share via device"
          @click="nativeShare"
        >
          <Icon name="mdi:share-variant" size="18" />
          <span>Share</span>
        </button>
      </div>
    </div>

    <div class="mt-4 flex flex-row flex-wrap gap-2">
      <div
        v-for="network in networks"
        :key="network"
        :class="`social-share-wrapper social-share-${network === 'twitter' ? 'x' : network}`"
        :data-network="network === 'twitter' ? 'x' : network"
        :title="`Share with ${network === 'twitter' ? 'X' : network.charAt(0).toUpperCase() + network.slice(1)}`"
      >
        <SocialShare
          :network="network"
          :url="shareUrl"
          :title="shareTitle"
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
  @apply rounded-lg px-4 py-2.5 transition-all duration-200;
  @apply flex items-center gap-2 font-semibold;
  @apply border-2 shadow-lg hover:shadow-xl;
  @apply transform hover:scale-105 active:scale-95;
}

:deep(.social-share-button span),
:deep(.social-share-button .label) {
  display: none;
}

:deep(.social-share-button svg),
:deep(.social-share-button .icon) {
  @apply h-5 w-5 flex-shrink-0;
  transition: all 0.2s ease-in-out;
}

.social-share-facebook :deep(.social-share-button),
.social-share-wrapper[data-network='facebook'] :deep(.social-share-button) {
  @apply border-blue-600 bg-blue-500 text-white dark:border-blue-500 dark:bg-blue-600;
  box-shadow: 0 4px 14px 0 rgba(59, 130, 246, 0.4);
}

.social-share-facebook:hover :deep(.social-share-button),
.social-share-wrapper[data-network='facebook']:hover :deep(.social-share-button) {
  @apply border-blue-700 bg-blue-600 dark:border-blue-400 dark:bg-blue-500;
  box-shadow: 0 6px 20px 0 rgba(59, 130, 246, 0.6);
}

.social-share-x :deep(.social-share-button),
.social-share-wrapper[data-network='x'] :deep(.social-share-button) {
  @apply border-sky-600 bg-sky-500 text-white dark:border-sky-500 dark:bg-sky-600;
  box-shadow: 0 4px 14px 0 rgba(14, 165, 233, 0.4);
}

.social-share-x:hover :deep(.social-share-button),
.social-share-wrapper[data-network='x']:hover :deep(.social-share-button) {
  @apply border-sky-700 bg-sky-600 dark:border-sky-400 dark:bg-sky-500;
  box-shadow: 0 6px 20px 0 rgba(14, 165, 233, 0.6);
}

.social-share-linkedin :deep(.social-share-button),
.social-share-wrapper[data-network='linkedin'] :deep(.social-share-button) {
  @apply border-blue-700 bg-blue-600 text-white dark:border-blue-600 dark:bg-blue-700;
  box-shadow: 0 4px 14px 0 rgba(37, 99, 235, 0.4);
}

.social-share-linkedin:hover :deep(.social-share-button),
.social-share-wrapper[data-network='linkedin']:hover :deep(.social-share-button) {
  @apply border-blue-800 bg-blue-700 dark:border-blue-500 dark:bg-blue-600;
  box-shadow: 0 6px 20px 0 rgba(37, 99, 235, 0.6);
}

.social-share-whatsapp :deep(.social-share-button),
.social-share-wrapper[data-network='whatsapp'] :deep(.social-share-button) {
  @apply border-emerald-600 bg-emerald-500 text-white dark:border-emerald-500 dark:bg-emerald-600;
  box-shadow: 0 4px 14px 0 rgba(16, 185, 129, 0.4);
}

.social-share-whatsapp:hover :deep(.social-share-button),
.social-share-wrapper[data-network='whatsapp']:hover :deep(.social-share-button) {
  @apply border-emerald-700 bg-emerald-600 dark:border-emerald-400 dark:bg-emerald-500;
  box-shadow: 0 6px 20px 0 rgba(16, 185, 129, 0.6);
}

.social-share-email :deep(.social-share-button),
.social-share-wrapper[data-network='email'] :deep(.social-share-button) {
  @apply border-slate-700 bg-slate-600 text-white dark:border-slate-400 dark:bg-slate-500;
  box-shadow: 0 4px 14px 0 rgba(71, 85, 105, 0.4);
}

.social-share-email:hover :deep(.social-share-button),
.social-share-wrapper[data-network='email']:hover :deep(.social-share-button) {
  @apply border-slate-800 bg-slate-700 dark:border-slate-300 dark:bg-slate-400;
  box-shadow: 0 6px 20px 0 rgba(71, 85, 105, 0.6);
}
</style>
