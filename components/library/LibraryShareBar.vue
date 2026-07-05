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
    class="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200/80 bg-white/80 px-3 py-2 dark:border-slate-700/80 dark:bg-slate-800/80"
  >
    <span class="mr-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">Share</span>

    <button
      type="button"
      class="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-gray-100 dark:border-slate-600 dark:bg-slate-700 dark:text-zinc-200 dark:hover:bg-slate-600"
      :title="shareUrl"
      @click="copyLink"
    >
      <Icon :name="copied ? 'mdi:check' : 'mdi:link-variant'" size="16" />
      <span class="hidden sm:inline">{{ copied ? 'Copied' : 'Copy link' }}</span>
    </button>

    <button
      v-if="canNativeShare"
      type="button"
      class="inline-flex items-center gap-1 rounded-md bg-sky-600 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-sky-700"
      title="Share via device"
      @click="nativeShare"
    >
      <Icon name="mdi:share-variant" size="16" />
      <span class="hidden sm:inline">Share</span>
    </button>

    <div class="ml-auto flex flex-wrap items-center gap-1.5">
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
  @apply flex items-center rounded-md border px-2 py-1.5 transition-colors;
}

:deep(.social-share-button span),
:deep(.social-share-button .label) {
  display: none;
}

:deep(.social-share-button svg),
:deep(.social-share-button .icon) {
  @apply h-4 w-4 flex-shrink-0;
}

.social-share-facebook :deep(.social-share-button),
.social-share-wrapper[data-network='facebook'] :deep(.social-share-button) {
  @apply border-blue-600/80 bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600;
}

.social-share-x :deep(.social-share-button),
.social-share-wrapper[data-network='x'] :deep(.social-share-button) {
  @apply border-sky-600/80 bg-sky-500 text-white hover:bg-sky-600 dark:bg-sky-600;
}

.social-share-linkedin :deep(.social-share-button),
.social-share-wrapper[data-network='linkedin'] :deep(.social-share-button) {
  @apply border-blue-700/80 bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700;
}

.social-share-whatsapp :deep(.social-share-button),
.social-share-wrapper[data-network='whatsapp'] :deep(.social-share-button) {
  @apply border-emerald-600/80 bg-emerald-500 text-white hover:bg-emerald-600 dark:bg-emerald-600;
}

.social-share-email :deep(.social-share-button),
.social-share-wrapper[data-network='email'] :deep(.social-share-button) {
  @apply border-slate-600/80 bg-slate-500 text-white hover:bg-slate-600 dark:bg-slate-600;
}
</style>
