<script setup lang="ts">
interface Props {
  youtubeUrl?: string | null
  spotifyUrl?: string | null
}

const props = defineProps<Props>()

const youtubeEmbedId = computed(() => {
  const url = props.youtubeUrl?.trim()
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.slice(1).split('/')[0] || null
    }
    if (parsed.hostname.includes('youtube.com')) {
      return parsed.searchParams.get('v')
    }
  } catch {
    return null
  }
  return null
})

const spotifyEmbedPath = computed(() => {
  const url = props.spotifyUrl?.trim()
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.includes('spotify.com')) return null
    const path = parsed.pathname
    if (!path.includes('/track/') && !path.includes('/album/') && !path.includes('/playlist/')) {
      return null
    }
    return path
  } catch {
    return null
  }
})

const hasEmbeds = computed(() => Boolean(youtubeEmbedId.value || spotifyEmbedPath.value))
</script>

<template>
  <div v-if="hasEmbeds" class="music-stream-embeds space-y-4">
    <div
      v-if="youtubeEmbedId"
      class="overflow-hidden rounded-xl border border-gray-200 shadow-md dark:border-slate-700"
    >
      <div class="aspect-video w-full">
        <iframe
          :src="`https://www.youtube.com/embed/${youtubeEmbedId}`"
          title="YouTube player"
          class="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        />
      </div>
    </div>

    <div
      v-if="spotifyEmbedPath"
      class="overflow-hidden rounded-xl border border-gray-200 shadow-md dark:border-slate-700"
    >
      <iframe
        :src="`https://open.spotify.com/embed${spotifyEmbedPath}`"
        title="Spotify player"
        class="h-[152px] w-full"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
      />
    </div>
  </div>
</template>
